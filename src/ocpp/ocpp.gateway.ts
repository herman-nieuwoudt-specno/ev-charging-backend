import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';
import { Injectable, Logger } from '@nestjs/common';
import { ClientGateway } from 'src/client/client.gatway';
import { ChargerState } from 'src/models/charger-status';

@WebSocketGateway({
  path: '/ocpp/EV_CHARGER_001',
  transports: ['websocket'],
  cors: { origin: '*', methods: ['GET', 'POST'] },
})
@Injectable()
export class OcppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private logger = new Logger(OcppGateway.name);
  private clients = new Map<string, WebSocket>();
  private chargerStatus: Record<string, ChargerState> = {};

  @WebSocketServer()
  server: Server;

  constructor(private clientGateway: ClientGateway) {}

  handleConnection(client: WebSocket, req: { url?: string }) {
    const url = req?.url || '';
    const parts = url.split('/');
    const clientId =
      parts[parts.length - 1] ||
      `client-${Math.random().toString(36).substr(2, 9)}`;

    this.clients.set(clientId, client);
    this.chargerStatus[clientId] = {
      wsConnected: true,
      lastHeartbeat: new Date().toISOString(),
      charging: false,
    };

    this.logger.log(`🔌 WebSocket connected: ${clientId}`);
    this.logger.log(`📍 From: ${client._socket.remoteAddress}`);

    client.on('message', (raw) => this.handleMessage(client, clientId, raw));

    client.on('close', () => {
      this.logger.warn(`⚠️ WebSocket closed (${clientId})`);
      this.chargerStatus[clientId].wsConnected = false;
      this.clients.delete(clientId);
    });

    client.on('error', (err) => {
      this.logger.error(`❌ WebSocket error for ${clientId}: ${err.message}`);
    });
  }

  private handleMessage(client: WebSocket, clientId: string, raw: string) {
    this.logger.debug(`🪵 Raw message from ${clientId}: ${raw}`);
    try {
      const msg = JSON.parse(raw);
      if (!Array.isArray(msg) || msg.length < 4) return;

      const [type, id, action, payload] = msg;

      if (type === 2)
        this.handleCallMessage(client, clientId, id, action, payload);
      if (type === 3) this.handleCallResult(clientId, id, payload);
    } catch (err) {
      this.logger.error(`❌ Failed to parse message from ${clientId}: ${err}`);
    }
  }

  handleCallMessage(
    client: WebSocket,
    clientId: string,
    messageId: string,
    action: string,
    payload: any,
  ) {
    switch (action) {
      case 'BootNotification':
        this.logger.log(`🚀 BootNotification from ${clientId}`);
        this.reply(client, messageId, {
          status: 'Accepted',
          currentTime: new Date().toISOString(),
          interval: 30,
        });
        break;
      case 'Heartbeat':
        this.logger.log(`💓 Heartbeat from ${clientId}`);
        this.chargerStatus[clientId].lastHeartbeat = new Date().toISOString();
        this.reply(client, messageId, {
          currentTime: new Date().toISOString(),
        });
        this.clientGateway.broadcast('status', this.chargerStatus[clientId]);
        break;

      case 'StatusNotification':
        this.logger.log(
          `🔔 StatusNotification — ${clientId}, ${payload.status}`,
        );
        this.chargerStatus[clientId] = {
          ...this.chargerStatus[clientId],
          wsConnected: true,
          chargerStatus: payload.status,
          connectorId: payload.connectorId,
        };
        this.reply(client, messageId, {});
        this.clientGateway.broadcast('status', this.chargerStatus[clientId]);
        break;
      case 'Authorize':
        this.logger.log(`🔑 Authorize for ${payload.idTag}`);
        this.reply(client, messageId, {
          idTagInfo: {
            status: 'Accepted',
          },
        });
      case 'StartTransaction':
        this.logger.log(`🟢 StartTransaction from ${clientId}`);
        const transactionId = Date.now();

        this.chargerStatus[clientId] = {
          ...this.chargerStatus[clientId],
          charging: true,
          transactionId,
          idTag: payload.idTag,
          meterStart: payload.meterStart,
          timestampStart: payload.timestamp,
        };
        this.reply(client, messageId, {
          transactionId,
          idTagInfo: { status: 'Accepted' },
        });
        this.clientGateway.broadcast('status', this.chargerStatus[clientId]);
        break;

      case 'StopTransaction':
        this.logger.log(`🔴 StopTransaction from ${clientId}`);
        this.chargerStatus[clientId] = {
          ...this.chargerStatus[clientId],
          charging: false,
          transactionId: undefined,
          meterStop: payload.meterStop,
          timestampStop: payload.timestamp,
        };
        this.reply(client, messageId, {});
        this.clientGateway.broadcast('status', this.chargerStatus[clientId]);
        break;

      case 'MeterValues':
        this.logger.log(`⚡ MeterValues from ${clientId}`);
        this.chargerStatus[clientId].lastMeterValues = payload;
        this.reply(client, messageId, {});
        this.clientGateway.broadcast('meter', payload);
        break;

      default:
        this.logger.warn(`📆 Unhandled action: ${action}`);
        this.reply(client, messageId, {});
    }
  }

  handleCallResult(clientId: string, messageId: string, payload: any) {
    this.logger.log(
      `📦 CALL_RESULT from ${clientId} — messageId: ${messageId}`,
    );
    this.logger.debug(`Payload: ${JSON.stringify(payload)}`);
  }

  reply(client: WebSocket, messageId: string, payload: any) {
    client.send(JSON.stringify([3, messageId, payload]));
  }

  sendMessageToCharger(message: string, clientId: string) {
    const client = this.clients.get(clientId);

    if (client && client.readyState === client.OPEN) {
      console.log(`Sending message to ${clientId}: ${message}`);
      client.send(message);
    } else {
      this.logger.warn(`❌ Cannot send to ${clientId} — not connected`);
    }
  }

  getStatusForCharger(id: string) {
    return (
      this.chargerStatus[id] || { wsConnected: false, chargerStatus: 'Unknown' }
    );
  }

  getMeterValuesForCharger(id: string) {
    return this.chargerStatus[id]?.lastMeterValues || null;
  }

  handleDisconnect(client: WebSocket) {
    for (const [key, value] of this.clients.entries()) {
      if (value === client) {
        this.clients.delete(key);
      }
    }
  }
}
