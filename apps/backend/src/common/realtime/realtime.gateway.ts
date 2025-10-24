import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('RealtimeGateway');

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // POS Events
  @SubscribeMessage('join-pos')
  handleJoinPos(@ConnectedSocket() client: Socket, @MessageBody() data: { tableId: string }) {
    client.join(`pos-${data.tableId}`);
    this.logger.log(`Client ${client.id} joined POS for table ${data.tableId}`);
  }

  @SubscribeMessage('leave-pos')
  handleLeavePos(@ConnectedSocket() client: Socket, @MessageBody() data: { tableId: string }) {
    client.leave(`pos-${data.tableId}`);
    this.logger.log(`Client ${client.id} left POS for table ${data.tableId}`);
  }

  // Kitchen Events
  @SubscribeMessage('join-kitchen')
  handleJoinKitchen(@ConnectedSocket() client: Socket) {
    client.join('kitchen');
    this.logger.log(`Client ${client.id} joined kitchen`);
  }

  @SubscribeMessage('leave-kitchen')
  handleLeaveKitchen(@ConnectedSocket() client: Socket) {
    client.leave('kitchen');
    this.logger.log(`Client ${client.id} left kitchen`);
  }

  // Order Events
  emitOrderCreated(order: any) {
    this.server.emit('order-created', order);
    this.server.to('kitchen').emit('kitchen-order-created', order);
  }

  emitOrderUpdated(order: any) {
    this.server.emit('order-updated', order);
    this.server.to('kitchen').emit('kitchen-order-updated', order);
  }

  emitOrderStatusChanged(orderId: string, status: string) {
    this.server.emit('order-status-changed', { orderId, status });
    this.server.to('kitchen').emit('kitchen-order-status-changed', { orderId, status });
  }

  // Table Events
  emitTableStatusChanged(tableId: string, status: string) {
    this.server.emit('table-status-changed', { tableId, status });
  }

  // Payment Events
  emitPaymentProcessed(payment: any) {
    this.server.emit('payment-processed', payment);
  }

  // Inventory Events
  emitLowStock(ingredient: any) {
    this.server.emit('low-stock-alert', ingredient);
  }

  emitStockUpdated(ingredient: any) {
    this.server.emit('stock-updated', ingredient);
  }
}
