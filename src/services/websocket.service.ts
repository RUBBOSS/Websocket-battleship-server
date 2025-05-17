import { WebSocketServer, WebSocket } from 'ws';
import { Message } from '../models/interfaces.js';
import DatabaseService from './database.service.js';
import { ExtendedWebSocket } from '../models/websocket.js';

class WebSocketService {
  private static instance: WebSocketService;
  private wss: WebSocketServer;
  private db: DatabaseService;

  private constructor(port: number) {
    this.db = DatabaseService.getInstance();
    this.wss = new WebSocketServer({ port });
    this.setupEventHandlers();
  }

  public static getInstance(port: number): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService(port);
    }
    return WebSocketService.instance;
  }

  private setupEventHandlers(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('New client connected');

      const extWs = ws as ExtendedWebSocket;
      extWs.isAlive = true;

      ws.on('pong', () => {
        (ws as ExtendedWebSocket).isAlive = true;
      });
      ws.on('message', (message: string) => {
        try {
          const parsedMessage: Message = JSON.parse(message.toString());
          console.log(`Received message: ${JSON.stringify(parsedMessage)}`);

          this.emit('message', parsedMessage, ws as ExtendedWebSocket);
        } catch (error) {
          console.error('Error parsing message:', error);
          this.sendToClient(ws as ExtendedWebSocket, {
            type: 'error',
            data: JSON.stringify({ message: 'Invalid message format' }),
            id: 0,
          });
        }
      });

      ws.on('close', () => {
        console.log('Client disconnected');
        this.handleDisconnection(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.handleDisconnection(ws);
      });

      (ws as ExtendedWebSocket).isAlive = true;
    });

    this.wss.on('listening', () => {
      const address = this.wss.address();
      if (typeof address === 'object' && address !== null) {
        console.log(`WebSocket server is running on port ${address.port}`);
      } else {
        console.log('WebSocket server is running');
      }
    });

    this.setupHeartbeat();
  }

  private setupHeartbeat(): void {
    const interval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        const extWs = ws as ExtendedWebSocket;
        if (extWs.isAlive === false) {
          console.log('Terminating inactive connection');
          this.handleDisconnection(ws);
          return ws.terminate();
        }

        extWs.isAlive = false;
        try {
          ws.ping();
        } catch (error) {
          console.error('Error sending ping:', error);
          this.handleDisconnection(ws);
          ws.terminate();
        }
      });
    }, 15000);

    this.wss.on('close', () => {
      clearInterval(interval);
    });
  }

  private handleDisconnection(ws: WebSocket): void {
    try {
      const players = this.db.getAllPlayers();
      const disconnectedPlayer = players.find((player) => player.connection === ws);

      if (disconnectedPlayer) {
        console.log(`Player ${disconnectedPlayer.name} disconnected`);

        // Check for room and handle cleanup
        const room = this.db.getRoomByPlayer(disconnectedPlayer.id);
        if (room) {
          console.log(`Removing room ${room.roomId} due to player disconnect`);
          this.db.removeRoom(room.roomId.toString());

          // Notify other players in the room
          room.roomUsers.forEach((user) => {
            if (user.index !== disconnectedPlayer.id) {
              const otherPlayer = this.db.getPlayer(user.index.toString());
              if (otherPlayer && otherPlayer.connection) {
                this.sendToClient(otherPlayer.connection, {
                  type: 'error',
                  data: JSON.stringify({ message: 'Other player disconnected' }),
                  id: 0,
                });
              }
            }
          });

          this.broadcastRoomsUpdate();
        }
      }
    } catch (error) {
      console.error('Error handling disconnection:', error);
    }
  }

  private eventListeners: Record<string, Array<(...args: unknown[]) => void>> = {};
  private messageListeners: Array<(message: Message, ws: ExtendedWebSocket) => void> = [];

  public on(event: string, listener: (...args: unknown[]) => void): void {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(listener);

    if (event === 'message' && typeof listener === 'function') {
      this.messageListeners.push(listener as (message: Message, ws: ExtendedWebSocket) => void);
    }
  }

  public onMessage(listener: (message: Message, ws: ExtendedWebSocket) => void): void {
    this.messageListeners.push(listener);
  }

  private emit(event: string, ...args: unknown[]): void {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach((listener) => {
        listener(...args);
      });
    }

    if (
      event === 'message' &&
      args.length >= 2 &&
      typeof args[0] === 'object' &&
      args[0] !== null &&
      args[1] instanceof WebSocket
    ) {
      const message = args[0] as Message;
      const ws = args[1] as ExtendedWebSocket;

      this.messageListeners.forEach((listener) => {
        listener(message, ws);
      });
    }
  }

  public sendToClient(client: ExtendedWebSocket, message: Message): void {
    try {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
        console.log(`Sent to client: ${JSON.stringify(message)}`);
      } else {
        console.warn('Cannot send message, connection not open');
      }
    } catch (error) {
      console.error('Error sending message to client:', error);
    }
  }

  public sendToPlayer(playerId: string, message: Message): void {
    try {
      const player = this.db.getPlayer(playerId);
      if (player && player.connection) {
        this.sendToClient(player.connection, message);
      } else {
        console.warn(
          `Cannot send message to player ${playerId}, player not found or not connected`,
        );
      }
    } catch (error) {
      console.error(`Error sending message to player ${playerId}:`, error);
    }
  }

  public sendToGame(gameId: string, message: Message): void {
    try {
      const game = this.db.getGame(gameId);
      if (game) {
        game.players.forEach((gamePlayer) => {
          const player = this.db.getPlayer(gamePlayer.id);
          if (player && player.connection) {
            this.sendToClient(player.connection, message);
          }
        });
      } else {
        console.warn(`Cannot send message to game ${gameId}, game not found`);
      }
    } catch (error) {
      console.error(`Error sending message to game ${gameId}:`, error);
    }
  }

  public broadcast(message: Message): void {
    try {
      this.wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          (client as ExtendedWebSocket).send(JSON.stringify(message));
        }
      });
      console.log(`Broadcasted: ${JSON.stringify(message)}`);
    } catch (error) {
      console.error('Error broadcasting message:', error);
    }
  }

  public broadcastRoomsUpdate(): void {
    try {
      const rooms = this.db.getAllRooms();
      const availableRooms = rooms.filter((room) => room.roomUsers.length < 2);

      this.broadcast({
        type: 'update_room',
        data: JSON.stringify(availableRooms),
        id: 0,
      });
    } catch (error) {
      console.error('Error broadcasting rooms update:', error);
    }
  }

  public broadcastWinnersUpdate(): void {
    try {
      const winners = this.db.getWinners();

      this.broadcast({
        type: 'update_winners',
        data: JSON.stringify(winners),
        id: 0,
      });
    } catch (error) {
      console.error('Error broadcasting winners update:', error);
    }
  }
}

export default WebSocketService;
