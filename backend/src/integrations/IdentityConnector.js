'use strict';

const GovernmentDataConnector = require('./GovernmentDataConnector');

class IdentityConnector extends GovernmentDataConnector {
  constructor() {
    super('UIDAI Aadhaar Authentication Connector', 'Ministry of Electronics and Information Technology', 'SIMULATION');
  }

  async verifyIdentity({ aadhaar, otp }) {
    if (!aadhaar || !/^\d{12}$/.test(aadhaar)) {
      return { success: false, error: 'Invalid 12-digit Aadhaar number' };
    }
    // Simulation: Returns demographic payload
    return {
      success: true,
      status: this.status,
      ekycData: {
        maskedAadhaar: `XXXX-XXXX-${aadhaar.slice(-4)}`,
        verified: true,
        authDate: new Date(),
      },
    };
  }
}

module.exports = new IdentityConnector();
