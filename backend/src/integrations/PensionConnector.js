'use strict';

const GovernmentDataConnector = require('./GovernmentDataConnector');

class PensionConnector extends GovernmentDataConnector {
  constructor() {
    super('NSAP National Social Assistance Connector', 'Ministry of Rural Development', 'SIMULATION');
  }

  async getBenefits(aadhaarHashOrMemberId) {
    return {
      success: true,
      status: this.status,
      activePensions: [],
      crossSchemeConflictCheck: 'No conflicting national social assistance pension active',
    };
  }
}

module.exports = new PensionConnector();
