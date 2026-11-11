/**
 * CoreSoundEffects.ts
 * Synthesizes high-fidelity, futuristic sound effects using Web Audio API nodes.
 * No external file dependencies - extremely low latency and highly reliable.
 */

export class CoreSoundEffects {
  private static instance: CoreSoundEffects | null = null;
  private ctx: AudioContext | null = null;

  private constructor() {}

  public static getInstance(): CoreSoundEffects {
    if (!CoreSoundEffects.instance) {
      CoreSoundEffects.instance = new CoreSoundEffects();
    }
    return CoreSoundEffects.instance;
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch((err) => console.error("[CoreSoundEffects] Resume failed:", err));
    }
  }

  /**
   * Sound 1: Fusion reactor startup hum (played when connecting/connected)
   */
  public playConnect() {
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      
      // Main power hum oscillator
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      // Setup lowpass filter for a warm, sub-bass feel
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(80, now);
      filter.frequency.exponentialRampToValueAtTime(180, now + 1.2);
      filter.Q.setValueAtTime(3, now);

      // Main tone starting at 50Hz sweeping to 90Hz
      osc1.type = "sawtooth";
      osc1.frequency.setValueAtTime(50, now);
      osc1.frequency.linearRampToValueAtTime(90, now + 1.0);

      // Sub-harmonic drone at 45Hz
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(45, now);

      // Volume envelope
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.18, now + 0.2);
      gainNode.gain.setValueAtTime(0.18, now + 0.8);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

      // Connections
      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      // Start and Stop
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.5);
      osc2.stop(now + 1.5);
    } catch (e) {
      console.warn("[CoreSoundEffects] Play connect failed:", e);
    }
  }

  /**
   * Sound 2: Soft high-tech ping (played when listening / activated)
   */
  public playActivation() {
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      // Primary crystal chime
      const osc1 = this.ctx.createOscillator();
      // Resonance chime
      const osc2 = this.ctx.createOscillator();
      
      const gainNode = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      // Bandpass filter to make it sound futuristic and clean
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1500, now);
      filter.frequency.exponentialRampToValueAtTime(800, now + 0.35);
      filter.Q.setValueAtTime(1.5, now);

      // Sine sweep
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(980, now);
      osc1.frequency.exponentialRampToValueAtTime(1480, now + 0.15);

      // Secondary frequency for crystal resonance (harmonic)
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1960, now);
      osc2.frequency.exponentialRampToValueAtTime(2960, now + 0.15);

      // Amplitude envelope (fast attack, smooth exponential decay)
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.12, now + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      // Connection
      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.5);
      osc2.stop(now + 0.5);
    } catch (e) {
      console.warn("[CoreSoundEffects] Play activation failed:", e);
    }
  }

  /**
   * Sound 3: High-tech powering down hum (played when disconnected)
   */
  public playDisconnect() {
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(150, now);
      filter.frequency.linearRampToValueAtTime(40, now + 0.7);

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.linearRampToValueAtTime(35, now + 0.75);

      gainNode.gain.setValueAtTime(0.15, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.85);
    } catch (e) {
      console.warn("[CoreSoundEffects] Play disconnect failed:", e);
    }
  }

  /**
   * Sound 4: Sleek audio-muted confirmation
   */
  public playMute() {
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc1.type = "triangle";
      osc2.type = "sine";

      // Descending beep-boop
      osc1.frequency.setValueAtTime(440, now);
      osc1.frequency.setValueAtTime(330, now + 0.08);

      osc2.frequency.setValueAtTime(220, now);
      osc2.frequency.setValueAtTime(165, now + 0.08);

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.1, now + 0.01);
      gainNode.gain.setValueAtTime(0.1, now + 0.15);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.3);
      osc2.stop(now + 0.3);
    } catch (e) {
      console.warn("[CoreSoundEffects] Play mute failed:", e);
    }
  }

  /**
   * Sound 5: Clean audio-unmuted activation confirmation
   */
  public playUnmute() {
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc1.type = "triangle";
      osc2.type = "sine";

      // Ascending boop-beep
      osc1.frequency.setValueAtTime(330, now);
      osc1.frequency.setValueAtTime(440, now + 0.08);

      osc2.frequency.setValueAtTime(165, now);
      osc2.frequency.setValueAtTime(220, now + 0.08);

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.1, now + 0.01);
      gainNode.gain.setValueAtTime(0.1, now + 0.15);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.3);
      osc2.stop(now + 0.3);
    } catch (e) {
      console.warn("[CoreSoundEffects] Play unmute failed:", e);
    }
  }

  /**
   * Sound 6: A very subtle haptic audio feedback click for speaking onset
   */
  public playSpeakingOnset() {
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.05);

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.08, now + 0.005);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch (e) {
      console.warn("[CoreSoundEffects] Play speaking onset failed:", e);
    }
  }

  /**
   * Sound 7: Play a unique audio chime for each theme change
   */
  public playThemeChime(themeId: string) {
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const cleanId = themeId.toLowerCase().trim();

      switch (cleanId) {
        case "shadow": {
          // Deep stealthy low sine sweep + soft harmonic high chime
          const oscLow = this.ctx.createOscillator();
          const oscHigh = this.ctx.createOscillator();
          const gainNode = this.ctx.createGain();
          const filter = this.ctx.createBiquadFilter();

          filter.type = "lowpass";
          filter.frequency.setValueAtTime(120, now);

          oscLow.type = "sine";
          oscLow.frequency.setValueAtTime(70, now);
          oscLow.frequency.exponentialRampToValueAtTime(110, now + 0.4);

          oscHigh.type = "sine";
          oscHigh.frequency.setValueAtTime(440, now);
          oscHigh.frequency.exponentialRampToValueAtTime(220, now + 0.3);

          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.linearRampToValueAtTime(0.12, now + 0.05);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

          oscLow.connect(filter);
          oscHigh.connect(gainNode);
          filter.connect(gainNode);
          gainNode.connect(this.ctx.destination);

          oscLow.start(now);
          oscHigh.start(now);
          oscLow.stop(now + 0.6);
          oscHigh.stop(now + 0.6);
          break;
        }

        case "cyber": {
          // Cyber Blue: Fast high-tech robotic arpeggio
          const osc1 = this.ctx.createOscillator();
          const osc2 = this.ctx.createOscillator();
          const gainNode = this.ctx.createGain();

          osc1.type = "square";
          osc2.type = "sine";

          // Note 1
          osc1.frequency.setValueAtTime(523.25, now); // C5
          osc2.frequency.setValueAtTime(261.63, now); // C4
          // Note 2 after 0.1s
          osc1.frequency.setValueAtTime(783.99, now + 0.08); // G5
          osc2.frequency.setValueAtTime(392.00, now + 0.08); // G4

          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.linearRampToValueAtTime(0.06, now + 0.01);
          gainNode.gain.setValueAtTime(0.06, now + 0.15);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

          osc1.connect(gainNode);
          osc2.connect(gainNode);
          gainNode.connect(this.ctx.destination);

          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 0.4);
          osc2.stop(now + 0.4);
          break;
        }

        case "crimson": {
          // Crimson Core: Low, dark, aggressive growl with filter sweep
          const osc1 = this.ctx.createOscillator();
          const osc2 = this.ctx.createOscillator();
          const gainNode = this.ctx.createGain();
          const filter = this.ctx.createBiquadFilter();

          filter.type = "lowpass";
          filter.frequency.setValueAtTime(1000, now);
          filter.frequency.exponentialRampToValueAtTime(120, now + 0.55);
          filter.Q.setValueAtTime(6, now);

          osc1.type = "sawtooth";
          osc1.frequency.setValueAtTime(65, now);
          osc1.frequency.linearRampToValueAtTime(55, now + 0.6);

          osc2.type = "sine";
          osc2.frequency.setValueAtTime(130, now);

          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.linearRampToValueAtTime(0.15, now + 0.05);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

          osc1.connect(filter);
          osc2.connect(filter);
          filter.connect(gainNode);
          gainNode.connect(this.ctx.destination);

          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 0.75);
          osc2.stop(now + 0.75);
          break;
        }

        case "emerald": {
          // Emerald Protocol: Matrix-style cascade of 3 high-speed retro beeps
          const osc = this.ctx.createOscillator();
          const gainNode = this.ctx.createGain();

          osc.type = "triangle";

          // Micro-beeps
          osc.frequency.setValueAtTime(880, now); // A5
          osc.frequency.setValueAtTime(1320, now + 0.05); // E6
          osc.frequency.setValueAtTime(1760, now + 0.1); // A6

          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.linearRampToValueAtTime(0.08, now + 0.01);
          gainNode.gain.setValueAtTime(0.08, now + 0.15);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

          osc.connect(gainNode);
          gainNode.connect(this.ctx.destination);

          osc.start(now);
          osc.stop(now + 0.4);
          break;
        }

        case "purple": {
          // Royal Purple: Deep majestic major triad swell (warm harmonic chord)
          const osc1 = this.ctx.createOscillator();
          const osc2 = this.ctx.createOscillator();
          const osc3 = this.ctx.createOscillator();
          const gainNode = this.ctx.createGain();

          osc1.type = "sine";
          osc2.type = "triangle";
          osc3.type = "sine";

          osc1.frequency.setValueAtTime(220, now); // A3
          osc2.frequency.setValueAtTime(277.18, now); // C#4
          osc3.frequency.setValueAtTime(329.63, now); // E4

          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.linearRampToValueAtTime(0.08, now + 0.15); // slow swell
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

          osc1.connect(gainNode);
          osc2.connect(gainNode);
          osc3.connect(gainNode);
          gainNode.connect(this.ctx.destination);

          osc1.start(now);
          osc2.start(now);
          osc3.start(now);
          osc1.stop(now + 0.9);
          osc2.stop(now + 0.9);
          osc3.stop(now + 0.9);
          break;
        }

        case "white": {
          // Arctic White: Icy, high-frequency crystal chime with glass-like fast decay
          const osc1 = this.ctx.createOscillator();
          const osc2 = this.ctx.createOscillator();
          const gainNode = this.ctx.createGain();

          osc1.type = "sine";
          osc2.type = "sine";

          osc1.frequency.setValueAtTime(2500, now);
          osc1.frequency.exponentialRampToValueAtTime(1200, now + 0.15);

          osc2.frequency.setValueAtTime(5000, now); // Super high shimmer

          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.linearRampToValueAtTime(0.08, now + 0.005);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

          osc1.connect(gainNode);
          osc2.connect(gainNode);
          gainNode.connect(this.ctx.destination);

          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 0.3);
          osc2.stop(now + 0.3);
          break;
        }

        case "gold": {
          // Gold Elite: Shimmering perfect chord with vibrato
          const osc1 = this.ctx.createOscillator();
          const osc2 = this.ctx.createOscillator();
          const osc3 = this.ctx.createOscillator();
          const gainNode = this.ctx.createGain();

          osc1.type = "sine";
          osc2.type = "sine";
          osc3.type = "sine";

          osc1.frequency.setValueAtTime(440, now); // A4
          osc2.frequency.setValueAtTime(554.37, now); // C#5
          osc3.frequency.setValueAtTime(659.25, now); // E5

          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.linearRampToValueAtTime(0.08, now + 0.08);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

          osc1.connect(gainNode);
          osc2.connect(gainNode);
          osc3.connect(gainNode);
          gainNode.connect(this.ctx.destination);

          osc1.start(now);
          osc2.start(now);
          osc3.start(now);
          osc1.stop(now + 0.7);
          osc2.stop(now + 0.7);
          osc3.stop(now + 0.7);
          break;
        }

        case "neon": {
          // Neon RGB: Laser-like pitch sweep
          const osc = this.ctx.createOscillator();
          const gainNode = this.ctx.createGain();

          osc.type = "triangle";
          osc.frequency.setValueAtTime(300, now);
          osc.frequency.exponentialRampToValueAtTime(1400, now + 0.15);
          osc.frequency.linearRampToValueAtTime(400, now + 0.35);

          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.linearRampToValueAtTime(0.07, now + 0.02);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

          osc.connect(gainNode);
          gainNode.connect(this.ctx.destination);

          osc.start(now);
          osc.stop(now + 0.5);
          break;
        }

        default: {
          // Fallback simple clean ping
          const osc = this.ctx.createOscillator();
          const gainNode = this.ctx.createGain();

          osc.type = "sine";
          osc.frequency.setValueAtTime(880, now);
          osc.frequency.exponentialRampToValueAtTime(440, now + 0.2);

          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.linearRampToValueAtTime(0.1, now + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

          osc.connect(gainNode);
          gainNode.connect(this.ctx.destination);

          osc.start(now);
          osc.stop(now + 0.35);
          break;
        }
      }
    } catch (e) {
      console.warn("[CoreSoundEffects] Play theme chime failed:", e);
    }
  }
}
