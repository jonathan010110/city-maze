import { describe, it, expect, vi, afterEach } from 'vitest';
import { TIERS, pickTier } from '../src/enemies';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('TIERS data', () => {
  it('has three tiers ordered weak -> strong', () => {
    expect(TIERS.map((t) => t.name)).toEqual(['Runt', 'Brute', 'Titan']);
    for (let i = 1; i < TIERS.length; i++) {
      expect(TIERS[i]!.hp).toBeGreaterThan(TIERS[i - 1]!.hp);
      expect(TIERS[i]!.damage).toBeGreaterThan(TIERS[i - 1]!.damage);
      expect(TIERS[i]!.xp).toBeGreaterThan(TIERS[i - 1]!.xp);
    }
  });

  it('makes stronger tiers rarer and more accurate', () => {
    for (let i = 1; i < TIERS.length; i++) {
      expect(TIERS[i]!.weight).toBeLessThan(TIERS[i - 1]!.weight); // rarer
      expect(TIERS[i]!.missChance).toBeLessThan(TIERS[i - 1]!.missChance); // more accurate
    }
  });

  it('has positive weights', () => {
    for (const t of TIERS) expect(t.weight).toBeGreaterThan(0);
  });
});

describe('pickTier weighted selection', () => {
  // total weight = 5 + 3 + 1 = 9. Thresholds: Runt [0,5/9), Brute [5/9,8/9), Titan [8/9,1).
  it.each([
    [0, 'Runt'],
    [0.5, 'Runt'],
    [0.55, 'Runt'],
    [0.6, 'Brute'],
    [0.85, 'Brute'],
    [0.9, 'Titan'],
    [0.99, 'Titan'],
  ])('returns %s for Math.random()=%d', (rand, expected) => {
    vi.spyOn(Math, 'random').mockReturnValue(rand as number);
    expect(pickTier().name).toBe(expected);
  });

  it('selects in proportion to weights over a uniform sweep', () => {
    const total = TIERS.reduce((s, t) => s + t.weight, 0);
    const N = total * 1000; // 9000 evenly spaced draws
    const counts: Record<string, number> = { Runt: 0, Brute: 0, Titan: 0 };

    const rnd = vi.spyOn(Math, 'random');
    for (let i = 0; i < N; i++) {
      rnd.mockReturnValueOnce((i + 0.5) / N); // sweep (0,1)
      counts[pickTier().name]!++;
    }

    for (const t of TIERS) {
      const expectedShare = t.weight / total;
      expect(counts[t.name]! / N).toBeCloseTo(expectedShare, 2);
    }
  });
});
