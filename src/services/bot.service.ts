import { Ship, Position, Game, GamePlayer, Player } from '../models/interfaces.js';
import DatabaseService from './database.service.js';
import GameService from './game.service.js';
import WebSocketService from './websocket.service.js';
import { generateUUID } from '../utils/uuid.js';

class BotService {
  private static instance: BotService;
  private db: DatabaseService;
  private gameService: GameService;
  private wss: WebSocketService;

  private botPlayer: Player;

  private readonly shipConfigs = [
    { type: 'huge', length: 4 },
    { type: 'large', length: 3 },
    { type: 'large', length: 3 },
    { type: 'medium', length: 2 },
    { type: 'medium', length: 2 },
    { type: 'medium', length: 2 },
    { type: 'small', length: 1 },
    { type: 'small', length: 1 },
    { type: 'small', length: 1 },
    { type: 'small', length: 1 },
  ] as const;
  private constructor() {
    this.db = DatabaseService.getInstance();
    const botId = generateUUID();
    this.botPlayer = {
      id: botId,
      name: 'Bot Player',
      password: 'bot-password',
      connection: null!,
      wins: 0,
    };
    this.db.addPlayer(this.botPlayer);

    this.gameService = null!;
    this.wss = null!;
  }

  public static getInstance(): BotService {
    if (!BotService.instance) {
      BotService.instance = new BotService();
    }
    return BotService.instance;
  }

  public setGameService(gameService: GameService): void {
    this.gameService = gameService;
  }

  public setWebSocketService(wss: WebSocketService): void {
    this.wss = wss;
  }

  public getBotPlayer(): Player {
    return this.botPlayer;
  }

  public createGameWithBot(playerId: string): string {
    const gameId = generateUUID();

    const humanPlayer: GamePlayer = {
      id: playerId,
      gameId,
      ships: [],
      shotCells: [],
      killedShips: [],
    };

    const botPlayer: GamePlayer = {
      id: this.botPlayer.id,
      gameId,
      ships: [],
      shotCells: [],
      killedShips: [],
    };

    const game: Game = {
      id: gameId,
      players: [humanPlayer, botPlayer],
      currentPlayerIndex: humanPlayer.id,
      isFinished: false,
    };

    this.db.addGame(game);

    const botShips = this.generateRandomShips();

    setTimeout(() => {
      this.gameService.addShips(gameId, this.botPlayer.id, botShips);
    }, 1000);

    return gameId;
  }

  private generateRandomShips(): Ship[] {
    const ships: Ship[] = [];
    const occupiedCells: Position[] = [];

    const isCellOccupied = (x: number, y: number): boolean => {
      return occupiedCells.some((cell) => cell.x === x && cell.y === y);
    };

    const isValidPlacement = (ship: Ship): boolean => {
      const cells = this.getShipCells(ship);

      for (const cell of cells) {
        if (cell.x < 0 || cell.x > 9 || cell.y < 0 || cell.y > 9) {
          return false;
        }

        if (isCellOccupied(cell.x, cell.y)) {
          return false;
        }

        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;

            const nx = cell.x + dx;
            const ny = cell.y + dy;

            if (nx >= 0 && nx <= 9 && ny >= 0 && ny <= 9) {
              if (isCellOccupied(nx, ny)) {
                return false;
              }
            }
          }
        }
      }

