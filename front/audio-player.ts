interface AudioSettings {
    volume: number;
    isSound: boolean;
}

type AudioType = 'shot' | 'killed' | 'miss';

class AudioPlayer {
    private sound: AudioSettings;
    private music: AudioSettings;

    private missAudio: HTMLAudioElement;
    private killAudio: HTMLAudioElement;
    private shotAudio: HTMLAudioElement;
    private musicAudio: HTMLAudioElement;

    private audioQueue: AudioType[];
    private userInteracted: boolean;

    constructor() {
        this.sound = { volume: 0.5, isSound: true };
        this.music = { volume: 0.5, isSound: false };

        this.missAudio = new Audio();
        this.missAudio.src = "./public/assets/mp3/miss.mp3";

        this.killAudio = new Audio();
        this.killAudio.src = "./public/assets/mp3/killed.mp3";

        this.shotAudio = new Audio();
        this.shotAudio.src = "./public/assets/mp3/shot.mp3";

        this.musicAudio = new Audio();
        this.musicAudio.src = "./public/assets/mp3/music.mp3";

        this.audioQueue = [];

        this.userInteracted = false;

        this.setupUserInteractionListeners();

        setInterval(() => this.processAudioQueue(), 100);
    }

    private setupUserInteractionListeners(): void {
        const interactionEvents = [
            'click', 'touchstart', 'keydown', 'mousedown'
        ];

        interactionEvents.forEach(eventType => {
            document.addEventListener(eventType, () => {
                this.userInteracted = true;
            }, { once: false });
        });
    }

    private queueAudio(type: AudioType): void {
        this.audioQueue.push(type);
        this.processAudioQueue();
    }

    private processAudioQueue(): void {
        if (!this.userInteracted || this.audioQueue.length === 0) return;

        const audioType = this.audioQueue.shift();
        if (audioType) {
            this.playAudioImmediately(audioType);
        }
    }

    public playAudio(type: AudioType): void {
        this.queueAudio(type);
    }

    private playAudioImmediately(type: AudioType): void {
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

    public getSetting(type: 'music' | 'sound'): AudioSettings {
        return type === 'music' ? this.music : this.sound;
    }

    public updateSetting(type: 'music' | 'sound', settings: Partial<AudioSettings>): void {
        if (type === 'music') {
            this.music = Object.assign(this.music, settings);
            this.music.isSound ? this.tryPlayMusic() : this.musicAudio.pause();
        } else {
            this.sound = Object.assign(this.sound, settings);
        }
    }

    private tryPlayMusic(): void {
        if (this.userInteracted) {
            this.playMusic();
        } else {
            const playMusicOnce = (): void => {
                this.playMusic();
                document.removeEventListener('click', playMusicOnce);
                document.removeEventListener('touchstart', playMusicOnce);
            };

            document.addEventListener('click', playMusicOnce);
            document.addEventListener('touchstart', playMusicOnce);
        }
    }

    public playMusic(): void {
        this.musicAudio.volume = this.music.volume;

        const playPromise = this.musicAudio.play();

        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.log("Music autoplay prevented: ", error);
            });
        }

        this.musicAudio.onended = () => {
            this.musicAudio.currentTime = 0;
            this.playMusic();
        };
    }

    public shotShip(): void {
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

    public killShip(): void {
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

    public missShip(): void {
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

declare global {
    interface Window {
        AudioPlayerInstance: {
            playAudio: (type: string) => void;
            killShip: () => void;
            shotShip: () => void;
            missShip: () => void;
            playMusic: () => void;
            updateSetting: (type: "music" | "sound", settings: Partial<AudioSettings>) => void;
            sound: AudioSettings;
            music: AudioSettings;
        };
    }
}

const audioPlayer = new AudioPlayer();
window.AudioPlayerInstance = {
    playAudio: (type: string) => {
        if (type === 'shot' || type === 'killed' || type === 'miss') {
            audioPlayer.playAudio(type);
        }
    },
    killShip: () => audioPlayer.killShip(),
    shotShip: () => audioPlayer.shotShip(),
    missShip: () => audioPlayer.missShip(),
    playMusic: () => audioPlayer.playMusic(),
    updateSetting: (type, settings) => audioPlayer.updateSetting(type, settings),
    get sound() { return audioPlayer.getSetting('sound'); },
    get music() { return audioPlayer.getSetting('music'); }
};
