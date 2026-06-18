import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { Player } from '../src/player';
import { CONFIG } from '../src/config';
import type { Input } from '../src/controls';

// `Player.update` only calls these five Input methods, so a partial stub is enough.
function stubInput(over: Partial<Record<keyof Input, boolean>> = {}): Input {
  return {
    forward: () => over.forward ?? false,
    back: () => over.back ?? false,
    left: () => over.left ?? false,
    right: () => over.right ?? false,
    jumpPressed: () => over.jumpPressed ?? false,
  } as unknown as Input;
}

describe('Player upgradeCost', () => {
  it('follows ceil(levelCostBase * levelCostGrowth^levels)', () => {
    const p = new Player();
    for (const levels of [0, 1, 5, 10]) {
      p.levels = levels;
      const expected = Math.ceil(CONFIG.levelCostBase * Math.pow(CONFIG.levelCostGrowth, levels));
      expect(p.upgradeCost).toBe(expected);
    }
  });

  it('rises with each level', () => {
    const p = new Player();
    p.levels = 0;
    const first = p.upgradeCost;
    p.levels = 10;
    expect(p.upgradeCost).toBeGreaterThan(first);
  });
});

describe('Player.upgrade', () => {
  it('spends XP, raises the level count and strength', () => {
    const p = new Player();
    p.xp = 100;
    const cost = p.upgradeCost;
    const startStrength = p.strength;

    expect(p.upgrade('strength')).toBe(true);
    expect(p.xp).toBe(100 - cost);
    expect(p.levels).toBe(1);
    expect(p.strength).toBe(startStrength + CONFIG.strengthPerPoint);
  });

  it('raises maxHealth and heals by the same amount on durability', () => {
    const p = new Player();
    p.xp = 100;
    p.health = 10; // hurt
    const startMax = p.maxHealth;

    expect(p.upgrade('durability')).toBe(true);
    expect(p.maxHealth).toBe(startMax + CONFIG.durabilityPerPoint);
    expect(p.health).toBe(10 + CONFIG.durabilityPerPoint);
  });

  it('refuses and mutates nothing when XP is insufficient', () => {
    const p = new Player();
    p.xp = 0;
    const before = { xp: p.xp, levels: p.levels, strength: p.strength };

    expect(p.upgrade('strength')).toBe(false);
    expect(p.xp).toBe(before.xp);
    expect(p.levels).toBe(before.levels);
    expect(p.strength).toBe(before.strength);
  });
});

describe('Player.takeDamage / dead', () => {
  it('floors health at zero and flips dead', () => {
    const p = new Player();
    p.takeDamage(p.health + 50);
    expect(p.health).toBe(0);
    expect(p.dead).toBe(true);
  });

  it('subtracts partial damage and stays alive', () => {
    const p = new Player();
    const start = p.health;
    p.takeDamage(5);
    expect(p.health).toBe(start - 5);
    expect(p.dead).toBe(false);
  });
});

describe('Player.respawn', () => {
  it('resets position/velocity/health but keeps progression', () => {
    const p = new Player();
    p.xp = 42;
    p.levels = 3;
    p.strength = 99;
    p.maxHealth = 200;
    p.health = 5;
    p.velocity.set(1, 2, 3);

    const spawn = new THREE.Vector3(7, 0.4, -7);
    p.respawn(spawn);

    expect(p.position.equals(spawn)).toBe(true);
    expect(p.velocity.equals(new THREE.Vector3(0, 0, 0))).toBe(true);
    expect(p.health).toBe(p.maxHealth);
    // progression preserved
    expect(p.xp).toBe(42);
    expect(p.levels).toBe(3);
    expect(p.strength).toBe(99);
  });
});

describe('Player.update physics', () => {
  const forward = new THREE.Vector3(0, 0, -1); // looking down -z

  it('moves along the flat forward direction on forward input', () => {
    const p = new Player();
    p.update(0.1, stubInput({ forward: true }), forward);
    // velocity should point in -z at moveSpeed
    expect(p.velocity.z).toBeCloseTo(-CONFIG.moveSpeed);
    expect(p.velocity.x).toBeCloseTo(0);
    expect(p.position.z).toBeLessThan(0); // integrated movement
  });

  it('applies gravity to vertical velocity', () => {
    const p = new Player();
    p.grounded = false;
    p.update(0.1, stubInput(), forward);
    expect(p.velocity.y).toBeCloseTo(CONFIG.gravity * 0.1);
  });

  it('jumps only when grounded', () => {
    const p = new Player();
    p.grounded = true;
    p.update(0.016, stubInput({ jumpPressed: true }), forward);
    // jumpSpeed applied, then one gravity step
    expect(p.velocity.y).toBeCloseTo(CONFIG.jumpSpeed + CONFIG.gravity * 0.016);
    expect(p.grounded).toBe(false);
  });
});
