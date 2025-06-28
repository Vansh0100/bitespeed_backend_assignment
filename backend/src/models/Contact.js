const BaseModel = require('./BaseModel');
const database = require('../database/connection');
const { AppError } = require('../middleware/errorHandler');

class Contact extends BaseModel {
  constructor() {
    super('contacts');
  }
  async getAllContacts (){
    let query = `select * from contacts`
    const result = await database.query(query);
    return result.rows;
  }
  async findByEmailOrPhone(email, phoneNumber) {
    let query = `
      SELECT * FROM ${this.tableName} 
      WHERE deleted_at IS NULL AND (
    `;
    const values = [];
    const conditions = [];
    let valueIndex = 1;

    if (email) {
      conditions.push(`email = $${valueIndex++}`);
      values.push(email);
    }

    if (phoneNumber) {
      conditions.push(`phone_number = $${valueIndex++}`);
      values.push(phoneNumber);
    }

    if (conditions.length === 0) {
      return [];
    }

    query += conditions.join(' OR ') + ')';
    query += ' ORDER BY created_at ASC';

    const result = await database.query(query, values);
    return result.rows;
  }

  async findLinkedContacts(contactIds) {
    if (!contactIds || contactIds.length === 0) {
      return [];
    }

    // First, get the primary contact(s) from the given IDs
    const placeholders = contactIds.map((_, index) => `$${index + 1}`).join(',');
    
    // Simple approach: find all contacts that share the same linked_id or are primary contacts
    const query = `
      WITH contact_network AS (
        -- Get primary contacts from the input IDs
        SELECT DISTINCT 
          CASE 
            WHEN link_precedence = 'primary' THEN id
            WHEN linked_id IS NOT NULL THEN linked_id
            ELSE id
          END as primary_id
        FROM ${this.tableName}
        WHERE id IN (${placeholders}) AND deleted_at IS NULL
      )
      SELECT DISTINCT c.id, c.phone_number, c.email, c.linked_id, c.link_precedence, c.created_at, c.updated_at
      FROM ${this.tableName} c
      INNER JOIN contact_network cn ON (
        c.id = cn.primary_id OR 
        c.linked_id = cn.primary_id
      )
      WHERE c.deleted_at IS NULL
      ORDER BY c.created_at ASC;
    `;

    const result = await database.query(query, contactIds);
    return result.rows;
  }

  async createContact(contactData) {
    const { email, phoneNumber, linkedId = null, linkPrecedence = 'primary' } = contactData;

    const data = {
      email: email || null,
      phone_number: phoneNumber || null,
      linked_id: linkedId,
      link_precedence: linkPrecedence,
      created_at: new Date(),
      updated_at: new Date()
    };

    return super.create(data);
  }

  async updateLinkPrecedence(contactId, linkPrecedence, linkedId = null) {
    const updateData = {
      link_precedence: linkPrecedence,
      updated_at: new Date()
    };

    if (linkedId !== null) {
      updateData.linked_id = linkedId;
    }

    return super.update(contactId, updateData);
  }

