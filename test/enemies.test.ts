import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { Enemy, EnemyManager } from '../src/enemies';

// `Tier` is not exported, but the Enemy constructor accepts it structurally, so a
// plain literal of the right shape is a valid argument.
function makeTier(over: Partial<{ hp: number; damage: number; xp: number; missChance: number }> = {}) {
  return {
    name: 'Test',
    color: 0xffffff,
    radius: 0.5,
    hp: over.hp ?? 100,
    damage: over.damage ?? 10,
    speed: 3,
    xp: over.xp ?? 5,
    missChance: over.missChance ?? 0,
    weight: 1,
  };
}

describe('Enemy construction', () => {
  it('scales hp and damage by the stage multiplier', () => {
    const e = new Enemy(makeTier({ hp: 100, damage: 10 }), new THREE.Vector3(), 2);
    expect(e.maxHp).toBe(200);
    expect(e.hp).toBe(200);
    expect(e.hp).toBe(e.maxHp); // starts at full
    expect(e.damage).toBe(20);
  });

  it('places the body on the ground at the spawn x/z', () => {
    const e = new Enemy(makeTier(), new THREE.Vector3(5, 0, -3), 1);
    expect(e.position.x).toBe(5);
    expect(e.position.z).toBe(-3);
    expect(e.position.y).toBe(e.radius);
  });
});

describe('Enemy.boost', () => {
  it('scales maxHp and damage while preserving the hp fraction', () => {
    const e = new Enemy(makeTier({ hp: 100, damage: 10 }), new THREE.Vector3(), 1);
    e.hp = 50; // half health
    e.boost(2);

    expect(e.maxHp).toBe(200);
    expect(e.damage).toBe(20);
    expect(e.hp).toBe(100); // still 50% of the new max
  });
});

describe('Enemy.takeDamage', () => {
  it('returns false while the enemy survives', () => {
    const e = new Enemy(makeTier({ hp: 100 }), new THREE.Vector3(), 1);
    expect(e.takeDamage(30)).toBe(false);
    expect(e.hp).toBe(70);
  });

  it('returns true once hp drops to zero or below', () => {
    const e = new Enemy(makeTier({ hp: 100 }), new THREE.Vector3(), 1);
    expect(e.takeDamage(100)).toBe(true);
  });
});

describe('EnemyManager.escalate', () => {
  // Cells far from spawn so spawnOne's distance filter (> cellSize*3) keeps them.
  function makeManager(): EnemyManager {
    const openCells = [
      new THREE.Vector3(100, 0, 100),
      new THREE.Vector3(-100, 0, -100),
      new THREE.Vector3(100, 0, -100),
    ];
    return new EnemyManager(new THREE.Scene(), openCells, new THREE.Vector3(0, 0, 0));
  }

  it('boosts every current enemy', () => {
    const mgr = makeManager();
    expect(mgr.enemies.length).toBeGreaterThan(0);

    const snapshot = mgr.enemies.map((e) => ({ maxHp: e.maxHp, damage: e.damage }));
    mgr.escalate(1.8);

    mgr.enemies.forEach((e, i) => {
      expect(e.maxHp).toBeCloseTo(snapshot[i]!.maxHp * 1.8);
      expect(e.damage).toBeCloseTo(snapshot[i]!.damage * 1.8);
    });
  });
});
