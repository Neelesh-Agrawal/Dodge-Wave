import * as THREE from './vendor/three.module.js';
import { EffectComposer } from './vendor/addons/postprocessing/EffectComposer.js';
import { RenderPass } from './vendor/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './vendor/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from './vendor/addons/postprocessing/OutputPass.js';
import { randomSource, clamp } from './rules.mjs?v=cosmic-3';
import { courseCenter as routeCenter, courseSlope } from './race.mjs?v=cosmic-3';
const TAU = Math.PI * 2;
export class FlightWorld {
  constructor(canvas, { quality = true, reduced = false } = {}) {
    this.quality = quality; this.reduced = reduced; this.time = 0; this.distance = 0; this.curveCache = new Map(); this.bank = 0; this.nitro = 0;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.setClearColor(0x030b16);
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x050918, 125, 275);
    this.camera = new THREE.PerspectiveCamera(59, 1, .15, 650);
    this.camera.position.set(-2.6, 4.8, 18);
    this.look = new THREE.Vector3(0, 0, -32);
    this.scene.add(new THREE.HemisphereLight(0xa3d9f1, 0x17151c, 1.6));
    const light = new THREE.DirectionalLight(0xc9e3ef, 2.6); light.position.set(18, 12, -30); this.scene.add(light);
    const rim = new THREE.DirectionalLight(0x45d7ff, 2); rim.position.set(-12, 2, 14); this.scene.add(rim);
    this.boxGeometry = new THREE.BoxGeometry();
    this.metalTexture = this.makePanelTexture();
    this.materials = {
      armor: new THREE.MeshStandardMaterial({ color: 0x8fabb8, map: this.metalTexture, roughness: .5, metalness: .75 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x223846, map: this.metalTexture, roughness: .65, metalness: .7 }),
      copper: new THREE.MeshStandardMaterial({ color: 0xb65c2f, map: this.metalTexture, roughness: .45, metalness: .75 }),
      amber: new THREE.MeshStandardMaterial({ color: 0xff9d38, emissive: 0xff6d12, emissiveIntensity: 3.2, roughness: .35 }),
      cyan: new THREE.MeshStandardMaterial({ color: 0x8dfcf0, emissive: 0x36e4d3, emissiveIntensity: 3, roughness: .2 }),
      danger: new THREE.MeshBasicMaterial({ color: new THREE.Color(3.4, .18, .035) }),
      glass: new THREE.MeshStandardMaterial({ color: 0x063143, metalness: .92, roughness: .1, emissive: 0x176782, emissiveIntensity: .65 }),
    };
    this.glowTexture = this.makeGlow();
    this.makeHorizon(); this.makeStation(); this.makeShip(); this.makeRivals(); this.makeDust(); this.streaks.visible = quality;
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .43, .35, 1.15);
    this.composer.addPass(this.bloom); this.composer.addPass(new OutputPass());
    this.particles = []; this.particleGeometry = new THREE.OctahedronGeometry(.07); this.particleMaterials = new Map(); this.resize();
  }
  makePanelTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 1024; const g = c.getContext('2d');
    g.fillStyle = '#87939b'; g.fillRect(0, 0, 1024, 1024);
    const rng = randomSource(7129);
    for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) {
      const x = col * 256, y = row * 256;
      g.fillStyle = row % 2 ? '#9ba5aa' : '#7b8b95'; g.fillRect(x + 5, y + 5, 246, 246);
      g.strokeStyle = '#354956'; g.lineWidth = 5; g.strokeRect(x + 5, y + 5, 246, 246);
      g.strokeStyle = '#c0cbd0'; g.lineWidth = 2; g.strokeRect(x + 12, y + 12, 232, 232);
      for (const dx of [20, 236]) for (const dy of [20, 236]) { g.fillStyle = '#293841'; g.beginPath(); g.arc(x + dx, y + dy, 5, 0, TAU); g.fill(); g.fillStyle = '#d2d8da'; g.fillRect(x + dx - 2, y + dy - 3, 4, 2); }
      if ((row + col) % 3 === 0) { g.fillStyle = '#172e3d'; g.fillRect(x + 40, y + 58, 175, 120); for (let k = 0; k < 8; k++) { g.fillStyle = '#536771'; g.fillRect(x + 47, y + 63 + k * 13, 162, 6); } }
      else { g.fillStyle = '#42545d'; g.fillRect(x + 45, y + 174, 168, 30); g.fillStyle = '#d7dcda'; g.font = 'bold 15px Arial'; g.fillText(`DM / ${row}${col} — 07`, x + 48, y + 195); g.strokeStyle = '#4c616d'; g.lineWidth = 2; g.strokeRect(x + 50, y + 48, 155, 104); }
      g.fillStyle = '#edba60'; for (let k = 0; k < 6; k++) { g.save(); g.translate(x + 130 + k * 15, y + 27); g.rotate(-.6); g.fillRect(0, 0, 8, 14); g.restore(); }
    }
    for (let i = 0; i < 320; i++) { const x = rng() * 1024, y = rng() * 1024; g.strokeStyle = rng() > .5 ? '#ffffff18' : '#071c3028'; g.lineWidth = rng() * 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + rng() * 35, y + rng() * 6); g.stroke(); }
    const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4; texture.wrapS = texture.wrapT = THREE.RepeatWrapping; return texture;
  }
  makeGlow() {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const glow = g.createRadialGradient(64, 64, 0, 64, 64, 64); glow.addColorStop(0, '#ffffff'); glow.addColorStop(.12, '#ffffffcc'); glow.addColorStop(.35, '#ffffff35'); glow.addColorStop(1, '#ffffff00'); g.fillStyle = glow; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
  }
  box(w, h, d, material, x = 0, y = 0, z = 0) { const mesh = new THREE.Mesh(this.boxGeometry, material); mesh.scale.set(w, h, d); mesh.position.set(x, y, z); return mesh; }
  torus(r, tube, material, segments = 64, arc = TAU) { return new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, segments, arc), material); }
  glow(color, size, x = 0, y = 0, z = 0) { const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTexture, color, transparent: true, opacity: .75, blending: THREE.AdditiveBlending, depthWrite: false })); sprite.scale.setScalar(size); sprite.position.set(x, y, z); return sprite; }
  // Orbital hoops, guide rails, hazards and racers share one curved centerline.
  courseCenter(meters) { return routeCenter(meters); }
  courseOffset(z, distance = this.distance) {
    const origin = this.courseCenter(distance), point = this.courseCenter(distance + 4 - z);
    return { x: point.x - origin.x, y: point.y - origin.y };
  }
  courseRotation(z, distance = this.distance) {
    const a = this.courseCenter(distance + 4 - z - .5), b = this.courseCenter(distance + 4 - z + .5);
    return { x: Math.atan2(b.y - a.y, 1), y: -Math.atan2(b.x - a.x, 1) };
  }
  makeHorizon() {
    this.scene.background = new THREE.Color(0x030611);
    // A single distant sky pass leaves the racing corridor open to space. The
    // accretion disc and its bent image are analytical, with no texture fetches
    // or costly ray marching; the star field stays crisp in either quality mode.
    this.skyMaterial = new THREE.ShaderMaterial({
      uniforms: { aspect: { value: 1 }, time: { value: 0 } }, depthWrite: false, depthTest: false, fog: false,
      vertexShader: 'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader: `
        varying vec2 vUv; uniform float aspect; uniform float time;
        float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
        float stars(vec2 p,float grid,float cutoff){vec2 cell=floor(p*grid),local=fract(p*grid)-.5;float seed=hash(cell);vec2 offset=vec2(hash(cell+7.1),hash(cell+19.7))*.65-.325;float d=length(local-offset);return step(cutoff,seed)*(exp(-d*d*850.)*.85+exp(-d*d*36.)*.055);}
        void main(){
          vec2 p=(vUv-.5)*vec2(aspect,1.);
          float cloud=noise(p*3.6+vec2(3.7,8.1))*.6+noise(p*8.3+4.)*.28+noise(p*17.1)*.12;
          float band=exp(-pow((p.y+p.x*.25+.19)*3.1,2.));
          vec3 color=vec3(.009,.016,.039)+vec3(.037,.022,.083)*cloud*band;
          color+=vec3(.012,.028,.053)*pow(cloud,3.)*2.;
          float st=stars(p+2.,155.,.978)+stars(p+8.,83.,.988)*1.4;
          color+=vec3(.68,.79,1.)*st;
          // Keep the landmark visible above the flight line on narrow screens.
          float wide=smoothstep(.65,1.2,aspect);
          float centerX=mix(aspect*.07,min(aspect*.23,.33),wide);
          vec2 q=(p-vec2(centerX,.235))*mix(1.85,1.,smoothstep(.55,1.25,aspect));
          float angle=-.14; q=mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*q;
          float r=length(q), theta=atan(q.y,q.x);
          float discR=length(vec2(q.x,q.y*5.1));
          float banding=.73+.15*sin(discR*590.+theta*5.-time*.12)+.12*sin(discR*237.-theta*9.);
          float disc=smoothstep(.115,.142,discR)*(1.-smoothstep(.28,.41,discR));
          float hot=exp(-pow((discR-.153)/.023,2.));
          vec3 ember=mix(vec3(.62,.12,.025),vec3(1.,.67,.27),hot);
          color+=ember*disc*banding*.9;
          color+=vec3(.31,.105,.028)*exp(-pow((discR-.19)/.12,2.))*.3;
          // Photon ring and the lensed rear disc wrapping over the black core.
          float lens=exp(-pow((r-.128)/.014,2.));
          float photon=exp(-pow((r-.1145)/.0028,2.));
          float upper=smoothstep(-.035,.05,q.y);
          color+=vec3(1.,.49,.12)*lens*(.32+upper*.85)*( .86+.14*sin(theta*41.));
          color+=vec3(1.,.86,.54)*photon*.95;
          color+=vec3(.24,.075,.022)*exp(-pow((r-.13)/.052,2.));
          color*=smoothstep(.108,.113,r);
          // The near side of the disc crosses in front of the lower silhouette.
          float front=disc*(1.-smoothstep(-.035,-.005,q.y));
          color+=ember*front*banding*.6;
          gl_FragColor=vec4(color,1.);
        }`
    });
    this.sky = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.skyMaterial); this.sky.position.z = -500; this.sky.renderOrder = -100; this.sky.frustumCulled = false;
    this.camera.add(this.sky); this.scene.add(this.camera);
    this.finishGate = new THREE.Group(); this.finishGate.visible = false; this.scene.add(this.finishGate);
    const material = new THREE.MeshStandardMaterial({ color: 0xf1e9c7, emissive: 0xffd97a, emissiveIntensity: 1.4, roughness: .3 });
    const ring = this.torus(9, .45, material, 80); ring.scale.y = .82; this.finishGate.add(ring);
    const c = document.createElement('canvas'); c.width = 512; c.height = 128;
    const g = c.getContext('2d'); g.fillStyle = '#071522'; g.fillRect(0, 0, 512, 128); g.fillStyle = '#fff3c9'; g.font = 'bold 64px Arial'; g.textAlign = 'center'; g.fillText('FINISH', 256, 87);
    const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(8, 2), new THREE.MeshBasicMaterial({ map: texture })); sign.position.set(0, 6, .5); this.finishGate.add(sign);
    for (const side of [-1, 1]) this.finishGate.add(this.box(.25, 13, .6, material, side * 9));
  }
  makeStation() {
    this.rng = randomSource(6917); const count = 20; this.segmentSpacing = 12; this.segmentPositions = Array.from({ length: count }, (_, i) => 24 - i * this.segmentSpacing);
    const ringGeo = new THREE.TorusGeometry(12.7, .12, 6, 64);
    this.ribs = new THREE.InstancedMesh(ringGeo, this.materials.armor, count); this.ribs.frustumCulled = false; this.scene.add(this.ribs);
    // No enclosed wall or fading panels: open rings reveal the cosmic horizon.
    this.makeTunnelSurface(); this.tunnelSurface.visible = false;
    this.lights = new THREE.InstancedMesh(this.boxGeometry, this.materials.cyan, count * 8); this.lights.frustumCulled = false; this.scene.add(this.lights);
    this.dummy = new THREE.Object3D();
    // Sectioned cable trunks follow the actual bends, with no straight pipes
    // cutting across the flight corridor.
    this.pipes = new THREE.InstancedMesh(this.boxGeometry, this.materials.copper, count * 4); this.pipes.frustumCulled = false; this.scene.add(this.pipes);
    this.cableLights = new THREE.InstancedMesh(this.boxGeometry, this.materials.amber, count * 4); this.cableLights.frustumCulled = false; this.scene.add(this.cableLights);
    this.shafts = new THREE.Group(); this.scene.add(this.shafts);
    const shaftMat = new THREE.MeshBasicMaterial({ color: 0x35c9e0, transparent: true, opacity: .035, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    for (let i = 0; i < 8; i++) { const shaft = new THREE.Mesh(new THREE.ConeGeometry(3.2, 30, 24, 1, true), shaftMat); shaft.rotation.z = i % 2 ? .6 : -.6; shaft.position.set(i % 2 ? -10 : 10, 0, -i * 27); this.shafts.add(shaft); }
    this.debris = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), this.materials.dark, 90); this.debris.frustumCulled = false; this.scene.add(this.debris);
    this.debrisData = Array.from({ length: 90 }, () => ({ x: (this.rng() > .5 ? 1 : -1) * (16 + this.rng() * 25), y: (this.rng() - .5) * 38, z: -this.rng() * 230, r: .5 + this.rng() * 2, spin: this.rng() * TAU }));
  }
  makeTunnelSurface() {
    const radial = 32, rows = 83, stride = radial + 1;
    this.tunnelRows = rows; this.tunnelRadial = radial;
    const positions = new Float32Array(rows * stride * 3), normals = new Float32Array(positions.length), uv = new Float32Array(rows * stride * 2), indices = [];
    for (let row = 0; row < rows - 1; row++) for (let j = 0; j < radial; j++) {
      const a = row * stride + j, b = a + stride;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2).setUsage(THREE.DynamicDrawUsage));
    geometry.setIndex(indices);
    const material = this.materials.dark.clone(); material.side = THREE.DoubleSide; material.color.setHex(0x425b6b); material.roughness = .78; material.metalness = .38;
    this.tunnelSurface = new THREE.Mesh(geometry, material); this.tunnelSurface.frustumCulled = false; this.scene.add(this.tunnelSurface);
    this.updateTunnelSurface();
  }
  updateTunnelSurface() {
    const geometry = this.tunnelSurface.geometry, position = geometry.attributes.position, normal = geometry.attributes.normal, uv = geometry.attributes.uv;
    const radial = this.tunnelRadial, stride = radial + 1;
    for (let row = 0; row < this.tunnelRows; row++) {
      const z = 64 - row * 4, offset = this.courseOffset(z), slope = courseSlope(this.distance + 4 - z);
      for (let j = 0; j <= radial; j++) {
        const angle = (j % radial) / radial * TAU, c = Math.cos(angle), s = Math.sin(angle), i = row * stride + j;
        position.setXYZ(i, offset.x + c * 12.7, offset.y + s * 8.7, z);
        // Gradient of the elliptical corridor, oriented inward; account for bends.
        const nx = -c / 12.7, ny = -s / 8.7, nz = nx * slope.x + ny * slope.y, length = Math.hypot(nx, ny, nz);
        normal.setXYZ(i, nx / length, ny / length, nz / length);
        uv.setXY(i, j / radial * 8, (this.distance + 4 - z) / 32);
      }
    }
    position.needsUpdate = normal.needsUpdate = uv.needsUpdate = true;
  }
  makeShip() {
    const ship = new THREE.Group(); this.ship = ship; this.scene.add(ship);
    const main = new THREE.Mesh(new THREE.CapsuleGeometry(.35, 1.65, 6, 12), this.materials.copper); main.rotation.x = Math.PI / 2; main.position.z = -.35; ship.add(main);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(.36, 1.2, 8), this.materials.armor); nose.rotation.x = -Math.PI / 2; nose.position.z = -1.7; ship.add(nose);
    const glass = new THREE.Mesh(new THREE.SphereGeometry(.3, 20, 12), this.materials.glass); glass.scale.set(.75, .75, 1.8); glass.position.set(0, .3, -.65); ship.add(glass);
    ship.add(this.box(.08, .08, 1.05, this.materials.armor, 0, .5, -.65));
    this.exhausts = []; this.engineGlows = [];
    for (const side of [-1, 1]) {
      const shape = new THREE.Shape(); shape.moveTo(side * .22, -.85); shape.lineTo(side * 1.42, .85); shape.lineTo(side * .95, 1.05); shape.lineTo(side * .18, .35);
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: .075, bevelEnabled: true, bevelSize: .025, bevelThickness: .025, bevelSegments: 1, steps: 1 }); geometry.rotateX(Math.PI / 2);
      const wing = new THREE.Mesh(geometry, this.materials.armor); wing.position.y = .04; ship.add(wing);
      ship.add(this.box(.07, .08, .65, this.materials.amber, side * .99, .16, .48));
      const pod = new THREE.Mesh(new THREE.CylinderGeometry(.23, .29, 1.1, 12), this.materials.dark); pod.rotation.x = Math.PI / 2; pod.position.set(side * .69, 0, .5); ship.add(pod);
      for (let j = 0; j < 3; j++) { const collar = this.torus(.27, .04, this.materials.armor, 16); collar.position.set(side * .69, 0, .2 + j * .32); ship.add(collar); }
      const nozzle = this.torus(.18, .055, this.materials.cyan, 24); nozzle.position.set(side * .69, 0, 1.1); ship.add(nozzle);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(.16, 2.8, 16, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(.12, .85, 1.15), transparent: true, opacity: .42, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); flame.rotation.x = Math.PI / 2; flame.position.set(side * .69, 0, 2.3); ship.add(flame); this.exhausts.push(flame);
      const glow = this.glow(0x48e9ff, .85, side * .69, 0, 1.25); glow.material.opacity=.38; ship.add(glow); this.engineGlows.push(glow);
      const fin = this.box(.07, .7, .65, this.materials.copper, side * .69, .33, .65); fin.rotation.z = side * -.2; ship.add(fin);
    }
    this.shield = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({ color: 0x76fff0, transparent: true, opacity: .12, wireframe: true, blending: THREE.AdditiveBlending, depthWrite: false })); this.shield.scale.set(1.55, .8, 2.1); ship.add(this.shield);
    this.engineLight = new THREE.PointLight(0x68eaf8, 1.3, 9); this.engineLight.position.set(0, 0, 1.5); ship.add(this.engineLight);
  }
  makeDust() {
    const positions = new Float32Array(100 * 6); this.streakData = Array.from({ length: 100 }, () => ({ x: (this.rng() - .5) * 22, y: (this.rng() - .5) * 14, z: -this.rng() * 150 }));
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(positions, 3)); this.streaks = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x60b6c7, transparent: true, opacity: .18, blending: THREE.AdditiveBlending, depthWrite: false })); this.streaks.frustumCulled = false; this.scene.add(this.streaks);
  }
  makeRivals() {
    const colors = [0xb99aff, 0x59ffe0, 0xff91c0, 0xffbf61, 0x79baff, 0xe8ea91, 0xf68561];
    // Distant racers keep the same silhouette using four shared-geometry meshes
    // each, rather than cloning every collar, light and detail of the hero ship.
    const hull = new THREE.CapsuleGeometry(.34, 1.7, 4, 8);
    const shape = new THREE.Shape(); shape.moveTo(0, -1.65); shape.lineTo(.38, -.65); shape.lineTo(1.42, .83); shape.lineTo(.95, 1.05); shape.lineTo(0, .4); shape.lineTo(-.95, 1.05); shape.lineTo(-1.42, .83); shape.lineTo(-.38, -.65); shape.closePath();
    const wings = new THREE.ExtrudeGeometry(shape, {depth:.09, bevelEnabled:false, steps:1}); wings.rotateX(Math.PI / 2);
    const canopy = new THREE.SphereGeometry(.3, 12, 8), flame = new THREE.ConeGeometry(.25, 2.4, 8, 1, true);
    const engine = new THREE.MeshBasicMaterial({color:0x83fff0,transparent:true,opacity:.55,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
    this.rivalShips = colors.map(color => {
      const ship = new THREE.Group(), material = this.materials.copper.clone(); material.color.setHex(color);
      const body = new THREE.Mesh(hull, material); body.rotation.x = Math.PI / 2; body.position.z = -.35; ship.add(body);
      ship.add(new THREE.Mesh(wings, material));
      const glass = new THREE.Mesh(canopy, this.materials.glass); glass.scale.set(.75,.75,1.8); glass.position.set(0,.3,-.65); ship.add(glass);
      const exhaust = new THREE.Mesh(flame,engine); exhaust.rotation.x = Math.PI / 2; exhaust.position.z = 2.1; ship.add(exhaust);
      ship.visible = false; this.scene.add(ship); return ship;
    });
  }
  setInstance(mesh, index, x, y, z, sx, sy, sz, rz = 0, curve = true) {
    // Many wall pieces share one section: calculate its bend once per frame.
    let section = this.curveCache.get(z);
    if (!section) { section = { offset: this.courseOffset(z), rotation: this.courseRotation(z) }; this.curveCache.set(z, section); }
    const d = this.dummy, offset = curve ? section.offset : { x: 0, y: 0 }, rotation = curve ? section.rotation : { x: 0, y: 0 };
    d.position.set(x + offset.x, y + offset.y, z); d.rotation.set(rotation.x, rotation.y, rz);
    d.scale.set(sx, sy, sz); d.updateMatrix(); mesh.setMatrixAt(index, d.matrix);
  }
  updateArchitecture(dt, speed, stage) {
    this.curveCache.clear(); const count = this.segmentPositions.length, spacing = this.segmentSpacing;
    for (let i = 0; i < count; i++) {
      // Absolute-distance placement means pause, reset and changing speed cannot
      // detach the tunnel from its hazards or competitors.
      const z = 24 - (((i * spacing - this.distance) % (count * spacing) + count * spacing) % (count * spacing)); this.segmentPositions[i] = z;
      this.setInstance(this.ribs, i, 0, 0, z, 1, .69, 1);
      for (let j = 0; j < 8; j++) {
        const a = j / 8 * TAU + Math.PI / 8, x = Math.cos(a) * 12.5, y = Math.sin(a) * 8.6;
        const tangent = Math.atan2(Math.cos(a) * 12.5, -Math.sin(a) * 8.6);
        this.setInstance(this.lights, i * 8 + j, x * .975, y * .975, z, .9, .035, .045, tangent);
      }
      let cable = 0;
      for (const x of [-11.8, 11.8]) for (const y of [-3.8, 3.8]) {
        this.setInstance(this.pipes, i * 4 + cable, x, y, z - spacing / 2, .12, .12, spacing + .6);
        this.setInstance(this.cableLights, i * 4 + cable, x - Math.sign(x) * .09, y, z - spacing / 2, .026, .026, spacing + .6); cable++;
      }
    }
    for (const mesh of [this.ribs, this.lights, this.pipes, this.cableLights]) mesh.instanceMatrix.needsUpdate = true;
    this.debris.visible = false; this.shafts.visible = false;
    const p = this.streaks.geometry.attributes.position.array;
    const length = Math.min(15, speed * (.055 + this.nitro * .09));
    this.streaks.material.opacity = .12 + this.nitro * .27;
    this.streakData.forEach((d, i) => { d.z += dt * speed * (1.3 + this.nitro * .65); if (d.z > 20) d.z -= 170; const o = this.courseOffset(d.z), k = i * 6; p[k] = p[k + 3] = d.x + o.x; p[k + 1] = p[k + 4] = d.y + o.y; p[k + 2] = d.z; p[k + 5] = d.z + length; }); this.streaks.geometry.attributes.position.needsUpdate = true;
  }
  burst(x, y, z, color = 0x69fff0, count = 18) {
    if(!this.particleMaterials.has(color)) this.particleMaterials.set(color,new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); const material=this.particleMaterials.get(color);
    const geometry = this.particleGeometry;
    for (let i = 0; i < (this.quality ? count : Math.min(count, 10)); i++) { const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); this.scene.add(mesh); this.particles.push({ mesh, life: .8 + Math.random() * .4, vx: (Math.random() - .5) * 10, vy: (Math.random() - .5) * 10, vz: (Math.random() - .3) * 16, material, geometry }); }
  }
  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, this.quality ? 1.5 : 1)); this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.fov = w < h ? 70 : 59; this.camera.updateProjectionMatrix();
    this.composer?.setPixelRatio(Math.min(devicePixelRatio, this.quality ? 1.2 : .8)); this.composer?.setSize(w, h);
  }
  setQuality(value) { this.quality = value; this.streaks.visible = value; this.resize(); }
  update(dt, data) {
    this.time += dt; const { player, state, speed, stage = 0, phase = 0, invulnerable = 0, shake = 0, steer = 0 } = data;
    this.distance = Number.isFinite(data.distance) ? data.distance : this.distance + dt * speed;
    this.nitro = THREE.MathUtils.damp(this.nitro, phase > 0 ? 1 : 0, phase > 0 ? 9 : 5, dt);
    const slope = courseSlope(this.distance), aheadSlope = courseSlope(this.distance + 65);
    const turn = clamp((aheadSlope.x - slope.x) * 2.7, -.24, .24);
    this.bank = THREE.MathUtils.damp(this.bank, this.reduced ? 0 : turn, 4, dt);
    this.updateArchitecture(dt, speed, stage);
    const remaining = (data.totalDistance ?? 12000) - this.distance;
    this.finishGate.visible = remaining < 210 && remaining > -30;
    const finishZ = 4 - remaining, finishOffset = this.courseOffset(finishZ), finishRotation = this.courseRotation(finishZ);
    this.finishGate.position.set(finishOffset.x, finishOffset.y, finishZ); this.finishGate.rotation.set(finishRotation.x, finishRotation.y, 0);
    this.rivalShips.forEach((ship, i) => {
      const rival = data.rivals?.[i]; if (!rival) { ship.visible = false; return; }
      const rz = 4 - (rival.distance - this.distance), offset = this.courseOffset(rz), rotation = this.courseRotation(rz);
      ship.visible = rz < this.camera.position.z - 2 && rz > -190;
      ship.position.set(offset.x + rival.x, offset.y + rival.y, rz); ship.rotation.set(rotation.x, rotation.y, clamp((rival.targetX - rival.x || 0) * -.12 + this.bank, -.4, .4));
    });
    const menu = state === 'menu', portrait = this.camera.aspect < 1;
    if (menu) { this.ship.position.set(3.6 + Math.sin(this.time * .5) * .14, -.6 + Math.sin(this.time) * .12, 1); this.ship.rotation.set(.1, -.25, -.17); }
    else { this.ship.position.set(player.x, player.y, 4); this.ship.rotation.z = THREE.MathUtils.damp(this.ship.rotation.z, this.bank * 1.4 - steer * .07, 11, dt); this.ship.rotation.x = THREE.MathUtils.damp(this.ship.rotation.x, this.courseRotation(4).x + (player.ty - player.y) * .08, 8, dt); this.ship.rotation.y = THREE.MathUtils.damp(this.ship.rotation.y, this.courseRotation(4).y - steer * .025, 8, dt); }
    const fov = (portrait ? 70 : 59) + (this.reduced ? 0 : this.nitro * 15 + Math.min(5, Math.max(0, speed - 42) * .085));
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, fov, 5, dt); this.camera.updateProjectionMatrix();
    const skyHeight = 1000 * Math.tan(this.camera.fov * Math.PI / 360);
    this.sky.scale.set(skyHeight * this.camera.aspect * 1.01, skyHeight * 1.01, 1);
    this.skyMaterial.uniforms.aspect.value = this.camera.aspect; this.skyMaterial.uniforms.time.value = this.reduced ? 0 : this.time;
    const z = Math.max(20, 4 + 11.5 / (Math.tan(this.camera.fov * Math.PI / 360) * this.camera.aspect));
    const cameraOffset = this.courseOffset(z);
    // Follow the course exactly; smooth only the pilot's lateral motion. A
    // delayed course-center camera can drift through a wall at racing speed.
    this.chaseX = THREE.MathUtils.damp(this.chaseX ?? 0, menu ? -2.3 : player.x * .32, 4, dt);
    this.chaseY = THREE.MathUtils.damp(this.chaseY ?? 3.2, menu ? 4.7 : 3.2 + player.y * .16, 4, dt);
    this.camera.position.x = cameraOffset.x + this.chaseX;
    this.camera.position.y = cameraOffset.y + this.chaseY;
    this.camera.position.z = z;
    const j = this.reduced ? 0 : shake * .22;
    const ahead = this.courseOffset(-34);
    this.look.set(ahead.x + (menu ? 0 : player.x * .1), ahead.y + (menu ? 0 : player.y * .08), -34);
    this.look.x += (Math.random() - .5) * j; this.look.y += (Math.random() - .5) * j;
    this.camera.lookAt(this.look); if (!this.reduced && !menu) this.camera.rotateZ(this.bank * .75 + clamp(-steer * .0025, -.025, .025));
    this.shield.visible = phase > 0 || (invulnerable > 0 && Math.floor(this.time * 9) % 2 === 0); this.shield.rotation.z += dt * 1.5;
    this.exhausts.forEach(e => { e.scale.y = 1 + this.nitro * 3.3 + Math.sin(this.time * 40) * .08; e.material.opacity = .42 + this.nitro * .28; });
    this.engineGlows.forEach(e => e.scale.setScalar(.85 + this.nitro * 1.1));
    this.engineLight.intensity = 1.3 + this.nitro * 2.7;
    this.bloom.strength = .43 + this.nitro * .12;
    for (let i = this.particles.length - 1; i >= 0; i--) { const p = this.particles[i]; p.life -= dt; p.mesh.position.x += p.vx * dt; p.mesh.position.y += p.vy * dt; p.mesh.position.z += p.vz * dt; p.mesh.scale.setScalar(Math.max(0, p.life)); if (p.life <= 0) { this.scene.remove(p.mesh); this.particles.splice(i, 1); } }
    if (this.quality) this.composer.render(); else this.renderer.render(this.scene, this.camera);
  }
}
