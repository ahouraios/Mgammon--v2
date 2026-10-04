// Web Audio API Sound Synthesizer for Workshop Alarms
// Works on all modern browsers (Desktop & Mobile) without requiring external audio files.

import { AlarmRingtone } from '../types';

let audioCtx: AudioContext | null = null;
let currentLoopTimeout: any = null;
let isRinging = false;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playAlarmSound(ringtone: AlarmRingtone = 'BELL', loop = true) {
  stopAlarmSound();
  isRinging = true;

  // Trigger Mobile Phone Vibration if supported
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate([400, 200, 400, 200, 800]);
    } catch {}
  }

  const playSingleRound = () => {
    if (!isRinging) return;
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      if (ringtone === 'BELL') {
        // Classic Factory/School Bell Chime (double metallic strike)
        const strikes = [0, 0.25, 0.55, 0.8];
        strikes.forEach((st) => {
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();

          osc1.type = 'triangle';
          osc1.frequency.setValueAtTime(880, now + st); // A5

          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(1760, now + st); // A6 overtone

          gain.gain.setValueAtTime(0.5, now + st);
          gain.gain.exponentialRampToValueAtTime(0.001, now + st + 0.35);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);

          osc1.start(now + st);
          osc2.start(now + st);
          osc1.stop(now + st + 0.36);
          osc2.stop(now + st + 0.36);
        });

        if (loop && isRinging) {
          currentLoopTimeout = setTimeout(playSingleRound, 2000);
        }
      } else if (ringtone === 'GENTLE') {
        // Gentle Melodic Harp Chime (C5, E5, G5, C6)
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.2);

          gain.gain.setValueAtTime(0.4, now + idx * 0.2);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.2 + 0.6);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + idx * 0.2);
          osc.stop(now + idx * 0.2 + 0.65);
        });

        if (loop && isRinging) {
          currentLoopTimeout = setTimeout(playSingleRound, 2500);
        }
      } else if (ringtone === 'SIREN') {
        // Urgent Industrial Siren / Two-tone Beep
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(750, now);
        osc.frequency.linearRampToValueAtTime(1100, now + 0.35);
        osc.frequency.linearRampToValueAtTime(750, now + 0.7);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.setValueAtTime(0.4, now + 0.7);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.86);

        if (loop && isRinging) {
          currentLoopTimeout = setTimeout(playSingleRound, 1200);
        }
      }
    } catch (err) {
      console.warn('AudioContext playback error:', err);
    }
  };

  playSingleRound();
}

export function stopAlarmSound() {
  isRinging = false;
  if (currentLoopTimeout) {
    clearTimeout(currentLoopTimeout);
    currentLoopTimeout = null;
  }
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(0);
    } catch {}
  }
}
