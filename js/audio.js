const AudioService = {
    synthesis: window.speechSynthesis,
    
    playWord(wordText, rate = 0.9) {
        if (!this.synthesis) {
            console.warn('Speech synthesis not supported in this browser.');
            return;
        }

        // Cancel any ongoing speech
        this.synthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(wordText);
        utterance.lang = 'en-US'; // Use US English
        utterance.rate = rate; // Configurable rate
        utterance.pitch = 1.1; // Slightly higher pitch

        // Try to find a good female voice if available
        const voices = this.synthesis.getVoices();
        const preferredVoice = voices.find(v => v.lang === 'en-US' && v.name.includes('Female'));
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }

        this.synthesis.speak(utterance);
    },

    init() {
        // Load voices early
        if (this.synthesis.onvoiceschanged !== undefined) {
            this.synthesis.onvoiceschanged = () => {
                // Voices loaded
            };
        }
    }
};

// Initialize audio service
AudioService.init();

const SoundEffects = {
    ctx: null,
    init() {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
    },
    playTone(freq, type, duration, vol=0.1) {
        if (!this.ctx) this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    },
    playCorrect() {
        this.playTone(659.25, 'sine', 0.1, 0.1); // E5
        setTimeout(() => this.playTone(880, 'sine', 0.2, 0.15), 100); // A5
    },
    playWrong() {
        this.playTone(300, 'triangle', 0.15, 0.2);
        setTimeout(() => this.playTone(200, 'triangle', 0.3, 0.2), 150);
    },
    playGameOver() {
        this.playTone(300, 'sawtooth', 0.2, 0.2);
        setTimeout(() => this.playTone(250, 'sawtooth', 0.2, 0.2), 200);
        setTimeout(() => this.playTone(200, 'sawtooth', 0.6, 0.2), 400);
    }
};
