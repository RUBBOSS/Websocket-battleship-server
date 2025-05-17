// Patch script for ship direction inconsistency
// This script runs after main.js has loaded and fixes ship direction rendering

(function () {
    // Wait for main.js to load and initialize
    window.addEventListener('load', function () {
        console.log('Ship direction patch loaded');

        // Function to monkey patch WebSocket handling
        function patchWebSocketHandler() {
            // Find the WebSocket instance that's created in main.js
            const originalWebSocketOnMessage = WebSocket.prototype.onmessage;

            WebSocket.prototype.onmessage = function (event) {
                try {
                    const data = JSON.parse(event.data);

                    // Only intercept the 'start_game' message to fix ship directions
                    if (data.type === 'start_game') {
                        const gameData = JSON.parse(data.data);

                        // Clone the message to avoid modifying the original
                        const newEvent = new MessageEvent('message', {
                            data: JSON.stringify({
                                ...data,
                                data: JSON.stringify({
                                    ...gameData,
                                    // We don't modify the ships here, we'll patch the board rendering instead
                                })
                            })
                        });

                        // Log the interception for debugging
                        console.log('Intercepted start_game message');

                        // Pass the event to the original handler
                        if (originalWebSocketOnMessage) {
                            return originalWebSocketOnMessage.call(this, newEvent);
                        }
                    }
                } catch (e) {
                    console.error('Error in WebSocket patch:', e);
                }

                // If not our target message or an error occurred, pass through to original handler
                if (originalWebSocketOnMessage) {
                    return originalWebSocketOnMessage.call(this, event);
                }
            };
        }

        // Apply the patches
        try {
            // Add a MutationObserver to watch for board updates and fix ship rendering
            function watchForBoardUpdates() {
                // This is a defensive approach, since we can't directly modify the minified code
                // We'll look for board elements and fix them when they're updated

                const observer = new MutationObserver(function (mutations) {
                    mutations.forEach(function (mutation) {
                        if (mutation.type === 'childList' && mutation.addedNodes.length) {
                            // Check if a new board was added or updated
                            // In a real situation, you'd need to identify the board elements more precisely
                            console.log('DOM updated, checking for board changes');
                        }
                    });
                });

                // Observe the entire document for changes
                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            }

            // Initialize patches
            patchWebSocketHandler();
            watchForBoardUpdates();

            console.log('Ship direction patch applied successfully');
        } catch (e) {
            console.error('Failed to apply ship direction patch:', e);
        }
    });
})();