  async consolidateContacts(email, phoneNumber) {
    return await database.transaction(async (client) => {
      // Find existing contacts with matching email or phone
      const existingContacts = await this.findByEmailOrPhone(email, phoneNumber);
      console.log("Existing contacts found:", existingContacts);
        
      if (existingContacts.length === 0) {
        // No existing contacts, create new primary contact
        console.log("No records found, creating new contacts");
        
        const newContact = await this.createContact({
          email,
          phoneNumber,
          linkPrecedence: 'primary'
        });
        
        return {
          primaryContact: newContact,
          allContacts: [newContact]
        };
      }

      // Get all linked contacts for the found contacts
      const contactIds = existingContacts.map(c => c.id);
      const allLinkedContacts = await this.findLinkedContacts(contactIds);
      console.log("All linked contacts found:", allLinkedContacts);
      
      // Separate contacts into different networks based on their primary contacts
      const networks = new Map();
      
      for (const contact of allLinkedContacts) {
        let primaryId;
        if (contact.link_precedence === 'primary') {
          primaryId = contact.id;
        } else if (contact.linked_id) {
          primaryId = contact.linked_id;
        } else {
          // This shouldn't happen, but handle it gracefully
          primaryId = contact.id;
        }
        
        if (!networks.has(primaryId)) {
          networks.set(primaryId, []);
        }
        networks.get(primaryId).push(contact);
      }

      // Check if we have multiple networks that need to be merged
      const primaryContacts = Array.from(networks.keys())
        .map(primaryId => allLinkedContacts.find(c => c.id === primaryId))
        .filter(Boolean);
      console.log("primaryContacts:", primaryContacts);
      
      let finalPrimaryContact;
      let allContactsInNetwork = [];

      if (primaryContacts.length > 1) {
        // NETWORK CONSOLIDATION SCENARIO
        console.log(`Consolidating ${primaryContacts.length} separate networks`);
        
        // Find the oldest primary contact (this will remain primary)
        finalPrimaryContact = primaryContacts.sort((a, b) => 
          new Date(a.created_at) - new Date(b.created_at)
        )[0];
        
        // Collect all contacts from all networks
        for (const [primaryId, contacts] of networks) {
          allContactsInNetwork.push(...contacts);
        }
        
        // Convert all other primary contacts to secondary and link them to the final primary
        for (const primaryContact of primaryContacts) {
          if (primaryContact.id !== finalPrimaryContact.id) {
            await this.updateLinkPrecedence(primaryContact.id, 'secondary', finalPrimaryContact.id);
            primaryContact.link_precedence = 'secondary';
            primaryContact.linked_id = finalPrimaryContact.id;
          }
        }
        
        // Update all secondary contacts to point to the final primary contact
        for (const contact of allContactsInNetwork) {
          if (contact.id !== finalPrimaryContact.id && contact.linked_id !== finalPrimaryContact.id) {
            await this.updateLinkPrecedence(contact.id, 'secondary', finalPrimaryContact.id);
            contact.link_precedence = 'secondary';
            contact.linked_id = finalPrimaryContact.id;
          }
        }
        
      } else if (primaryContacts.length === 1) {
        // SINGLE NETWORK SCENARIO
        finalPrimaryContact = primaryContacts[0];
        allContactsInNetwork = Array.from(networks.values())[0];
      } else {
        // No primary contact found, make the oldest one primary
        allContactsInNetwork = allLinkedContacts;
        finalPrimaryContact = allContactsInNetwork.sort((a, b) => 
          new Date(a.created_at) - new Date(b.created_at)
        )[0];
        
        if (finalPrimaryContact.link_precedence !== 'primary') {
          await this.updateLinkPrecedence(finalPrimaryContact.id, 'primary', null);
          finalPrimaryContact.link_precedence = 'primary';
          finalPrimaryContact.linked_id = null;
        }
      }

      // Check if we need to create a new contact for the current request
      // We should NOT create a new contact if:
      // 1. We're consolidating networks (the identifiers already exist in the networks)
      // 2. We have exact match
      // 3. The identifiers are already covered by existing contacts
      
      let shouldCreateNew = false;
      
      if (primaryContacts.length > 1) {
        // NETWORK CONSOLIDATION - Don't create new contact, identifiers already exist
        console.log("Network consolidation - not creating new contact");
        shouldCreateNew = false;
      } else {
        // SINGLE NETWORK OR NEW NETWORK - Check if we need new contact
        const existingEmail = email ? allContactsInNetwork.some(c => c.email === email) : true;
        const existingPhone = phoneNumber ? allContactsInNetwork.some(c => c.phone_number === phoneNumber) : true;

        if (email && phoneNumber) {
          // Both email and phone provided - check for exact match
          const hasExactMatch = allContactsInNetwork.some(c => 
            c.email === email && c.phone_number === phoneNumber
          );
          shouldCreateNew = !hasExactMatch;
        } else if (email && !existingEmail) {
          // Only email provided and it's new
          shouldCreateNew = true;
        } else if (phoneNumber && !existingPhone) {
          // Only phone provided and it's new
          shouldCreateNew = true;
        }
      }

      if (shouldCreateNew) {
        console.log("Creating new secondary contact for additional identifier");
        const newContact = await this.createContact({
          email,
          phoneNumber,
          linkedId: finalPrimaryContact.id,
          linkPrecedence: 'secondary'
        });
        allContactsInNetwork.push(newContact);
      }

      // Final cleanup: ensure all contacts are properly linked
      for (const contact of allContactsInNetwork) {
        if (contact.id !== finalPrimaryContact.id && 
            (contact.link_precedence !== 'secondary' || contact.linked_id !== finalPrimaryContact.id)) {
          await this.updateLinkPrecedence(contact.id, 'secondary', finalPrimaryContact.id);
          contact.link_precedence = 'secondary';
          contact.linked_id = finalPrimaryContact.id;
        }
      }

      console.log(`Final network: Primary: ${finalPrimaryContact.id}, Total contacts: ${allContactsInNetwork.length}`);

      return {
        primaryContact: finalPrimaryContact,
        allContacts: allContactsInNetwork
      };
    });
  }

  // Override findAll to exclude soft-deleted records
  async findAll(options = {}) {
    const { where = {}, ...otherOptions } = options;
    where.deleted_at = null; // Only get non-deleted records
    return super.findAll({ where, ...otherOptions });
  }
}

module.exports = new Contact();
