import { defineConfig } from 'vitest/config';

// Tests run in Node: the game logic under test (collision, player, weapon,
// enemies) only constructs Three.js data/objects, never renders, so no WebGL or
// DOM is required. Test files live in `test/` (outside `src`) so the production
// typecheck (`tsc` over `include: ["src"]`) stays untouched.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
});
