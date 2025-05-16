# Battleship WebSocket Game Server

A multiplayer Battleship game server implementation using WebSockets for real-time communication.

## Features

- WebSocket server for real-time game updates
- Player registration and authentication
- Room management for game sessions
- Ship placement validation
- Turn-based gameplay
- Winner tracking and leaderboard
- Single-player mode with AI opponent

## Technologies

- TypeScript
- Node.js
- WebSockets (ws library)
- HTTP server for serving static files

## Installation

1. Clone the repository
2. Install dependencies:
```
npm install
```
3. Configure environment variables in `.env` file (or use the defaults):
```
HTTP_PORT=3000
WS_PORT=8080
```

## Usage

### Development

```
npm run start:dev
```
- HTTP server @ `http://localhost:3000`
- WebSocket server @ `ws://localhost:8080`

### Production

```
npm run build
npm run start
```
- HTTP server @ `http://localhost:3000`
- WebSocket server @ `ws://localhost:8080`

## Game Protocol

The server and client communicate using JSON messages with the following format:

```typescript
{
  type: string;  // Message type
  data: any;     // Message data
  id: number;    // Always 0 in this implementation
}
```

### Player Commands

- `reg` - Register/login player
- `create_room` - Create a new game room
- `create_bot_game` - Create a game against the AI bot
- `add_user_to_room` - Join an existing room
- `add_ships` - Add ships to the game board
- `attack` - Attack opponent's board
- `randomAttack` - Perform a random attack

### Server Responses

- `reg` - Registration/login response
- `update_room` - Room list update
- `update_winners` - Winners list update
- `create_game` - Game created notification
- `start_game` - Game started notification
- `turn` - Turn notification
- `attack` - Attack result
- `finish` - Game finished notification

## Single Player Mode

The game supports a single-player mode where you can play against an AI bot. To start a game with the bot:

1. Register/login with the `reg` command
2. Send a `create_bot_game` command to create a game with the bot
3. Place your ships with the `add_ships` command
4. The bot will automatically place its ships
5. Play the game normally using `attack` or `randomAttack` commands
6. The bot will automatically take its turn when it's time

The bot uses a simple random strategy for both ship placement and attacks.

## Project Structure

- `/src` - Source code
  - `/controllers` - Message handling
  - `/http_server` - HTTP server for static files
  - `/models` - TypeScript interfaces
  - `/services` - Game logic services
  - `index.ts` - Main application entry point

## License

ISC
