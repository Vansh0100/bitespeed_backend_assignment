const Contact = require('../models/Contact');
const { AppError } = require('../middleware/errorHandler');

class ContactService {
  async getContactIdentity(email, phoneNumber) {
    try {
      if (!email && !phoneNumber) {
        throw new AppError('Either email or phoneNumber must be provided', 400);
      }

      const { primaryContact, allContacts } = await Contact.consolidateContacts(email, phoneNumber);
      
      return this.formatContactIdentity(primaryContact, allContacts);
    } catch (error) {
      console.log('Error in getContactIdentity:', error);
      throw error;
    }
  }

  formatContactIdentity(primaryContact, allContacts) {
    const secondaryContacts = allContacts.filter(c => 
      c.id !== primaryContact.id && c.link_precedence === 'secondary'
    );

    // Get unique emails and phone numbers, ensuring primary contact's info comes first
    const allEmails = allContacts.filter(c => c.email).map(c => c.email);
    const allPhones = allContacts.filter(c => c.phone_number).map(c => c.phone_number);

    const emails = [...new Set(allEmails)];
    const phoneNumbers = [...new Set(allPhones)];

    // Ensure primary contact's email and phone are first
    if (primaryContact.email) {
      const emailIndex = emails.indexOf(primaryContact.email);
      if (emailIndex > 0) {
        emails.splice(emailIndex, 1);
        emails.unshift(primaryContact.email);
      }
    }

    if (primaryContact.phone_number) {
      const phoneIndex = phoneNumbers.indexOf(primaryContact.phone_number);
      if (phoneIndex > 0) {
        phoneNumbers.splice(phoneIndex, 1);
        phoneNumbers.unshift(primaryContact.phone_number);
      }
    }

    return {
      primaryContactId: primaryContact.id,
      emails,
      phoneNumbers,
      secondaryContactIds: secondaryContacts.map(c => c.id)
    };
  }
}

module.exports = new ContactService();
