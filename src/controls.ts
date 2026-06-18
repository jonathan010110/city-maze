import * as THREE from 'three';
import { CONFIG } from './config';

// Keyboard + pointer-lock mouse input. Edge events (fire, reload, upgrades) are
// queued and consumed once by the game loop.
export class Input {
  private readonly keys = new Set<string>();
  private mouseDX = 0;
  private mouseDY = 0;
  private fireQueued = 0;
  private readonly pressed = new Set<string>(); // one-shot key presses
  locked = false;

  constructor(canvas: HTMLElement) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mousedown', this.onMouseDown);

    canvas.addEventListener('click', () => {
      if (!this.locked) void canvas.requestPointerLock();
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
    });
  }

  forward(): boolean {
    return this.keys.has('KeyW') || this.keys.has('ArrowUp');
  }
  back(): boolean {
    return this.keys.has('KeyS') || this.keys.has('ArrowDown');
  }
  left(): boolean {
    return this.keys.has('KeyA') || this.keys.has('ArrowLeft');
  }
  right(): boolean {
    return this.keys.has('KeyD') || this.keys.has('ArrowRight');
  }
  jumpPressed(): boolean {
    return this.keys.has('Space');
  }

  consumeMouseDX(): number {
    const d = this.mouseDX;
    this.mouseDX = 0;
    return d;
  }
  consumeMouseDY(): number {
    const d = this.mouseDY;
    this.mouseDY = 0;
    return d;
  }
  // True once per click.
  consumeFire(): boolean {
    if (this.fireQueued > 0) {
      this.fireQueued = 0;
      return true;
    }
    return false;
  }
  // True once per key press.
  consumePress(code: string): boolean {
    return this.pressed.delete(code);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (!this.keys.has(e.code)) this.pressed.add(e.code);
    this.keys.add(e.code);
    if (e.code === 'Space') e.preventDefault();
  };
  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };
  private onMouseMove = (e: MouseEvent) => {
    if (!this.locked) return;
    this.mouseDX += e.movementX;
    this.mouseDY += e.movementY;
  };
  private onMouseDown = (e: MouseEvent) => {
    if (this.locked && e.button === 0) this.fireQueued++;
  };
}

// First-person look: turns mouse movement into camera yaw/pitch.
export class FirstPersonLook {
  yaw = 0;
  pitch = 0;
  private recoil = 0; // transient upward kick from firing
  private readonly dir = new THREE.Vector3();

  update(input: Input, dt: number): void {
    this.yaw -= input.consumeMouseDX() * CONFIG.lookSensitivity;
    this.pitch -= input.consumeMouseDY() * CONFIG.lookSensitivity;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -CONFIG.pitchLimit, CONFIG.pitchLimit);
    this.recoil = Math.max(0, this.recoil - this.recoil * CONFIG.cameraRecoilRecover * dt);
  }

  addRecoil(): void {
    this.recoil += CONFIG.cameraRecoil;
  }

  applyTo(camera: THREE.PerspectiveCamera): void {
    const p = THREE.MathUtils.clamp(this.pitch + this.recoil, -CONFIG.pitchLimit, CONFIG.pitchLimit);
    camera.rotation.set(p, this.yaw, 0, 'YXZ');
  }

  // Horizontal forward direction (for movement).
  flatForward(camera: THREE.PerspectiveCamera): THREE.Vector3 {
    camera.getWorldDirection(this.dir);
    this.dir.y = 0;
    return this.dir.normalize();
  }
}
