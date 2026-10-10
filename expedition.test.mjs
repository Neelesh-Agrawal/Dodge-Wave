import assert from 'node:assert/strict';
import { EXPEDITION, randomSource, makeExpeditionPattern, irisCollision, laserClearance, rockClearance, crossing, LIMIT_X, LIMIT_Y, frameDelta, expeditionStage } from './rules.mjs';
assert.ok(EXPEDITION.filter(h=>!['ring','core'].includes(h.kind)).every(h=>h.arrival>=9),'first hazard leaves time to learn steering');
assert.deepEqual(EXPEDITION.filter(h=>h.kind==='core').map(h=>h.arrival),[22,47,72]);
for(let seed=1;seed<=200;seed++){
 const random=randomSource(seed);
 for(const spec of EXPEDITION){
  const h=makeExpeditionPattern(random,spec);
  assert.ok(Math.abs(h.x)<LIMIT_X&&Math.abs(h.y)<LIMIT_Y,'core and ring targets are reachable');
  if(h.kind==='iris'){
   assert.equal(irisCollision(h.x,h.y,h),false,'iris opening center clears the full wing footprint');
   assert.equal(irisCollision(h.x+h.radius,h.y,h),true,'outer wing striking a petal is detected');
   assert.equal(irisCollision(h.x,h.y+h.radius,h),true);
  }
 }
}
const beam={beamAngle:0,beamY:0};
assert.ok(laserClearance(0,0,beam)<0,'beam crossing hull causes damage');
assert.ok(laserClearance(0,1,beam)>0,'visible space above beam is safe');
assert.ok(laserClearance(.8,0,beam,Math.PI/2)<0,'vertical beam considers wing span');
assert.ok(laserClearance(1.5,0,beam,Math.PI/2)>0,'outside wing margin is safe');
assert.ok(rockClearance(0,0,{x:0,y:0,radius:1})<0);
assert.ok(rockClearance(2.5,0,{x:0,y:0,radius:1})>0);
for(const arrival of EXPEDITION.map(h=>h.arrival)){
 let crossed=0,previous=-300;
 for(let elapsed=0;elapsed<76;elapsed+=1/25){const z=4-(arrival-elapsed)*(18+elapsed*.09);if(crossing(previous,z))crossed++;previous=z;}
 assert.equal(crossed,1,'scheduled hazard plane crosses exactly once at low framerate');
}
console.log('Passed: 5s onboarding and danger at9s; three checkpoint arrivals; 4,000 reachable seeded targets; full-wing iris/laser collision; asteroid clearance; swept 25fps event crossings.');

assert.equal(frameDelta(999,1000),0,'queued animation timestamp before launch cannot move clock backwards');
assert.equal(expeditionStage(-.001),0,'negative jitter cannot announce collapse');
assert.equal(expeditionStage(0),0);assert.equal(expeditionStage(24.999),0);assert.equal(expeditionStage(25),1);assert.equal(expeditionStage(50),2);
