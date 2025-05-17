// Audio player with browser autoplay policy handling
class AudioPlayer {
    constructor() {
        this.sound = { volume: 0.5, isSound: true };
        this.music = { volume: 0.5, isSound: false };

        // Initialize audio elements
        this.missAudio = new Audio();
        this.missAudio.src = "./public/assets/mp3/miss.mp3";

        this.killAudio = new Audio();
        this.killAudio.src = "./public/assets/mp3/killed.mp3";

        this.shotAudio = new Audio();
        this.shotAudio.src = "./public/assets/mp3/shot.mp3";

        this.musicAudio = new Audio();
        this.musicAudio.src = "./public/assets/mp3/music.mp3";

        // Queue for sound effects
        this.audioQueue = [];

        // Flag to track if the user has interacted with the page
        this.userInteracted = false;

        // Add event listeners for user interaction
        this.setupUserInteractionListeners();

        // Process audio queue periodically
        setInterval(() => this.processAudioQueue(), 100);
    }

    // Setup listeners for user interaction events
    setupUserInteractionListeners() {
        const interactionEvents = [
            'click', 'touchstart', 'keydown', 'mousedown'
        ];

        interactionEvents.forEach(eventType => {
            document.addEventListener(eventType, () => {
                this.userInteracted = true;
            }, { once: false });
        });
    }

    // Add sound to the queue
    queueAudio(type) {
        this.audioQueue.push(type);
        this.processAudioQueue();
    }

    // Process the audio queue if user has interacted
    processAudioQueue() {
        if (!this.userInteracted || this.audioQueue.length === 0) return;

        const audioType = this.audioQueue.shift();
        this.playAudioImmediately(audioType);
    }

    // Queue audio based on event type
    playAudio(type) {
        this.queueAudio(type);
    }

    // Actual audio playing implementation
    playAudioImmediately(type) {
        switch (type) {
            case 'shot':
                this.shotShip();
                break;
            case 'killed':
                this.killShip();
                break;
            case 'miss':
                this.missShip();
                break;
        }
    }

    // Settings getters and setters
    getSetting(type) {
        return type === 'music' ? this.music : this.sound;
    }

    updateSetting(type, settings) {
        if (type === 'music') {
            this.music = Object.assign(this.music, settings);
            this.music.isSound ? this.tryPlayMusic() : this.musicAudio.pause();
        } else {
            this.sound = Object.assign(this.sound, settings);
        }
    }

    // Try to play music if user has interacted
    tryPlayMusic() {
        if (this.userInteracted) {
            this.playMusic();
        } else {
            // Add a one-time listener to play music after interaction
            const playMusicOnce = () => {
                this.playMusic();
                document.removeEventListener('click', playMusicOnce);
                document.removeEventListener('touchstart', playMusicOnce);
            };

            document.addEventListener('click', playMusicOnce);
            document.addEventListener('touchstart', playMusicOnce);
        }
    }

    // Play background music
    playMusic() {
        this.musicAudio.volume = this.music.volume;

        // Use a promise to handle autoplay restrictions
        const playPromise = this.musicAudio.play();

        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.log("Music autoplay prevented: ", error);
                // Music will be played later after user interaction
            });
        }

        this.musicAudio.onended = () => {
            this.musicAudio.currentTime = 0;
            this.playMusic();
        };
    }

    // Play ship hit sound
    shotShip() {
        if (!this.sound.isSound) return;

        this.shotAudio.currentTime = 0;
        if (this.shotAudio.currentTime > 0 &&
            !this.shotAudio.paused &&
            !this.shotAudio.ended &&
            this.shotAudio.readyState > this.shotAudio.HAVE_CURRENT_DATA) {
            return;
        }

        this.shotAudio.volume = this.sound.volume;
        const playPromise = this.shotAudio.play();

        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.log("Shot sound autoplay prevented: ", error);
            });
        }
    }

    // Play ship killed sound
    killShip() {
        if (!this.sound.isSound) return;

        this.killAudio.currentTime = 0;
        if (this.killAudio.currentTime > 0 &&
            !this.killAudio.paused &&
            !this.killAudio.ended &&
            this.killAudio.readyState > this.killAudio.HAVE_CURRENT_DATA) {
            return;
        }

        this.killAudio.volume = this.sound.volume;
        const playPromise = this.killAudio.play();

        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.log("Kill sound autoplay prevented: ", error);
            });
        }
    }

    // Play miss sound
    missShip() {
        if (!this.sound.isSound) return;

        this.missAudio.currentTime = 0;
        if (this.missAudio.currentTime > 0 &&
            !this.missAudio.paused &&
            !this.missAudio.ended &&
            this.missAudio.readyState > this.missAudio.HAVE_CURRENT_DATA) {
            return;
        }

        this.missAudio.volume = this.sound.volume;
        const playPromise = this.missAudio.play();

        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.log("Miss sound autoplay prevented: ", error);
            });
        }
    }
}

// Export a singleton instance
window.AudioPlayerInstance = new AudioPlayer();
