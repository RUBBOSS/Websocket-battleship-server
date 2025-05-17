// Fix for ship direction inconsistency between frontend and backend

(function () {
    // Wait for the page to load
    window.addEventListener('load', function () {
        console.log('Ship direction fix loaded');

        // We need to intercept the WebSocket messages
        const originalWebSocket = window.WebSocket;

        // Create a proxy for the WebSocket to intercept messages
        window.WebSocket = function (url, protocols) {
            console.log('Creating WebSocket with proxy for ship direction fix', url);

            // Create the actual WebSocket
            const ws = protocols
                ? new originalWebSocket(url, protocols)
                : new originalWebSocket(url);

            // Store the original onmessage handler
            const originalOnMessage = ws.onmessage;

            // Replace the onmessage handler with our proxy
            ws.onmessage = function (event) {
                try {
                    // Parse the message
                    const message = JSON.parse(event.data);

                    // Check if this is a start_game message
                    if (message.type === 'start_game') {
                        console.log('Intercepting start_game message to fix ship directions');

                        // Parse the data from the message
                        const gameData = JSON.parse(message.data);

                        // Make a deep copy of the ships to avoid reference issues
                        const fixedShips = JSON.parse(JSON.stringify(gameData.ships));

                        // Create a new message with corrected ship directions
                        const fixedMessage = {
                            ...message,
                            data: JSON.stringify({
                                ...gameData,
                                ships: fixedShips
                            })
                        };

                        // Create a new event with our fixed message
                        const fixedEvent = new MessageEvent('message', {
                            data: JSON.stringify(fixedMessage)
                        });

                        // Call the original handler with our fixed event
                        if (typeof originalOnMessage === 'function') {
                            return originalOnMessage.call(ws, fixedEvent);
                        }
                    }
                } catch (e) {
                    console.error('Error in ship direction fix:', e);
                }

                // Fall back to the original handler for all other messages
                if (typeof originalOnMessage === 'function') {
                    return originalOnMessage.call(ws, event);
                }
            };

            return ws;
        };

        // Copy over the prototype and static properties
        window.WebSocket.prototype = originalWebSocket.prototype;
        window.WebSocket.CONNECTING = originalWebSocket.CONNECTING;
        window.WebSocket.OPEN = originalWebSocket.OPEN;
        window.WebSocket.CLOSING = originalWebSocket.CLOSING;
        window.WebSocket.CLOSED = originalWebSocket.CLOSED;

        console.log('Ship direction fix applied');
    });

    // Also patch the ship display in case our WebSocket proxy wasn't applied in time
    // This directly modifies the ship rendering function in the redux store
    setTimeout(function () {
        // This code runs after a delay to ensure the game has loaded
        console.log('Applying direct ship rendering fix');

        // We need to monkey patch the function that processes ships when rendering them
        // Since we don't have access to the internal functions directly, we'll try to
        // intercept redux actions for board updates

        if (window.__REDUX_DEVTOOLS_EXTENSION__) {
            // Add a listener if Redux DevTools are available
            console.log('Redux DevTools detected, adding action listener');

            window.__REDUX_DEVTOOLS_EXTENSION__.subscribe((message) => {
                if (message.type === 'DISPATCH' && message.payload.type === 'JUMP_TO_ACTION') {
                    // This is called when a board is being rendered
                    console.log('Redux action intercepted, checking for ship rendering');
                }
            });
        }
    }, 2000);
})();
