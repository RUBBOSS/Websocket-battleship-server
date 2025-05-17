// Server-side fix script for handling WebSocket connections and room management issues
import WebSocketService from '../services/websocket.service.js';
import DatabaseService from '../services/database.service.js';
import { Room, Player } from '../models/interfaces.js';
import { WebSocket } from 'ws';

class ServerFix {
  private static instance: ServerFix;
  private wss: WebSocketService;
  private db: DatabaseService;

  private constructor() {
    this.db = DatabaseService.getInstance();
    // WebSocketService will be set later
    this.wss = null!;
  }

  public static getInstance(): ServerFix {
    if (!ServerFix.instance) {
      ServerFix.instance = new ServerFix();
    }
    return ServerFix.instance;
  }

  public setWebSocketService(wss: WebSocketService): void {
    this.wss = wss;
  }

  public initialize(): void {
    console.log('Initializing server-side fixes');

    // Apply the fixes
    this.setupRoomCleanup();
    // orphaned cleanup disabled; game end driven by game logic

    console.log('Server-side fixes initialized');
  }

  private setupRoomCleanup(): void {
    // Clean up stale rooms periodically
    setInterval(() => {
      try {
        const rooms = this.db.getAllRooms();
        const players = this.db.getAllPlayers();

        // Find rooms with disconnected players
        rooms.forEach((room: Room) => {
          const hasDisconnectedPlayers = room.roomUsers.some((user) => {
            const player = players.find((p: Player) => p.id === user.index);
            return !player || !player.connection || player.connection.readyState !== WebSocket.OPEN;
          });

          if (hasDisconnectedPlayers) {
            console.log(`Cleaning up room ${room.roomId} with disconnected players`);
            this.db.removeRoom(room.roomId.toString());
          }
        });

        this.wss.broadcastRoomsUpdate();
      } catch (error) {
        console.error('Error in room cleanup:', error);
      }
    }, 60000); // Check every minute
  }
}

export default ServerFix;
