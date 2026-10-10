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

   assert.ok(((camera.position.x-(behind.x-origin.x))/12)**2+((camera.position.y-(behind.y-origin.y))/8.6)**2<.6,'Chase camera must stay safely inside tunnel');

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



// The near roof remains solid, with no hidden/translucent cutaway sections.
const world={dummy:new THREE.Object3D(),curveCache:new Map(),distance:1400,courseCenter:FlightWorld.prototype.courseCenter,courseOffset:FlightWorld.prototype.courseOffset,courseRotation:FlightWorld.prototype.courseRotation};
let matrix;const mesh={setMatrixAt(i,m){matrix=m.clone();}};
for(const z of [-16,-7,0,4,20]) {FlightWorld.prototype.setInstance.call(world,mesh,0,0,8,z,9.8,.16,8.8);assert.ok(matrix.determinant()>0,`Roof section ${z} must remain solid`);}

// Exercise the actual indexed corridor geometry and raycast it, without WebGL.
Object.assign(world,{materials:{dark:new THREE.MeshStandardMaterial()},scene:new THREE.Scene(),updateTunnelSurface:FlightWorld.prototype.updateTunnelSurface});
FlightWorld.prototype.makeTunnelSurface.call(world);
const surface=world.tunnelSurface, positions=surface.geometry.attributes.position;
assert.equal(surface.material.transparent,false);assert.equal(surface.material.opacity,1);
assert.equal(surface.geometry.index.count,(world.tunnelRows-1)*world.tunnelRadial*6);
const raycaster=new THREE.Raycaster(), direction=new THREE.Vector3();
for(let distance=0;distance<=FINISH_DISTANCE;distance+=200) {
 world.distance=distance;world.updateTunnelSurface();surface.updateMatrixWorld(true);
 for(let row=0;row<world.tunnelRows;row++) {
  const first=row*(world.tunnelRadial+1),last=first+world.tunnelRadial;
  assert.equal(positions.getX(first),positions.getX(last));assert.equal(positions.getY(first),positions.getY(last));assert.equal(positions.getZ(first),positions.getZ(last));
 }
 for(const [w,h] of [[390,844],[360,800],[1440,900]]) for(const nitro of [0,1]) for(const x of [-6.8,6.8]) for(const y of [-3.6,3.6]) {
  const fov=(w<h?70:59)+nitro*15,z=Math.max(20,4+11.5/(Math.tan(fov*Math.PI/360)*(w/h))),offset=world.courseOffset(z);
  const camera=new THREE.Vector3(offset.x+x*.32,offset.y+3.2+y*.16,z),target=new THREE.Vector3(x,y,4);
  direction.subVectors(target,camera);const length=direction.length();direction.normalize();
  raycaster.set(camera,direction);raycaster.far=length-.1;
  assert.equal(raycaster.intersectObject(surface).length,0,`Solid wall occludes ship at ${distance}m ${w}x${h}, ${x},${y}, nitro ${nitro}`);
 }
}
console.log('Opaque continuous tunnel seam, full geometry and camera-to-ship visibility pass');
