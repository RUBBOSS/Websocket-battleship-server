interface EnhancedWebSocketInterface extends EventTarget {
    url: string;
    protocols: string | string[] | undefined;
    socket: WebSocket | null;
    isReconnecting: boolean;
    reconnectAttempts: number;
    maxReconnectAttempts: number;
    reconnectInterval: number;
    messageQueue: string[];
    readyState: number;
    CONNECTING: number;
    OPEN: number;
    CLOSING: number;
    CLOSED: number;
    createSocket(): void;
    setupSocketHandlers(): void;
    handleSocketError(error: Event): void;
    attemptReconnect(): void;
    send(data: string): void;
    close(code?: number, reason?: string): void;
    flushMessageQueue(): void;
}

(() => {
    console.log('Loading WebSocket and room connection fix');

    const OriginalWebSocket = window.WebSocket;

    class EnhancedWebSocket extends EventTarget implements EnhancedWebSocketInterface {
        url: string;
        protocols: string | string[] | undefined;
        socket: WebSocket | null;
        isReconnecting: boolean;
        reconnectAttempts: number;
        maxReconnectAttempts: number;
        reconnectInterval: number;
        messageQueue: string[];
        CONNECTING: number;
        OPEN: number;
        CLOSING: number;
        CLOSED: number;

        constructor(url: string, protocols?: string | string[]) {
            super();
            this.url = url;
            this.protocols = protocols;
            this.socket = null;
            this.isReconnecting = false;
            this.reconnectAttempts = 0;
            this.maxReconnectAttempts = 5;
            this.reconnectInterval = 3000;

            this.messageQueue = [];

            this.CONNECTING = 0;
            this.OPEN = 1;
            this.CLOSING = 2;
            this.CLOSED = 3;

            this.createSocket();
        }

        get readyState(): number {
            return this.socket ? this.socket.readyState : WebSocket.CLOSED;
        }

        createSocket(): void {
            try {
                console.log(`${this.isReconnecting ? 'Reconnecting' : 'Connecting'} to WebSocket at ${this.url}`);

                this.socket = this.protocols
                    ? new OriginalWebSocket(this.url, this.protocols)
                    : new OriginalWebSocket(this.url);

                this.setupSocketHandlers();
            } catch (error) {
                console.error('Error creating WebSocket:', error);
                this.handleSocketError(error as Event);
            }
        }

        setupSocketHandlers(): void {
            if (!this.socket) return;
            
            this.socket.onopen = (event) => {
                console.log('WebSocket connection established');
                this.reconnectAttempts = 0;
                this.isReconnecting = false;

                this.dispatchEvent(new Event('open'));

                this.flushMessageQueue();
            };

            this.socket.onclose = (event) => {
                console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);

                this.dispatchEvent(new CloseEvent('close', {
                    code: event.code,
                    reason: event.reason,
                    wasClean: event.wasClean
                }));

                if (!event.wasClean && !this.isReconnecting) {
                    this.attemptReconnect();
                }
            };

            this.socket.onerror = (event) => {
                console.error('WebSocket error:', event);

                this.dispatchEvent(new Event('error'));

                this.handleSocketError(event);
            };

            this.socket.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);

                    if (message.type === 'reg') {
                        try {
                            const regResponse = JSON.parse(message.data);
                            console.log('Registration response:', regResponse);

                            const fixedMessage = {
                                ...message,
                                data: JSON.stringify(regResponse)
                            };

                            const fixedEvent = new MessageEvent('message', {
                                data: JSON.stringify(fixedMessage)
                            });

                            this.dispatchEvent(fixedEvent);
                            return;
                        } catch (err) {
                            console.error('Error fixing registration message:', err);
                        }
                    }

                    if (message.type === 'update_room' && typeof message.data === 'string') {
                        try {
                            const rooms = JSON.parse(message.data);
                            const fixedRooms = rooms.map((room: any) => ({
                                ...room,
                                roomId: String(room.roomId),
                                roomUsers: (room.roomUsers || []).map((user: any) => ({
                                    ...user,
                                    index: String(user.index)
                                }))
                            }));

                            const fixedMessage = {
                                ...message,
                                data: JSON.stringify(fixedRooms)
                            };

                            const fixedEvent = new MessageEvent('message', {
                                data: JSON.stringify(fixedMessage)
                            });

                            this.dispatchEvent(fixedEvent);
                            return;
                        } catch (err) {
                            console.error('Error fixing update_room message:', err);
                        }
                    }

                    if (message.type === 'create_game') {
                        try {
                            const gameData = JSON.parse(message.data);
                            const fixedGameData = {
                                idGame: String(gameData.idGame),
                                idPlayer: String(gameData.idPlayer)
                            };

                            const fixedMessage = {
                                ...message,
                                data: JSON.stringify(fixedGameData)
                            };

                            const fixedEvent = new MessageEvent('message', {
                                data: JSON.stringify(fixedMessage)
                            });

                            this.dispatchEvent(fixedEvent);
                            return;
                        } catch (err) {
                            console.error('Error fixing create_game message:', err);
                        }
                    }

                    this.dispatchEvent(new MessageEvent('message', { data: event.data }));
                } catch (error) {
                    console.error('Error processing WebSocket message:', error);
                    this.dispatchEvent(new MessageEvent('message', { data: event.data }));
                }
            };
        }

        handleSocketError(error: Event): void {
            console.error('WebSocket error handling initiated:', error);

            if (!this.isReconnecting) {
                this.attemptReconnect();
            }
        }

        attemptReconnect(): void {
            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                console.error(`Max reconnection attempts (${this.maxReconnectAttempts}) reached. Giving up.`);
                return;
            }

            this.isReconnecting = true;
            this.reconnectAttempts++;

            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${this.reconnectInterval}ms`);

            setTimeout(() => {
                this.createSocket();
            }, this.reconnectInterval);
        }

        send(data: string): void {
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(data);
            } else {
                console.warn('WebSocket not ready, queueing message');
                this.messageQueue.push(data);
            }
        }

        close(code?: number, reason?: string): void {
            if (this.socket) {
                this.socket.close(code, reason);
            }
        }

        flushMessageQueue(): void {
            if (!this.socket) return;
            
            while (this.messageQueue.length > 0 && this.socket.readyState === WebSocket.OPEN) {
                const message = this.messageQueue.shift();
                if (message) {
                    console.log('Sending queued message');
                    this.socket.send(message);
                }
            }
        }
    }

    window.WebSocket = function(url: string, protocols?: string | string[]): WebSocket {
        return new EnhancedWebSocket(url, protocols) as unknown as WebSocket;
    } as any;

    Object.defineProperty(window.WebSocket, 'CONNECTING', { value: OriginalWebSocket.CONNECTING });
    Object.defineProperty(window.WebSocket, 'OPEN', { value: OriginalWebSocket.OPEN });
    Object.defineProperty(window.WebSocket, 'CLOSING', { value: OriginalWebSocket.CLOSING });
    Object.defineProperty(window.WebSocket, 'CLOSED', { value: OriginalWebSocket.CLOSED });

    console.log('WebSocket and room connection fix loaded');

    const originalOnError = window.onerror;
    window.onerror = function (message, source, lineno, colno, error) {
        console.error('Global error:', { message, source, lineno, colno, error });
        if (originalOnError) {
            return originalOnError.call(this, message, source, lineno, colno, error);
        }
        return false;
    };

    document.addEventListener('DOMContentLoaded', () => {
        console.log('Adding room joining fix listeners');

        document.body.addEventListener('click', () => {
            setTimeout(() => {
                const pendingSends = performance.getEntriesByType('resource')
                    .filter((entry): entry is PerformanceResourceTiming => 
                        entry instanceof PerformanceResourceTiming && 
                        entry.initiatorType === 'xmlhttprequest' && 
                        entry.name.includes('ws'));

                if (pendingSends.length > 0) {
                    console.log('Detected potential room join action');
                }
            }, 100);
        });
    });
})();
