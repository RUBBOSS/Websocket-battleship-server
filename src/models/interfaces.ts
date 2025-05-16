import { ExtendedWebSocket } from './websocket.js';

export interface Message {
  type: string;
  data: unknown;
  id: number;
}

export type MessageType =
  | 'reg'
  | 'create_room'
  | 'add_user_to_room'
  | 'create_bot_game'
  | 'add_ships'
  | 'attack'
  | 'randomAttack'
  | 'update_room'
  | 'update_winners'
  | 'create_game'
  | 'start_game'
  | 'turn'
  | 'finish'
  | 'error';

export interface RegData {
  name: string;
  password: string;
}

export interface RegResponse {
  name: string;
  index: number | string;
  error: boolean;
  errorText: string;
}

export interface WinnerData {
  name: string;
  wins: number;
}

export interface AddUserToRoomData {
  indexRoom: number | string;
}

export interface CreateGameResponse {
  idGame: number | string;
  idPlayer: number | string;
}

export interface RoomUser {
  name: string;
  index: number | string;
}

export interface Room {
  roomId: number | string;
  roomUsers: RoomUser[];
}

export interface Position {
  x: number;
  y: number;
}

export interface Ship {
  position: Position;
  direction: boolean;
  length: number;
  type: 'small' | 'medium' | 'large' | 'huge';
}

export interface AddShipsData {
  gameId: number | string;
  ships: Ship[];
  indexPlayer: number | string;
}

export interface StartGameData {
  ships: Ship[];
  currentPlayerIndex: number | string;
}

export interface AttackData {
  gameId: number | string;
  x: number;
  y: number;
  indexPlayer: number | string;
}

export interface RandomAttackData {
  gameId: number | string;
  indexPlayer: number | string;
}

export interface AttackResponse {
  position: Position;
  currentPlayer: number | string;
  status: 'miss' | 'killed' | 'shot';
}

export interface TurnData {
  currentPlayer: number | string;
}

export interface FinishData {
  winPlayer: number | string;
}

export interface Player {
  id: string;
  name: string;
  password: string;
  connection: ExtendedWebSocket;
  wins: number;
}

export interface GamePlayer {
  id: string;
  gameId: string;
  ships: Ship[];
  shotCells: Position[];
  killedShips: Ship[];
}

export interface Game {
  id: string;
  players: GamePlayer[];
  currentPlayerIndex: string;
  isFinished: boolean;
  winnerId?: string;
}

export interface Database {
  players: Map<string, Player>;
  rooms: Map<string, Room>;
  games: Map<string, Game>;
  winners: WinnerData[];
}
