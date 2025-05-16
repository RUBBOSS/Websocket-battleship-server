
import { v4 as uuidv4 } from 'uuid';
import { 
  Game, 
  GamePlayer, 
  Ship, 
  Position, 
  AttackResponse,
  StartGameData
} from '../models/interfaces.js';
import DatabaseService from './database.service.js';
import WebSocketService from './websocket.service.js';
import PlayerService from './player.service.js';


class GameService {
  private static instance: GameService;
  private db: DatabaseService;
  private wss: WebSocketService;
  private playerService: PlayerService;

  private constructor() {
    this.db = DatabaseService.getInstance();
    this.wss = null as unknown as WebSocketService;
    this.playerService = null as unknown as PlayerService;
  }


  public static getInstance(): GameService {
    if (!GameService.instance) {
      GameService.instance = new GameService();
    }
    return GameService.instance;
  }


  public setWebSocketService(wss: WebSocketService): void {
    this.wss = wss;
  }


  public setPlayerService(playerService: PlayerService): void {
    this.playerService = playerService;
  }


  public createGame(player1Id: string, player2Id: string): string {
    const gameId = uuidv4();
    
    const player1: GamePlayer = {
      id: player1Id,
      gameId,
      ships: [],
      shotCells: [],
      killedShips: []
    };
    
    const player2: GamePlayer = {
      id: player2Id,
      gameId,
      ships: [],
      shotCells: [],
      killedShips: []
    };
    
    const game: Game = {
      id: gameId,
      players: [player1, player2],
      currentPlayerIndex: player1Id,
      isFinished: false
    };
    
    this.db.addGame(game);
    
    return gameId;
  }


  public addShips(gameId: string, playerId: string, ships: Ship[]): void {
    const game = this.db.getGame(gameId);
    
    if (!game) {
      throw new Error('Game not found');
    }
    
    const playerIndex = game.players.findIndex(p => p.id === playerId);
    
    if (playerIndex === -1) {
      throw new Error('Player not found in game');
    }
    
    game.players[playerIndex].ships = ships;
    
    this.db.updateGame(game);
    
    if (game.players[0].ships.length > 0 && game.players[1].ships.length > 0) {
      this.startGame(gameId);
    }
  }


  private startGame(gameId: string): void {
    const game = this.db.getGame(gameId);
    
    if (!game) {
      return;
    }
    
    game.players.forEach(player => {
      const startGameData: StartGameData = {
        ships: player.ships,
        currentPlayerIndex: player.id
      };
      
      this.wss.sendToPlayer(player.id, {
        type: 'start_game',
        data: startGameData,
        id: 0
      });
    });
    
    this.wss.sendToGame(gameId, {
      type: 'turn',
      data: {
        currentPlayer: game.currentPlayerIndex
      },
      id: 0
    });
  }

 
  public attack(gameId: string, playerId: string, x: number, y: number): AttackResponse {
    const game = this.db.getGame(gameId);
    
    if (!game) {
      throw new Error('Game not found');
    }
    
    if (game.currentPlayerIndex !== playerId) {
      throw new Error('Not your turn');
    }
    
    const attackingPlayerIndex = game.players.findIndex(p => p.id === playerId);
    const targetPlayerIndex = attackingPlayerIndex === 0 ? 1 : 0;
    const targetPlayer = game.players[targetPlayerIndex];
    
    if (this.hasAlreadyShot(game.players[attackingPlayerIndex], x, y)) {
      throw new Error('Already shot at these coordinates');
    }
    
    game.players[attackingPlayerIndex].shotCells.push({ x, y });
    
    const hitShip = this.findHitShip(targetPlayer.ships, x, y);
    
    let status: 'miss' | 'shot' | 'killed' = 'miss';
    
    if (hitShip) {
      const isKilled = this.isShipKilled(game.players[attackingPlayerIndex].shotCells, hitShip);
      
      if (isKilled) {
        status = 'killed';
        game.players[attackingPlayerIndex].killedShips.push(hitShip);
        
        if (this.areAllShipsKilled(game.players[attackingPlayerIndex], targetPlayer.ships)) {
          this.endGame(game, playerId);
        }
        
        this.markCellsAroundShip(game.players[attackingPlayerIndex], hitShip);
      } else {
        status = 'shot';
      }
    } else {
      game.currentPlayerIndex = targetPlayer.id;
    }
    
    this.db.updateGame(game);
    
    const response: AttackResponse = {
      position: { x, y },
      currentPlayer: playerId,
      status
    };
    
    this.wss.sendToGame(gameId, {
      type: 'attack',
      data: response,
      id: 0
    });
    
    if (status === 'miss') {
      this.wss.sendToGame(gameId, {
        type: 'turn',
        data: {
          currentPlayer: game.currentPlayerIndex
        },
        id: 0
      });
    }
    
    return response;
  }


