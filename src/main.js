const enemies = [
  { name: 'Forest Bandit', hp: 16, damage: 2, reward: 7, xp: 6 },
  { name: 'Demonic Wolf', hp: 24, damage: 3, reward: 10, xp: 8 },
  { name: 'Fallen Cultivator', hp: 38, damage: 5, reward: 14, xp: 11 },
  { name: 'Ruins Guardian', hp: 56, damage: 7, reward: 20, xp: 16 }
];

const attributes = [
  { key: 'strength', label: 'Strength', desc: '+2 damage each point' },
  { key: 'vitality', label: 'Vitality', desc: '+9 HP each point' },
  { key: 'agility', label: 'Agility', desc: '-16ms attack interval each point' },
  { key: 'dexterity', label: 'Dexterity', desc: '+0.8% crit chance each point' },
  { key: 'spirit', label: 'Spirit', desc: '+6% Spirit Stone gain each point' },
  { key: 'willpower', label: 'Willpower', desc: '+4% breakthrough bonus each point' },
  { key: 'luck', label: 'Luck', desc: '+0.6% evasion each point' }
];

const state = {
  level: 1,
  xp: 0,
  xpNeeded: 10,
  currency: 0,
  daoInsight: 0,
  statPoints: 0,
  baseDamage: 4,
  baseHp: 35,
  enemyTier: 0,
  enemy: null,
  log: ['The Dao journey begins.'],
  costs: {
    damage: 12,
    health: 10
  },
  attr: {
    strength: 3,
    vitality: 3,
    agility: 2,
    dexterity: 2,
    spirit: 1,
    willpower: 1,
    luck: 1
  },
  player: {
    hp: 1,
    hpMax: 1,
    damage: 1,
    critChance: 0,
    evasion: 0,
    attackIntervalMs: 600
  }
};

const el = {
  level: document.getElementById('level'),
  xp: document.getElementById('xp'),
  xpNeeded: document.getElementById('xp-needed'),
  hp: document.getElementById('player-hp'),
  hpMax: document.getElementById('player-hp-max'),
  dmg: document.getElementById('player-damage'),
  critChance: document.getElementById('crit-chance'),
  evasion: document.getElementById('evasion'),
  attackInterval: document.getElementById('attack-interval'),
  statPoints: document.getElementById('stat-points'),
  currency: document.getElementById('currency'),
  daoInsight: document.getElementById('dao-insight'),
  enemyName: document.getElementById('enemy-name'),
  enemyLvl: document.getElementById('enemy-level'),
  enemyHp: document.getElementById('enemy-hp'),
  enemyHpMax: document.getElementById('enemy-hp-max'),
  enemyReward: document.getElementById('enemy-reward'),
  enemyBar: document.getElementById('enemy-bar'),
  log: document.getElementById('event-log'),
  damageBtn: document.getElementById('upgrade-damage'),
  healthBtn: document.getElementById('upgrade-health'),
  breakthroughBtn: document.getElementById('breakthrough'),
  attributeList: document.getElementById('attribute-list')
};

function pushLog(message) {
  state.log.unshift(message);
  state.log = state.log.slice(0, 12);
}

function recalcDerivedStats() {
  state.player.damage = state.baseDamage + state.attr.strength * 2 + Math.floor(state.daoInsight * 0.8);
  state.player.hpMax = state.baseHp + state.attr.vitality * 9 + state.daoInsight * 4;
  state.player.critChance = Math.min(60, state.attr.dexterity * 0.8 + state.daoInsight * 0.15);
  state.player.evasion = Math.min(45, state.attr.luck * 0.6 + state.attr.agility * 0.2);
  state.player.attackIntervalMs = Math.max(260, 640 - state.attr.agility * 16 - state.daoInsight * 5);

  state.player.hp = Math.min(state.player.hp, state.player.hpMax);
}

function spawnEnemy() {
  const template = enemies[state.enemyTier % enemies.length];
  const cycle = Math.floor(state.enemyTier / enemies.length);
  const scale = 1 + cycle * 0.3;

  const hpMax = Math.round(template.hp * scale);
  state.enemy = {
    name: template.name,
    level: state.enemyTier + 1,
    hpMax,
    hp: hpMax,
    damage: Math.round(template.damage * scale),
    reward: Math.round(template.reward * scale),
    xp: Math.round(template.xp * scale)
  };
}

function gainXp(amount) {
  state.xp += amount;

  while (state.xp >= state.xpNeeded) {
    state.xp -= state.xpNeeded;
    state.level += 1;
    state.xpNeeded = Math.round(state.xpNeeded * 1.3);
    state.baseHp += 3;
    state.baseDamage += 1;
    state.statPoints += 3;
    pushLog(`You reached cultivation level ${state.level}. +3 attribute points.`);
  }
}

function getCritDamageMultiplier() {
  return Math.random() * 100 < state.player.critChance ? 1.75 : 1;
}

function enemyHitsPlayer() {
  const dodged = Math.random() * 100 < state.player.evasion;
  if (dodged) {
    pushLog(`You evaded ${state.enemy.name}'s strike.`);
    return;
  }
  state.player.hp -= state.enemy.damage;
}

