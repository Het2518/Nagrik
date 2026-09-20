'use strict';

const router = require('express').Router();
const { authenticate } = require('../middleware/authMiddleware');
const { getPdsDetails, getUidaiEkyc } = require('../controllers/integrationController');

const { getConnectorsStatus } = require('../integrations');

// Public health & simulation status
router.get('/status', (req, res) => {
  res.json({
    success: true,
    data: {
      disclaimer: 'All external government databases are simulated via interoperability adapters for privacy and testability.',
      connectors: getConnectorsStatus(),
    },
  });
});

// All subsequent integration endpoints require authentication
router.use(authenticate);

router.get('/pds/:rationCardNumber', getPdsDetails);
router.post('/uidai/ekyc', getUidaiEkyc);

module.exports = router;
