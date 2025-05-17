// Patch script for main.js
// This script runs after main.js has loaded and patches the audio functionality

(function () {
    // Wait for main.js to load and initialize
    window.addEventListener('load', function () {
        // Check if the audio player instance from main.js exists
        // (We're looking for the global qo variable which is the audio player instance)

        // Replace the global sound player's playAudio method
        if (window.qo && window.qo.playAudio) {
            console.log('Patching Battleship audio player to use AudioPlayerInstance');

            // Save original methods for reference
            const originalPlayAudio = window.qo.playAudio;
            const originalKillShip = window.qo.killShip;
            const originalShotShip = window.qo.shotShip;
            const originalMissShip = window.qo.missShip;
            const originalPlayMusic = window.qo.playMusic;
            const originalUpdateSetting = window.qo.updateSetting;

            // Override methods to use our AudioPlayerInstance
            window.qo.playAudio = function (type) {
                console.log('Using patched playAudio:', type);
                // Use our new player's queue system
                window.AudioPlayerInstance.playAudio(type);
            };

            window.qo.killShip = function () {
                // Forward to our instance
                window.AudioPlayerInstance.killShip();
            };

            window.qo.shotShip = function () {
                // Forward to our instance
                window.AudioPlayerInstance.shotShip();
            };

            window.qo.missShip = function () {
                // Forward to our instance
                window.AudioPlayerInstance.missShip();
            };

            window.qo.playMusic = function () {
                // Forward to our instance
                window.AudioPlayerInstance.playMusic();
            };

            window.qo.updateSetting = function (type, settings) {
                // Update our instance settings
                window.AudioPlayerInstance.updateSetting(type, settings);
                // Also call original to keep UI in sync
                originalUpdateSetting.call(window.qo, type, settings);
            };

            // Sync settings
            window.AudioPlayerInstance.sound = window.qo.sound;
            window.AudioPlayerInstance.music = window.qo.music;

            console.log('Audio player successfully patched');
        }
    });
})();
