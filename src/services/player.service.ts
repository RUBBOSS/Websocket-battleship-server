import { v4 as uuidv4 } from 'uuid';
import { WebSocket } from 'ws';
import { Player, RegData, RegResponse } from '../models/interfaces.js';
import DatabaseService from './database.service.js';
import WebSocketService from './websocket.service.js';


class PlayerService {
  private static instance: PlayerService;
  private db: DatabaseService;
  private wss: WebSocketService;

  private constructor() {
    this.db = DatabaseService.getInstance();
    this.wss = null as unknown as WebSocketService;
  }


  public static getInstance(): PlayerService {
    if (!PlayerService.instance) {
      PlayerService.instance = new PlayerService();
    }
    return PlayerService.instance;
  }

  public setWebSocketService(wss: WebSocketService): void {
    this.wss = wss;
  }


  public registerPlayer(data: RegData, connection: WebSocket): RegResponse {
    const existingPlayer = this.db.getPlayerByName(data.name);
    
    if (existingPlayer) {
      if (existingPlayer.password === data.password) {
        existingPlayer.connection = connection;
        this.db.addPlayer(existingPlayer);
        
        return {
          name: existingPlayer.name,
          index: existingPlayer.id,
          error: false,
          errorText: ''
        };
      } else {
        return {
          name: data.name,
          index: '',
          error: true,
          errorText: 'Incorrect password'
        };
      }
    } else {
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


  public getPlayer(id: string): Player | undefined {
    return this.db.getPlayer(id);
  }


  public getPlayerByName(name: string): Player | undefined {
    return this.db.getPlayerByName(name);
  }

  /**
   * Get all players
   */
  public getPlayers(): Player[] {
    return this.db.getAllPlayers();
  }

  public updateWinners(playerId: string): void {
    const player = this.db.getPlayer(playerId);
    if (player) {
      this.db.addWinner(player.name);
      this.wss.broadcastWinnersUpdate();
    }
  }
}

export default PlayerService;
