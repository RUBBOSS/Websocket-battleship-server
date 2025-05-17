import { Room, RoomUser, CreateGameResponse } from '../models/interfaces.js';
import DatabaseService from './database.service.js';
import GameService from './game.service.js';
import WebSocketService from './websocket.service.js';
import { generateUUID } from '../utils/uuid.js';

class RoomService {
  private static instance: RoomService;
  private db: DatabaseService;
  private wss: WebSocketService;
  private gameService: GameService;
  private constructor() {
    this.db = DatabaseService.getInstance();
    this.wss = null!;
    this.gameService = null!;
  }

  public static getInstance(): RoomService {
    if (!RoomService.instance) {
      RoomService.instance = new RoomService();
    }
    return RoomService.instance;
  }

  public setWebSocketService(wss: WebSocketService): void {
    this.wss = wss;
  }

  public setGameService(gameService: GameService): void {
    this.gameService = gameService;
  }

  public createRoom(playerId: string): Room {
    const roomId = generateUUID();
    const player = this.db.getPlayer(playerId);

    if (!player) {
      console.error(`Player not found with ID: ${playerId}`);
      throw new Error('Player not found');
    }

    const roomUser: RoomUser = {
      name: player.name,
      index: player.id,
    };

    const room: Room = {
      roomId,
      roomUsers: [roomUser],
    };

    this.db.addRoom(room);
    console.log(`Room created with ID: ${roomId}, player: ${player.name}`);

    this.wss.broadcastRoomsUpdate();

    return room;
  }

  public addUserToRoom(playerId: string, roomId: string): CreateGameResponse {
    // Ensure we're working with string IDs consistently
    const normalizedRoomId = String(roomId);
    const room = this.db.getRoom(normalizedRoomId);
    const player = this.db.getPlayer(playerId);

    if (!room) {
      console.error(`Room not found with ID: ${normalizedRoomId}`);
      throw new Error('Room not found');
    }

    if (!player) {
      console.error(`Player not found with ID: ${playerId}`);
      throw new Error('Player not found');
    }

    if (room.roomUsers.length >= 2) {
      console.warn(`Room ${normalizedRoomId} is full`);
      throw new Error('Room is full');
    }

    // Check if player is already in the room
    if (room.roomUsers.some((user) => user.index === player.id)) {
      console.warn(`Player ${player.name} already in room ${normalizedRoomId}`);
      throw new Error('Player already in room');
    }

    const roomUser: RoomUser = {
      name: player.name,
      index: player.id,
    };

    room.roomUsers.push(roomUser);
    console.log(`Player ${player.name} joined room ${normalizedRoomId}`);

    this.db.addRoom(room);

    if (room.roomUsers.length === 2) {
      console.log(`Room ${normalizedRoomId} is full, creating game`);
      const gameId = this.gameService.createGame(
        room.roomUsers[0].index.toString(),
        room.roomUsers[1].index.toString(),
      );

      this.wss.broadcastRoomsUpdate();

      const createGameResponse1: CreateGameResponse = {
        idGame: gameId,
        idPlayer: room.roomUsers[0].index.toString(),
      };

      const createGameResponse2: CreateGameResponse = {
        idGame: gameId,
        idPlayer: room.roomUsers[1].index.toString(),
      };

      this.wss.sendToPlayer(room.roomUsers[0].index.toString(), {
        type: 'create_game',
        data: JSON.stringify(createGameResponse1),
        id: 0,
      });

      this.wss.sendToPlayer(room.roomUsers[1].index.toString(), {
        type: 'create_game',
        data: JSON.stringify(createGameResponse2),
        id: 0,
      });

      return createGameResponse1;
    }

    this.wss.broadcastRoomsUpdate();

    return {
      idGame: '',
      idPlayer: '',
    };
  }

  public getAvailableRooms(): Room[] {
    const rooms = this.db.getAllRooms();
    return rooms.filter((room) => room.roomUsers.length < 2);
  }

  public getRoom(roomId: string): Room | undefined {
    return this.db.getRoom(roomId);
  }

  public getRoomByPlayer(playerId: string): Room | undefined {
    return this.db.getRoomByPlayer(playerId);
  }
}

export default RoomService;
