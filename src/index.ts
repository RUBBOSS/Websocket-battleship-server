
import 'dotenv/config';
import WebSocketService from './services/websocket.service.js';
import HttpServer from './http_server/index.js';
import MessageHandler from './controllers/messageHandler.js';

const HTTP_PORT = process.env.HTTP_PORT ? parseInt(process.env.HTTP_PORT, 10) : 3000;
const WS_PORT = process.env.WS_PORT ? parseInt(process.env.WS_PORT, 10) : 8080;


class BattleshipApp {
  private httpServer: HttpServer;
  private wsService: WebSocketService;
  private messageHandler: MessageHandler;

  constructor() {
    this.httpServer = new HttpServer(HTTP_PORT);
    
    this.wsService = WebSocketService.getInstance(WS_PORT);
    
    this.messageHandler = MessageHandler.getInstance();
    this.messageHandler.setWebSocketService(this.wsService);
    this.messageHandler.initialize();
  }


  public start(): void {
    this.httpServer.start();
    
    console.log(`Battleship game server started`);
    console.log(`HTTP server running on port ${HTTP_PORT}`);
    console.log(`WebSocket server running on port ${WS_PORT}`);
  }
}

const app = new BattleshipApp();
app.start();

process.on('SIGINT', () => {
  console.log('Shutting down server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down server...');
  process.exit(0);
});