const Contact = require('../../models/Contact');

const seedContacts = async () => {
  try {
    // Check if contacts already exist
    const existingContacts = await Contact.findAll({ limit: 1 });
    if (existingContacts.length > 0) {
      console.log('Contacts already exist, skipping contact seeding');
      return;
    }

    // Sample contact data to demonstrate the linking functionality
    const contactsData = [
      // Network 1: John Doe
      {
        email: 'john@example.com',
        phoneNumber: '1234567890',
        linkPrecedence: 'primary'
      },
      {
        email: 'john.doe@gmail.com', // Same person, different email
        phoneNumber: '1234567890', // Same phone number
        linkPrecedence: 'secondary'
      },
      {
        email: 'john.doe@gmail.com', // Same email as above
        phoneNumber: '1987654321', // Different phone number
        linkPrecedence: 'secondary'
      },

      // Network 2: Jane Smith
      {
        email: 'jane@company.com',
        phoneNumber: '1111111111',
        linkPrecedence: 'primary'
      },
      {
        email: 'jane.smith@personal.com',
        phoneNumber: '1111111111', // Same phone
        linkPrecedence: 'secondary'
      },

      // Network 3: Bob Wilson (standalone)
      {
        email: 'bob@example.com',
        phoneNumber: '2222222222',
        linkPrecedence: 'primary'
      },

      // Network 4: Alice Johnson
      {
        email: 'alice@work.com',
        phoneNumber: '3333333333',
        linkPrecedence: 'primary'
      },
      {
        email: 'alice@personal.com',
        phoneNumber: null, // Only email
        linkPrecedence: 'secondary'
      },
      {
        email: null, // Only phone
        phoneNumber: '3333444444',
        linkPrecedence: 'secondary'
      }
    ];

    console.log('Creating sample contacts...');

    // Create primary contacts first
    const primaryContacts = [];
    for (const contactData of contactsData.filter(c => c.linkPrecedence === 'primary')) {
      const contact = await Contact.createContact(contactData);
      primaryContacts.push(contact);
      console.log(`Created primary contact: ${contact.id} - ${contact.email || 'No email'} - ${contact.phone_number || 'No phone'}`);
    }

    // Create secondary contacts and link them
    const secondaryContactsData = contactsData.filter(c => c.linkPrecedence === 'secondary');
    
    // Link John Doe's secondary contacts
    const johnPrimary = primaryContacts.find(c => c.email === 'john@example.com');
    if (johnPrimary) {
      const johnSecondaryData = secondaryContactsData.filter((_, index) => index < 2); // First 2 secondary contacts
      for (const contactData of johnSecondaryData) {
        const contact = await Contact.createContact({
          ...contactData,
          linkedId: johnPrimary.id
        });
        console.log(`Created secondary contact: ${contact.id} linked to ${johnPrimary.id}`);
      }
    }

    // Link Jane Smith's secondary contact
    const janePrimary = primaryContacts.find(c => c.email === 'jane@company.com');
    if (janePrimary) {
      const janeSecondaryData = secondaryContactsData.find(c => c.email === 'jane.smith@personal.com');
      if (janeSecondaryData) {
        const contact = await Contact.createContact({
          ...janeSecondaryData,
          linkedId: janePrimary.id
        });
        console.log(`Created secondary contact: ${contact.id} linked to ${janePrimary.id}`);
      }
    }

    // Link Alice Johnson's secondary contacts
    const alicePrimary = primaryContacts.find(c => c.email === 'alice@work.com');
    if (alicePrimary) {
      const aliceSecondaryData = secondaryContactsData.filter(c => 
        c.email === 'alice@personal.com' || c.phoneNumber === '+3333444444'
      );
      for (const contactData of aliceSecondaryData) {
        const contact = await Contact.createContact({
          ...contactData,
          linkedId: alicePrimary.id
        });
        console.log(`Created secondary contact: ${contact.id} linked to ${alicePrimary.id}`);
      }
    }

    console.log('Contact seeding completed successfully');
    
  } catch (error) {
    console.log('Error seeding contacts:', error);
    throw error;
  }
};

module.exports = { seedContacts };
