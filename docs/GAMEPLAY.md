# Gameplay & Balancing

[← README](./README.md) · [ARCHITECTURE](./ARCHITECTURE.md) · [CONFIG](./CONFIG.md) · [TESTING](./TESTING.md)

## Steuerung

Quelle: `src/controls.ts` (`Input`, `FirstPersonLook`), Verdrahtung in `src/game.ts`.

| Eingabe | Aktion |
|---------|--------|
| **Klick** auf den Canvas | Maus einfangen (Pointer-Lock) → Maus-Blick aktiv |
| **Maus bewegen** | Umsehen (Yaw/Pitch), Pitch begrenzt auf ±`pitchLimit` |
| **W A S D** / Pfeiltasten | Bewegen (relativ zur Blickrichtung) |
| **Leertaste** | Springen (nur am Boden) |
| **Linksklick** | Schießen |
| **R** | Nachladen |
| **1** | +Stärke (XP ausgeben) |
| **2** | +Haltbarkeit (XP ausgeben) |
| **Esc** | Maus freigeben (Browser-Standard) → HUD-Buttons klickbar |

Bewegung ist kamerarelativ: `Player.update` bekommt die horizontale Blickrichtung
(`flatForward`) und leitet daraus vorwärts/seitwärts ab.

## Waffe (Handfeuerwaffe)

Quelle: `src/weapon.ts`, Werte in `CONFIG`.

- **Magazin** `magSize` (12), **Reserve** `reserveStart` (60). Nachladen
  (`reloadTime` 1.1 s) füllt aus der Reserve auf.
- **Reichweite** `shootRange` (7 m) — `raycaster.far`; weiter entfernte Gegner
  werden nicht getroffen.
- **Feuerrate** über `fireCooldown` (0.22 s). Halbautomatisch (pro Klick ein Schuss).
- **Kills füllen Munition**: pro Kill `ammoPerKill` (8) in die Reserve.
- Sichtbare **schwarze Kugel** (`bulletColor`, `bulletRadius`, `bulletSpeed`),
  fliegt vom Lauf zum Ziel; Schaden beim Einschlag (= `player.strength`).
- Feedback: Mündungsfeuer, Modell-Rückstoß (z-Kick) + **Kamera-Recoil**
  (`look.addRecoil`, `cameraRecoil`).

## Gegner

Quelle: `src/enemies.ts`. Drei Tiers im Array `TIERS` (nicht in CONFIG!).

| Tier | Farbe | HP | Schaden | Speed | XP | `missChance` | Spawn-Gewicht |
|------|-------|----|---------|-------|----|--------------|---------------|
| **Runt** | grün | 30 | 7 | 3.2 | 2 | 0.55 (verfehlt oft) | 5 |
| **Brute** | orange | 90 | 13 | 2.7 | 6 | 0.25 (selten daneben) | 3 |
| **Titan** | rot | 220 | 22 | 2.3 | 15 | 0.00 (trifft immer) | 1 |

- **KI**: Verfolgt den Spieler innerhalb `enemyAggroRange` (12 m), stoppt bei
  `enemyPreferredRange` (3.5 m) und schießt. Kollidiert mit Wänden (gleitet,
  kein echtes Pathfinding).
- **Schießen** nur mit **Line-of-Sight** (Raycast gegen Häuser) und innerhalb
  `enemyShootRange` (7 m), Takt `enemyShootCooldown` (~1.4 s, leicht zufällig).
  Treffer/Verfehlen per `missChance`. Gegner-Kugel = Tier-Farbe, `enemyBulletSpeed`.
- **Healthbar** schwebt über jedem Gegner (Billboard, grün→rot).
- **Treffer-Punkt**: überlebt der Gegner, bleibt ein schwarzer Punkt an der
  Einschlagstelle.
- **Pistole**: kleines Box-Mesh an der Front jedes Gegners.
- **Respawn**: `EnemyManager` füllt alle `enemyRespawnInterval` (3 s) bis zur
  Zielzahl `enemyCount` (14) auf → endloser Nachschub.

Spawn-Auswahl: zufällige offene Zelle mit Abstand > `cellSize*3` zum Spieler-Spawn.

## Progression (XP → Stärke/Haltbarkeit)

Quelle: `src/player.ts`, Stage-Logik in `src/game.ts` (`checkStage`).

- **XP** kommt pro Kill (Tier-`xp`).
- **Upgrade-Kosten steigen**:
  `upgradeCost = ceil(levelCostBase * levelCostGrowth^levels)`
  (Start 2 XP, ×1.12 pro bereits gekauftem Level). `levels` = Summe aller Upgrades.
- **Stärke** (`strengthPerPoint` +4 Schaden) · **Haltbarkeit**
  (`durabilityPerPoint` +20 Max-HP **und** sofortige Heilung um denselben Betrag).
- **Schwere Stufe**: erreicht `levels` den Wert `levelsForHardStage` (40), ruft
  `checkStage` einmalig `enemies.escalate(hardStageMultiplier)` (×1.8 auf HP &
  Schaden aller aktuellen und künftigen Gegner) und zeigt ein Banner.
- **Tod**: HP ≤ 0 → 1.6 s Overlay, dann Respawn am Start. **Stats und XP bleiben
  erhalten** (kein Verlust) — nur volle Heilung.

## HUD

Quelle: `src/hud.ts` (+ Styles in `src/style.css`). Reines DOM-Overlay.

- **Crosshair** (Mitte), **Health-Bar** (oben links), **rote Vignette** bei
  Treffer (`flashDamage`).
- **Unten rechts** (`.panel`): Munition, XP + nächste Kosten, Level-up-Zähler,
  zwei **Upgrade-Buttons** (zeigen aktuellen Wert + Kosten; deaktiviert wenn
  XP < Kosten; klickbar nur mit freigegebener Maus).
- **Stage-Banner** (transient, `showBanner`) und **Death-Overlay** (`setDeath`).
