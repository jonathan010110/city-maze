import { describe, it, expect } from 'vitest';
import { generateMazeGrid, cellWorld } from '../src/world';
import { CONFIG, MAZE_DIM } from '../src/config';

// Run the generator several times so we don't pass on a lucky random seed.
function grids(n: number): boolean[][][] {
  return Array.from({ length: n }, () => generateMazeGrid());
}

describe('cellWorld mapping', () => {
  it('centers the grid on the origin', () => {
    const center = (MAZE_DIM - 1) / 2;
    expect(cellWorld(center)).toBe(0);
  });

  it('maps neighbouring indices one cellSize apart', () => {
    expect(cellWorld(1) - cellWorld(0)).toBeCloseTo(CONFIG.cellSize);
  });

  it('is symmetric around the center', () => {
    const center = (MAZE_DIM - 1) / 2;
    expect(cellWorld(center - 2)).toBeCloseTo(-cellWorld(center + 2));
  });
});

describe('generateMazeGrid', () => {
  it('produces a MAZE_DIM x MAZE_DIM grid', () => {
    for (const grid of grids(5)) {
      expect(grid.length).toBe(MAZE_DIM);
      for (const row of grid) expect(row.length).toBe(MAZE_DIM);
    }
  });

  it('keeps the outer ring solid (player stays enclosed)', () => {
    for (const grid of grids(5)) {
      const last = MAZE_DIM - 1;
      for (let i = 0; i < MAZE_DIM; i++) {
        expect(grid[0]![i]).toBe(true); // top
        expect(grid[last]![i]).toBe(true); // bottom
        expect(grid[i]![0]).toBe(true); // left
        expect(grid[i]![last]).toBe(true); // right
      }
    }
  });

  it('always carves the spawn cell (1,1) open', () => {
    for (const grid of grids(20)) {
      expect(grid[1]![1]).toBe(false);
    }
  });

  it('opens a meaningful number of passage cells', () => {
    for (const grid of grids(5)) {
      const open = grid.flat().filter((wall) => !wall).length;
      // A perfect maze on the inner (MAZE_DIM-2) field opens at least the cell
      // grid; braiding only adds more. Sanity floor: more than just the spawn.
      expect(open).toBeGreaterThan(MAZE_DIM); // far more than a single corridor
    }
  });

  it('every open cell is reachable from the spawn (connected)', () => {
    for (const grid of grids(5)) {
      const seen = new Set<string>();
      const stack: Array<[number, number]> = [[1, 1]];
      const key = (x: number, y: number) => `${x},${y}`;
      seen.add(key(1, 1));
      while (stack.length) {
        const [x, y] = stack.pop()!;
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= MAZE_DIM || ny >= MAZE_DIM) continue;
          if (grid[ny]![nx]) continue; // wall
          const k = key(nx, ny);
          if (seen.has(k)) continue;
          seen.add(k);
          stack.push([nx, ny]);
        }
      }
      // Count of open cells must equal the flood-fill reach -> fully connected.
      const open = grid.flat().filter((wall) => !wall).length;
      expect(seen.size).toBe(open);
    }
  });
});
