# Tests

[← README](./README.md) · [ARCHITECTURE](./ARCHITECTURE.md) · [GAMEPLAY](./GAMEPLAY.md) · [CONFIG](./CONFIG.md)

Unit-Tests für die **reine Spiel-Logik** (Progression, Kollision, Waffen-/Munitions-
Handling, Gegner-Skalierung, Maze-Generierung, Tier-Gewichtung). Render-, DOM- und
KI-Update-Pfade sind bewusst ausgespart.

## Setup

- **Runner:** [Vitest](https://vitest.dev) (dev-Dependency, in `package.json`).
- **Konfig:** `vitest.config.ts` im Projekt-Root — `environment: 'node'`,
  `include: ['test/**/*.test.ts']`.
- **Ablageort:** Ordner `test/` **außerhalb** von `src/`. Grund: `tsconfig.json` hat
  `include: ["src"]`, der Build-Typecheck (`npm run build` → `tsc`) baut die Tests
  also nicht mit. Vitest typecheckt/transpiliert sie zur Laufzeit über esbuild.

```bash
npm test            # einmalig (vitest run, CI-Modus)
npm run test:watch  # Watch-Modus während der Entwicklung
```

## Warum kein WebGL/DOM nötig ist

Three.js-Objekte (`Vector3`, `Box3`, `Mesh`, `PerspectiveCamera`, `Scene`) lassen
sich in **Node ohne GL-Kontext** konstruieren — nur das *Rendern* (`renderer.render`)
braucht WebGL. Dadurch sind `Player`, `Weapon`, `Enemy` und `EnemyManager` direkt
instanziierbar, ohne Mocking-Akrobatik. Die einzige DOM-Abhängigkeit, `Input`
(Event-Listener), wird per Plain-Stub mit den fünf in `Player.update` genutzten
Methoden ersetzt (`forward/back/left/right/jumpPressed`).

## Abdeckung (`test/`)

| Datei | Modul | Geprüft |
|-------|-------|---------|
| `config.test.ts` | `config.ts` | `MAZE_DIM`/`WORLD_HALF`-Ableitungen, Sanity (Höhenbereich, Gravitation < 0). |
| `collision.test.ts` | `collision.ts` | `clampToGround` (Boden-Snap, Velocity-Null, Grenzen-Clamp), `resolveSphereAABB` (Herausschieben, **Gleiten** = tangentiale Velocity bleibt, Außen-Fall). |
| `player.test.ts` | `player.ts` | `upgradeCost`-Formel, `upgrade` (Stärke / Haltbarkeit+Heilung / zu wenig XP), `takeDamage`+`dead`, `respawn` (Progression bleibt), `update` (Bewegung/Schwerkraft/Sprung). |
| `weapon.test.ts` | `weapon.ts` | `startReload`-Guards, Reload-Zyklus über `update` (voller/teilweiser Transfer, Timing). |
| `enemies.test.ts` | `enemies.ts` | `Enemy`-Konstruktion (Stage-Mult), `boost` (HP-Anteil bleibt), `takeDamage`, `EnemyManager.escalate`. |
| `world.test.ts` | `world.ts` | `cellWorld`-Mapping, `generateMazeGrid` (Dimension, massiver Außenring, Spawn-Zelle offen, **Konnektivität** per Flood-Fill). |
| `tiers.test.ts` | `enemies.ts` | `TIERS`-Invarianten (schwach→stark, stärker = seltener+treffsicherer), `pickTier`-Gewichtung (gemocktes `Math.random` + Verteilungs-Sweep). |

## Bewusst nicht getestet

- **Render-/DOM-Pfade:** `world.ts`-Meshes/Materials/Texturen, `hud.ts`, `game.ts`-Loop,
  `controls.ts` (echte Event-Listener), `projectiles.ts`-Visuals.
- **`Weapon.tryFire`:** hängt an einem Hitscan-Raycast gegen die Scene; Cooldown/Recoil
  sind privat und nur darüber beobachtbar. Getestet wird die vollständig öffentliche
  Munitions-/Reload-Logik.
- **`Enemy.update`:** KI (Verfolgen/LoS/Schießen) braucht Scene/Camera/Projektile und
  zufallsgetriebenes Verhalten — außerhalb des „soliden Kerns".

## Für Tests exportierte Helfer

Damit Maze- und Tier-Logik testbar ist, sind einige zuvor modul-interne Symbole
**exportiert** (reine Sichtbarkeit, keine Verhaltensänderung):

- `world.ts`: `generateMazeGrid()`, `cellWorld(i)` (aus der lokalen Closure in
  `generateMaze` herausgezogen — eine Quelle der Wahrheit).
- `enemies.ts`: `Tier`, `TIERS`, `pickTier()`.

## Neue Tests schreiben

- Datei unter `test/<modul>.test.ts` anlegen; Importe relativ nach `../src/...`.
- Für Bodies in Kollisionstests genügt ein Plain-Objekt, das strukturell das
  `Body`-Interface erfüllt (`position`, `velocity`, `radius`, `grounded`).
- `Enemy` braucht ein `Tier`-Objekt — entweder `TIERS[i]` oder ein passendes Literal.
- Zufall (`Math.random`) deterministisch über `vi.spyOn(Math, 'random')` steuern und
  in `afterEach` mit `vi.restoreAllMocks()` zurücksetzen (siehe `tiers.test.ts`).
- Generatoren/Randomisiertes mehrfach laufen lassen, um Glückstreffer auszuschließen
  (siehe `world.test.ts`).
