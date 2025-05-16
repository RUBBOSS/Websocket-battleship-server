const WebSocket = require('ws');

const WS_URL = 'ws://localhost:8080';

const ws = new WebSocket(WS_URL);

const player = {
  name: 'TestPlayer',
  password: 'password123'
};

const ships = [
  {
    position: { x: 0, y: 0 },
    direction: true,
    length: 4,
    type: 'huge'
  },
  {
    position: { x: 0, y: 2 },
    direction: true,
    length: 3,
    type: 'large'
  },
  {
    position: { x: 0, y: 4 },
    direction: true,
    length: 3,
    type: 'large'
  },
  {
    position: { x: 0, y: 6 },
    direction: true,
    length: 2,
    type: 'medium'
  },
  {
    position: { x: 3, y: 6 },
    direction: true,
    length: 2,
    type: 'medium'
  },
  {
    position: { x: 6, y: 6 },
    direction: true,
    length: 2,
    type: 'medium'
  },
  {
    position: { x: 0, y: 8 },
    direction: true,
    length: 1,
    type: 'small'
  },
  {
    position: { x: 2, y: 8 },
    direction: true,
    length: 1,
    type: 'small'
  },
  {
    position: { x: 4, y: 8 },
    direction: true,
    length: 1,
    type: 'small'
  },
  {
    position: { x: 6, y: 8 },
    direction: true,
    length: 1,
    type: 'small'
  }
];

let gameId = null;
let playerId = null;
let isMyTurn = false;

function log(type, data) {
  console.log(`[${type}]`, JSON.stringify(data, null, 2));
}

function sendMessage(type, data = '') {
  const message = {
    type,
    data,
    id: 0
  };
  ws.send(JSON.stringify(message));
  log('SENT', message);
}

ws.on('message', (data) => {
  const message = JSON.parse(data);
  log('RECEIVED', message);
  
  switch (message.type) {
    case 'reg':
      if (!message.data.error) {
        playerId = message.data.index;
        console.log(`\nRegistered as ${message.data.name} with ID ${playerId}`);
        console.log('Creating a game with the bot...\n');
        sendMessage('create_bot_game');
      }
      break;
      
    case 'create_game':
      gameId = message.data.idGame;
      playerId = message.data.idPlayer;
      console.log(`\nGame created with ID ${gameId}\n`);
      
      setTimeout(() => {
        console.log('Adding ships...\n');
        sendMessage('add_ships', {
          gameId,
          ships,
          indexPlayer: playerId
        });
      }, 1000);
      break;
      
    case 'start_game':
      console.log('\nGame started! Ship positions:');
      message.data.ships.forEach(ship => console.log(`${ship.type} at (${ship.position.x},${ship.position.y})`));
      console.log('');
      break;
      
    case 'turn':
      isMyTurn = message.data.currentPlayer === playerId;
      console.log(`\nCurrent turn: ${isMyTurn ? 'YOUR TURN' : 'BOT TURN'}`);
      
      if (isMyTurn) {
        setTimeout(() => {
          console.log('Making a random attack...\n');
          sendMessage('randomAttack', {
            gameId,
            indexPlayer: playerId
          });
        }, 1000);
      }
      break;
      
    case 'attack':
      console.log(`\nAttack at (${message.data.position.x},${message.data.position.y}): ${message.data.status.toUpperCase()}`);
      break;
      
    case 'finish':
      const isWinner = message.data.winPlayer === playerId;
      console.log(`\nGame finished! ${isWinner ? 'YOU WON!' : 'BOT WON!'}`);
      
      setTimeout(() => {
        console.log('\nClosing connection...');
        ws.close();
      }, 3000);
      break;
  }
});

ws.on('open', () => {
  console.log('Connected to the server!');
  console.log('Registering as a test player...\n');
  
  sendMessage('reg', player);
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

ws.on('close', () => {
  console.log('Connection closed');
});
