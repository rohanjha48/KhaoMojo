/**
 * Zero-dependency Web Audio synthesizer & HTML5 Audio player for UI feedback
 */

export function playAudioElement(audioSrc = '/sounds/notification.mp3') {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));
  try {
    const audio = new Audio(audioSrc);
    audio.volume = 0.9;
    return audio.play();
  } catch (err) {
    return Promise.reject(err);
  }
}

function playSynthesizedChime(type) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === 'new-order') {
      // Urgent upbeat ping for incoming admin order
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.08);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.16);

      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } else {
      // Pleasant melodic chime for checkout success
      const now = ctx.currentTime;
      [
        { freq: 523.25, time: 0 },    // C5
        { freq: 659.25, time: 0.1 },  // E5
        { freq: 783.99, time: 0.2 },  // G5
        { freq: 1046.5, time: 0.3 },  // C6
      ].forEach(({ freq, time }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + time);
        gain.gain.setValueAtTime(0.2, now + time);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + time);
        osc.stop(now + time + 0.35);
      });
    }
  } catch {
    // Silently continue if autoplay policy restricts
  }
}

export function playChime(type = 'success') {
  if (typeof window === 'undefined') return;

  // Try HTML5 Audio element first (new Audio)
  const soundFile = type === 'new-order' ? '/sounds/notification.mp3' : '/sounds/notification.wav';
  playAudioElement(soundFile)
    .catch(() => {
      // Fallback to Web Audio synthesizer if autoplay was restricted or file missing
      playSynthesizedChime(type);
    });
}
