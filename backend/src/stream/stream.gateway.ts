import {
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { StreamBus, StreamEvent } from './stream.bus.js';

@WebSocketGateway({
  path: '/stream',
  cors: { origin: '*' },
})
export class StreamGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(StreamGateway.name);

  constructor(private readonly bus: StreamBus) {
    bus.subscribe((event: StreamEvent) => this.broadcast(event));
  }

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(@MessageBody() body: { event: string }): void {
    this.logger.debug(`Subscribe requested: ${body?.event}`);
  }

  private broadcast(event: StreamEvent): void {
    this.server.emit('message', event);
  }
}