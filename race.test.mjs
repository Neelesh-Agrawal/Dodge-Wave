import assert from 'node:assert/strict';
import {FlightRace,FINISH_DISTANCE,waveAt,speedAt,BOOST_MULTIPLIER,courseCenter,courseSlope,driftAt,resolveVehicleCollisions} from './race.mjs';
import {makeExpeditionPattern,laserClearance,clamp} from './rules.mjs';
// Endless: no finish line, no bots, speed keeps rising but is capped.
assert.equal(FINISH_DISTANCE,Infinity);assert.equal(waveAt(0),1);assert(waveAt(20000)>20);
assert(speedAt(1)>=40,'Immediate pace');assert(speedAt(11)>speedAt(1)*1.8,'Difficulty visibly accelerates');assert(speedAt(30)>speedAt(11),'Speed keeps creeping up');assert(speedAt(1000)<=118,'Speed is capped');assert(BOOST_MULTIPLIER>=1.6);
const a=new FlightRace(12),b=new FlightRace(12);assert.equal(a.rivals.length,0,'Solo run');assert.equal(a.rank,1);
let count=0;for(let i=0;i<1800;i++){a.step(1/60);b.step(1/60);count+=a.upcoming().length;b.upcoming();}assert.equal(a.distance,b.distance,'Deterministic per seed');assert(count>18,'Obstacles appear often from the start');assert(!a.finished);
const fast=new FlightRace(12);for(let i=0;i<1800;i++)fast.step(1/60,true);assert(fast.distance>a.distance*1.6,'Nitro provides a real burst');
const player={x:0,y:0,tx:0,ty:0,distance:20},opponent={x:0,y:0,distance:20};assert.equal(resolveVehicleCollisions(player,[opponent]).length,1);
for(const m of [100,600,1400,5500]){const slope=courseSlope(m),c0=courseCenter(m),c1=courseCenter(m+.001);assert(Math.abs(slope.x-(c1.x-c0.x)/.001)<.00001);assert(Math.abs(slope.y-(c1.y-c0.y)/.001)<.00001);}
assert(Math.hypot(driftAt(180,85,.04).x,driftAt(180,85,.04).y)>Math.hypot(driftAt(180,46,.04).x,driftAt(180,46,.04).y),'Corners require more countersteer at speed');
// A very long run keeps generating fair, reachable obstacles.
const arrivals=[],long=new FlightRace(99);for(let i=0;i<60*600;i++){long.step(1/60);arrivals.push(...long.upcoming());}
assert(!long.finished);assert(long.distance>30000,'Ten minutes of flight covers a long distance');assert(arrivals.every((s,i)=>!i||s.distance>arrivals[i-1].distance));assert(arrivals.length>300);
assert(arrivals.filter(h=>['iris','laser','debris'].includes(h.kind)).length/arrivals.length>.7,'Most encounters require steering');
for(let i=1;i<arrivals.length;i++){const h=arrivals[i],p=arrivals[i-1],pattern=makeExpeditionPattern(()=>.5,h),seconds=(h.distance-p.distance)/speedAt(h.wave);assert(pattern.radius>2.3,'Opening fits player wings');assert(seconds>.8,'Encounters keep a useful reaction interval');assert(Math.abs(h.routeX-p.routeX)/seconds<8);assert(Math.abs(h.routeY-p.routeY)/seconds<6);}
for(const h of arrivals.filter(h=>h.cross).slice(0,40))for(const beamY of [-1.6,0,1.6])for(const beamAngle of [-.2,0,.2]){const pattern=makeExpeditionPattern(()=>.5,h),y=clamp(beamY+Math.sign(pattern.y)*2.6,-3.45,3.45);assert(laserClearance(pattern.x,y,{beamY,beamAngle})>0&&laserClearance(pattern.x,y,{beamY,beamAngle},beamAngle+Math.PI/2)>0,'Crossed lasers keep a safe route');}
long.reset(99);assert.equal(long.distance,0);
console.log('Dodge Me endless: solo run, rising capped speed, nitro, curved course, ten-minute fair obstacle stream and reset passed.');
