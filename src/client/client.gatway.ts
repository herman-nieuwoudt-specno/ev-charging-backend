import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';
import { Injectable, Logger } from '@nestjs/common';

@WebSocketGateway({
  path: '/ws/client',
  cors: { origin: '*', methods: ['GET', 'POST'] },
})
@Injectable()
export class ClientGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private logger = new Logger(ClientGateway.name);
  private clients = new Set<WebSocket>();

  @WebSocketServer()
  server: Server;

  handleConnection(client: WebSocket) {
    this.logger.log(`🧑‍💻 Frontend connected`);
    this.clients.add(client);

    client.on('close', () => {
      this.logger.warn(`👋 Frontend disconnected`);
      this.clients.delete(client);
    });
  }

  handleDisconnect(client: WebSocket) {
    this.clients.delete(client);
  }

  broadcast(type: string, payload: any) {
    const msg = JSON.stringify({ type, payload });
    for (const client of this.clients) {
      if (client.readyState === client.OPEN) {
        client.send(msg);
      }
    }
  }
}
