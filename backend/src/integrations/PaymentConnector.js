'use strict';

const GovernmentDataConnector = require('./GovernmentDataConnector');

class PaymentConnector extends GovernmentDataConnector {
  constructor() {
    super('PFMS DBT Payment Gateway Connector', 'Ministry of Finance, Controller General of Accounts', 'SIMULATION');
  }

  async getBenefits(bankDetails) {
    return {
      success: true,
      status: this.status,
      dbtReadiness: {
        isAadhaarSeeded: true,
        npciMapperActive: true,
        bankStatus: 'Valid Account for DBT Transfer',
      },
    };
  }
}

module.exports = new PaymentConnector();
