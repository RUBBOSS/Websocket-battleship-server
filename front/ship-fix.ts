interface ShipData {
    position: {
        x: number;
        y: number;
    };
    direction: boolean;
    length: number;
}

interface StartGameMessage {
    type: string;
    data: string;
}

(() => {
    window.addEventListener('load', function () {
        console.log('Ship direction fix loaded');

        const originalWebSocket = window.WebSocket;

        const CustomWebSocket = function (url: string, protocols?: string | string[]): WebSocket {
            console.log('Creating WebSocket with proxy for ship direction fix', url);

            const ws = protocols
                ? new originalWebSocket(url, protocols)
                : new originalWebSocket(url);

            const originalOnMessage = ws.onmessage;

            ws.onmessage = function (event: MessageEvent) {
                try {
                    const message = JSON.parse(event.data) as StartGameMessage;

                    if (message.type === 'start_game') {
                        console.log('Intercepting start_game message to fix ship directions');

                        try {
                            const gameData = JSON.parse(message.data);

                            if (gameData.ships && Array.isArray(gameData.ships)) {
                                gameData.ships = gameData.ships.map((ship: ShipData) => {
                                    const fixedShip = JSON.parse(JSON.stringify(ship));
                                    
                                    console.log(`Fixing ship direction from ${ship.direction} to ${!ship.direction}`);
                                    
                                    fixedShip.direction = !ship.direction;
                                    return fixedShip;
                                });
                            }

                            const fixedMessage = {
                                ...message,
                                data: JSON.stringify(gameData)
                            };

                            const fixedEvent = new MessageEvent('message', {
                                data: JSON.stringify(fixedMessage)
                            });

                            if (originalOnMessage) {
                                originalOnMessage.call(ws, fixedEvent);
                            }
                            return;
                        } catch (err) {
                            console.error('Error fixing ship directions:', err);
                        }
                    }

                    if (originalOnMessage) {
                        originalOnMessage.call(ws, event);
                    }
                } catch (err) {
                    console.error('Error in ship fix message handler:', err);
                    if (originalOnMessage) {
                        originalOnMessage.call(ws, event);
                    }
                }
            };

            return ws;
        };

        CustomWebSocket.CONNECTING = originalWebSocket.CONNECTING;
        CustomWebSocket.OPEN = originalWebSocket.OPEN;
        CustomWebSocket.CLOSING = originalWebSocket.CLOSING;
        CustomWebSocket.CLOSED = originalWebSocket.CLOSED;
        
        window.WebSocket = CustomWebSocket as any;
    });
})();
