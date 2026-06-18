import * as THREE from 'three';

interface SpawnOptions {
  color: number;
  radius: number;
  speed: number;
  onArrive?: (() => void) | undefined;
}

interface Projectile {
  mesh: THREE.Mesh;
  origin: THREE.Vector3;
  dir: THREE.Vector3;
  total: number; // distance from origin to target
  traveled: number;
  speed: number;
  onArrive: (() => void) | undefined;
}

// Visual tracers: small balls that fly from an origin to a target point and run
// a callback on arrival (where the actual damage is applied).
export class ProjectileManager {
  private readonly list: Projectile[] = [];
  private readonly geo = new THREE.SphereGeometry(1, 8, 6);

  constructor(private readonly scene: THREE.Scene) {}

  spawn(origin: THREE.Vector3, target: THREE.Vector3, opts: SpawnOptions): void {
    const mesh = new THREE.Mesh(this.geo, new THREE.MeshBasicMaterial({ color: opts.color }));
    mesh.scale.setScalar(opts.radius);
    mesh.position.copy(origin);
    this.scene.add(mesh);

    const dir = new THREE.Vector3().subVectors(target, origin);
    const total = dir.length();
    dir.normalize();
    this.list.push({ mesh, origin: origin.clone(), dir, total, traveled: 0, speed: opts.speed, onArrive: opts.onArrive });
  }

  update(dt: number): void {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i]!;
      p.traveled += p.speed * dt;
      if (p.traveled >= p.total) {
        if (p.onArrive) p.onArrive();
        this.scene.remove(p.mesh);
        (p.mesh.material as THREE.Material).dispose();
        this.list.splice(i, 1);
        continue;
      }
      p.mesh.position.copy(p.origin).addScaledVector(p.dir, p.traveled);
    }
  }
}
