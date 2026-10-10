import assert from 'node:assert/strict';
import {randomSource,dailySeed,makePattern,gateCollision,gateClearance,crossing,LIMIT_X,LIMIT_Y} from './rules.mjs';
const date=new Date('2026-10-09T08:00:00Z');
assert.equal(dailySeed(date),dailySeed(new Date('2026-10-09T23:59:00Z')),'daily challenge must use one UTC seed');
assert.notEqual(dailySeed(date),dailySeed(new Date('2026-10-10T00:00:00Z')));
const a=randomSource(dailySeed(date)),b=randomSource(dailySeed(date));
for(let i=0;i<100;i++)assert.deepEqual(makePattern(a,i),makePattern(b,i),'same daily seed must produce the same hazard sequence');
const rng=randomSource(99);
for(let i=0;i<1000;i++){
 const gate=makePattern(rng,i);
 assert.ok(Math.abs(gate.x)<LIMIT_X&&Math.abs(gate.y)<LIMIT_Y,'every opening has a reachable center');
 assert.equal(gateCollision(gate.x,gate.y,gate),false,'the visible center is safe');
 assert.equal(gateCollision(gate.x+gate.gapX,gate.y,gate),true,'touching the frame causes a hit');
 assert.equal(gateCollision(gate.x,gate.y+gate.gapY,gate),true);
 assert.ok(gateClearance(gate.x,gate.y,gate)>1.4,'later stages still leave steering room');
}
assert.equal(crossing(-20,8),true,'fast hazards cannot tunnel through the player plane');
assert.equal(crossing(3.9,4),true);
assert.equal(crossing(4,5),false,'an already crossed plane must not hit twice');
assert.equal(crossing(1,3),false);
console.log('Passed: UTC daily determinism; 1,000 reachable hazard patterns; frame collision/clearance; swept plane crossings.');
