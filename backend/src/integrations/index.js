'use strict';

const IdentityConnector = require('./IdentityConnector');
const CivilRegistrationConnector = require('./CivilRegistrationConnector');
const RationConnector = require('./RationConnector');
const EducationConnector = require('./EducationConnector');
const PensionConnector = require('./PensionConnector');
const DocumentConnector = require('./DocumentConnector');
const PaymentConnector = require('./PaymentConnector');

const connectors = [
  IdentityConnector,
  CivilRegistrationConnector,
  RationConnector,
  EducationConnector,
  PensionConnector,
  DocumentConnector,
  PaymentConnector,
];

const getConnectorsStatus = () => {
  return connectors.map((c) => c.getStatus());
};

module.exports = {
  IdentityConnector,
  CivilRegistrationConnector,
  RationConnector,
  EducationConnector,
  PensionConnector,
  DocumentConnector,
  PaymentConnector,
  connectors,
  getConnectorsStatus,
};
