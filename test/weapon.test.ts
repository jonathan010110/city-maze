import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { Weapon } from '../src/weapon';
import { CONFIG } from '../src/config';

// The weapon constructor builds meshes and parents them to the camera; none of
// that needs WebGL, so a bare PerspectiveCamera is enough.
function makeWeapon(): Weapon {
  return new Weapon(new THREE.PerspectiveCamera());
}

describe('Weapon initial state', () => {
  it('starts with a full magazine and the configured reserve', () => {
    const w = makeWeapon();
    expect(w.ammo).toBe(CONFIG.magSize);
    expect(w.reserve).toBe(CONFIG.reserveStart);
    expect(w.reloading).toBe(false);
  });
});

describe('Weapon.startReload guards', () => {
  it('does nothing when the magazine is already full', () => {
    const w = makeWeapon();
    w.startReload();
    expect(w.reloading).toBe(false);
  });

  it('does nothing when there is no reserve ammo', () => {
    const w = makeWeapon();
    w.ammo = 3;
    w.reserve = 0;
    w.startReload();
    expect(w.reloading).toBe(false);
  });

  it('begins reloading when the mag is not full and reserve exists', () => {
    const w = makeWeapon();
    w.ammo = 3;
    w.startReload();
    expect(w.reloading).toBe(true);
  });

  it('is idempotent while a reload is already in progress', () => {
    const w = makeWeapon();
    w.ammo = 3;
    w.startReload();
    w.startReload(); // second call must not throw or change state
    expect(w.reloading).toBe(true);
  });
});

describe('Weapon reload completion via update', () => {
  it('refills the magazine from reserve once reloadTime elapses', () => {
    const w = makeWeapon();
    w.ammo = CONFIG.magSize - 5;
    const reserveBefore = w.reserve;

    w.startReload();
    w.update(CONFIG.reloadTime + 0.001); // push the reload timer past zero

    expect(w.ammo).toBe(CONFIG.magSize);
    expect(w.reserve).toBe(reserveBefore - 5);
    expect(w.reloading).toBe(false);
  });

  it('only transfers what the reserve can cover', () => {
    const w = makeWeapon();
    w.ammo = 0;
    w.reserve = 3; // less than a full magazine

    w.startReload();
    w.update(CONFIG.reloadTime + 0.001);

    expect(w.ammo).toBe(3);
    expect(w.reserve).toBe(0);
    expect(w.reloading).toBe(false);
  });

  it('stays in reloading state before the timer elapses', () => {
    const w = makeWeapon();
    w.ammo = 1;
    w.startReload();
    w.update(CONFIG.reloadTime * 0.5);
    expect(w.reloading).toBe(true);
    expect(w.ammo).toBe(1); // not yet refilled
  });
});
