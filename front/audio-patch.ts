interface OriginalAudioPlayer {
    playAudio: (type: string) => void;
    killShip: () => void;
    shotShip: () => void;
    missShip: () => void;
    playMusic: () => void;
    updateSetting: (type: 'music' | 'sound', settings: Partial<AudioSettings>) => void;
    sound: AudioSettings;
    music: AudioSettings;
}

interface AudioSettings {
    volume: number;
    isSound: boolean;
}

declare global {
    interface Window {
        qo?: OriginalAudioPlayer;
        AudioPlayerInstance: {
            playAudio: (type: string) => void;
            killShip: () => void;
            shotShip: () => void;
            missShip: () => void;
            playMusic: () => void;
            updateSetting: (type: 'music' | 'sound', settings: Partial<AudioSettings>) => void;
            sound: AudioSettings;
            music: AudioSettings;
        };
    }
}

(function () {
    window.addEventListener('load', function () {

        if (window.qo && window.qo.playAudio) {
            console.log('Patching Battleship audio player to use AudioPlayerInstance');

            const originalPlayAudio = window.qo.playAudio;
            const originalKillShip = window.qo.killShip;
            const originalShotShip = window.qo.shotShip;
            const originalMissShip = window.qo.missShip;
            const originalPlayMusic = window.qo.playMusic;
            const originalUpdateSetting = window.qo.updateSetting;

            window.qo.playAudio = function (type: string) {
                console.log('Using patched playAudio:', type);
                window.AudioPlayerInstance.playAudio(type);
            };

            window.qo.killShip = function () {
                window.AudioPlayerInstance.killShip();
            };

            window.qo.shotShip = function () {
                window.AudioPlayerInstance.shotShip();
            };

            window.qo.missShip = function () {
                window.AudioPlayerInstance.missShip();
            };

            window.qo.playMusic = function () {
                window.AudioPlayerInstance.playMusic();
            };

            window.qo.updateSetting = function (type: 'music' | 'sound', settings: Partial<AudioSettings>) {
                window.AudioPlayerInstance.updateSetting(type, settings);
                originalUpdateSetting.call(window.qo, type, settings);
            };

            window.AudioPlayerInstance.sound = window.qo.sound;
            window.AudioPlayerInstance.music = window.qo.music;

            console.log('Audio player successfully patched');
        }
    });
})();
