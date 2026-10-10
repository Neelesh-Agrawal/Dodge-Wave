// Locally synthesized effects: no downloads, autoplay, or background music.
export class FlightAudio {
  constructor(Context = globalThis.AudioContext || globalThis.webkitAudioContext) { this.Context=Context; this.enabled=false; }
  async enable(value) {
    this.enabled=value;
    if(!value) { if(this.context)this.master.gain.setTargetAtTime(0,this.context.currentTime,.015); this.stop(); return false; }
    try {
      if(!this.context) this.build(new this.Context());
      await this.context.resume();
      if(this.context.state!=='running') throw Error('Audio unavailable');
      this.master.gain.setTargetAtTime(this.enabled?.65:0,this.context.currentTime,.015);
      if(this.enabled) this.tone(660,.18,880);
      return this.enabled;
    } catch { this.enabled=false; this.stop(); return false; }
  }
  build(c) {
    this.context=c; this.master=c.createGain(); this.master.gain.value=.65; this.master.connect(c.destination);
    this.engine=c.createOscillator(); this.engine.type='sawtooth';
    this.filter=c.createBiquadFilter(); this.filter.type='lowpass'; this.filter.frequency.value=650;
    this.engineGain=c.createGain(); this.engineGain.gain.value=0;
    this.engine.connect(this.filter); this.filter.connect(this.engineGain); this.engineGain.connect(this.master); this.engine.start();
    const buffer=c.createBuffer(1,c.sampleRate*2,c.sampleRate), data=buffer.getChannelData(0);
    for(let i=0;i<data.length;i++) data[i]=Math.random()*2-1;
    this.wind=c.createBufferSource(); this.wind.buffer=buffer; this.wind.loop=true;
    this.windFilter=c.createBiquadFilter(); this.windFilter.type='bandpass'; this.windFilter.frequency.value=900; this.windFilter.Q.value=.7;
    this.windGain=c.createGain(); this.windGain.gain.value=0;
    this.wind.connect(this.windFilter); this.windFilter.connect(this.windGain); this.windGain.connect(this.master); this.wind.start();
  }
  stop() { if(!this.context)return; const t=this.context.currentTime; this.engineGain.gain.setTargetAtTime(0,t,.03); this.windGain.gain.setTargetAtTime(0,t,.03); }
  update(playing,speed,boost) {
    if(!this.context)return;
    const c=this.context,t=c.currentTime,on=playing&&this.enabled;
    this.engineGain.gain.setTargetAtTime(on?(boost?.105:.07):0,t,.08);
    this.engine.frequency.setTargetAtTime(100+speed*1.3+(boost?70:0),t,.12);
    this.filter.frequency.setTargetAtTime(boost?1500:650+speed*3,t,.15);
    this.windGain.gain.setTargetAtTime(on?(boost?.16:.025):0,t,.1);
    this.windFilter.frequency.setTargetAtTime(boost?1900:900,t,.15);
  }
  tone(frequency=500,duration=.15,end=frequency) {
    if(!this.enabled||!this.context)return;
    const c=this.context,t=c.currentTime,osc=c.createOscillator(),gain=c.createGain();
    osc.type=frequency<200?'triangle':'sine'; osc.connect(gain); gain.connect(this.master);
    osc.frequency.setValueAtTime(frequency,t); osc.frequency.exponentialRampToValueAtTime(end,t+duration);
    gain.gain.setValueAtTime(.14,t); gain.gain.exponentialRampToValueAtTime(.001,t+duration);
    osc.onended=()=>{osc.disconnect();gain.disconnect();}; osc.start(); osc.stop(t+duration);
  }
}
