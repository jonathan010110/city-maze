import type { Player } from './player';
import type { Weapon } from './weapon';

// Builds and updates the on-screen UI: crosshair, health, XP, ammo and the
// bottom-right Strength/Durability upgrade buttons.
export class Hud {
  private readonly healthFill: HTMLElement;
  private readonly healthText: HTMLElement;
  private readonly xpText: HTMLElement;
  private readonly ammoText: HTMLElement;
  private readonly strBtn: HTMLButtonElement;
  private readonly durBtn: HTMLButtonElement;
  private readonly levelText: HTMLElement;
  private readonly vignette: HTMLElement;
  private readonly crosshair: HTMLElement;
  private readonly death: HTMLElement;
  private readonly banner: HTMLElement;
  private flash = 0;
  private bannerTimer = 0;

  constructor(onUpgrade: (stat: 'strength' | 'durability') => void) {
    this.crosshair = el('div', 'crosshair');
    this.crosshair.textContent = '+';

    this.vignette = el('div', 'vignette');

    // Top-left: health bar.
    const healthWrap = el('div', 'health-wrap');
    this.healthText = el('div', 'health-text');
    const barBg = el('div', 'bar-bg');
    this.healthFill = el('div', 'bar-fill');
    barBg.appendChild(this.healthFill);
    healthWrap.append(this.healthText, barBg);

    // Bottom-right: ammo + XP + upgrade buttons.
    const panel = el('div', 'panel');
    this.ammoText = el('div', 'ammo');
    this.xpText = el('div', 'xp');
    this.levelText = el('div', 'level');
    this.strBtn = el('button', 'upg') as HTMLButtonElement;
    this.durBtn = el('button', 'upg') as HTMLButtonElement;
    this.strBtn.addEventListener('click', () => onUpgrade('strength'));
    this.durBtn.addEventListener('click', () => onUpgrade('durability'));
    panel.append(this.ammoText, this.xpText, this.levelText, this.strBtn, this.durBtn);

    this.death = el('div', 'death');
    this.death.textContent = 'YOU DIED — respawning…';
    this.death.style.display = 'none';

    this.banner = el('div', 'banner');
    this.banner.style.display = 'none';

    document.body.append(this.crosshair, this.vignette, healthWrap, panel, this.death, this.banner);
  }

  flashDamage(): void {
    this.flash = 1;
  }

  setDeath(visible: boolean): void {
    this.death.style.display = visible ? 'flex' : 'none';
  }

  showBanner(text: string): void {
    this.banner.textContent = text;
    this.banner.style.display = 'flex';
    this.bannerTimer = 3;
  }

  update(dt: number, player: Player, weapon: Weapon): void {
    const hpPct = (player.health / player.maxHealth) * 100;
    this.healthFill.style.width = `${hpPct}%`;
    this.healthText.textContent = `HP ${Math.ceil(player.health)} / ${player.maxHealth}`;

    this.ammoText.textContent = weapon.reloading
      ? 'RELOADING…'
      : `AMMO ${weapon.ammo} / ${weapon.reserveDisplay}`;

    const cost = player.upgradeCost;
    this.xpText.textContent = `XP: ${player.xp}  (next: ${cost})`;
    this.levelText.textContent = `Level-ups: ${player.levels}`;
    this.strBtn.textContent = `[1] Strength ${player.strength}  (−${cost} XP)`;
    this.durBtn.textContent = `[2] Durability ${player.maxHealth}  (−${cost} XP)`;
    const canUp = player.xp >= cost;
    this.strBtn.disabled = !canUp;
    this.durBtn.disabled = !canUp;

    // Red damage vignette fade.
    this.flash = Math.max(0, this.flash - dt * 2.5);
    this.vignette.style.opacity = String(this.flash * 0.6);

    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) this.banner.style.display = 'none';
    }
  }
}

function el(tag: string, className: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}
