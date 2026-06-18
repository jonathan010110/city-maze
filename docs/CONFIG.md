# Tuning-Referenz (`src/config.ts`)

[← README](./README.md) · [ARCHITECTURE](./ARCHITECTURE.md) · [GAMEPLAY](./GAMEPLAY.md) · [TESTING](./TESTING.md)

Alle Spielparameter liegen zentral in `CONFIG` (`src/config.ts`). **Einheiten =
Meter / Sekunden / Radiant.** `CONFIG` ist `as const` — siehe Strict-Mode-Hinweis
in [ARCHITECTURE](./ARCHITECTURE.md) (mutierbare Felder `: number` annotieren).

> **Ausnahme:** Die Gegner-Tier-Werte (HP, Schaden, Speed, XP, `missChance`,
> Farbe, Gewicht) stehen **nicht** in CONFIG, sondern im Array `TIERS` in
> `src/enemies.ts`. Dort balancen.

## Bewegung / Physik

| Schlüssel | Default | Bedeutung |
|-----------|---------|-----------|
| `gravity` | -25 | Abwärtsbeschleunigung (m/s²) |
| `jumpSpeed` | 7 | Sprung-Startgeschwindigkeit (≈1 m hoch) |
| `moveSpeed` | 6 | Laufgeschwindigkeit (m/s) |
| `playerRadius` | 0.4 | Kollisions-Radius des Spielers (m) |
| `eyeHeight` | 1.6 | Kamerahöhe über dem Boden (m) |
| `groundY` | 0 | Bodenhöhe |

## Maus-Blick / Recoil

| Schlüssel | Default | Bedeutung |
|-----------|---------|-----------|
| `lookSensitivity` | 0.0022 | Radiant pro Mauspixel |
| `pitchLimit` | 1.45 | max. Hoch-/Runterblick (rad) |
| `cameraRecoil` | 0.03 | Aufwärts-Kick der Sicht pro Schuss (rad) |
| `cameraRecoilRecover` | 8 | wie schnell der Kick abklingt |

## Stats / Progression

| Schlüssel | Default | Bedeutung |
|-----------|---------|-----------|
| `startStrength` | 12 | Start-Schaden pro Schuss |
| `startDurability` | 100 | Start-Max-HP |
| `strengthPerPoint` | 4 | Schaden pro Stärke-Upgrade |
| `durabilityPerPoint` | 20 | Max-HP (und Heilung) pro Haltbarkeit-Upgrade |
| `levelCostBase` | 2 | XP-Kosten des ersten Upgrades |
| `levelCostGrowth` | 1.12 | Kostenfaktor pro bereits gekauftem Level |
| `levelsForHardStage` | 40 | Level-ups bis zur schweren Stufe |
| `hardStageMultiplier` | 1.8 | HP-/Schaden-Skalierung der Gegner in der schweren Stufe |

## Debug

| Schlüssel | Default | Bedeutung |
|-----------|---------|-----------|
| `debugStartNearHardStage` | `import.meta.env.DEV` | Wenn aktiv: Spieler startet mit `levels = levelsForHardStage - 1` und genau genug XP, sodass **ein** Druck auf `1`/`2` den Hard-Stage-Übergang auslöst. **Nur im Dev-Build aktiv** (`npm start`); im Production-Build (`npm run build` / Deploy) ist `import.meta.env.DEV` `false`, der Cheat also automatisch deaktiviert und per Tree-Shaking aus dem Bundle entfernt. |

## Waffe

| Schlüssel | Default | Bedeutung |
|-----------|---------|-----------|
| `magSize` | 12 | Magazingröße |
| `reserveStart` | 60 | Start-Reservemunition |
| `reloadTime` | 1.1 | Nachladedauer (s) |
| `fireCooldown` | 0.22 | Zeit zwischen Schüssen (s) |
| `shootRange` | 7 | Schussreichweite (m) |
| `ammoPerKill` | 8 | Munition in die Reserve pro Kill |
| `bulletSpeed` | 60 | Tempo der sichtbaren Kugel (m/s) |
| `bulletRadius` | 0.05 | Radius der Kugel (m) |
| `bulletColor` | 0x111111 | Farbe der Kugel (schwarz) |

## Gegner (global; Tier-Werte in `enemies.ts`)

| Schlüssel | Default | Bedeutung |
|-----------|---------|-----------|
| `enemyCount` | 14 | Zielanzahl (wird durch Respawn gehalten) |
| `enemyRespawnInterval` | 3 | Sekunden zwischen Nachspawns |
| `enemyAggroRange` | 12 | beginnt zu verfolgen ab dieser Distanz (m) |
| `enemyPreferredRange` | 3.5 | stoppt hier und schießt (m) |
| `enemyShootRange` | 7 | maximale Schussdistanz (m) |
| `enemyShootCooldown` | 1.4 | Basistakt zwischen Schüssen (s) |
| `enemyBulletSpeed` | 38 | Tempo der Gegner-Kugel (m/s) |

## Maze

| Schlüssel | Default | Bedeutung |
|-----------|---------|-----------|
| `mazeCells` | 8 | Räume pro Achse (Gitter `2*cells+1`) |
| `cellSize` | 4 | Korridorbreite / Hausbreite (m) |
| `minHeight` | 12 | niedrigstes Haus (m) |
| `maxHeight` | 40 | höchstes Haus (m) |
| `braidChance` | 0.95 | Anteil aufgebrochener Sackgassen → mehr Wege/Schleifen |

## Abgeleitete Werte (am Ende von `config.ts`)

- `MAZE_DIM = 2 * mazeCells + 1` — Gitterdimension inkl. Außenwänden.
- `WORLD_HALF = (MAZE_DIM * cellSize) / 2` — halbe Feldbreite (Grenzen in
  `clampToGround`).

## Häufige Anpassungen

- **Größeres Labyrinth** → `mazeCells` erhöhen.
- **Breitere/engere Gänge** → `cellSize`.
- **Mehr/weniger offen** → `braidChance` (1 = fast keine Sackgassen).
- **Schwieriger/leichter** → `enemyCount`, `hardStageMultiplier`,
  `levelsForHardStage`, oder Tier-Werte in `src/enemies.ts`.
- **Reichweite** → `shootRange` (und ggf. `enemyShootRange`).
- **Schnellere Progression** → `levelCostGrowth` senken oder Tier-`xp` erhöhen.
- **Hard-Stage-Übergang testen** → im Dev-Build (`npm start`) ist
  `debugStartNearHardStage` automatisch aktiv; ein Druck auf `1`/`2` löst den
  Übergang aus. Im Production-Build ist der Cheat deaktiviert.
