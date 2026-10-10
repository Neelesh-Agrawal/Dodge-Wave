import * as THREE from './vendor/three.module.js';

import assert from 'node:assert/strict';

import { courseCenter, courseSlope, FINISH_DISTANCE } from './race.mjs';

import { FlightWorld } from './flight-world.mjs';

// The entire route, including its worst vertical/horizontal turns, steering

// limits and full nitro FOV. Test wing tips as well as the center of the craft.

for (const [w,h] of [[390,844],[360,800],[1440,900]]) {

 let minX=1,maxX=-1,minY=1,maxY=-1;

 for(let distance=0;distance<=FINISH_DISTANCE;distance+=40) {

  const origin=courseCenter(distance), ahead=courseCenter(distance+38), slope=courseSlope(distance), nextSlope=courseSlope(distance+65);

  const bank=THREE.MathUtils.clamp((nextSlope.x-slope.x)*2.7,-.24,.24);

  for(const nitro of [0,1]) for(const x of [-6.8,0,6.8]) for(const y of [-3.6,0,3.6]) {

   const camera=new THREE.PerspectiveCamera((w<h?70:59)+nitro*15,w/h,.15,650);

   const z=Math.max(20,4+11.5/(Math.tan(camera.fov*Math.PI/360)*camera.aspect)), behind=courseCenter(distance+4-z);

   camera.position.set(behind.x-origin.x+x*.32,behind.y-origin.y+3.2+y*.16,z);

   assert.ok(((camera.position.x-(behind.x-origin.x))/12)**2+((camera.position.y-(behind.y-origin.y))/8.6)**2<.6,'Chase camera must stay within the orbital guide hoops');

   camera.lookAt(ahead.x-origin.x+x*.1,ahead.y-origin.y+y*.08,-34); camera.rotateZ(bank*.75); camera.updateMatrixWorld();

   for(const wing of [-1.42,0,1.42]) {

    const p=new THREE.Vector3(x+wing*Math.cos(bank*1.4),y+wing*Math.sin(bank*1.4),4).project(camera);

    assert.ok(Math.abs(p.x)<1&&Math.abs(p.y)<1,`${w}x${h}: craft clipped at ${distance}m, steering ${x},${y}, nitro ${nitro}`);

    minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);

   }

  }

 }

 console.log(`${w}x${h}: all 12km turns and nitro pass, x[${minX.toFixed(2)},${maxX.toFixed(2)}] y[${minY.toFixed(2)},${maxY.toFixed(2)}]`);

}



// Open orbital architecture must not enclose the celestial background. Check
// the real station builder and verify hidden legacy geometry is never updated.
const world={dummy:new THREE.Object3D(),curveCache:new Map(),distance:1400,nitro:0,courseCenter:FlightWorld.prototype.courseCenter,courseOffset:FlightWorld.prototype.courseOffset,courseRotation:FlightWorld.prototype.courseRotation,setInstance:FlightWorld.prototype.setInstance};
Object.assign(world,{boxGeometry:new THREE.BoxGeometry(),materials:{armor:new THREE.MeshStandardMaterial(),dark:new THREE.MeshStandardMaterial(),copper:new THREE.MeshStandardMaterial(),cyan:new THREE.MeshStandardMaterial(),amber:new THREE.MeshStandardMaterial()},scene:new THREE.Scene(),makeTunnelSurface(){this.tunnelSurface=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshBasicMaterial());},updateTunnelSurface(){throw Error('Hidden surface must not rebuild every frame');}});
FlightWorld.prototype.makeStation.call(world);
assert.equal(world.tunnelSurface.visible,false,'The racing course must remain open to space');
assert.equal(world.ribs.count,20);assert.equal(world.segmentSpacing,12);
world.streaks={geometry:{attributes:{position:{array:new Float32Array(6)}}},material:{opacity:0}};world.streakData=[{x:0,y:0,z:-60}];
FlightWorld.prototype.updateArchitecture.call(world,.016,50,0);
for(const mesh of [world.ribs,world.lights,world.pipes,world.cableLights]) for(const value of mesh.instanceMatrix.array) assert.ok(Number.isFinite(value),'Orbital track transforms remain finite');
console.log('Open orbital course, stable track transforms and hidden-surface budget pass');
