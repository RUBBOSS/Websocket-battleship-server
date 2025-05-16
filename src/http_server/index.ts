import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

const mimeTypes: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.wasm': 'application/wasm'
};


class HttpServer {
  private server: http.Server;
  private port: number;
  private rootDir: string;

  constructor(port: number) {
    this.port = port;
    
    const __dirname = path.resolve(path.dirname(''));
    this.rootDir = path.join(__dirname, 'front');
    
    this.server = http.createServer(this.requestHandler.bind(this));
  }


  private requestHandler(req: http.IncomingMessage, res: http.ServerResponse): void {
    let filePath = req.url === '/' 
      ? path.join(this.rootDir, 'index.html') 
      : path.join(this.rootDir, req.url || '');
    
    fs.stat(filePath, (err, stats) => {
      if (err) {
        this.serveError(res, 404, 'File not found');
        return;
      }
      
      if (stats.isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }
      
      const extname = path.extname(filePath);
      const contentType = mimeTypes[extname] || 'application/octet-stream';
      
      fs.readFile(filePath, (err, data) => {
        if (err) {
          this.serveError(res, 500, 'Internal server error');
          return;
        }
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      });
    });
  }


  private serveError(res: http.ServerResponse, statusCode: number, message: string): void {
    res.writeHead(statusCode, { 'Content-Type': 'text/html' });
    res.end(`<h1>${statusCode} - ${message}</h1>`);
  }


  public start(): void {
    this.server.listen(this.port, () => {
      console.log(`HTTP server is running on port ${this.port}`);
    });
  }
}

export default HttpServer;