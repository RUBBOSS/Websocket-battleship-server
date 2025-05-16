import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { httpServer } from './http_server/index.js';
import { initMessageHandler } from './controllers/messageHandler.js';
import { getWsServer } from './services/websocket.service.js';

const HTTP_PORT = 8181;
const WS_PORT = 8080;

// Start HTTP server for static files
console.log(`Starting static HTTP server on port ${HTTP_PORT}`);
httpServer.listen(HTTP_PORT);

// Create WebSocket server
const wss = new WebSocketServer({ port: WS_PORT });
console.log(`WebSocket server is running on ws://localhost:${WS_PORT}`);

// Initialize WebSocket service with the server instance
getWsServer(wss);

// Initialize message handler
initMessageHandler(wss);

// Handle WebSocket server errors
wss.on('error', (error) => {
    console.error('WebSocket server error:', error);
});

// Handle process termination to properly close the WebSocket server
process.on('SIGINT', () => {
    console.log('Shutting down WebSocket server');
    wss.close(() => {
        console.log('WebSocket server closed');
        process.exit(0);
    });
});