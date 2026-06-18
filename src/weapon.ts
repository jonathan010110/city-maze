import * as THREE from 'three';
import { CONFIG } from './config';
import type { Player } from './player';
import type { EnemyManager } from './enemies';
import type { ProjectileManager } from './projectiles';

// A simple handgun: a viewmodel parented to the camera, a hitscan to decide the
// target, and a visible bullet that flies from the muzzle to that point.
export class Weapon {
  ammo: number = CONFIG.magSize;
  reserve: number = CONFIG.reserveStart;
  reloading = false;

  private cooldown = 0;
  private reloadTimer = 0;
  private recoil = 0;

  private readonly group = new THREE.Group();
  private readonly muzzle: THREE.Mesh;
  private readonly raycaster = new THREE.Raycaster();
  private readonly center = new THREE.Vector2(0, 0);
  private readonly muzzleWorld = new THREE.Vector3();
  private readonly farPoint = new THREE.Vector3();

  constructor(private readonly camera: THREE.PerspectiveCamera) {
    this.raycaster.far = CONFIG.shootRange;

    const metal = new THREE.MeshStandardMaterial({ color: 0x2b2b30, roughness: 0.5, metalness: 0.6 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.3), metal);
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.28), metal);
    barrel.position.set(0, 0.05, -0.28);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.12), metal);
    grip.position.set(0, -0.16, 0.06);

    this.muzzle = new THREE.Mesh(
      new THREE.PlaneGeometry(0.18, 0.18),
      new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.9 }),
    );
    this.muzzle.position.set(0, 0.05, -0.44);
    this.muzzle.visible = false;

    this.group.add(body, barrel, grip, this.muzzle);
    this.group.position.set(0.22, -0.22, -0.45);
    camera.add(this.group);
  }

  get reserveDisplay(): number {
    return this.reserve;
  }

  startReload(): void {
    if (this.reloading || this.ammo === CONFIG.magSize || this.reserve === 0) return;
    this.reloading = true;
    this.reloadTimer = CONFIG.reloadTime;
  }

  // Fire if able. Returns true if a shot left the barrel (for camera recoil).
  tryFire(enemies: EnemyManager, player: Player, projectiles: ProjectileManager): boolean {
    if (this.cooldown > 0 || this.reloading) return false;
    if (this.ammo <= 0) {
      this.startReload();
      return false;
    }
    this.ammo--;
    this.cooldown = CONFIG.fireCooldown;
    this.recoil = 0.06;
    this.muzzle.visible = true;

    this.camera.updateMatrixWorld();
    this.muzzle.getWorldPosition(this.muzzleWorld);

    this.raycaster.setFromCamera(this.center, this.camera);
    const hits = this.raycaster.intersectObjects(enemies.meshes, false);
    const first = hits[0];

    let target: THREE.Vector3;
    let hitMesh: THREE.Object3D | null = null;
    if (first) {
      target = first.point.clone();
      hitMesh = first.object;
    } else {
      target = this.raycaster.ray.at(CONFIG.shootRange, this.farPoint).clone();
    }

    projectiles.spawn(this.muzzleWorld.clone(), target, {
      color: CONFIG.bulletColor,
      radius: CONFIG.bulletRadius,
      speed: CONFIG.bulletSpeed,
      onArrive: () => {
        if (!hitMesh) return;
        const xp = enemies.damageByMesh(hitMesh, player.strength, target);
        if (xp > 0) {
          player.xp += xp;
          this.reserve += CONFIG.ammoPerKill;
        }
      },
    });
    return true;
  }

  update(dt: number): void {
    this.cooldown = Math.max(0, this.cooldown - dt);

    if (this.reloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        const need = CONFIG.magSize - this.ammo;
        const take = Math.min(need, this.reserve);
        this.ammo += take;
        this.reserve -= take;
        this.reloading = false;
      }
    }

    if (this.muzzle.visible && this.cooldown < CONFIG.fireCooldown - 0.04) this.muzzle.visible = false;

    this.recoil = Math.max(0, this.recoil - dt * 0.4);
    this.group.position.z = -0.45 + this.recoil;
  }
}
