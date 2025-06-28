const express = require('express');
const contactRoutes = require('./contactRoutes');

const router = express.Router();

// Route definitions
router.use('/contacts', contactRoutes);

// API info endpoint
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Bitespeed Identity Reconciliation API',
    version: '1.0.0',
    endpoints: {
      identify: '/api/v1/contacts/identify',
      get_all_contacts: '/api/v1/contacts/get_all',
    }
  });
});

module.exports = router;
