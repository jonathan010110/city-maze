import * as THREE from 'three';
import { CONFIG, MAZE_DIM } from './config';

export interface MazeResult {
  colliders: THREE.Box3[];
  spawn: THREE.Vector3;
  openCells: THREE.Vector3[]; // world centers of every walkable cell (for spawning enemies)
}

// Builds the ground, lights and sky.
export function buildWorld(scene: THREE.Scene): void {
  scene.background = new THREE.Color(0x8fb3d9); // hazy sky
  scene.fog = new THREE.Fog(0x8fb3d9, 50, 140);

  const size = MAZE_DIM * CONFIG.cellSize;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshStandardMaterial({ color: 0x32363b }),
  );
  ground.rotation.x = -Math.PI / 2; // lie flat in the XZ plane at y = 0
  ground.receiveShadow = true;
  scene.add(ground);

  scene.add(new THREE.HemisphereLight(0xcfe4ff, 0x40464d, 1.0));
  const sun = new THREE.DirectionalLight(0xfff2d8, 1.3);
  sun.position.set(40, 70, 25);
  scene.add(sun);
}

// --- Procedural building facades -------------------------------------------

// Paints a tile of windows (random lit/unlit) onto a canvas texture. Tiling
// this vertically gives a believable lit-window facade.
function makeFacadeTexture(): THREE.CanvasTexture {
  const cols = 4;
  const rows = 6;
  const cell = 24;
  const canvas = document.createElement('canvas');
  canvas.width = cols * cell;
  canvas.height = rows * cell;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#262b33'; // concrete / mullions
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const lit = ['#ffe6a3', '#ffd27a', '#fff4cf'];
  const dark = ['#11202b', '#15252f', '#0e1a22'];
  const margin = 4;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const isLit = Math.random() < 0.32;
      const pool = isLit ? lit : dark;
      ctx.fillStyle = pool[Math.floor(Math.random() * pool.length)]!;
      ctx.fillRect(c * cell + margin, r * cell + margin, cell - 2 * margin, cell - 2 * margin);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

const PALETTE = [0x9aa7b4, 0x7e8a99, 0xa9968a, 0x8d8f9c, 0x6f7d86, 0xb0a89a];
const ROOF = [0x3a3f47, 0x2e333a, 0x434750];

// A few base facade textures so buildings don't all share one window pattern.
let facadeBases: THREE.CanvasTexture[] | null = null;
const materialCache = new Map<string, THREE.Material[]>();

// Returns a 6-face material array (windowed sides, plain roof) for a building.
function buildingMaterials(colorIdx: number, baseIdx: number, repeatY: number): THREE.Material[] {
  const key = `${colorIdx}-${baseIdx}-${repeatY}`;
  const cached = materialCache.get(key);
  if (cached) return cached;

  const base = facadeBases![baseIdx]!;
  const map = base.clone();
  map.needsUpdate = true;
  map.repeat.set(1, repeatY); // tile windows up the height

  const side = new THREE.MeshStandardMaterial({
    map,
    color: PALETTE[colorIdx]!,
    roughness: 0.85,
    metalness: 0.05,
  });
  const roof = new THREE.MeshStandardMaterial({ color: ROOF[colorIdx % ROOF.length]!, roughness: 0.9 });

  // BoxGeometry face order: +x, -x, +y(top), -y(bottom), +z, -z.
  const mats = [side, side, roof, roof, side, side];
  materialCache.set(key, mats);
  return mats;
}

// --- Maze generation -------------------------------------------------------

// Recursive-backtracker maze. Returns a grid where true = wall (building),
// false = walkable passage. Outer ring stays solid so the player is enclosed.
export function generateMazeGrid(): boolean[][] {
  const dim = MAZE_DIM;
  const grid: boolean[][] = Array.from({ length: dim }, () => Array<boolean>(dim).fill(true));
  const isWall = (x: number, y: number) => grid[y]![x]!;
  const setOpen = (x: number, y: number) => {
    grid[y]![x] = false;
  };

  const stack: Array<[number, number]> = [];
  setOpen(1, 1);
  stack.push([1, 1]);
  const dirs: Array<[number, number]> = [
    [2, 0],
    [-2, 0],
    [0, 2],
    [0, -2],
  ];

  while (stack.length > 0) {
    const [x, y] = stack[stack.length - 1]!;
    const options = dirs
      .map(([dx, dy]) => [x + dx, y + dy, dx, dy] as const)
      .filter(([nx, ny]) => nx > 0 && ny > 0 && nx < dim - 1 && ny < dim - 1 && isWall(nx, ny));

    if (options.length === 0) {
      stack.pop();
      continue;
    }
    const [nx, ny, dx, dy] = options[Math.floor(Math.random() * options.length)]!;
    setOpen(x + dx / 2, y + dy / 2); // knock out the wall between cells
    setOpen(nx, ny);
    stack.push([nx, ny]);
  }

  // Braid the maze: open extra walls so dead-ends become loops. This gives many
  // interconnected paths and no single "end" -- you can wander forever.
  const isOpen = (x: number, y: number) => !grid[y]![x];
  const steps: Array<[number, number]> = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  for (let y = 1; y < dim - 1; y += 2) {
    for (let x = 1; x < dim - 1; x += 2) {
      const openCount = steps.filter(([dx, dy]) => isOpen(x + dx, y + dy)).length;
      if (openCount > 1) continue; // not a dead-end
      if (Math.random() > CONFIG.braidChance) continue;
      // Knock out a currently-closed wall that connects to another corridor.
      const links = steps.filter(
        ([dx, dy]) =>
          !isOpen(x + dx, y + dy) &&
          x + dx * 2 > 0 &&
          y + dy * 2 > 0 &&
          x + dx * 2 < dim - 1 &&
          y + dy * 2 < dim - 1 &&
          isOpen(x + dx * 2, y + dy * 2),
      );
      const link = links[Math.floor(Math.random() * links.length)];
      if (link) setOpen(x + link[0], y + link[1]);
    }
  }
  return grid;
}

// Maps a grid index to its centered world coordinate (in meters).
export function cellWorld(i: number): number {
  return (i - (MAZE_DIM - 1) / 2) * CONFIG.cellSize;
}

// Builds the maze of buildings and returns colliders + a safe spawn point.
export function generateMaze(scene: THREE.Scene): MazeResult {
  if (!facadeBases) facadeBases = [makeFacadeTexture(), makeFacadeTexture(), makeFacadeTexture()];

  const grid = generateMazeGrid();
  const dim = MAZE_DIM;
  const { cellSize, minHeight, maxHeight } = CONFIG;

  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const colliders: THREE.Box3[] = [];
  const openCells: THREE.Vector3[] = [];

  for (let gy = 0; gy < dim; gy++) {
    for (let gx = 0; gx < dim; gx++) {
      if (!grid[gy]![gx]) {
        openCells.push(new THREE.Vector3(cellWorld(gx), CONFIG.playerRadius, cellWorld(gy)));
        continue; // passage, leave open
      }

      const cx = cellWorld(gx);
      const cz = cellWorld(gy);
      const h = minHeight + Math.random() * (maxHeight - minHeight);

      const colorIdx = Math.floor(Math.random() * PALETTE.length);
      const baseIdx = (gx + gy) % 3;
      const repeatY = Math.max(2, Math.round(h / 6));
      const mesh = new THREE.Mesh(boxGeo, buildingMaterials(colorIdx, baseIdx, repeatY));
      mesh.scale.set(cellSize, h, cellSize); // fill the whole cell -> continuous walls
      mesh.position.set(cx, h / 2, cz);
      scene.add(mesh);

      colliders.push(
        new THREE.Box3().setFromCenterAndSize(
          new THREE.Vector3(cx, h / 2, cz),
          new THREE.Vector3(cellSize, h, cellSize),
        ),
      );
    }
  }

  // Cell (1,1) is always carved open by the generator -> safe spawn.
  const spawn = new THREE.Vector3(cellWorld(1), CONFIG.playerRadius, cellWorld(1));
  return { colliders, spawn, openCells };
}
