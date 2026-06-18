import * as THREE from 'three';
import { CONFIG } from './config';
import { resolveSphereAABB, clampToGround, type Body } from './collision';
import type { Player } from './player';
import type { ProjectileManager } from './projectiles';

export interface Tier {
  name: string;
  color: number;
  radius: number;
  hp: number;
  damage: number;
  speed: number;
  xp: number;
  missChance: number; // probability a shot misses
  weight: number;
}

// Weak -> strong. Green often misses, orange seldom, red never.
export const TIERS: Tier[] = [
  { name: 'Runt', color: 0x4caf50, radius: 0.45, hp: 30, damage: 7, speed: 3.2, xp: 2, missChance: 0.55, weight: 5 },
  { name: 'Brute', color: 0xff9800, radius: 0.6, hp: 90, damage: 13, speed: 2.7, xp: 6, missChance: 0.25, weight: 3 },
  { name: 'Titan', color: 0xe53935, radius: 0.85, hp: 220, damage: 22, speed: 2.3, xp: 15, missChance: 0, weight: 1 },
];

export function pickTier(): Tier {
  const total = TIERS.reduce((s, t) => s + t.weight, 0);
  let r = Math.random() * total;
  for (const t of TIERS) {
    r -= t.weight;
    if (r <= 0) return t;
  }
  return TIERS[0]!;
}

// Line-of-sight test against the maze walls (so enemies can't shoot through buildings).
const _losDir = new THREE.Vector3();
const _losHit = new THREE.Vector3();
const _losRay = new THREE.Ray();
function hasLineOfSight(a: THREE.Vector3, b: THREE.Vector3, colliders: THREE.Box3[]): boolean {
  _losDir.subVectors(b, a);
  const d = _losDir.length();
  _losDir.divideScalar(d);
  _losRay.origin.copy(a);
  _losRay.direction.copy(_losDir);
  for (const box of colliders) {
    if (_losRay.intersectBox(box, _losHit) && a.distanceTo(_losHit) < d) return false;
  }
  return true;
}

export class Enemy implements Body {
  readonly position = new THREE.Vector3();
  readonly velocity = new THREE.Vector3();
  readonly radius: number;
  grounded = true;
  hp: number;
  maxHp: number;
  damage: number;
  readonly tier: Tier;
  readonly mesh: THREE.Mesh;

  private readonly meshYOffset: number;
  private readonly barFill: THREE.Mesh;
  private readonly barGroup: THREE.Group;
  private shootTimer: number;
  private readonly muzzleWorld = new THREE.Vector3();

  constructor(tier: Tier, spawn: THREE.Vector3, stageMult: number) {
    this.tier = tier;
    this.radius = tier.radius;
    this.maxHp = tier.hp * stageMult;
    this.hp = this.maxHp;
    this.damage = tier.damage * stageMult;
    this.position.copy(spawn).setY(tier.radius);
    this.shootTimer = Math.random() * CONFIG.enemyShootCooldown;

    const geo = new THREE.CapsuleGeometry(tier.radius, tier.radius * 1.4, 6, 12);
    const mat = new THREE.MeshStandardMaterial({ color: tier.color, roughness: 0.6, emissive: tier.color, emissiveIntensity: 0.12 });
    this.mesh = new THREE.Mesh(geo, mat);
    this.meshYOffset = tier.radius * 0.7;
    this.mesh.userData.enemy = this; // so raycasts find us back

    // Little pistol on the front.
    const pistol = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.12, 0.32),
      new THREE.MeshStandardMaterial({ color: 0x202024, metalness: 0.5, roughness: 0.5 }),
    );
    pistol.position.set(tier.radius * 0.7, 0, -tier.radius * 0.9);
    this.mesh.add(pistol);

    // Health bar (two camera-facing planes) above the head.
    this.barGroup = new THREE.Group();
    const barBg = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.14), new THREE.MeshBasicMaterial({ color: 0x000000 }));
    this.barFill = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.12), new THREE.MeshBasicMaterial({ color: 0x37d04a }));
    this.barFill.position.z = 0.001;
    this.barGroup.add(barBg, this.barFill);
    this.barGroup.position.y = tier.radius * 2.0 + 0.35;
    this.barGroup.scale.setScalar(Math.max(0.9, tier.radius * 2));
    this.mesh.add(this.barGroup);

    this.syncMesh();
  }

  boost(mult: number): void {
    const ratio = this.hp / this.maxHp;
    this.maxHp *= mult;
    this.hp = this.maxHp * ratio;
    this.damage *= mult;
  }

  takeDamage(amount: number): boolean {
    this.hp -= amount;
    return this.hp <= 0;
  }

  // Adds a small black mark on the body where a bullet landed.
  addBulletHole(localPoint: THREE.Vector3): void {
    const hole = new THREE.Mesh(
      new THREE.SphereGeometry(this.radius * 0.16, 6, 5),
      new THREE.MeshBasicMaterial({ color: 0x050505 }),
    );
    hole.position.copy(localPoint);
    this.mesh.add(hole);
  }

  private syncMesh(): void {
    this.mesh.position.copy(this.position).setY(this.position.y + this.meshYOffset);
  }

  update(dt: number, player: Player, colliders: THREE.Box3[], camera: THREE.Camera, projectiles: ProjectileManager): void {
    const dx = player.position.x - this.position.x;
    const dz = player.position.z - this.position.z;
    const dist = Math.hypot(dx, dz);

    // Move toward the player but stop at preferred range to shoot.
    if (dist < CONFIG.enemyAggroRange && dist > CONFIG.enemyPreferredRange) {
      const s = this.tier.speed / dist;
      this.velocity.x = dx * s;
      this.velocity.z = dz * s;
    } else {
      this.velocity.x = 0;
      this.velocity.z = 0;
    }
    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;
    this.grounded = false;
    resolveSphereAABB(this, colliders);
    clampToGround(this);
    this.syncMesh();

    // Health bar: face the camera and reflect current hp.
    this.barGroup.quaternion.copy(camera.quaternion);
    const frac = THREE.MathUtils.clamp(this.hp / this.maxHp, 0, 1);
    this.barFill.scale.x = frac;
    this.barFill.position.x = -(1 - frac) / 2; // keep it left-anchored
    (this.barFill.material as THREE.MeshBasicMaterial).color.setHSL(frac * 0.33, 0.8, 0.5);

    // Shooting.
    this.shootTimer -= dt;
    if (this.shootTimer <= 0 && dist < CONFIG.enemyShootRange) {
      this.muzzleWorld.copy(this.position).setY(this.position.y + this.radius);
      const eye = player.position.clone().setY(player.position.y - player.radius + CONFIG.eyeHeight);
      if (hasLineOfSight(this.muzzleWorld, eye, colliders)) {
        this.shootTimer = CONFIG.enemyShootCooldown * (0.7 + Math.random() * 0.6);
        const hit = Math.random() >= this.tier.missChance;
        const target = eye.clone();
        if (!hit) target.add(new THREE.Vector3((Math.random() - 0.5) * 2.5, (Math.random() - 0.5) * 2.5, (Math.random() - 0.5) * 2.5));
        projectiles.spawn(this.muzzleWorld.clone(), target, {
          color: this.tier.color,
          radius: CONFIG.bulletRadius,
          speed: CONFIG.enemyBulletSpeed,
          onArrive: hit ? () => player.takeDamage(this.damage) : undefined,
        });
      }
    }
  }
}

