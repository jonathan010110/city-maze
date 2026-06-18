// Tunable constants for the first-person maze shooter. Units are METERS.
export const CONFIG = {
  // player movement / physics
  gravity: -25,
  jumpSpeed: 7, // ~1 m jump
  moveSpeed: 6, // m/s
  playerRadius: 0.4,
  eyeHeight: 1.6, // camera height (m)
  groundY: 0,

  // mouse-look
  lookSensitivity: 0.0022,
  pitchLimit: 1.45,
  cameraRecoil: 0.03, // radians the view kicks up per shot
  cameraRecoilRecover: 8, // how fast the kick settles

  // player stats / progression
  startStrength: 12, // base shot damage
  startDurability: 100, // base max health
  strengthPerPoint: 4,
  durabilityPerPoint: 20,
  levelCostBase: 2, // XP cost of the first upgrade
  levelCostGrowth: 1.12, // cost multiplier per level taken (rises over time)
  levelsForHardStage: 40, // after this many upgrades, enemies get stronger
  hardStageMultiplier: 1.8, // enemy hp/damage scale in the hard stage

  // debug: start one upgrade short of the hard stage so a single press of
  // 1/2 triggers the transition. Set back to false for normal play.
  debugStartNearHardStage: true,

  // weapon (handgun)
  magSize: 12,
  reserveStart: 60,
  reloadTime: 1.1,
  fireCooldown: 0.22,
  shootRange: 7, // meters
  ammoPerKill: 8,
  bulletSpeed: 60, // m/s, visual tracer
  bulletRadius: 0.05,
  bulletColor: 0x111111, // small black ball

  // enemies
  enemyCount: 14, // target population (respawns to maintain this)
  enemyRespawnInterval: 3, // seconds between top-up spawns
  enemyAggroRange: 12,
  enemyPreferredRange: 3.5, // stops here and shoots
  enemyShootRange: 7,
  enemyShootCooldown: 1.4,
  enemyBulletSpeed: 38,

  // maze
  mazeCells: 8,
  cellSize: 4, // corridor width (m)
  minHeight: 12,
  maxHeight: 40,
  braidChance: 0.95,
} as const;

export const MAZE_DIM = 2 * CONFIG.mazeCells + 1;
export const WORLD_HALF = (MAZE_DIM * CONFIG.cellSize) / 2;
