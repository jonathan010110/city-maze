import * as THREE from 'three';
import { CONFIG } from './config';
import type { Input } from './controls';
import type { Body } from './collision';

// The first-person player: a physics sphere (no visible body) plus RPG stats.
export class Player implements Body {
  readonly position = new THREE.Vector3(0, CONFIG.playerRadius, 0); // sphere center
  readonly velocity = new THREE.Vector3();
  readonly radius = CONFIG.playerRadius;
  grounded = true;

  // Stats / progression.
  strength: number = CONFIG.startStrength; // shot damage
  maxHealth: number = CONFIG.startDurability;
  health: number = CONFIG.startDurability;
  xp = 0;
  levels = 0; // total upgrades taken (drives cost + difficulty stage)

  // Scratch vectors.
  private readonly forward = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private readonly wish = new THREE.Vector3();
  private readonly up = new THREE.Vector3(0, 1, 0);

  // `flatForward` is the camera's horizontal facing, supplied by the game loop.
  update(dt: number, input: Input, flatForward: THREE.Vector3): void {
    this.forward.copy(flatForward).setY(0).normalize();
    this.right.crossVectors(this.forward, this.up).normalize();

    this.wish.set(0, 0, 0);
    if (input.forward()) this.wish.add(this.forward);
    if (input.back()) this.wish.sub(this.forward);
    if (input.right()) this.wish.add(this.right);
    if (input.left()) this.wish.sub(this.right);
    if (this.wish.lengthSq() > 0) this.wish.normalize().multiplyScalar(CONFIG.moveSpeed);

    this.velocity.x = this.wish.x;
    this.velocity.z = this.wish.z;

    if (input.jumpPressed() && this.grounded) {
      this.velocity.y = CONFIG.jumpSpeed;
      this.grounded = false;
    }

    this.velocity.y += CONFIG.gravity * dt;
    this.position.addScaledVector(this.velocity, dt);
    this.grounded = false; // collision / ground clamp re-establishes this
  }

  takeDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount);
  }

  get dead(): boolean {
    return this.health <= 0;
  }

  // XP cost of the next upgrade, rising the more you've already leveled.
  get upgradeCost(): number {
    return Math.ceil(CONFIG.levelCostBase * Math.pow(CONFIG.levelCostGrowth, this.levels));
  }

  // Spend XP on a stat. Returns true if it could be afforded.
  upgrade(stat: 'strength' | 'durability'): boolean {
    const cost = this.upgradeCost;
    if (this.xp < cost) return false;
    this.xp -= cost;
    this.levels++;
    if (stat === 'strength') {
      this.strength += CONFIG.strengthPerPoint;
    } else {
      this.maxHealth += CONFIG.durabilityPerPoint;
      this.health += CONFIG.durabilityPerPoint; // healing reward for investing
    }
    return true;
  }

  respawn(spawn: THREE.Vector3): void {
    this.position.copy(spawn);
    this.velocity.set(0, 0, 0);
    this.health = this.maxHealth; // keep stats/XP, just revive
  }
}
