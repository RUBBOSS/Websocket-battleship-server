import DatabaseService from '../src/services/database.service.js';
import { Player, Room, Game } from '../src/models/interfaces.js';
import { ExtendedWebSocket } from '../src/models/websocket.js';
import { generateUUID } from '../src/utils/uuid.js';
import { mock } from 'jest-mock-extended';

describe('DatabaseService', () => {
  let dbService: DatabaseService;
  let playerId: string;
  let player: Player;
  let mockWs: ExtendedWebSocket;

  beforeEach(() => {
    dbService = DatabaseService.getInstance();

    const players = dbService.getAllPlayers();
    players.forEach((p) => {
      const rooms = dbService.getAllRooms();
      rooms.forEach((r) => {
        dbService.removeRoom(r.roomId.toString());
      });

      const games = dbService.getAllGames();
      games.forEach((g) => {
        dbService.removeGame(g.id);
      });
    });

    playerId = generateUUID();

    mockWs = mock<ExtendedWebSocket>({
      readyState: 1,
      isAlive: true,
    });

    player = {
      id: playerId,
      name: 'Test Player',
      password: 'password',
      connection: mockWs,
      wins: 0,
    };
    dbService.addPlayer(player);
  });

  test('should be a singleton', () => {
    const instance1 = DatabaseService.getInstance();
    const instance2 = DatabaseService.getInstance();
    expect(instance1).toBe(instance2);
  });

  test('should add and retrieve a player', () => {
    const retrievedPlayer = dbService.getPlayer(playerId);
    expect(retrievedPlayer).toEqual(player);
  });

  test('should find a player by name', () => {
    const playerByName = dbService.getPlayerByName('Test Player');
    expect(playerByName?.name).toBe(player.name);
    expect(playerByName?.password).toBe(player.password);
    expect(playerByName?.wins).toBe(player.wins);
  });

  test('should add and retrieve a room', () => {
    const roomId = generateUUID();
    const room: Room = {
      roomId,
      roomUsers: [
        {
          name: 'Test Player',
          index: playerId,
        },
      ],
    };

    dbService.addRoom(room);
    const retrievedRoom = dbService.getRoom(roomId);
    expect(retrievedRoom).toEqual(room);
  });

  test('should find a room by player', () => {
    const roomId = generateUUID();
    const room: Room = {
      roomId,
      roomUsers: [
        {
          name: 'Test Player',
          index: playerId,
        },
      ],
    };

    dbService.addRoom(room);
    const roomByPlayer = dbService.getRoomByPlayer(playerId);
    expect(roomByPlayer).toEqual(room);
  });

  test('should remove a room', () => {
    const roomId = generateUUID();
    const room: Room = {
      roomId,
      roomUsers: [
        {
          name: 'Test Player',
          index: playerId,
        },
      ],
    };

    dbService.addRoom(room);
    dbService.removeRoom(roomId);
    const retrievedRoom = dbService.getRoom(roomId);
    expect(retrievedRoom).toBeUndefined();
  });

  test('should add and update a game', () => {
    const gameId = generateUUID();
    const game: Game = {
      id: gameId,
      players: [
        {
          id: playerId,
          gameId,
          ships: [],
          shotCells: [],
          killedShips: [],
        },
      ],
      currentPlayerIndex: playerId,
      isFinished: false,
    };

    dbService.addGame(game);
    const retrievedGame = dbService.getGame(gameId);
    expect(retrievedGame).toEqual(game);

    game.isFinished = true;
    game.winnerId = playerId;
    dbService.updateGame(game);

    const updatedGame = dbService.getGame(gameId);
    expect(updatedGame?.isFinished).toBe(true);
    expect(updatedGame?.winnerId).toBe(playerId);
  });

  test('should find a game by player', () => {
    const gameId = generateUUID();
    const game: Game = {
      id: gameId,
      players: [
        {
          id: playerId,
          gameId,
          ships: [],
          shotCells: [],
          killedShips: [],
        },
      ],
      currentPlayerIndex: playerId,
      isFinished: false,
    };

    dbService.addGame(game);
    const gameByPlayer = dbService.getGameByPlayer(playerId);
    expect(gameByPlayer).toEqual(game);
  });

  test('should track winners', () => {
    dbService.addWinner('Test Player');
    const winners = dbService.getWinners();
    expect(winners.length).toBe(1);
    expect(winners[0].name).toBe('Test Player');
    expect(winners[0].wins).toBe(1);

    dbService.addWinner('Test Player');
    const updatedWinners = dbService.getWinners();
    expect(updatedWinners[0].wins).toBe(2);
    const updatedPlayer = dbService.getPlayer(playerId);
    expect(updatedPlayer).toBeDefined();
  });
});
