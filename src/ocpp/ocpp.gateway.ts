// ocpp.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';
import { Injectable, Logger } from '@nestjs/common';

@WebSocketGateway({
  path: '/ocpp/EV_CHARGER_001',
  transports: ['websocket'],
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
@Injectable()
export class OcppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private logger: Logger = new Logger(OcppGateway.name);
  private clients: Map<string, WebSocket> = new Map();
  private chargerStatus: Record<string, any> = {};

  @WebSocketServer()
  server: Server;

  handleConnection(client: WebSocket, req: { url?: string }) {
    const url = req?.url || '';
    this.logger.log(`📥 WebSocket connection URL: ${url}`);
    const parts = url.split('/');
    const clientId =
      parts[parts.length - 1] ||
      `client-${Math.random().toString(36).substr(2, 9)}`;

    this.clients.set(clientId, client);
    this.logger.log(
      `🔌 New WebSocket connection from: ${client._socket.remoteAddress}`,
    );
    this.logger.log(`⚡️ Charger connected with ID: ${clientId}`);

    client.on('message', (rawMessage: string) => {
      this.logger.log(`📩 Received message from ${clientId}: ${rawMessage}`);

      try {
        const message = JSON.parse(rawMessage);
        if (!Array.isArray(message) || message.length < 4) return;

        const [messageTypeId, messageId, action, payload] = message;

        if (messageTypeId === 2) {
          switch (action) {
            case 'BootNotification':
              this.logger.log(`🚀 BootNotification received from ${clientId}`);
              client.send(
                JSON.stringify([
                  3,
                  messageId,
                  {
                    status: 'Accepted',
                    currentTime: new Date().toISOString(),
                    interval: 60,
                  },
                ]),
              );
              break;

            case 'Heartbeat':
              this.logger.log(`💓 Heartbeat received from ${clientId}`);
              this.chargerStatus[clientId] = {
                ...this.chargerStatus[clientId],
                lastHeartbeat: new Date().toISOString(),
              };
              client.send(
                JSON.stringify([
                  3,
                  messageId,
                  { currentTime: new Date().toISOString() },
                ]),
              );
              break;

            case 'StatusNotification':
              this.logger.log(
                `🔔 StatusNotification from ${clientId}: ${payload.status}`,
              );
              this.chargerStatus[clientId] = {
                ...this.chargerStatus[clientId],
                status: payload.status,
                errorCode: payload.errorCode,
                timestamp: payload.timestamp,
              };
              client.send(JSON.stringify([3, messageId, {}]));
              break;

            case 'Authorize':
              this.logger.log(
                `🔑 Authorize request for idTag: ${payload.idTag}`,
              );
              client.send(
                JSON.stringify([
                  3,
                  messageId,
                  {
                    idTagInfo: {
                      status: 'Accepted',
                      expiryDate: new Date(
                        Date.now() + 24 * 60 * 60 * 1000,
                      ).toISOString(), // Optional
                      parentIdTag: null,
                    },
                  },
                ]),
              );
              break;

            default:
              this.logger.warn(
                `📆 Unhandled OCPP action "${action}" from ${clientId}`,
              );
              client.send(JSON.stringify([3, messageId, {}]));
              break;
          }
        }
      } catch (error) {
        this.logger.error(
          `❌ Failed to parse message from ${clientId}: ${error}`,
        );
      }
    });

    client.on('close', (code, reason) => {
      this.logger.warn(
        `⚠️ WebSocket closed (${clientId}) - Code: ${code}, Reason: ${reason}`,
      );
      this.clients.delete(clientId);
    });
  }

  handleDisconnect(client: WebSocket) {
    this.clients.forEach((value, key) => {
      if (value === client) {
        this.logger.log(`🔌 Charger disconnected: ${key}`);
        this.clients.delete(key);
      }
    });
  }

  sendMessageToCharger(message: string, clientId: string) {
    const client = this.clients.get(clientId);
    if (client && client.readyState === client.OPEN) {
      client.send(message);
    } else {
      this.logger.warn(`❌ Cannot send to charger ${clientId} — not connected`);
    }
  }

  getStatusForCharger(id: string) {
    return this.chargerStatus[id] || { status: 'Disconnected' };
  }
}
