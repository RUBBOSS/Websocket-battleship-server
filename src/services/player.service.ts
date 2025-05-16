
import { v4 as uuidv4 } from 'uuid';
import { WebSocket } from 'ws';
import { Player, RegData, RegResponse } from '../models/interfaces.js';
import DatabaseService from './database.service.js';
import WebSocketService from './websocket.service.js';

/**
 * Player service for user registration and authentication
 */
class PlayerService {
  private static instance: PlayerService;
  private db: DatabaseService;
  private wss: WebSocketService;

  private constructor() {
    this.db = DatabaseService.getInstance();
    // WebSocketService will be set later to avoid circular dependency
    this.wss = null as unknown as WebSocketService;
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): PlayerService {
    if (!PlayerService.instance) {
      PlayerService.instance = new PlayerService();
    }
    return PlayerService.instance;
  }

  /**
   * Set WebSocket service reference
   */
  public setWebSocketService(wss: WebSocketService): void {
    this.wss = wss;
  }

  /**
   * Register or login a player
   */
  public registerPlayer(data: RegData, connection: WebSocket): RegResponse {
    // Check if the player already exists
    const existingPlayer = this.db.getPlayerByName(data.name);
    
    if (existingPlayer) {
      // Login logic
      if (existingPlayer.password === data.password) {
        // Update the connection
        existingPlayer.connection = connection;
        this.db.addPlayer(existingPlayer);
        
        return {
          name: existingPlayer.name,
          index: existingPlayer.id,
          error: false,
          errorText: ''
        };
      } else {
        // Incorrect password
        return {
          name: data.name,
          index: '',
          error: true,
          errorText: 'Incorrect password'
        };
      }
    } else {
      // Registration logic
      const newPlayerId = uuidv4();
      const newPlayer: Player = {
        id: newPlayerId,
        name: data.name,
        password: data.password,
        connection,
        wins: 0
      };
      
      this.db.addPlayer(newPlayer);
      
      return {
        name: newPlayer.name,
        index: newPlayer.id,
        error: false,
        errorText: ''
      };
    }
  }

  /**
   * Get player by ID
   */
  public getPlayer(id: string): Player | undefined {
    return this.db.getPlayer(id);
  }

  /**
   * Get player by name
   */
  public getPlayerByName(name: string): Player | undefined {
    return this.db.getPlayerByName(name);
  }

  /**
   * Update winners information and broadcast to all clients
   */
  public updateWinners(playerId: string): void {
    const player = this.db.getPlayer(playerId);
    if (player) {
      this.db.addWinner(player.name);
      this.wss.broadcastWinnersUpdate();
    }
  }
}

export default PlayerService;
