import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { resolveSphereAABB, clampToGround, type Body } from '../src/collision';
import { CONFIG, WORLD_HALF } from '../src/config';

// A plain object satisfies the structural `Body` interface.
function makeBody(position: THREE.Vector3, radius = 0.4): Body {
  return {
    position,
    velocity: new THREE.Vector3(),
    radius,
    grounded: false,
  };
}

describe('clampToGround', () => {
  it('lifts a body below rest height onto the ground and zeroes downward velocity', () => {
    const body = makeBody(new THREE.Vector3(0, -5, 0));
    body.velocity.set(0, -10, 0);

    clampToGround(body);

    expect(body.position.y).toBe(CONFIG.groundY + body.radius);
    expect(body.velocity.y).toBe(0);
    expect(body.grounded).toBe(true);
  });

  it('leaves a body above the ground untouched (no false grounded)', () => {
    const body = makeBody(new THREE.Vector3(0, 10, 0));
    body.velocity.set(0, -3, 0);

    clampToGround(body);

    expect(body.position.y).toBe(10);
    expect(body.velocity.y).toBe(-3); // still falling
    expect(body.grounded).toBe(false);
  });

  it('clamps x/z to the world bounds', () => {
    const body = makeBody(new THREE.Vector3(WORLD_HALF + 50, 1, -WORLD_HALF - 50));
    const lim = WORLD_HALF - body.radius;

    clampToGround(body);

    expect(body.position.x).toBe(lim);
    expect(body.position.z).toBe(-lim);
  });
});

describe('resolveSphereAABB', () => {
  // A unit wall box centered on the origin's x-axis face.
  function wall(): THREE.Box3 {
    return new THREE.Box3(new THREE.Vector3(-1, 0, -1), new THREE.Vector3(1, 4, 1));
  }

  it('pushes a penetrating sphere out so it no longer overlaps', () => {
    const radius = 0.5;
    // Center just inside the +x face of the box.
    const body = makeBody(new THREE.Vector3(1 - 0.2, 1, 0), radius);
    const box = wall();

    resolveSphereAABB(body, [box]);

    // Closest point on the box to the (resolved) center must be >= radius away.
    const closest = new THREE.Vector3(
      THREE.MathUtils.clamp(body.position.x, box.min.x, box.max.x),
      THREE.MathUtils.clamp(body.position.y, box.min.y, box.max.y),
      THREE.MathUtils.clamp(body.position.z, box.min.z, box.max.z),
    );
    expect(body.position.distanceTo(closest)).toBeGreaterThanOrEqual(radius - 1e-6);
    expect(body.position.x).toBeGreaterThan(1); // ejected along +x
  });

  it('removes velocity into the wall but keeps tangential velocity (slide)', () => {
    const radius = 0.5;
    const body = makeBody(new THREE.Vector3(1 - 0.2, 1, 0), radius);
    // Moving into the wall (-x) while sliding along z.
    body.velocity.set(-3, 0, 2);
    const box = wall();

    resolveSphereAABB(body, [box]);

    expect(body.velocity.x).toBeGreaterThanOrEqual(0); // into-wall component removed
    expect(body.velocity.z).toBeCloseTo(2); // tangential preserved
  });

  it('does not move a sphere that is clearly outside', () => {
    const radius = 0.4;
    const body = makeBody(new THREE.Vector3(10, 1, 10), radius);
    const before = body.position.clone();

    resolveSphereAABB(body, [wall()]);

    expect(body.position.equals(before)).toBe(true);
  });
});
