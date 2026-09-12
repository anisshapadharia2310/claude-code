// Ambient office loop, generated live — no audio files, nothing downloaded.
export function startAmbience(){
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const out = ctx.createGain(); out.gain.value = 0; out.connect(ctx.destination);
  out.gain.linearRampToValueAtTime(.5, ctx.currentTime + 1.5);

  // room tone: brown noise, heavily filtered
  const len = ctx.sampleRate * 4;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++){ const w = Math.random()*2-1; last = (last + .02*w)/1.02; d[i] = last*3.2; }
  const tone = ctx.createBufferSource(); tone.buffer = buf; tone.loop = true;
  const lp = ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value = 380;
  const tg = ctx.createGain(); tg.gain.value = .22;
  tone.connect(lp).connect(tg).connect(out); tone.start();

  // distant chatter: band-passed noise, slowly swelling
  const chat = ctx.createBufferSource(); chat.buffer = buf; chat.loop = true;
  const bp = ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value = 700; bp.Q.value = 1.4;
  const cg = ctx.createGain(); cg.gain.value = .05;
  const lfo = ctx.createOscillator(); lfo.frequency.value = .08;
  const lfoGain = ctx.createGain(); lfoGain.gain.value = .035;
  lfo.connect(lfoGain).connect(cg.gain); lfo.start();
  chat.connect(bp).connect(cg).connect(out); chat.start();

  // keyboard taps
  let stopped = false;
  function tap(){
    if (stopped) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'square';
    o.frequency.value = 1400 + Math.random()*900;
    const g = ctx.createGain();
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(.03 + Math.random()*.02, t + .002);
    g.gain.exponentialRampToValueAtTime(.0001, t + .045);
    const f = ctx.createBiquadFilter(); f.type='bandpass'; f.frequency.value = 2200; f.Q.value = .8;
    o.connect(f).connect(g).connect(out);
    o.start(t); o.stop(t + .06);
    setTimeout(tap, 60 + Math.random() * 520);
  }
  setTimeout(tap, 400);

  return { ctx, stop(){ stopped = true; ctx.close(); } };
}