      return true;
    };

    for (const config of this.shipConfigs) {
      let ship: Ship;
      let attempts = 0;
      const maxAttempts = 100;

      do {
        const x = Math.floor(Math.random() * 10);
        const y = Math.floor(Math.random() * 10);

        const direction = Math.random() > 0.5;

        ship = {
          position: { x, y },
          direction,
          length: config.length,
          type: config.type as 'small' | 'medium' | 'large' | 'huge',
        };

        attempts++;
        if (attempts > maxAttempts) {
          ships.length = 0;
          occupiedCells.length = 0;
          break;
        }
      } while (!isValidPlacement(ship));

      if (attempts <= maxAttempts) {
        ships.push(ship);

        const cells = this.getShipCells(ship);
        occupiedCells.push(...cells);
      } else {
        continue;
      }
    }

    return ships;
  }
  private getShipCells(ship: Ship): Position[] {
    const cells: Position[] = [];
    const { x, y } = ship.position;

    for (let i = 0; i < ship.length; i++) {
      if (ship.direction) {
        // Changed to match frontend expectation: direction=true means vertical (y+i)
        cells.push({ x, y: y + i });
      } else {
        // Changed to match frontend expectation: direction=false means horizontal (x+i)
        cells.push({ x: x + i, y });
      }
    }

    return cells;
  }

  public makeBotMove(gameId: string): void {
    const game = this.db.getGame(gameId);

    if (!game) {
      console.error('Game not found for bot move');
      return;
    }

    if (game.currentPlayerIndex !== this.botPlayer.id) {
      return;
    }

    setTimeout(() => {
      try {
        const botPlayerIndex = game.players.findIndex((p) => p.id === this.botPlayer.id);
        const opponentIndex = botPlayerIndex === 0 ? 1 : 0;
        const botGamePlayer = game.players[botPlayerIndex];

        const partiallyHitShips = this.findPartiallyHitShips(game, botGamePlayer, opponentIndex);

        if (partiallyHitShips.length > 0) {
          const targetPosition = this.getTargetAroundPartialHit(
            partiallyHitShips[0],
            botGamePlayer,
          );
          if (targetPosition) {
            this.gameService.attack(gameId, this.botPlayer.id, targetPosition.x, targetPosition.y);
            return;
          }
        }

        this.gameService.randomAttack(gameId, this.botPlayer.id);
      } catch (error) {
        console.error('Error making bot move:', error);
      }
    }, 1000);
  }

  private findPartiallyHitShips(
    game: Game,
    botPlayer: GamePlayer,
    opponentIndex: number,
  ): Position[][] {
    const partiallyHitShips: Position[][] = [];
    const opponentShips = game.players[opponentIndex].ships;

    for (const ship of opponentShips) {
      const shipCells = this.getShipCells(ship);

      const hitCells = shipCells.filter((cell) =>
        botPlayer.shotCells.some((shot) => shot.x === cell.x && shot.y === cell.y),
      );

      if (hitCells.length > 0 && hitCells.length < shipCells.length) {
        partiallyHitShips.push(hitCells);
      }
    }

    return partiallyHitShips;
  }

  private getTargetAroundPartialHit(hitCells: Position[], botPlayer: GamePlayer): Position | null {
    const directions = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];

    if (hitCells.length > 1) {
      const sortedByX = [...hitCells].sort((a, b) => a.x - b.x);
      const sortedByY = [...hitCells].sort((a, b) => a.y - b.y);

      if (
        sortedByX[0].x !== sortedByX[sortedByX.length - 1].x &&
        sortedByY[0].y === sortedByY[sortedByY.length - 1].y
      ) {
        directions.splice(2, 2);
      } else if (
        sortedByX[0].x === sortedByX[sortedByX.length - 1].x &&
        sortedByY[0].y !== sortedByY[sortedByY.length - 1].y
      ) {
        directions.splice(0, 2);
      }
    }

    this.shuffleArray(directions);

    for (const cell of hitCells) {
      for (const dir of directions) {
        const targetX = cell.x + dir.dx;
        const targetY = cell.y + dir.dy;

        if (targetX >= 0 && targetX <= 9 && targetY >= 0 && targetY <= 9) {
          if (!botPlayer.shotCells.some((shot) => shot.x === targetX && shot.y === targetY)) {
            return { x: targetX, y: targetY };
          }
        }
      }
    }

    return null;
  }

  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  public monitorGames(): void {
    setInterval(() => {
      const games = Array.from(this.db.getAllGames());

      for (const game of games) {
        if (!game.isFinished && game.currentPlayerIndex === this.botPlayer.id) {
          this.makeBotMove(game.id);
        }
      }
    }, 1000);
  }
}

export default BotService;
