import { Database, Player, Room, Game, WinnerData } from '../models/interfaces.js';

class DatabaseService {
  private static instance: DatabaseService;
  private db: Database;

  private constructor() {
    this.db = {
      players: new Map<string, Player>(),
      rooms: new Map<string, Room>(),
      games: new Map<string, Game>(),
      winners: [],
    };
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public addPlayer(player: Player): void {
    this.db.players.set(player.id, player);
  }

  public getPlayer(id: string): Player | undefined {
    return this.db.players.get(id);
  }

  public getPlayerByName(name: string): Player | undefined {
    for (const player of this.db.players.values()) {
      if (player.name === name) {
        return player;
      }
    }
    return undefined;
  }

  public getAllPlayers(): Player[] {
    return Array.from(this.db.players.values());
  }

  public addRoom(room: Room): void {
    this.db.rooms.set(room.roomId.toString(), room);
  }

  public getRoom(id: string): Room | undefined {
    return this.db.rooms.get(id);
  }

  public getRoomByPlayer(playerId: string): Room | undefined {
    for (const room of this.db.rooms.values()) {
      if (room.roomUsers.some((user) => user.index === playerId)) {
        return room;
      }
    }
    return undefined;
  }

  public removeRoom(id: string): void {
    this.db.rooms.delete(id);
  }

  public getAllRooms(): Room[] {
    return Array.from(this.db.rooms.values());
  }

  public addGame(game: Game): void {
    this.db.games.set(game.id, game);
  }

  public getGame(id: string): Game | undefined {
    return this.db.games.get(id);
  }

  public getGameByPlayer(playerId: string): Game | undefined {
    for (const game of this.db.games.values()) {
      if (game.players.some((player) => player.id === playerId)) {
        return game;
      }
    }
    return undefined;
  }

  public updateGame(game: Game): void {
    this.db.games.set(game.id, game);
  }

  public removeGame(id: string): void {
    this.db.games.delete(id);
  }

  public getAllGames(): Game[] {
    return Array.from(this.db.games.values());
  }

  public addWinner(name: string): void {
    const winner = this.db.winners.find((w) => w.name === name);

    if (winner) {
      winner.wins++;
    } else {
      this.db.winners.push({ name, wins: 1 });
    }

    const player = this.getPlayerByName(name);
    if (player) {
      player.wins++;
      this.addPlayer(player);
    }
  }

  public getWinners(): WinnerData[] {
    return [...this.db.winners].sort((a, b) => b.wins - a.wins);
  }
}

export default DatabaseService;