function fightTick() {
  if (!state.enemy) return;

  recalcDerivedStats();

  const hit = Math.round(state.player.damage * getCritDamageMultiplier());
  state.enemy.hp -= hit;

  if (state.enemy.hp <= 0) {
    const spiritBonus = 1 + state.attr.spirit * 0.06;
    const reward = Math.round(state.enemy.reward * spiritBonus);
    state.currency += reward;
    gainXp(state.enemy.xp);
    pushLog(`Defeated ${state.enemy.name}: +${reward} Spirit Stones.`);

    state.enemyTier += 1;
    spawnEnemy();
    state.player.hp = state.player.hpMax;
    render();
    return;
  }

  enemyHitsPlayer();

  if (state.player.hp <= 0) {
    state.player.hp = state.player.hpMax;
    state.enemy.hp = state.enemy.hpMax;
    pushLog('Defeat. You meditate and recover.');
  }

  render();
}

function buyDamage() {
  if (state.currency < state.costs.damage) return;
  state.currency -= state.costs.damage;
  state.baseDamage += 1;
  state.costs.damage = Math.round(state.costs.damage * 1.34);
  pushLog('Technique improved: +1 base damage.');
  recalcDerivedStats();
  render();
}

function buyHealth() {
  if (state.currency < state.costs.health) return;
  state.currency -= state.costs.health;
  state.baseHp += 8;
  state.player.hp = state.player.hpMax;
  state.costs.health = Math.round(state.costs.health * 1.32);
  pushLog('Body tempered: +8 base HP.');
  recalcDerivedStats();
  render();
}

function breakthrough() {
  if (state.level < 7) {
    pushLog('Breakthrough requires at least level 7.');
    render();
    return;
  }

  const willBonus = 1 + state.attr.willpower * 0.04;
  const gain = Math.max(1, Math.floor((state.level / 3) * willBonus));

  state.daoInsight += gain;
  state.level = 1;
  state.xp = 0;
  state.xpNeeded = 10;
  state.currency = 0;
  state.enemyTier = 0;
  state.statPoints = 4;
  state.baseDamage = 4 + Math.floor(state.daoInsight * 0.6);
  state.baseHp = 35 + state.daoInsight * 2;
  state.costs.damage = 12;
  state.costs.health = 10;

  pushLog(`Breakthrough achieved! +${gain} Dao Insight.`);
  recalcDerivedStats();
  state.player.hp = state.player.hpMax;
  spawnEnemy();
  render();
}

function increaseAttribute(key) {
  if (state.statPoints <= 0) return;
  state.attr[key] += 1;
  state.statPoints -= 1;
  recalcDerivedStats();
  render();
}

function renderAttributes() {
  el.attributeList.innerHTML = attributes
    .map(
      (attribute) => `
      <div class="attribute-item">
        <div>
          <strong>${attribute.label}</strong>
          <p class="hint">${attribute.desc}</p>
        </div>
        <strong>${state.attr[attribute.key]}</strong>
        <div class="attribute-controls">
          <button class="btn" data-attr="${attribute.key}" ${state.statPoints <= 0 ? 'disabled' : ''}>+1</button>
        </div>
      </div>`
    )
    .join('');

  el.attributeList.querySelectorAll('button[data-attr]').forEach((button) => {
    button.addEventListener('click', () => increaseAttribute(button.dataset.attr));
  });
}

function render() {
  recalcDerivedStats();

  el.level.textContent = state.level;
  el.xp.textContent = state.xp;
  el.xpNeeded.textContent = state.xpNeeded;
  el.hp.textContent = Math.max(0, Math.round(state.player.hp));
  el.hpMax.textContent = Math.round(state.player.hpMax);
  el.dmg.textContent = state.player.damage;
  el.critChance.textContent = `${state.player.critChance.toFixed(1)}%`;
  el.evasion.textContent = `${state.player.evasion.toFixed(1)}%`;
  el.attackInterval.textContent = `${state.player.attackIntervalMs}ms`;
  el.statPoints.textContent = state.statPoints;
  el.currency.textContent = state.currency;
  el.daoInsight.textContent = state.daoInsight;

  el.enemyName.textContent = state.enemy.name;
  el.enemyLvl.textContent = state.enemy.level;
  el.enemyHp.textContent = Math.max(0, state.enemy.hp);
  el.enemyHpMax.textContent = state.enemy.hpMax;
  el.enemyReward.textContent = state.enemy.reward;
  el.enemyBar.style.width = `${(Math.max(0, state.enemy.hp) / state.enemy.hpMax) * 100}%`;

  el.log.innerHTML = state.log.map((entry) => `<li>${entry}</li>`).join('');

  el.damageBtn.textContent = `Upgrade Technique (+1 base damage) — ${state.costs.damage}`;
  el.healthBtn.textContent = `Temper Body (+8 base HP) — ${state.costs.health}`;
  el.damageBtn.disabled = state.currency < state.costs.damage;
  el.healthBtn.disabled = state.currency < state.costs.health;

  renderAttributes();
}

function gameLoop() {
  fightTick();
  setTimeout(gameLoop, state.player.attackIntervalMs);
}

el.damageBtn.addEventListener('click', buyDamage);
el.healthBtn.addEventListener('click', buyHealth);
el.breakthroughBtn.addEventListener('click', breakthrough);

recalcDerivedStats();
state.player.hp = state.player.hpMax;
spawnEnemy();
render();
gameLoop();
