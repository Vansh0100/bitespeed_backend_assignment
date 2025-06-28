const Contact = require('../models/Contact');
const { AppError } = require('../middleware/errorHandler');

class ContactController {
  // Main identify endpoint
  getAllContacts = async (req, res) => {
    try {
      // Fetch all contacts from the database
      const contacts = await Contact.getAllContacts();

      // Format the response
      const response = {
        success: true,
        data: contacts
      };

      res.status(200).json(response);
    } catch (error) {
      console.log('Error in getAllContacts endpoint:', error);
      throw error;
    }
  }
  identify = async (req, res) => {
    const { email, phoneNumber } = req.body;

    // Validate that at least one identifier is provided
    if (!email && !phoneNumber) {
      throw new AppError('Either email or phoneNumber must be provided', 400);
    }

    try {
      // Consolidate contacts and get the result
      const { primaryContact, allContacts } = await Contact.consolidateContacts(email, phoneNumber);

      // Prepare the response
      const response = this.formatIdentifyResponse(primaryContact, allContacts);

      console.log(`Contact identified - Primary ID: ${response.contact.primaryContactId}, Email: ${email}, Phone: ${phoneNumber}`);

      res.status(200).json(response);
    } catch (error) {
      console.log('Error in identify endpoint:', error);
      throw error;
    }
  };

  // Format the response according to the specified structure
  formatIdentifyResponse(primaryContact, allContacts) {
    // Separate primary and secondary contacts
    const secondaryContacts = allContacts.filter(c => 
      c.id !== primaryContact.id && c.link_precedence === 'secondary'
    );

    // Collect all unique emails and phone numbers
    const emails = [...new Set(allContacts
      .filter(c => c.email)
      .map(c => c.email))];
    
    const phoneNumbers = [...new Set(allContacts
      .filter(c => c.phone_number)
      .map(c => c.phone_number))];

    // Ensure primary contact's email and phone are first
    if (primaryContact.email && !emails.includes(primaryContact.email)) {
      emails.unshift(primaryContact.email);
    } else if (primaryContact.email) {
      // Move primary email to first position
      const index = emails.indexOf(primaryContact.email);
      if (index > 0) {
        emails.splice(index, 1);
        emails.unshift(primaryContact.email);
      }
    }

    if (primaryContact.phone_number && !phoneNumbers.includes(primaryContact.phone_number)) {
      phoneNumbers.unshift(primaryContact.phone_number);
    } else if (primaryContact.phone_number) {
      // Move primary phone to first position
      const index = phoneNumbers.indexOf(primaryContact.phone_number);
      if (index > 0) {
        phoneNumbers.splice(index, 1);
        phoneNumbers.unshift(primaryContact.phone_number);
      }
    }

    return {
      contact: {
        primaryContactId: primaryContact.id,
        emails,
        phoneNumbers,
        secondaryContactIds: secondaryContacts.map(c => c.id)
      }
    };
  }
}

module.exports = new ContactController();
