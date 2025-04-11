export type ChargerState = {
  wsConnected: boolean;
  chargerStatus?: string;
  charging?: boolean;
  lastHeartbeat?: string;
  connectorId?: number;
  transactionId?: number;
  idTag?: string;
  meterStart?: number;
  meterStop?: number;
  timestampStart?: string;
  timestampStop?: string;
  lastMeterValues?: any;
};
