import * as THREE from 'three';
import { CONFIG, WORLD_HALF } from './config';

// Anything round that moves and collides with the maze walls (player, enemies).
export interface Body {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  radius: number;
  grounded: boolean;
}

const _closest = new THREE.Vector3();
const _delta = new THREE.Vector3();
const _normal = new THREE.Vector3();

function closestPointOnAABB(p: THREE.Vector3, box: THREE.Box3, out: THREE.Vector3): THREE.Vector3 {
  out.set(
    THREE.MathUtils.clamp(p.x, box.min.x, box.max.x),
    THREE.MathUtils.clamp(p.y, box.min.y, box.max.y),
    THREE.MathUtils.clamp(p.z, box.min.z, box.max.z),
  );
  return out;
}

function resolveOne(body: Body, box: THREE.Box3): boolean {
  closestPointOnAABB(body.position, box, _closest);
  _delta.subVectors(body.position, _closest);
  const distSq = _delta.lengthSq();
  const r = body.radius;
  if (distSq >= r * r) return false;

  if (distSq > 1e-8) {
    const dist = Math.sqrt(distSq);
    _normal.copy(_delta).multiplyScalar(1 / dist);
    body.position.addScaledVector(_normal, r - dist);
  } else {
    // Center inside the box: eject along the axis of least penetration.
    const dxMin = body.position.x - box.min.x;
    const dxMax = box.max.x - body.position.x;
    const dyMin = body.position.y - box.min.y;
    const dyMax = box.max.y - body.position.y;
    const dzMin = body.position.z - box.min.z;
    const dzMax = box.max.z - body.position.z;
    const min = Math.min(dxMin, dxMax, dyMin, dyMax, dzMin, dzMax);
    if (min === dxMin) _normal.set(-1, 0, 0);
    else if (min === dxMax) _normal.set(1, 0, 0);
    else if (min === dyMin) _normal.set(0, -1, 0);
    else if (min === dyMax) _normal.set(0, 1, 0);
    else if (min === dzMin) _normal.set(0, 0, -1);
    else _normal.set(0, 0, 1);
    body.position.addScaledVector(_normal, min + r);
  }

  const vn = body.velocity.dot(_normal);
  if (vn < 0) body.velocity.addScaledVector(_normal, -vn); // slide, don't pass through
  if (_normal.y > 0.5) body.grounded = true;
  return true;
}

export function resolveSphereAABB(body: Body, colliders: THREE.Box3[]): void {
  for (let pass = 0; pass < 3; pass++) {
    let any = false;
    for (const box of colliders) {
      if (resolveOne(body, box)) any = true;
    }
    if (!any) break;
  }
}

export function clampToGround(body: Body): void {
  const restY = CONFIG.groundY + body.radius;
  if (body.position.y <= restY) {
    body.position.y = restY;
    if (body.velocity.y < 0) body.velocity.y = 0;
    body.grounded = true;
  }
  const lim = WORLD_HALF - body.radius;
  body.position.x = THREE.MathUtils.clamp(body.position.x, -lim, lim);
  body.position.z = THREE.MathUtils.clamp(body.position.z, -lim, lim);
}
