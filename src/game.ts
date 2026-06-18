import * as THREE from 'three';
import { CONFIG } from './config';
import { buildWorld, generateMaze } from './world';
import { Player } from './player';
import { Input, FirstPersonLook } from './controls';
import { resolveSphereAABB, clampToGround } from './collision';
import { EnemyManager } from './enemies';
import { Weapon } from './weapon';
import { Hud } from './hud';
import { ProjectileManager } from './projectiles';

// Owns the renderer/scene/camera, wires the modules together and runs the loop.
export class Game {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly clock = new THREE.Clock();

  private readonly player: Player;
  private readonly input: Input;
  private readonly look = new FirstPersonLook();
  private readonly colliders: THREE.Box3[];
  private readonly spawn: THREE.Vector3;
  private readonly enemies: EnemyManager;
  private readonly weapon: Weapon;
  private readonly hud: Hud;
  private readonly projectiles: ProjectileManager;
  private deathTimer = 0; // seconds of "you died" overlay before respawn
  private stage = 1; // difficulty stage; 2 unlocks after enough level-ups

  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.body.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 1000);
    this.scene.add(this.camera); // so the weapon viewmodel (a camera child) renders

    buildWorld(this.scene);
    const maze = generateMaze(this.scene);
    this.colliders = maze.colliders;
    this.spawn = maze.spawn;

    this.player = new Player();
    this.player.position.copy(this.spawn);
    if (CONFIG.debugStartNearHardStage) {
      // One upgrade short of the hard stage, with exactly enough XP to buy it,
      // so pressing 1 or 2 once triggers the transition.
      this.player.levels = CONFIG.levelsForHardStage - 1;
      this.player.xp = this.player.upgradeCost;
    }

    this.input = new Input(this.renderer.domElement);
    this.projectiles = new ProjectileManager(this.scene);
    this.enemies = new EnemyManager(this.scene, maze.openCells, this.spawn);
    this.weapon = new Weapon(this.camera);
    this.hud = new Hud((stat) => {
      if (this.player.upgrade(stat)) this.checkStage();
    });

    window.addEventListener('resize', this.onResize);
  }

  start(): void {
    this.clock.start();
    requestAnimationFrame(this.loop);
  }

  private loop = () => {
    const dt = Math.min(this.clock.getDelta(), 0.05);

    // Look first so movement is relative to where we're facing.
    this.look.update(this.input, dt);
    this.look.applyTo(this.camera);
    const forward = this.look.flatForward(this.camera);

    // Player movement + physics + collision.
    this.player.update(dt, this.input, forward);
    resolveSphereAABB(this.player, this.colliders);
    clampToGround(this.player);

    // Camera rides at eye height on the player.
    this.camera.position.set(
      this.player.position.x,
      this.player.position.y - this.player.radius + CONFIG.eyeHeight,
      this.player.position.z,
    );

    // Upgrades via number keys (buttons also work when the mouse is released).
    if (this.input.consumePress('Digit1') && this.player.upgrade('strength')) this.checkStage();
    if (this.input.consumePress('Digit2') && this.player.upgrade('durability')) this.checkStage();
    if (this.input.consumePress('KeyR')) this.weapon.startReload();

    // Combat (frozen while the death overlay is up).
    const hpBefore = this.player.health;
    if (this.deathTimer <= 0) {
      this.enemies.update(dt, this.player, this.colliders, this.camera, this.projectiles);
      if (this.input.consumeFire() && this.weapon.tryFire(this.enemies, this.player, this.projectiles)) {
        this.look.addRecoil();
      }
    }
    this.projectiles.update(dt); // bullets land here -> damage applied
    this.weapon.update(dt);
    if (this.player.health < hpBefore) this.hud.flashDamage();

    // Death -> overlay for a beat, then respawn (stats/XP kept).
    if (this.player.dead && this.deathTimer <= 0) {
      this.deathTimer = 1.6;
      this.hud.setDeath(true);
    }
    if (this.deathTimer > 0) {
      this.deathTimer -= dt;
      if (this.deathTimer <= 0) {
        this.player.respawn(this.spawn);
        this.hud.setDeath(false);
      }
    }

    this.hud.update(dt, this.player, this.weapon);
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.loop);
  };

  // Promote to the hard stage once the player has leveled up enough.
  private checkStage(): void {
    if (this.stage === 1 && this.player.levels >= CONFIG.levelsForHardStage) {
      this.stage = 2;
      this.enemies.escalate(CONFIG.hardStageMultiplier);
      this.hud.showBanner('HARD STAGE — enemies are stronger!');
    }
  }

  private onResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };
}
