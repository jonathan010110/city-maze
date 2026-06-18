# Architektur & Datenfluss

[← README](./README.md) · [GAMEPLAY](./GAMEPLAY.md) · [CONFIG](./CONFIG.md)

## Bootstrap

```
index.html  ──lädt──▶  src/index.ts  ──erzeugt──▶  Game (src/game.ts)  ──▶ game.start()
```

`index.html` enthält nur den HUD-Hinweis `#hint` und das Modul-Script.
`src/index.ts` importiert `./style.css`, instanziiert `Game` und ruft `start()`,
was die Clock startet und die `requestAnimationFrame`-Loop anwirft.

`Game` (Konstruktor) baut: `WebGLRenderer` (an `document.body`), `Scene`,
`PerspectiveCamera` (FOV 75) — **die Kamera wird der Scene hinzugefügt**
(`scene.add(camera)`), damit das Waffenmodell als Kamera-Kind gerendert wird.
Dann: `buildWorld(scene)`, `generateMaze(scene)` (liefert `colliders`, `spawn`,
`openCells`), `Player`, `Input`, `ProjectileManager`, `EnemyManager`, `Weapon`,
`Hud`. Resize-Handler aktualisiert Kamera-Aspect + Renderer-Größe.

## Game-Loop (`Game.loop` in `src/game.ts`)

Reihenfolge pro Frame (genau so im Code):

1. `dt = min(clock.getDelta(), 0.05)` — **dt-Clamping** verhindert Tunneling
   nach Tab-Wechsel.
2. `look.update(input, dt)` → `look.applyTo(camera)` (setzt `camera.rotation`)
   → `forward = look.flatForward(camera)` (horizontale Blickrichtung).
3. `player.update(dt, input, forward)` — Eingabe, Schwerkraft, Sprung,
   Integration.
4. `resolveSphereAABB(player, colliders)` → `clampToGround(player)` — Kollision &
   Boden.
5. Kamera auf **Augenhöhe** setzen: `player.position.y - radius + eyeHeight`.
6. Upgrade-Tasten (`Digit1`/`Digit2` → `player.upgrade` → `checkStage`) und
   `KeyR` (`weapon.startReload`).
7. `hpBefore = player.health` merken. Falls kein Death-Overlay:
   `enemies.update(...)`, dann bei `consumeFire()` + `weapon.tryFire(...)` →
   `look.addRecoil()`.
8. `projectiles.update(dt)` — **hier landen Kugeln und wenden Schaden an**
   (Spieler *und* Gegner).
9. `weapon.update(dt)` (Cooldown, Reload, Mündungsfeuer, Modell-Recoil).
10. Wenn `player.health < hpBefore` → `hud.flashDamage()`.
11. Death-Handling: bei Tod `deathTimer = 1.6 s` + Overlay; nach Ablauf
    `player.respawn(spawn)` (Stats/XP bleiben).
12. `hud.update(dt, player, weapon)` → `renderer.render` → nächster Frame.

**Wichtig:** Schaden ist nicht sofort beim Schuss, sondern beim **Einschlag der
sichtbaren Kugel** (Schritt 8). Deshalb wird `hpBefore` über den ganzen
Combat-Block verglichen.

## Kernmuster

### `Body`-Interface (`src/collision.ts`)
```ts
interface Body { position; velocity; radius; grounded; }
```
`Player` und `Enemy` implementieren es strukturell und teilen sich dieselbe
Kollisionslogik:
- `resolveSphereAABB(body, colliders)` — Sphere-vs-AABB über Closest-Point,
  schiebt den Körper aus der Wand und entfernt nur die **in die Wand gerichtete**
  Geschwindigkeit → der Körper **gleitet** an Wänden entlang. Läuft 3 Pässe
  (Ecken zwischen zwei Häusern).
- `clampToGround(body)` — setzt auf `y = radius` ab, nullt Abwärts-Velocity,
  setzt `grounded`, und hält den Körper über `WORLD_HALF` innerhalb des Felds.

Kollider sind `THREE.Box3[]` (ein Box pro Haus), erzeugt in `generateMaze`.

