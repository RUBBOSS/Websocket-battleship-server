import {
  Message,
  RegData,
  AddUserToRoomData,
  AddShipsData,
  AttackData,
  RandomAttackData,
} from '../models/interfaces.js';
import { ExtendedWebSocket } from '../models/websocket.js';
import PlayerService from '../services/player.service.js';
import RoomService from '../services/room.service.js';
import GameService from '../services/game.service.js';
import WebSocketService from '../services/websocket.service.js';
import BotService from '../services/bot.service.js';

class MessageHandler {
  private static instance: MessageHandler;
  private playerService: PlayerService;
  private roomService: RoomService;
  private gameService: GameService;
  private botService: BotService;
  private wss: WebSocketService;
  private constructor() {
    this.playerService = PlayerService.getInstance();
    this.roomService = RoomService.getInstance();
    this.gameService = GameService.getInstance();
    this.botService = BotService.getInstance();
    this.wss = null!;
  }

  public static getInstance(): MessageHandler {
    if (!MessageHandler.instance) {
      MessageHandler.instance = new MessageHandler();
    }
    return MessageHandler.instance;
  }

  public setWebSocketService(wss: WebSocketService): void {
    this.wss = wss;
  }

  public initialize(): void {
    this.playerService.setWebSocketService(this.wss);
    this.roomService.setWebSocketService(this.wss);
    this.roomService.setGameService(this.gameService);
    this.gameService.setWebSocketService(this.wss);
    this.gameService.setPlayerService(this.playerService);
    this.botService.setWebSocketService(this.wss);
    this.botService.setGameService(this.gameService);
    this.botService.monitorGames();

    this.wss.onMessage((message: Message, connection: ExtendedWebSocket) => {
      this.handleMessage(message, connection);
    });
  }

  private handleMessage(message: Message, connection: ExtendedWebSocket): void {
    try {
      console.log(`Processing message type: ${message.type}`);
      switch (message.type) {
        case 'reg':
          this.handleRegistration(this.parseData<RegData>(message.data), connection);
          break;
        case 'create_room':
          this.handleCreateRoom(message, connection);
          break;
        case 'create_bot_game':
        case 'single_play':
          this.handleCreateBotGame(connection);
          break;
        case 'add_user_to_room':
          this.handleAddUserToRoom(this.parseData<AddUserToRoomData>(message.data), connection);
          break;
        case 'add_ships':
          this.handleAddShips(this.parseData<AddShipsData>(message.data));
          break;
        case 'attack':
          this.handleAttack(this.parseData<AttackData>(message.data));
          break;
        case 'randomAttack':
          this.handleRandomAttack(this.parseData<RandomAttackData>(message.data));
          break;
        default:
          console.warn(`Unknown message type: ${message.type}`);
          this.wss.sendToClient(connection, {
            type: 'error',
            data: JSON.stringify({ message: `Unknown message type: ${message.type}` }),
            id: 0,
          });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      this.wss.sendToClient(connection, {
        type: 'error',
        data: JSON.stringify({
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
        id: 0,
      });
    }
  }

  private parseData<T>(data: unknown): T {
    if (typeof data === 'string') {
      try {
        return JSON.parse(data) as T;
      } catch (error) {
        console.error('Error parsing JSON data:', error);
        throw new Error('Invalid JSON data format');
      }
    }
    return data as T;
  }
  private handleRegistration(data: RegData, connection: ExtendedWebSocket): void {
    if (!data.name || typeof data.name !== 'string') {
      throw new Error('Invalid player name');
    }
    const nameRegex = /^[a-zA-Z0-9_\-.]{3,20}$/;
    if (!nameRegex.test(data.name)) {
      throw new Error(
        'Player name must be 3-20 characters and contain only letters, numbers, underscores, hyphens, and dots',
      );
    }

    if (!data.password || typeof data.password !== 'string') {
      throw new Error('Invalid password');
    }

    if (data.password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    console.log(`Registering player: ${data.name}`);
    const response = this.playerService.registerPlayer(data, connection);

    this.wss.sendToClient(connection, {
      type: 'reg',
      data: JSON.stringify(response),
      id: 0,
    });

    if (!response.error) {
      this.wss.broadcastRoomsUpdate();
      this.wss.broadcastWinnersUpdate();
    }
  }

  private handleCreateRoom(message: Message, connection: ExtendedWebSocket): void {
    const players = this.playerService.getPlayers();
    const player = players.find((p) => p.connection === connection);

    if (!player) {
      console.error('Player not found when creating room');
      throw new Error('Player not found');
    }

    console.log(`Creating room for player: ${player.name}`);
    this.roomService.createRoom(player.id);
  }

  private handleCreateBotGame(connection: ExtendedWebSocket): void {
    const players = this.playerService.getPlayers();
    const player = players.find((p) => p.connection === connection);

    if (!player) {
      console.error('Player not found when creating bot game');
      throw new Error('Player not found');
    }

    console.log(`Creating bot game for player: ${player.name}`);
    const gameId = this.botService.createGameWithBot(player.id);

    this.wss.sendToPlayer(player.id, {
      type: 'create_game',
      data: JSON.stringify({
        idGame: gameId,
        idPlayer: player.id,
      }),
      id: 0,
    });
  }

  private handleAddUserToRoom(data: AddUserToRoomData, connection: ExtendedWebSocket): void {
    const players = this.playerService.getPlayers();
    const player = players.find((p) => p.connection === connection);

    if (!player) {
      console.error('Player not found when joining room');
      throw new Error('Player not found');
    }

    if (!data.indexRoom) {
      console.error('Room index is missing');
      throw new Error('Room index is required');
    }

    console.log(`Player ${player.name} joining room: ${data.indexRoom}`);
    this.roomService.addUserToRoom(player.id, String(data.indexRoom));
  }

  private handleAddShips(data: AddShipsData): void {
    if (!data.gameId || !data.indexPlayer || !Array.isArray(data.ships)) {
      console.error('Invalid ship data', data);
      throw new Error('Invalid ship data');
    }

    console.log(`Adding ships for player ${data.indexPlayer} in game ${data.gameId}`);
    this.gameService.addShips(data.gameId.toString(), data.indexPlayer.toString(), data.ships);
  }

  private handleAttack(data: AttackData): void {
    if (
      !data.gameId ||
      !data.indexPlayer ||
      typeof data.x !== 'number' ||
      typeof data.y !== 'number'
    ) {
      console.error('Invalid attack data', data);
      throw new Error('Invalid attack data');
    }

    console.log(
      `Attack at (${data.x},${data.y}) from player ${data.indexPlayer} in game ${data.gameId}`,
    );
    this.gameService.attack(data.gameId.toString(), data.indexPlayer.toString(), data.x, data.y);
  }

  private handleRandomAttack(data: RandomAttackData): void {
    if (!data.gameId || !data.indexPlayer) {
      console.error('Invalid random attack data', data);
      throw new Error('Invalid random attack data');
    }

    console.log(`Random attack from player ${data.indexPlayer} in game ${data.gameId}`);
    this.gameService.randomAttack(data.gameId.toString(), data.indexPlayer.toString());
  }
}

export default MessageHandler;
