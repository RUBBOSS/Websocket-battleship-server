import { WebSocket } from 'ws';
import { 
  Message, 
  RegData, 
  AddUserToRoomData, 
  AddShipsData,
  AttackData,
  RandomAttackData
} from '../models/interfaces.js';
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
    this.wss = null as unknown as WebSocketService;
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
    
    // Set up bot service
    this.botService.setWebSocketService(this.wss);
    this.botService.setGameService(this.gameService);
    
    // Start bot game monitoring
    this.botService.monitorGames();

    this.wss.on('message', (message: Message, connection: WebSocket) => {
      this.handleMessage(message, connection);
    });
  }


  private handleMessage(message: Message, connection: WebSocket): void {
    try {
      switch (message.type) {
        case 'reg':
          this.handleRegistration(message.data, connection);
          break;
        case 'create_room':
          this.handleCreateRoom(message, connection);
          break;
        case 'create_bot_game':
          this.handleCreateBotGame(connection);
          break;
        case 'add_user_to_room':
          this.handleAddUserToRoom(message.data, connection);
          break;
        case 'add_ships':
          this.handleAddShips(message.data);
          break;
        case 'attack':
          this.handleAttack(message.data);
          break;
        case 'randomAttack':
          this.handleRandomAttack(message.data);
          break;
        default:
          console.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('Error handling message:', error);
      this.wss.sendToClient(connection, {
        type: 'error',
        data: {
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        id: 0
      });
    }
  }


  private handleRegistration(data: RegData, connection: WebSocket): void {
    const response = this.playerService.registerPlayer(data, connection);
    
    this.wss.sendToClient(connection, {
      type: 'reg',
      data: response,
      id: 0
    });
    
    if (!response.error) {
      this.wss.broadcastRoomsUpdate();
      this.wss.broadcastWinnersUpdate();
    }
  }


  private handleCreateRoom(message: Message, connection: WebSocket): void {
    const players = this.playerService.getPlayers();
    const player = players.find(p => p.connection === connection);
    
    if (!player) {
      throw new Error('Player not found');
    }
    
    this.roomService.createRoom(player.id);
  }


  private handleCreateBotGame(connection: WebSocket): void {
    // Find the player by connection
    const players = this.playerService.getPlayers();
    const player = players.find(p => p.connection === connection);
    
    if (!player) {
      throw new Error('Player not found');
    }
    
    // Create a game with the bot
    const gameId = this.botService.createGameWithBot(player.id);
    
    // Send create_game message to the player
    this.wss.sendToPlayer(player.id, {
      type: 'create_game',
      data: {
        idGame: gameId,
        idPlayer: player.id
      },
      id: 0
    });
  }


  private handleAddUserToRoom(data: AddUserToRoomData, connection: WebSocket): void {
    // Find the player by connection
    const players = this.playerService.getPlayers();
    const player = players.find(p => p.connection === connection);
    
    if (!player) {
      throw new Error('Player not found');
    }
    
    this.roomService.addUserToRoom(player.id, data.indexRoom.toString());
  }


  private handleAddShips(data: AddShipsData): void {
    this.gameService.addShips(
      data.gameId.toString(),
      data.indexPlayer.toString(),
      data.ships
    );
  }


  private handleAttack(data: AttackData): void {
    this.gameService.attack(
      data.gameId.toString(),
      data.indexPlayer.toString(),
      data.x,
      data.y
    );
  }


  private handleRandomAttack(data: RandomAttackData): void {
    this.gameService.randomAttack(
      data.gameId.toString(),
      data.indexPlayer.toString()
    );
  }
}

export default MessageHandler;
