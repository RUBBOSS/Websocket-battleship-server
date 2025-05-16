
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

/**
 * Message Handler Controller for processing WebSocket messages
 */
class MessageHandler {
  private static instance: MessageHandler;
  private playerService: PlayerService;
  private roomService: RoomService;
  private gameService: GameService;
  private wss: WebSocketService;

  private constructor() {
    this.playerService = PlayerService.getInstance();
    this.roomService = RoomService.getInstance();
    this.gameService = GameService.getInstance();
    // WebSocketService will be set later
    this.wss = null as unknown as WebSocketService;
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): MessageHandler {
    if (!MessageHandler.instance) {
      MessageHandler.instance = new MessageHandler();
    }
    return MessageHandler.instance;
  }

  /**
   * Set WebSocket service reference
   */
  public setWebSocketService(wss: WebSocketService): void {
    this.wss = wss;
  }

  /**
   * Initialize handlers
   */
  public initialize(): void {
    // Set service references to avoid circular dependencies
    this.playerService.setWebSocketService(this.wss);
    this.roomService.setWebSocketService(this.wss);
    this.roomService.setGameService(this.gameService);
    this.gameService.setWebSocketService(this.wss);
    this.gameService.setPlayerService(this.playerService);

    // Listen for WebSocket messages
    this.wss.on('message', (message: Message, connection: WebSocket) => {
      this.handleMessage(message, connection);
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: Message, connection: WebSocket): void {
    try {
      switch (message.type) {
        case 'reg':
          this.handleRegistration(message.data, connection);
          break;
        case 'create_room':
          this.handleCreateRoom(message, connection);
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
      // Notify the client about the error
      this.wss.sendToClient(connection, {
        type: 'error',
        data: {
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        id: 0
      });
    }
  }

  /**
   * Handle player registration
   */
  private handleRegistration(data: RegData, connection: WebSocket): void {
    const response = this.playerService.registerPlayer(data, connection);
    
    // Send registration response to the client
    this.wss.sendToClient(connection, {
      type: 'reg',
      data: response,
      id: 0
    });
    
    // If registration is successful, broadcast room and winners updates
    if (!response.error) {
      this.wss.broadcastRoomsUpdate();
      this.wss.broadcastWinnersUpdate();
    }
  }

  /**
   * Handle room creation
   */
  private handleCreateRoom(message: Message, connection: WebSocket): void {
    // Find the player by connection
    const players = this.playerService.getPlayers();
    const player = players.find(p => p.connection === connection);
    
    if (!player) {
      throw new Error('Player not found');
    }
    
    // Create a new room
    this.roomService.createRoom(player.id);
  }

  /**
   * Handle adding user to room
   */
  private handleAddUserToRoom(data: AddUserToRoomData, connection: WebSocket): void {
    // Find the player by connection
    const players = this.playerService.getPlayers();
    const player = players.find(p => p.connection === connection);
    
    if (!player) {
      throw new Error('Player not found');
    }
    
    // Add the player to the room
    this.roomService.addUserToRoom(player.id, data.indexRoom.toString());
  }

  /**
   * Handle adding ships
   */
  private handleAddShips(data: AddShipsData): void {
    this.gameService.addShips(
      data.gameId.toString(),
      data.indexPlayer.toString(),
      data.ships
    );
  }

  /**
   * Handle attack
   */
  private handleAttack(data: AttackData): void {
    this.gameService.attack(
      data.gameId.toString(),
      data.indexPlayer.toString(),
      data.x,
      data.y
    );
  }

  /**
   * Handle random attack
   */
  private handleRandomAttack(data: RandomAttackData): void {
    this.gameService.randomAttack(
      data.gameId.toString(),
      data.indexPlayer.toString()
    );
  }
}

export default MessageHandler;
