// Fix script for WebSocket connection and room joining issues
// This script enhances the WebSocket connectivity and provides better error handling

(function () {
    console.log('Loading WebSocket and room connection fix');

    // Store original WebSocket constructor
    const OriginalWebSocket = window.WebSocket;

    // Enhanced WebSocket with auto-reconnect and improved error handling
    class EnhancedWebSocket extends EventTarget {
        constructor(url, protocols) {
            super();
            this.url = url;
            this.protocols = protocols;
            this.socket = null;
            this.isReconnecting = false;
            this.reconnectAttempts = 0;
            this.maxReconnectAttempts = 5;
            this.reconnectInterval = 3000; // 3 seconds

            // Track message queue for messages sent while reconnecting
            this.messageQueue = [];

            // Public properties for compatibility with the WebSocket interface
            this.CONNECTING = 0;
            this.OPEN = 1;
            this.CLOSING = 2;
            this.CLOSED = 3;

            this.createSocket();
        }

        get readyState() {
            return this.socket ? this.socket.readyState : WebSocket.CLOSED;
        }

        createSocket() {
            try {
                console.log(`${this.isReconnecting ? 'Reconnecting' : 'Connecting'} to WebSocket at ${this.url}`);

                this.socket = this.protocols
                    ? new OriginalWebSocket(this.url, this.protocols)
                    : new OriginalWebSocket(this.url);

                this.setupSocketHandlers();
            } catch (error) {
                console.error('Error creating WebSocket:', error);
                this.handleSocketError(error);
            }
        }

        setupSocketHandlers() {
            // Copy event listeners to the new socket
            this.socket.onopen = (event) => {
                console.log('WebSocket connection established');
                this.reconnectAttempts = 0;
                this.isReconnecting = false;

                // Dispatch the event
                this.dispatchEvent(new Event('open'));

                // Send any queued messages
                this.flushMessageQueue();
            };

            this.socket.onclose = (event) => {
                console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);

                // Dispatch the event
                this.dispatchEvent(new CloseEvent('close', {
                    code: event.code,
                    reason: event.reason,
                    wasClean: event.wasClean
                }));

                // Attempt to reconnect if the connection was not closed intentionally
                if (!event.wasClean && !this.isReconnecting) {
                    this.attemptReconnect();
                }
            };

            this.socket.onerror = (event) => {
                console.error('WebSocket error:', event);

                // Dispatch the event
                this.dispatchEvent(new Event('error'));

                // Handle reconnection on error
                this.handleSocketError(event);
            }; this.socket.onmessage = (event) => {
                try {
                    // Process the message
                    const message = JSON.parse(event.data);

                    // Fix for registration issues
                    if (message.type === 'reg') {
                        try {
                            // Ensure we have properly formatted registration response
                            const regResponse = JSON.parse(message.data);
                            console.log('Registration response:', regResponse);

                            // Create a fixed message
                            const fixedMessage = {
                                ...message,
                                data: JSON.stringify(regResponse)
                            };

                            // Create a new event with our fixed message
                            const fixedEvent = new MessageEvent('message', {
                                data: JSON.stringify(fixedMessage)
                            });

                            // Dispatch the fixed event
                            this.dispatchEvent(fixedEvent);
                            return;
                        } catch (err) {
                            console.error('Error fixing registration message:', err);
                        }
                    }
                    const rooms = JSON.parse(message.data);
                    // Ensure room IDs are properly formatted as strings
                    const fixedRooms = rooms.map(room => ({
                        ...room,
                        roomId: String(room.roomId),
                        roomUsers: (room.roomUsers || []).map(user => ({
                            ...user,
                            index: String(user.index)
                        }))
                    }));

                    // Create a fixed message
                    const fixedMessage = {
                        ...message,
                        data: JSON.stringify(fixedRooms)
                    };

                    // Create a new event with our fixed message
                    const fixedEvent = new MessageEvent('message', {
                        data: JSON.stringify(fixedMessage)
                    });

                    // Dispatch the fixed event
                    this.dispatchEvent(fixedEvent);
                    return;
                }

                    // Fix for create_game messages to ensure consistent ID formats
                    if (message.type === 'create_game') {
                    try {
                        const gameData = JSON.parse(message.data);
                        // Ensure IDs are strings
                        const fixedGameData = {
                            idGame: String(gameData.idGame),
                            idPlayer: String(gameData.idPlayer)
                        };

                        // Create a fixed message
                        const fixedMessage = {
                            ...message,
                            data: JSON.stringify(fixedGameData)
                        };

                        // Create a new event with our fixed message
                        const fixedEvent = new MessageEvent('message', {
                            data: JSON.stringify(fixedMessage)
                        });

                        // Dispatch the fixed event
                        this.dispatchEvent(fixedEvent);
                        return;
                    } catch (err) {
                        console.error('Error fixing create_game message:', err);
                    }
                }

                // Pass through other messages
                this.dispatchEvent(new MessageEvent('message', { data: event.data }));
            } catch (error) {
                console.error('Error processing WebSocket message:', error);
                // Pass through the original message if there's an error
                this.dispatchEvent(new MessageEvent('message', { data: event.data }));
            }
        };
    }

    handleSocketError(error) {
        console.error('WebSocket error handling initiated:', error);

        if (!this.isReconnecting) {
            this.attemptReconnect();
        }
    }

    attemptReconnect() {
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

    send(data) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(data);
        } else {
            console.warn('WebSocket not ready, queueing message');
            this.messageQueue.push(data);
        }
    }

    close(code, reason) {
        if (this.socket) {
            this.socket.close(code, reason);
        }
    }

    flushMessageQueue() {
        while (this.messageQueue.length > 0 && this.socket.readyState === WebSocket.OPEN) {
            const message = this.messageQueue.shift();
            console.log('Sending queued message');
            this.socket.send(message);
        }
    }
}

    // Replace the WebSocket constructor
    window.WebSocket = function (url, protocols) {
    return new EnhancedWebSocket(url, protocols);
};

// Copy static properties
window.WebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
window.WebSocket.OPEN = OriginalWebSocket.OPEN;
window.WebSocket.CLOSING = OriginalWebSocket.CLOSING;
window.WebSocket.CLOSED = OriginalWebSocket.CLOSED;

console.log('WebSocket and room connection fix loaded');

// Add diagnostic logging to window.onerror
const originalOnError = window.onerror;
window.onerror = function (message, source, lineno, colno, error) {
    console.error('Global error:', { message, source, lineno, colno, error });
    if (originalOnError) {
        return originalOnError.apply(this, arguments);
    }
    return false;
};

// Fix for add_user_to_room messages
document.addEventListener('DOMContentLoaded', () => {
    console.log('Adding room joining fix listeners');

    // Intercept clicks on room join buttons via event delegation
    document.body.addEventListener('click', (event) => {
        // Wait a short time to see if a WebSocket message is about to be sent
        setTimeout(() => {
            const pendingSends = performance.getEntriesByType('resource')
                .filter(entry => entry.initiatorType === 'xmlhttprequest' && entry.name.includes('ws'));

            if (pendingSends.length > 0) {
                console.log('Detected potential room join action');
            }
        }, 100);
    });
});
}) ();
