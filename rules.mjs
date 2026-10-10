export const DURATION = 75, PLAYER_Z = 4, LIMIT_X = 6.8, LIMIT_Y = 3.6;
export const PLAYER_HALF_WIDTH = 1.05, PLAYER_HALF_HEIGHT = .28;
export const PLAYER_RADIUS = .34;
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export function randomSource(seed) { let n = seed >>> 0; return () => { n += 0x6D2B79F5; let t = n; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function dailySeed(date = new Date()) { return Number(date.toISOString().slice(0, 10).replaceAll('-', '')) ^ 0x69aace; }
export function crossing(previousZ, z, plane = PLAYER_Z) { return previousZ < plane && z >= plane; }
export const EXPEDITION = [
  ['ring', 2.5], ['ring', 4.8], ['iris', 9], ['debris', 13], ['laser', 17], ['core', 22],
  ['iris', 27], ['laser', 30.5], ['debris', 34], ['iris', 37], ['laser', 40], ['debris', 43], ['core', 47],
  ['iris', 52], ['laser', 55], ['debris', 58], ['laser', 61], ['iris', 64], ['debris', 67], ['core', 72],
].map(([kind, arrival], index) => ({ kind, arrival, index, stage: arrival < 25 ? 0 : arrival < 50 ? 1 : 2 }));
export function makeExpeditionPattern(random, spec) {
  const x = spec.routeX ?? (spec.index < 2 ? (spec.index ? -1.8 : 0) : (random() - .5) * 6);
  const y = spec.kind === 'laser' ? (Number.isFinite(spec.routeY) ? (spec.routeY >= 0 ? 2.8 : -2.8) : (random() > .5 ? 2.8 : -2.8)) : spec.routeY ?? (spec.index < 2 ? 0 : (random() - .5) * 2.8);
  return { ...spec, x, y, radius: spec.wave ? Math.max(2.35,2.85-(spec.wave-1)*.045) : 3.35 - spec.stage * .18, rotation: (random() > .5 ? 1 : -1) * (.12 + spec.stage * .05), seed: random() * 6.28, cross: spec.cross ?? (spec.kind === 'laser' && spec.arrival === 61) };
}
export function irisCollision(x, y, h) { const distance = Math.hypot(x - h.x, y - h.y); const support = Math.hypot(PLAYER_HALF_WIDTH * (x - h.x), PLAYER_HALF_HEIGHT * (y - h.y)) / Math.max(.001, distance); return distance + support > h.radius && (Boolean(h.wave) || distance - support < 6.2); }
export function laserClearance(x, y, h, angle = h.beamAngle) { const nx = -Math.sin(angle), ny = Math.cos(angle); const support = Math.hypot(PLAYER_HALF_WIDTH * nx, PLAYER_HALF_HEIGHT * ny); return Math.abs(nx * x + ny * (y - h.beamY)) - support - .1; }
export function rockClearance(x, y, rock) { return Math.hypot((x - rock.x) / (rock.radius + PLAYER_HALF_WIDTH), (y - rock.y) / (rock.radius * .8 + PLAYER_HALF_HEIGHT)) - 1; }
// Retained helpers allow the original seeded-pattern regression checks to protect daily determinism.
export function makePattern(random, index) { const stage = Math.min(2, Math.floor(index / 12)); return { x: (random() - .5) * 8.5, y: (random() - .5) * 3.6, gapX: 2.45 - stage * .18, gapY: 2.1 - stage * .13, stage, index }; }
export function gateCollision(x, y, h, radius = PLAYER_RADIUS) { return Math.abs(x - h.x) > h.gapX - radius || Math.abs(y - h.y) > h.gapY - radius; }
export function gateClearance(x, y, h, radius = PLAYER_RADIUS) { return Math.min(h.gapX - Math.abs(x - h.x) - radius, h.gapY - Math.abs(y - h.y) - radius); }

export const frameDelta = (now, previous) => clamp((now-previous)/1000,0,.04);
export const expeditionStage = elapsed => clamp(Math.floor(Math.max(0,elapsed)/25),0,2);
