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

## Usage

### Development

```bash
npm run start:dev
```

App served @ http://localhost:8181 with nodemon

### Production

```bash
npm run start
```

App served @ http://localhost:8181 without nodemon

### All commands

| Command | Description |
| ------- | ----------- |
| `npm run start:dev` | App served @ http://localhost:8181 with nodemon |
| `npm run start` | App served @ http://localhost:8181 without nodemon |
| `npm run build` | Build the TypeScript project |
| `npm run lint` | Run ESLint on the project |
| `npm run lint:fix` | Fix ESLint issues automatically |
| `npm run format` | Format code using Prettier |
| `npm test` | Run tests with Jest |

## Technologies

- TypeScript
- Node.js
- WebSockets (ws library)
- HTTP server for serving static files
- ESLint for code quality
- Prettier for code formatting

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

### Code Quality

```
npm run lint       # Check code with ESLint
npm run lint:fix   # Fix lint issues automatically
npm run format     # Format code with Prettier
```

### Testing

```
npm test           # Run all tests with Jest
```

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

The bot uses a more intelligent strategy:
1. It places ships randomly but ensures they don't overlap or touch each other
2. For attacks, it uses a "hunt and target" strategy:
   - When it hits a ship but hasn't sunk it, it will target adjacent cells
   - When it identifies the orientation of a partially hit ship, it focuses on that direction
   - Otherwise, it uses random shots

A test script is available at `src/utils/test-bot.js` to try out the bot functionality:

```
npm run build
node dist/utils/test-bot.js
```

## Project Structure

- `/src` - Source code
  - `/controllers` - Message handling
  - `/http_server` - HTTP server for static files
  - `/models` - TypeScript interfaces
  - `/services` - Game logic services
  - `/utils` - Utility functions
  - `index.ts` - Main application entry point
- `/__tests__` - Test files
- `.eslintrc.json` - ESLint configuration
- `.prettierrc` - Prettier configuration
- `jest.config.js` - Jest test configuration
- `.husky` - Git hooks for code quality

## License

ISC
