'use strict';

/**
 * GovernmentDataConnector — Base Interoperability Adapter
 *
 * All external government integration connectors extend this class.
 * Ensures uniform status reporting (MOCK / SIMULATION / CONNECTED / UNAVAILABLE)
 * and contract methods.
 */
class GovernmentDataConnector {
  constructor(name, department, status = 'SIMULATION') {
    this.name = name;
    this.department = department;
    this.status = status; // 'MOCK' | 'SIMULATION' | 'CONNECTED' | 'UNAVAILABLE'
    this.lastCheckedAt = new Date();
  }

  getStatus() {
    return {
      connectorName: this.name,
      department: this.department,
      status: this.status,
      isSimulation: this.status === 'SIMULATION' || this.status === 'MOCK',
      lastCheckedAt: this.lastCheckedAt,
    };
  }

  async getFamily(identifier) {
    throw new Error(`${this.name}: getFamily() not implemented`);
  }

  async getMember(identifier) {
    throw new Error(`${this.name}: getMember() not implemented`);
  }

  async getDocuments(identifier) {
    throw new Error(`${this.name}: getDocuments() not implemented`);
  }

  async getBenefits(identifier) {
    throw new Error(`${this.name}: getBenefits() not implemented`);
  }

  async getLifeEvents(identifier) {
    throw new Error(`${this.name}: getLifeEvents() not implemented`);
  }

  async verifyIdentity(data) {
    throw new Error(`${this.name}: verifyIdentity() not implemented`);
  }

  async verifyDocument(certNumber, type) {
    throw new Error(`${this.name}: verifyDocument() not implemented`);
  }
}

module.exports = GovernmentDataConnector;
