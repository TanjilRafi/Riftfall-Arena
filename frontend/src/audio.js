export function createAudio() {
  let ctx = null

  function init() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()
  }

  function noiseBurst(freq, dur, vol) {
    const now = ctx.currentTime
    const len = ctx.sampleRate * dur
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2)
    const src = ctx.createBufferSource(); src.buffer = buf
    const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = freq
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, now); g.gain.exponentialRampToValueAtTime(0.001, now + dur)
    src.connect(filt).connect(g).connect(ctx.destination)
    src.start(now)
  }

  function tone(type, f0, f1, dur, vol, delay = 0) {
    const now = ctx.currentTime + delay
    const osc = ctx.createOscillator(); osc.type = type
    osc.frequency.setValueAtTime(f0, now)
    if (f1) osc.frequency.exponentialRampToValueAtTime(f1, now + dur)
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, now); g.gain.exponentialRampToValueAtTime(0.001, now + dur)
    osc.connect(g).connect(ctx.destination)
    osc.start(now); osc.stop(now + dur + 0.02)
  }

  function playShot(weaponId) {
    init()
    if (weaponId === 'shotgun') { noiseBurst(600, 0.15, 0.4); tone('sawtooth', 80, 40, 0.1, 0.25) }
    else if (weaponId === 'smg') { noiseBurst(2500, 0.05, 0.2); tone('square', 180, 80, 0.04, 0.12) }
    else if (weaponId === 'pistol') { noiseBurst(1800, 0.08, 0.3); tone('square', 120, 50, 0.06, 0.15) }
    else { noiseBurst(2000, 0.08, 0.25); tone('square', 150, 60, 0.06, 0.18) }
  }

  function playHit() { init(); tone('square', 800, 400, 0.05, 0.12) }
  function playKill() { init(); tone('sawtooth', 600, 100, 0.2, 0.2) }
  function playReload() { init(); tone('square', 300, null, 0.03, 0.1); tone('square', 300, null, 0.03, 0.08, 0.15) }
  function playDamage() { init(); tone('sine', 200, 80, 0.15, 0.25) }
  function playWaveStart() {
    init()
    for (let i = 0; i < 3; i++) tone('sine', 440 * Math.pow(1.25, i), null, 0.08, 0.15, i * 0.1)
  }
  function playEmpty() { init(); tone('square', 200, 100, 0.03, 0.08) }

  return { init, playShot, playHit, playKill, playReload, playDamage, playWaveStart, playEmpty }
}
