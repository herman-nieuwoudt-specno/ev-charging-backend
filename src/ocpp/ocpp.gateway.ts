import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';
import { Injectable, Logger } from '@nestjs/common';

@WebSocketGateway({ path: '/ocpp', port: 3001 }) // OCPP WebSocket Server
@Injectable()
export class OcppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private logger: Logger = new Logger(OcppGateway.name);
  private clients: Map<string, WebSocket> = new Map();

  @WebSocketServer()
  server: Server;

  handleConnection(client: WebSocket) {
    const clientId = Math.random().toString(36).substr(2, 9);
    this.clients.set(clientId, client);
    this.logger.log(`Charger connected: ${clientId}`);

    // Acknowledge connection
    client.send(JSON.stringify(['3', clientId, 'Connected']));
  }

  handleDisconnect(client: WebSocket) {
    this.clients.forEach((value, key) => {
      if (value === client) {
        this.logger.log(`Charger disconnected: ${key}`);
        this.clients.delete(key);
      }
    });
  }

  // 🔹 Handle BootNotification (when a charger connects)
  @SubscribeMessage('BootNotification')
  handleBootNotification(@MessageBody() data: any) {
    this.logger.log(`Received BootNotification: ${JSON.stringify(data)}`);
    return JSON.stringify([
      '3',
      'BootNotification',
      { status: 'Accepted', interval: 60 },
    ]);
  }

  // 🔹 Handle Heartbeat (charger status updates)
  @SubscribeMessage('Heartbeat')
  handleHeartbeat(@MessageBody() data: any) {
    this.logger.log(`Heartbeat received: ${JSON.stringify(data)}`);
    return JSON.stringify([
      '3',
      'Heartbeat',
      { currentTime: new Date().toISOString() },
    ]);
  }

  // 🔹 Handle Remote Start Transaction
  @SubscribeMessage('RemoteStartTransaction')
  handleRemoteStart(@MessageBody() data: { idTag: string }) {
    this.logger.log(`Starting transaction for ID Tag: ${data.idTag}`);
    return JSON.stringify([
      '3',
      'RemoteStartTransaction',
      { status: 'Accepted' },
    ]);
  }

  // 🔹 Handle Remote Stop Transaction
  @SubscribeMessage('RemoteStopTransaction')
  handleRemoteStop(@MessageBody() data: { transactionId: string }) {
    this.logger.log(`Stopping transaction ID: ${data.transactionId}`);
    return JSON.stringify([
      '3',
      'RemoteStopTransaction',
      { status: 'Accepted' },
    ]);
  }

  // 🔹 Handle Meter Values (collecting charging data)
  @SubscribeMessage('MeterValues')
  handleMeterValues(@MessageBody() data: any) {
    this.logger.log(`MeterValues received: ${JSON.stringify(data)}`);
    return JSON.stringify(['3', 'MeterValues', {}]);
  }

  sendMessageToCharger(message: string) {
    this.clients.forEach((client) => client.send(message));
  }
}