export class EnemyManager {
  readonly enemies: Enemy[] = [];
  readonly meshes: THREE.Mesh[] = []; // capsules only, for raycasting
  private stageMult = 1;
  private respawnTimer = CONFIG.enemyRespawnInterval;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly openCells: THREE.Vector3[],
    private readonly spawn: THREE.Vector3,
  ) {
    for (let i = 0; i < CONFIG.enemyCount; i++) this.spawnOne();
  }

  private spawnOne(): void {
    const cells = this.openCells.filter((c) => c.distanceTo(this.spawn) > CONFIG.cellSize * 3);
    const cell = cells[Math.floor(Math.random() * cells.length)];
    if (!cell) return;
    const enemy = new Enemy(pickTier(), cell, this.stageMult);
    this.enemies.push(enemy);
    this.meshes.push(enemy.mesh);
    this.scene.add(enemy.mesh);
  }

  private remove(index: number): void {
    const enemy = this.enemies[index]!;
    this.scene.remove(enemy.mesh);
    enemy.mesh.geometry.dispose();
    this.enemies.splice(index, 1);
    const mi = this.meshes.indexOf(enemy.mesh);
    if (mi >= 0) this.meshes.splice(mi, 1);
  }

  update(dt: number, player: Player, colliders: THREE.Box3[], camera: THREE.Camera, projectiles: ProjectileManager): void {
    for (const e of this.enemies) e.update(dt, player, colliders, camera, projectiles);

    // Keep the maze populated so the grind never runs dry.
    this.respawnTimer -= dt;
    if (this.respawnTimer <= 0) {
      this.respawnTimer = CONFIG.enemyRespawnInterval;
      if (this.enemies.length < CONFIG.enemyCount) this.spawnOne();
    }
  }

  // Apply a hit to a specific capsule mesh. Returns XP if the enemy died.
  damageByMesh(mesh: THREE.Object3D, amount: number, hitPoint: THREE.Vector3): number {
    const enemy = mesh.userData.enemy as Enemy | undefined;
    if (!enemy) return 0;
    const idx = this.enemies.indexOf(enemy);
    if (idx < 0) return 0;
    if (enemy.takeDamage(amount)) {
      const xp = enemy.tier.xp;
      this.remove(idx);
      return xp;
    }
    enemy.addBulletHole(enemy.mesh.worldToLocal(hitPoint.clone()));
    return 0;
  }

  // Make all current and future enemies tougher (hard stage).
  escalate(mult: number): void {
    this.stageMult = mult;
    for (const e of this.enemies) e.boost(mult);
  }
}
