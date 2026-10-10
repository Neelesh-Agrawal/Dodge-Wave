import assert from 'node:assert/strict';
import {FlightAudio} from './flight-audio.mjs';
class Param {value=0;setTargetAtTime(v){this.value=v;}setValueAtTime(v){this.value=v;}exponentialRampToValueAtTime(v){this.value=v;}}
class Node {gain=new Param();frequency=new Param();Q=new Param();connect(){}start(){}stop(){this.onended?.();}disconnect(){}}
class Context {
 currentTime=1;sampleRate=48000;state='suspended';destination={};
 async resume(){this.state='running';}createGain(){return new Node();}createOscillator(){return new Node();}createBiquadFilter(){return new Node();}createBufferSource(){return new Node();}
 createBuffer(ch,n){return {getChannelData:()=>new Float32Array(n)}}
}
const audio=new FlightAudio(Context);
assert.equal(await audio.enable(true),true);assert.equal(audio.context.state,'running');
audio.update(true,50,false);const normal=audio.engineGain.gain.value,wind=audio.windGain.gain.value;
assert.ok(normal>=.05,'Engine must have an audible midrange signal');assert.ok(audio.engine.frequency.value>=160);
audio.update(true,100,true);assert.ok(audio.engineGain.gain.value>normal);assert.ok(audio.windGain.gain.value>wind*4,'Nitro has a distinct wind rush');
audio.update(false,50,false);assert.equal(audio.engineGain.gain.value,0);assert.equal(audio.windGain.gain.value,0);
await audio.enable(false);assert.equal(audio.master.gain.value,0,'Off mutes effects as well as engine');
audio.update(true,50,true);assert.equal(audio.engineGain.gain.value,0);
await audio.enable(true);assert.ok(audio.master.gain.value>0);
class Blocked extends Context {async resume(){throw Error('blocked');}}
assert.equal(await new FlightAudio(Blocked).enable(true),false,'Blocked audio must not pretend Sound is on');
console.log('Sound unlock, audible engine range, nitro rush, pause, full mute and blocked-context recovery pass');
