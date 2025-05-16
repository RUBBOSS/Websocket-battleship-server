
import { WebSocketServer, WebSocket } from 'ws';
import { Player, Message } from '../models/interfaces.js';
import DatabaseService from './database.service.js';

/**
 * WebSocket service for handling client connections and message passing
 */
class WebSocketService {
  private static instance: WebSocketService;
  private wss: WebSocketServer;
  private db: DatabaseService;

  private constructor(port: number) {
    this.db = DatabaseService.getInstance();
    this.wss = new WebSocketServer({ port });
    this.setupEventHandlers();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(port: number): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService(port);
    }
    return WebSocketService.instance;
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('New client connected');

      ws.on('message', (message: string) => {
        try {
          const parsedMessage: Message = JSON.parse(message.toString());
          console.log(`Received message: ${JSON.stringify(parsedMessage)}`);
          
          // The actual message handling will be added in the MessageHandler
          this.emit('message', parsedMessage, ws);
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      });

      ws.on('close', () => {
        console.log('Client disconnected');
        // Handle disconnection (remove from rooms, games, etc.)
        this.handleDisconnection(ws);
      });
    });

    this.wss.on('listening', () => {
      // Get the address info
      const address = this.wss.address();
      if (typeof address === 'object' && address !== null) {
        console.log(`WebSocket server is running on port ${address.port}`);
      } else {
        console.log('WebSocket server is running');
      }
    });
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(ws: WebSocket): void {
    // Find the player who disconnected
    const players = this.db.getAllPlayers();
    const disconnectedPlayer = players.find(player => player.connection === ws);

    if (disconnectedPlayer) {
      // Check if the player is in a room
      const room = this.db.getRoomByPlayer(disconnectedPlayer.id);
      if (room) {
        // Remove the room
        this.db.removeRoom(room.roomId.toString());
        
        // Notify other players about the room update
        this.broadcastRoomsUpdate();
      }

      // Check if the player is in a game
      const game = this.db.getGameByPlayer(disconnectedPlayer.id);
      if (game && !game.isFinished) {
        // Determine the winner (the other player)
        const winner = game.players.find(player => player.id !== disconnectedPlayer.id);
        if (winner) {
          // Mark the game as finished with the other player as winner
          game.isFinished = true;
          game.winnerId = winner.id;
          
          // Update the game
          this.db.updateGame(game);
          
          // Find the winner's player record to get the name
          const winnerPlayer = this.db.getPlayer(winner.id);
          if (winnerPlayer) {
            // Add win to the winner's record
            this.db.addWinner(winnerPlayer.name);
            
            // Notify about game finish
            this.sendToGame(game.id, {
              type: 'finish',
              data: {
                winPlayer: winner.id
              },
              id: 0
            });
            
            // Broadcast winners update
            this.broadcastWinnersUpdate();
          }
        }
      }
    }
  }

  /**
   * Custom event listeners
   */
  private eventListeners: Record<string, Function[]> = {};

  /**
   * Register event listener
   */
  public on(event: string, listener: Function): void {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(listener);
  }

  /**
   * Emit an event
   */
  private emit(event: string, ...args: any[]): void {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(listener => {
        listener(...args);
      });
    }
  }

  /**
   * Send a message to a specific client
   */
  public sendToClient(client: WebSocket, message: Message): void {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
      console.log(`Sent to client: ${JSON.stringify(message)}`);
    }
  }

  /**
   * Send a message to a specific player
   */
  public sendToPlayer(playerId: string, message: Message): void {
    const player = this.db.getPlayer(playerId);
    if (player && player.connection) {
      this.sendToClient(player.connection, message);
    }
  }

  /**
   * Send a message to all players in a game
   */
  public sendToGame(gameId: string, message: Message): void {
    const game = this.db.getGame(gameId);
    if (game) {
      game.players.forEach(gamePlayer => {
        const player = this.db.getPlayer(gamePlayer.id);
        if (player && player.connection) {
          this.sendToClient(player.connection, message);
        }
      });
    }
  }

  /**
   * Broadcast a message to all connected clients
   */
  public broadcast(message: Message): void {
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
    console.log(`Broadcasted: ${JSON.stringify(message)}`);
  }

  /**
   * Broadcast room updates to all clients
   */
  public broadcastRoomsUpdate(): void {
    const rooms = this.db.getAllRooms();
    const availableRooms = rooms.filter(room => room.roomUsers.length === 1);
    
    this.broadcast({
      type: 'update_room',
      data: availableRooms,
      id: 0
    });
  }

  /**
   * Broadcast winners update to all clients
   */
  public broadcastWinnersUpdate(): void {
    const winners = this.db.getWinners();
    
    this.broadcast({
      type: 'update_winners',
      data: winners,
      id: 0
    });
  }
}

export default WebSocketService;
