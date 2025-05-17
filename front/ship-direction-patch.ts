interface GameData {
    ships?: any[];
    currentPlayerIndex?: string;
    [key: string]: any;
}

interface StartGameMessage {
    type: string;
    data: string;
    [key: string]: any;
}

(() => {
    window.addEventListener('load', function () {
        console.log('Ship direction patch loaded');

        function patchWebSocketHandler(): void {
            const originalWebSocketOnMessage = WebSocket.prototype.onmessage;

            WebSocket.prototype.onmessage = function(this: WebSocket, event: MessageEvent) {
                try {
                    const data = JSON.parse(event.data) as StartGameMessage;

                    if (data.type === 'start_game') {
                        const gameData = JSON.parse(data.data) as GameData;

                        const newEvent = new MessageEvent('message', {
                            data: JSON.stringify({
                                ...data,
                                data: JSON.stringify({
                                    ...gameData,
                                })
                            })
                        });

                        patchShipRendering();

                        if (originalWebSocketOnMessage) {
                            originalWebSocketOnMessage.call(this, newEvent);
                        }
                        return;
                    }

                    if (originalWebSocketOnMessage) {
                        originalWebSocketOnMessage.call(this, event);
                    }
                } catch (err) {
                    console.error('Error in ship direction patch:', err);
                    if (originalWebSocketOnMessage) {
                        originalWebSocketOnMessage.call(this, event);
                    }
                }
            };
        }

        function patchShipRendering(): void {

            console.log('Patching ship rendering to fix direction issues');

            setTimeout(() => {
                if ((window as any).gameRenderer && (window as any).gameRenderer.renderShips) {
                    const originalRenderShips = (window as any).gameRenderer.renderShips;
                    
                    (window as any).gameRenderer.renderShips = function(ships: any[]) {
                        const fixedShips = ships.map(ship => ({
                            ...ship,
                            direction: !ship.direction
                        }));
                        
                        return originalRenderShips.call(this, fixedShips);
                    };
                }
            }, 500);
        }

        patchWebSocketHandler();
    });
})();
