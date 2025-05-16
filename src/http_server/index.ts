import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

// Define MIME types for different file extensions
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

/**
 * HTTP Server for serving static files
 */
class HttpServer {
  private server: http.Server;
  private port: number;
  private rootDir: string;

  constructor(port: number) {
    this.port = port;
    
    // Get the directory where the front-end assets are located
    const __dirname = path.resolve(path.dirname(''));
    this.rootDir = path.join(__dirname, 'front');
    
    // Create HTTP server
    this.server = http.createServer(this.requestHandler.bind(this));
  }

  /**
   * Handle HTTP requests
   */
  private requestHandler(req: http.IncomingMessage, res: http.ServerResponse): void {
    // Get the file path
    let filePath = req.url === '/' 
      ? path.join(this.rootDir, 'index.html') 
      : path.join(this.rootDir, req.url || '');
    
    // Check if file exists
    fs.stat(filePath, (err, stats) => {
      if (err) {
        // File not found, serve 404
        this.serveError(res, 404, 'File not found');
        return;
      }
      
      // If it's a directory, try to serve index.html
      if (stats.isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }
      
      // Get file extension and content type
      const extname = path.extname(filePath);
      const contentType = mimeTypes[extname] || 'application/octet-stream';
      
      // Read and serve the file
      fs.readFile(filePath, (err, data) => {
        if (err) {
          this.serveError(res, 500, 'Internal server error');
          return;
        }
        
        // Serve the file
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      });
    });
  }

  /**
   * Serve error response
   */
  private serveError(res: http.ServerResponse, statusCode: number, message: string): void {
    res.writeHead(statusCode, { 'Content-Type': 'text/html' });
    res.end(`<h1>${statusCode} - ${message}</h1>`);
  }

  /**
   * Start the HTTP server
   */
  public start(): void {
    this.server.listen(this.port, () => {
      console.log(`HTTP server is running on port ${this.port}`);
    });
  }
}

export default HttpServer;