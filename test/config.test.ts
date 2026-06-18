import { describe, it, expect } from 'vitest';
import { CONFIG, MAZE_DIM, WORLD_HALF } from '../src/config';

describe('config derived values', () => {
  it('MAZE_DIM is the odd grid size 2*cells + 1', () => {
    expect(MAZE_DIM).toBe(2 * CONFIG.mazeCells + 1);
    expect(MAZE_DIM % 2).toBe(1); // odd, so cells + walls line up
  });

  it('WORLD_HALF is half the full field width', () => {
    expect(WORLD_HALF).toBe((MAZE_DIM * CONFIG.cellSize) / 2);
  });
});

describe('config sanity', () => {
  it('building heights form a valid range', () => {
    expect(CONFIG.minHeight).toBeGreaterThan(0);
    expect(CONFIG.minHeight).toBeLessThan(CONFIG.maxHeight);
  });

  it('core tuning values are positive', () => {
    expect(CONFIG.moveSpeed).toBeGreaterThan(0);
    expect(CONFIG.playerRadius).toBeGreaterThan(0);
    expect(CONFIG.cellSize).toBeGreaterThan(0);
    expect(CONFIG.magSize).toBeGreaterThan(0);
  });

  it('gravity pulls downward', () => {
    expect(CONFIG.gravity).toBeLessThan(0);
  });
});
