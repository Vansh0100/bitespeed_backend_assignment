const express = require('express');
const Joi = require('joi');
const ContactController = require('../controllers/ContactController');
const { validate } = require('../middleware/validation');

const router = express.Router();

// Validation schemas
const identifySchema = Joi.object({
  email: Joi.string().email().allow(null, '').optional(),
  phoneNumber: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).allow(null, '').optional()
}).or('email', 'phoneNumber') // At least one of email or phoneNumber is required
.custom((value, helpers) => {
  // Custom validation to ensure at least one valid (non-empty) field is provided
  const { email, phoneNumber } = value;
  
  const hasValidEmail = email && email.trim() !== '';
  const hasValidPhone = phoneNumber && phoneNumber.trim() !== '';
  
  if (!hasValidEmail && !hasValidPhone) {
    return helpers.error('custom.atLeastOne');
  }
  
  return value;
}, 'At least one identifier required')
.messages({
  'custom.atLeastOne': 'Either email or phoneNumber must be provided and not empty'
});


// Public endpoint - Main identify endpoint for Bitespeed
router.post('/identify', 
  validate(identifySchema), 
  ContactController.identify
);

router.get('/get_all', ContactController.getAllContacts);

module.exports = router;