### Projektil-Pattern (`src/weapon.ts` + `src/projectiles.ts`)
1. Beim Schuss bestimmt ein **Hitscan-Raycast** (Mitte des Bildschirms, gegen
   `enemies.meshes`, `raycaster.far = shootRange`) Ziel-Punkt und ggf. getroffenes
   Gegner-Mesh.
2. `ProjectileManager.spawn(origin, target, {color, radius, speed, onArrive})`
   erzeugt eine sichtbare kleine Kugel, die vom **Mündungs-Weltpunkt** zum Ziel
   fliegt.
3. Bei Ankunft (`projectiles.update`) ruft `onArrive()` den eigentlichen Schaden
   auf (Spieler-Schuss → `enemies.damageByMesh`; Gegner-Schuss → `player.takeDamage`).

Vorteil: visuell sichtbare Kugeln, aber zielsicheres Hit-Detection zum Feuer-
Zeitpunkt. Gegner-Treffer/Verfehlen wird beim Abschuss per `missChance` entschieden
(bei Verfehlen fliegt die Kugel mit Zufalls-Offset und hat kein `onArrive`).

### Einheiten & Koordinaten
1 Einheit = **1 Meter**. Das Maze ist ein Gitter `MAZE_DIM = 2*mazeCells + 1`.
In `generateMaze` mappt `cellWorld(i) = (i - (dim-1)/2) * cellSize` Gitterindex →
Weltkoordinate (zentriert um den Ursprung). `WORLD_HALF` = halbe Feldbreite, für
die Grenzen in `clampToGround`. Spieler-Spawn ist Zelle `(1,1)` (immer offen).

### Maze-Generierung (`src/world.ts`)
Recursive-Backtracker erzeugt ein perfektes Labyrinth; danach **Braiding**
(`braidChance`): Sackgassen werden aufgebrochen → viele Schleifen, kein „Ende".
Der äußere Ring bleibt massiv (eingeschlossen). Offene Zellen werden als
`openCells` gesammelt (für Gegner-Spawns). Häuser = skalierte Unit-Box mit
prozeduraler **Fassaden-Textur** (Canvas mit beleuchteten/dunklen Fenstern),
Material pro `(colorIdx, baseIdx, repeatY)` gecached.

## Rendering-Besonderheiten

- **Waffe = Kamera-Kind**: `camera.add(weapon.group)`; nur sichtbar, weil die
  Kamera in der Scene hängt. Mündungs-Weltposition via `muzzle.getWorldPosition`
  (vorher `camera.updateMatrixWorld()`).
- **Gegner-Healthbars**: zwei Planes als Kind des Gegner-Mesh, jeden Frame per
  `barGroup.quaternion.copy(camera.quaternion)` zur Kamera ausgerichtet
  (Billboard). Füllung skaliert in x, Farbe per HSL nach HP-Anteil.
- **Treffer-Punkte**: kleine schwarze Sphere als Kind des Gegner-Mesh am lokalen
  Trefferpunkt (`mesh.worldToLocal(hitPoint)`), nur wenn der Gegner überlebt.
- **Raycast nur gegen Kapseln**: `intersectObjects(enemies.meshes, false)` —
  non-recursive, damit Pistole/Healthbar/Treffer-Punkte (Kinder) nicht treffen.
  `mesh.userData.enemy` verweist zurück auf das `Enemy`-Objekt.

## TypeScript-Strict-Fallen (tsconfig)

- `noUncheckedIndexedAccess`: Array-Index liefert `T | undefined`. Über Arrays mit
  `for...of` iterieren; wo Index sicher ist, `arr[i]!` verwenden (siehe
  `world.ts`, `enemies.ts`).
- `exactOptionalPropertyTypes`: optionale Props brauchen `| undefined` im Typ,
  wenn man explizit `undefined` übergibt (siehe `SpawnOptions.onArrive` in
  `projectiles.ts`).
- `as const` auf `CONFIG` macht Werte zu **Literal-Typen**. Felder, die von einem
  CONFIG-Wert initialisiert und später mutiert werden, explizit `: number`
  annotieren (z. B. `Player.maxHealth`, `Weapon.reserve`, `CameraRig.distance`),
  sonst „Type 'number' is not assignable to type '100'".
- `noUnusedLocals`/`noUnusedParameters`: keine toten Variablen/Parameter.
