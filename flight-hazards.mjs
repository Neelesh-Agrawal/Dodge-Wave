import * as THREE from './vendor/three.module.js';
import { clamp, makeExpeditionPattern } from './rules.mjs?v=canopy-1';
const TAU = Math.PI * 2;
export class FlightHazards {
  constructor(world) { this.world = world; this.scene = world.scene; this.live = []; this.rockGeometry = new THREE.IcosahedronGeometry(1, 1); this.rockMaterial = new THREE.MeshStandardMaterial({ color: 0x514a48, roughness: .9, metalness: .15 }); this.pickupGeometry = new THREE.TorusGeometry(.82, .07, 8, 40); }
  clear() { this.live.forEach(h => this.dispose(h)); this.live.length = 0; }
  dispose(h) { this.scene.remove(h.group); h.group.traverse(mesh => { if (mesh.geometry && mesh.geometry !== this.world.boxGeometry && mesh.geometry !== this.rockGeometry && mesh.geometry !== this.pickupGeometry) mesh.geometry.dispose(); if (mesh.userData.ownMaterial) mesh.material.dispose(); }); }
  add(spec, random) {
    const data = makeExpeditionPattern(random, spec); const group = new THREE.Group(); const h = { ...data, group, checked: false, collected: false, previousZ: -300, z: -300, rocks: [], blades: [], beamAngle: 0, beamY: 0 };
    if (h.kind === 'iris') this.makeIris(h); else if (h.kind === 'laser') this.makeLaser(h); else if (h.kind === 'debris') this.makeDebris(h, random); else if (h.kind === 'core') this.makeCore(h); else this.makeRing(h);
    this.scene.add(group); this.live.push(h); return h;
  }
  makeRing(h) { const pickup = new THREE.Mesh(this.pickupGeometry, this.world.materials.cyan); pickup.position.set(h.x, h.y, 0); h.group.add(pickup); h.pickup = pickup; h.group.add(this.world.glow(0x45f9e0, 3.2, h.x, h.y, 0)); }
  makeIris(h) {
    const w = this.world, frame = new THREE.Group(); frame.position.set(h.x, h.y, 0); h.group.add(frame); h.frame = frame;
    if(h.wave){const wall=new THREE.Shape();wall.absellipse(0,0,14,10,0,TAU,false);const hole=new THREE.Path();hole.absarc(h.x,h.y,6.15,0,TAU,true);wall.holes.push(hole);const bulkhead=new THREE.Mesh(new THREE.ExtrudeGeometry(wall,{depth:.3,bevelEnabled:false,curveSegments:40,steps:1}),w.materials.dark);bulkhead.position.z=-.35;h.group.add(bulkhead);}
    frame.add(w.torus(6.2, .28, w.materials.armor, 80)); frame.add(w.torus(5.8, .1, w.materials.amber, 80)); frame.add(w.torus(6.5, .1, w.materials.dark, 80));
    // Six authored annular petals leave a circular opening; every surface has real thickness.
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * TAU, shape = new THREE.Shape(), inner = h.radius, outer = 5.9;
      shape.absarc(0, 0, outer, a + .025, a + TAU / 6 - .025, false);
      shape.lineTo(Math.cos(a + TAU / 6 - .025) * inner, Math.sin(a + TAU / 6 - .025) * inner);
      shape.absarc(0, 0, inner, a + TAU / 6 - .025, a + .025, true); shape.closePath();
      const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: .36, bevelEnabled: true, bevelThickness: .07, bevelSize: .06, bevelSegments: 1, steps: 1 }), i % 2 ? w.materials.dark : w.materials.armor); mesh.position.z = -.18; frame.add(mesh); h.blades.push(mesh);
      const bracket = w.box(.3, 1.5, .7, w.materials.copper, Math.cos(a) * 6.15, Math.sin(a) * 6.15, 0); bracket.rotation.z = a; frame.add(bracket);
      const arc = w.torus(h.radius + .02, .055, w.materials.cyan, 12, TAU / 6 - .08); arc.rotation.z = a + .04; arc.position.z = .35; frame.add(arc);
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(.14, .14, .5, 8), w.materials.copper); bolt.rotation.x = Math.PI / 2; bolt.position.set(Math.cos(a + .4) * 5.5, Math.sin(a + .4) * 5.5, .3); frame.add(bolt);
    }
    this.makeRing(h); h.group.add(w.glow(0x34dcca, 3.7, h.x, h.y, -.5));
  }
  makeLaser(h) {
    const w = this.world; const mechanism = new THREE.Group(); h.mechanism = mechanism; h.group.add(mechanism);
    const beamMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.8, .2, .03), transparent: true, opacity: .85 });
    const haloMat = new THREE.MeshBasicMaterial({ color: 0xff5424, transparent: true, opacity: .16, blending: THREE.AdditiveBlending, depthWrite: false });
    const beam = w.box(21, .13, .13, beamMat), halo = w.box(21, .55, .2, haloMat); beam.userData.ownMaterial = halo.userData.ownMaterial = true; mechanism.add(beam, halo); h.beam = beam; h.halo = halo;
    for (const side of [-1, 1]) { const emitter = new THREE.Group(); emitter.position.x = side * 10.5; emitter.add(w.box(.9, 1.4, 1.2, w.materials.dark)); emitter.add(w.box(.18, .85, 1.25, w.materials.copper, -.25)); emitter.add(w.glow(0xff7a23, 3)); const mouth = w.torus(.42, .12, w.materials.amber, 24); mouth.rotation.y = Math.PI / 2; emitter.add(mouth); mechanism.add(emitter); }
    if (h.cross) { const second = mechanism.clone(); second.rotation.z = Math.PI / 2; h.group.add(second); h.secondBeam = second; }
    this.makeRing(h);
  }
  makeDebris(h, random) {
    const w = this.world;
    for (let i = 0; i < 6 + h.stage; i++) {
      let x, y, radius; do { x = (random() - .5) * 15; y = (random() - .5) * 8.3; radius = .65 + random() * .9; } while (Math.hypot((x - h.x) / 1.6, y - h.y) < radius + 1.5);
      const rock = new THREE.Group(); rock.position.set(x, y, (random() - .5) * 5); const mesh = new THREE.Mesh(this.rockGeometry, this.rockMaterial); mesh.scale.set(radius, radius * .8, radius); rock.add(mesh);
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(radius * .3), w.materials.amber); crystal.position.set(radius * .6, radius * .3, radius * .5); crystal.rotation.set(random() * 2, random() * 2, random() * 2); rock.add(crystal);
      const strap = w.torus(radius * .7, .035, w.materials.copper, 18); strap.rotation.set(random() * 3, random() * 3, random() * 3); rock.add(strap); h.group.add(rock); h.rocks.push({ x, y, radius, localZ: rock.position.z, mesh: rock, checked: false, spin: (random() - .5) * .4 });
    }
    this.makeRing(h);
  }
  makeCore(h) {
    const w = this.world; const core = new THREE.Group(); core.position.set(h.x, h.y, 0); h.core = core; h.group.add(core);
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(.8), w.materials.cyan); core.add(crystal); h.crystal = crystal;
    for (let i = 0; i < 3; i++) { const ring = w.torus(1.35 + i * .16, .07, i % 2 ? w.materials.copper : w.materials.amber, 48); ring.rotation.set(i * .8, i * .65, i * .3); core.add(ring); }
    core.add(w.glow(0x36f5df, 5)); h.pickup = core;
    // Large docking brackets make the checkpoint visible well before arrival.
    for (const side of [-1, 1]) { const bracket = w.box(.12, 2.1, .18, w.materials.cyan, h.x + side * 2.4, h.y, -.3); h.group.add(bracket); h.group.add(w.box(.7, .12, .18, w.materials.cyan, h.x + side * 2.1, h.y + 1.05, -.3)); h.group.add(w.box(.7, .12, .18, w.materials.cyan, h.x + side * 2.1, h.y - 1.05, -.3)); }
  }
  update(h, elapsed, speed, dt, distance = this.world.distance) {
    h.previousZ = h.z; h.z = Number.isFinite(h.distance) ? 4 - (h.distance - distance) : 4 - (h.arrival - elapsed) * speed; const offset = this.world.courseOffset(h.z, distance), rotation = this.world.courseRotation(h.z, distance);
    h.group.position.set(offset.x, offset.y, h.z); h.group.rotation.set(rotation.x, rotation.y, 0);
    if (h.kind === 'iris') h.frame.rotation.z = elapsed * h.rotation;
    if (h.kind === 'laser') {
      h.beamAngle = Math.sin(elapsed * .43 + h.seed) * (h.cross ? .2 : .45); h.beamY = Math.sin(elapsed * .85 + h.seed) * 1.6;
      h.mechanism.rotation.z = h.beamAngle; h.mechanism.position.y = h.beamY;
      if (h.secondBeam) { h.secondBeam.rotation.z = h.beamAngle + Math.PI / 2; h.secondBeam.position.y = h.beamY; }
      const until = Number.isFinite(h.distance) ? (h.distance - distance) / Math.max(speed, 1) : h.arrival - elapsed; const warning = until > 1.5; h.beam.scale.y = warning ? .4 : 1; h.beam.material.color.setRGB(warning ? 1.8 : 3.8, warning ? .8 : .2, .025); h.halo.visible = !warning;
      const sign = h.y > 0 ? 1 : -1; h.pickup.position.y = clamp(h.beamY + sign * 2.6, -3.45, 3.45); h.pickup.position.x = h.x; h.y = h.pickup.position.y;
    }
    if (h.kind === 'debris') h.rocks.forEach(r => { r.mesh.rotation.x += dt * r.spin; r.mesh.rotation.y += dt * .15; });
    if (h.kind === 'core') { h.core.rotation.z = elapsed * .5; h.crystal.rotation.y += dt * .8; }
    else if (h.pickup) h.pickup.rotation.z += dt * .6;
  }
  collect(h) { h.collected = true; h.pickup.visible = false; if (h.kind === 'core') h.group.visible = false; }
}
