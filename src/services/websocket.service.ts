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
            data: { message: 'Invalid message format' },
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
          this.handleDisconnection(ws);
          return ws.terminate();
        }

        extWs.isAlive = false;
        ws.ping();
      });
    }, 30000);

    this.wss.on('close', () => {
      clearInterval(interval);
    });
  }

  private handleDisconnection(ws: WebSocket): void {
    const players = this.db.getAllPlayers();
    const disconnectedPlayer = players.find((player) => player.connection === ws);

    if (disconnectedPlayer) {
      const room = this.db.getRoomByPlayer(disconnectedPlayer.id);
      if (room) {
        this.db.removeRoom(room.roomId.toString());

        this.broadcastRoomsUpdate();
      }

      const game = this.db.getGameByPlayer(disconnectedPlayer.id);
      if (game && !game.isFinished) {
        const winner = game.players.find((player) => player.id !== disconnectedPlayer.id);
        if (winner) {
          game.isFinished = true;
          game.winnerId = winner.id;

          this.db.updateGame(game);

          const winnerPlayer = this.db.getPlayer(winner.id);
          if (winnerPlayer) {
            this.db.addWinner(winnerPlayer.name);

            this.sendToGame(game.id, {
              type: 'finish',
              data: {
                winPlayer: winner.id,
              },
              id: 0,
            });

            this.broadcastWinnersUpdate();
          }
        }
      }
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
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
      console.log(`Sent to client: ${JSON.stringify(message)}`);
    }
  }

  public sendToPlayer(playerId: string, message: Message): void {
    const player = this.db.getPlayer(playerId);
    if (player && player.connection) {
      this.sendToClient(player.connection, message);
    }
  }

  public sendToGame(gameId: string, message: Message): void {
    const game = this.db.getGame(gameId);
    if (game) {
      game.players.forEach((gamePlayer) => {
        const player = this.db.getPlayer(gamePlayer.id);
        if (player && player.connection) {
          this.sendToClient(player.connection, message);
        }
      });
    }
  }
  public broadcast(message: Message): void {
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        (client as ExtendedWebSocket).send(JSON.stringify(message));
      }
    });
    console.log(`Broadcasted: ${JSON.stringify(message)}`);
  }

  public broadcastRoomsUpdate(): void {
    const rooms = this.db.getAllRooms();
    const availableRooms = rooms.filter((room) => room.roomUsers.length === 1);

    this.broadcast({
      type: 'update_room',
      data: availableRooms,
      id: 0,
    });
  }

  public broadcastWinnersUpdate(): void {
    const winners = this.db.getWinners();

    this.broadcast({
      type: 'update_winners',
      data: winners,
      id: 0,
    });
  }
}

export default WebSocketService;
