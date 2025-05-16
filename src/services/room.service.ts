
import { v4 as uuidv4 } from 'uuid';
import { Room, RoomUser, CreateGameResponse } from '../models/interfaces.js';
import DatabaseService from './database.service.js';
import GameService from './game.service.js';
import WebSocketService from './websocket.service.js';

/**
 * Room service for managing game rooms
 */
class RoomService {
  private static instance: RoomService;
  private db: DatabaseService;
  private wss: WebSocketService;
  private gameService: GameService;

  private constructor() {
    this.db = DatabaseService.getInstance();
    // These services will be set later to avoid circular dependency
    this.wss = null as unknown as WebSocketService;
    this.gameService = null as unknown as GameService;
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): RoomService {
    if (!RoomService.instance) {
      RoomService.instance = new RoomService();
    }
    return RoomService.instance;
  }

  /**
   * Set WebSocket service reference
   */
  public setWebSocketService(wss: WebSocketService): void {
    this.wss = wss;
  }

  /**
   * Set Game service reference
   */
  public setGameService(gameService: GameService): void {
    this.gameService = gameService;
  }

  /**
   * Create a new room
   */
  public createRoom(playerId: string): Room {
    const roomId = uuidv4();
    const player = this.db.getPlayer(playerId);
    
    if (!player) {
      throw new Error('Player not found');
    }
    
    const roomUser: RoomUser = {
      name: player.name,
      index: player.id
    };
    
    const room: Room = {
      roomId,
      roomUsers: [roomUser]
    };
    
    // Save the room
    this.db.addRoom(room);
    
    // Broadcast room update to all clients
    this.wss.broadcastRoomsUpdate();
    
    return room;
  }

  /**
   * Add a player to a room
   */
  public addUserToRoom(playerId: string, roomId: string): CreateGameResponse {
    const room = this.db.getRoom(roomId);
    const player = this.db.getPlayer(playerId);
    
    if (!room) {
      throw new Error('Room not found');
    }
    
    if (!player) {
      throw new Error('Player not found');
    }
    
    // Check if the room already has 2 players
    if (room.roomUsers.length >= 2) {
      throw new Error('Room is full');
    }
    
    // Add the player to the room
    const roomUser: RoomUser = {
      name: player.name,
      index: player.id
    };
    
    room.roomUsers.push(roomUser);
    
    // Update the room
    this.db.addRoom(room);
    
    // Create a new game when 2 players are in the room
    if (room.roomUsers.length === 2) {
      const gameId = this.gameService.createGame(
        room.roomUsers[0].index.toString(),
        room.roomUsers[1].index.toString()
      );
      
      // Remove the room from available rooms
      this.wss.broadcastRoomsUpdate();
      
      // Send create_game message to both players
      const createGameResponse1: CreateGameResponse = {
        idGame: gameId,
        idPlayer: room.roomUsers[0].index.toString()
      };
      
      const createGameResponse2: CreateGameResponse = {
        idGame: gameId,
        idPlayer: room.roomUsers[1].index.toString()
      };
      
      this.wss.sendToPlayer(room.roomUsers[0].index.toString(), {
        type: 'create_game',
        data: createGameResponse1,
        id: 0
      });
      
      this.wss.sendToPlayer(room.roomUsers[1].index.toString(), {
        type: 'create_game',
        data: createGameResponse2,
        id: 0
      });
      
      return createGameResponse1;
    }
    
    // Broadcast room update to all clients
    this.wss.broadcastRoomsUpdate();
    
    // Return empty response since the game hasn't started yet
    return {
      idGame: '',
      idPlayer: ''
    };
  }

  /**
   * Get all available rooms (with only one player)
   */
  public getAvailableRooms(): Room[] {
    const rooms = this.db.getAllRooms();
    return rooms.filter(room => room.roomUsers.length === 1);
  }

  /**
   * Get a room by ID
   */
  public getRoom(roomId: string): Room | undefined {
    return this.db.getRoom(roomId);
  }

  /**
   * Get room by player ID
   */
  public getRoomByPlayer(playerId: string): Room | undefined {
    return this.db.getRoomByPlayer(playerId);
  }
}

export default RoomService;