  public randomAttack(gameId: string, playerId: string): AttackResponse {
    const game = this.db.getGame(gameId);
    
    if (!game) {
      throw new Error('Game not found');
    }
    
    if (game.currentPlayerIndex !== playerId) {
      throw new Error('Not your turn');
    }
    
    const attackingPlayerIndex = game.players.findIndex(p => p.id === playerId);
    const targetPlayerIndex = attackingPlayerIndex === 0 ? 1 : 0;
    
    const availableCells = this.getAvailableCells(game.players[attackingPlayerIndex]);
    
    if (availableCells.length === 0) {
      throw new Error('No available cells to shoot');
    }
    
    const randomIndex = Math.floor(Math.random() * availableCells.length);
    const { x, y } = availableCells[randomIndex];
    
    return this.attack(gameId, playerId, x, y);
  }


  private endGame(game: Game, winnerId: string): void {
    game.isFinished = true;
    game.winnerId = winnerId;
    
    this.db.updateGame(game);
    
    this.playerService.updateWinners(winnerId);
    
    this.wss.sendToGame(game.id, {
      type: 'finish',
      data: {
        winPlayer: winnerId
      },
      id: 0
    });
  }


  private hasAlreadyShot(player: GamePlayer, x: number, y: number): boolean {
    return player.shotCells.some(cell => cell.x === x && cell.y === y);
  }


  private findHitShip(ships: Ship[], x: number, y: number): Ship | undefined {
    return ships.find(ship => {
      const cells = this.getShipCells(ship);
      return cells.some(cell => cell.x === x && cell.y === y);
    });
  }


  private isShipKilled(shotCells: Position[], ship: Ship): boolean {
    const shipCells = this.getShipCells(ship);
    return shipCells.every(cell => 
      shotCells.some(shot => shot.x === cell.x && shot.y === cell.y)
    );
  }


  private areAllShipsKilled(player: GamePlayer, targetShips: Ship[]): boolean {
    return targetShips.every(ship => 
      this.isShipKilled(player.shotCells, ship)
    );
  }


  private getShipCells(ship: Ship): Position[] {
    const cells: Position[] = [];
    const { x, y } = ship.position;
    
    for (let i = 0; i < ship.length; i++) {
      if (ship.direction) {
        cells.push({ x: x + i, y });
      } else {
        cells.push({ x, y: y + i });
      }
    }
    
    return cells;
  }


  private markCellsAroundShip(player: GamePlayer, ship: Ship): void {
    const shipCells = this.getShipCells(ship);
    const aroundCells: Position[] = [];
    
    shipCells.forEach(cell => {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          
          const newX = cell.x + dx;
          const newY = cell.y + dy;
          
          if (newX < 0 || newX > 9 || newY < 0 || newY > 9) continue;
          
          if (shipCells.some(sc => sc.x === newX && sc.y === newY)) continue;
          
          if (aroundCells.some(ac => ac.x === newX && ac.y === newY)) continue;
          
          aroundCells.push({ x: newX, y: newY });
        }
      }
    });
    
    aroundCells.forEach(cell => {
      if (!this.hasAlreadyShot(player, cell.x, cell.y)) {
        player.shotCells.push(cell);
      }
    });
  }


  private getAvailableCells(player: GamePlayer): Position[] {
    const availableCells: Position[] = [];
    
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        if (!this.hasAlreadyShot(player, x, y)) {
          availableCells.push({ x, y });
        }
      }
    }
    
    return availableCells;
  }


  public getGame(gameId: string): Game | undefined {
    return this.db.getGame(gameId);
  }
}

export default GameService;
