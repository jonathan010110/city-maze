# Maze Shooter — Entwickler-Doku

First-Person-Shooter in einem 3D-Labyrinth aus prozeduralen Hochhäusern. Diese
Docs beschreiben den **aktuellen Stand** des Codes in `src/`, damit man ohne
Vorwissen sofort Änderungen vornehmen kann.

## Spielkonzept

Du läufst in der Ego-Perspektive durch ein Labyrinth aus Häusern. Gegner streifen
umher, verfolgen dich und schießen mit Pistolen. Du erlegst sie mit deiner
Handfeuerwaffe, bekommst **XP** und gibst diese manuell für **Stärke** (mehr
Schaden) und **Haltbarkeit** (mehr Leben) aus. So wirst du stark genug für die
härteren Gegner. Nach genügend Level-ups schaltet eine **schwere Stufe** frei,
in der alle Gegner stärker werden. Das Labyrinth ist „endlos": viele
Schleifen/Wege (keine Sackgassen), kein Ausgang, Gegner spawnen nach.

## Tech-Stack

- **Three.js** (3D-Rendering) — einzige Laufzeit-Dependency.
- **Vite** (Dev-Server + Build), **TypeScript** im strict-Modus.
- **Vitest** (Unit-Tests, dev-only) — siehe [TESTING.md](./TESTING.md).
- Keine Physik-Engine, kein Framework — Bewegung, Kollision, KI und HUD sind
  von Hand geschrieben.

## Starten

```bash
npm install        # einmalig
npm start          # Dev-Server -> http://localhost:5173 (Vite, mit HMR)
npm run build      # tsc (Typecheck) + vite build -> dist/
npm test           # Vitest einmalig (CI-Modus)
npm run test:watch # Vitest im Watch-Modus während der Entwicklung
```

`npm run build` führt **`tsc &&  vite build`** aus — der TypeScript-Compiler ist
der Typecheck-Gate. Vor dem Pushen immer `npm run build` **und** `npm test` grün
bekommen.

## Datei-Map (`src/`)

| Datei | Verantwortung |
|-------|---------------|
| `index.ts` | Einstieg: lädt CSS, erzeugt `Game`, startet die Loop. |
| `game.ts` | `Game`-Klasse: Renderer/Scene/Camera, verdrahtet alle Module, **Game-Loop**, Resize, Death/Respawn, Stage-Aufstieg. |
| `config.ts` | Alle Tuning-Konstanten (`CONFIG`) + abgeleitete `MAZE_DIM`, `WORLD_HALF`. Einheiten = Meter. |
| `world.ts` | Boden/Licht/Himmel, **Maze-Generierung** (Recursive-Backtracker + Braiding), prozedurale Hausfassaden, liefert Kollider + Spawn + offene Zellen. |
| `collision.ts` | `Body`-Interface, Sphere-vs-AABB-Auflösung (`resolveSphereAABB`), Boden-/Grenzen-Clamp (`clampToGround`). |
| `player.ts` | `Player`: Physik-Sphere (unsichtbar), Stats (Stärke/Haltbarkeit/HP/XP/Level), Bewegung, `upgrade()`, `respawn()`. |
| `controls.ts` | `Input` (Tastatur, Pointer-Lock-Maus, Feuer-/Tasten-Edges) und `FirstPersonLook` (Yaw/Pitch + Kamera-Recoil). |
| `enemies.ts` | `Enemy` + `EnemyManager`: Tiers, KI (Verfolgen/Schießen mit Line-of-Sight), Healthbars, Pistolen, Treffer-Punkte, Respawn, `escalate()`. |
| `weapon.ts` | `Weapon`: Waffenmodell (Kind der Kamera), Hitscan-Ziel, Munition/Nachladen, Mündungsfeuer, Modell-Recoil. |
| `projectiles.ts` | `ProjectileManager`: sichtbare Kugeln, die vom Lauf zum Ziel fliegen; Schaden via `onArrive`-Callback. |
| `hud.ts` | `Hud`: DOM-Overlay (Crosshair, Health-Bar, Vignette, Ammo/XP/Level + Upgrade-Buttons, Stage-Banner, Death-Overlay). |
| `style.css` | Layout des Canvas + HUD-Styles. |

Zusätzlich: `index.html` (lädt `src/index.ts`, enthält den Steuerungs-Hinweis `#hint`).

Außerhalb von `src/`: `vitest.config.ts` (Test-Runner-Konfig) und der Ordner
`test/` mit den Unit-Tests (`*.test.ts`). Tests liegen bewusst getrennt von `src/`,
damit der Production-Typecheck (`tsc` über `include: ["src"]`) sie nicht mitbaut.

## Weiterführend

- [ARCHITECTURE.md](./ARCHITECTURE.md) — Aufbau, Game-Loop, Kernmuster, Strict-Mode-Fallen.
- [GAMEPLAY.md](./GAMEPLAY.md) — Steuerung, Waffe, Gegner-Tiers, Progression, HUD.
- [CONFIG.md](./CONFIG.md) — vollständige Tuning-Referenz.
- [TESTING.md](./TESTING.md) — Test-Setup, Abdeckung, was bewusst nicht getestet wird, neue Tests schreiben.
