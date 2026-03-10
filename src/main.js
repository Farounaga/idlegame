const enemyArchetypes = [
  { name: 'Forest Bandit', hpFactor: 1, damageFactor: 1, rewardFactor: 1, xpFactor: 1 },
  { name: 'Demonic Wolf', hpFactor: 0.88, damageFactor: 1.12, rewardFactor: 1.06, xpFactor: 1.04 },
  { name: 'Fallen Cultivator', hpFactor: 1.2, damageFactor: 1.05, rewardFactor: 1.14, xpFactor: 1.15 },
  { name: 'Ruins Guardian', hpFactor: 1.45, damageFactor: 1.2, rewardFactor: 1.22, xpFactor: 1.2 }
];

const attributes = [
  { key: 'strength', label: 'Strength', desc: '+2 damage each point' },
  { key: 'vitality', label: 'Vitality', desc: '+9 HP each point' },
  { key: 'agility', label: 'Agility', desc: '-16ms player attack interval each point' },
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
  costs: { damage: 12, health: 10 },
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
    attackIntervalMs: 640,
    attackProgressMs: 0
  },
  enemyAttackIntervalMs: 900,
  enemyAttackProgressMs: 0,
  lastFrameMs: performance.now()
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
  statPoints: document.getElementById('stat-points'),
  currency: document.getElementById('currency'),
  daoInsight: document.getElementById('dao-insight'),
  enemyName: document.getElementById('enemy-name'),
  enemyLvl: document.getElementById('enemy-level'),
  enemyHp: document.getElementById('enemy-hp'),
  enemyHpMax: document.getElementById('enemy-hp-max'),
  enemyReward: document.getElementById('enemy-reward'),
  enemyHpBar: document.getElementById('enemy-hp-bar'),
  enemyHpLabel: document.getElementById('enemy-hp-label'),
  playerHpBar: document.getElementById('player-hp-bar'),
  playerHpLabel: document.getElementById('player-hp-label'),
  playerCooldownBar: document.getElementById('player-cooldown-bar'),
  playerCooldownLabel: document.getElementById('player-cooldown-label'),
  enemyCooldownBar: document.getElementById('enemy-cooldown-bar'),
  enemyCooldownLabel: document.getElementById('enemy-cooldown-label'),
  playerSprite: document.getElementById('player-sprite'),
  enemySprite: document.getElementById('enemy-sprite'),
  playerFighter: document.getElementById('player-fighter'),
  enemyFighter: document.getElementById('enemy-fighter'),
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

function animateAttack(attackerSprite, defenderCard, attackClass) {
  attackerSprite.classList.remove(attackClass);
  void attackerSprite.offsetWidth;
  attackerSprite.classList.add(attackClass);

  defenderCard.classList.remove('hit-flash');
  void defenderCard.offsetWidth;
  defenderCard.classList.add('hit-flash');
}

function recalcDerivedStats() {
  state.player.damage = state.baseDamage + state.attr.strength * 2 + Math.floor(state.daoInsight * 0.8);
  state.player.hpMax = state.baseHp + state.attr.vitality * 9 + state.daoInsight * 4;
  state.player.critChance = Math.min(60, state.attr.dexterity * 0.8 + state.daoInsight * 0.15);
  state.player.evasion = Math.min(45, state.attr.luck * 0.6 + state.attr.agility * 0.2);
  state.player.attackIntervalMs = Math.max(260, 640 - state.attr.agility * 16 - state.daoInsight * 5);
  state.player.hp = Math.min(state.player.hp, state.player.hpMax);
}

function growthCurve(stage) {
  const s = stage + 1;

  // Multi-phase idle curve: exponential backbone + polynomial pressure + periodic waves + milestone spikes + soft rebalance.
  const baseExp = Math.pow(1.145, s);
  const lateExp = Math.pow(1.018, Math.max(0, s - 35));
  const polynomialPressure = 1 + 0.025 * Math.pow(s, 1.15);
  const wave = 1 + 0.09 * Math.sin(s * 0.7) + 0.04 * Math.sin(s * 0.17 + 1.1);
  const milestoneSpike = s % 10 === 0 ? 1.42 : s % 5 === 0 ? 1.18 : 1;
  const softRebalance = 1 / (1 + Math.max(0, s - 140) * 0.0018);

  return baseExp * lateExp * polynomialPressure * wave * milestoneSpike * softRebalance;
}

function enemyProfile(stage) {
  const archetype = enemyArchetypes[stage % enemyArchetypes.length];
  const s = stage + 1;
  const curve = growthCurve(stage);

  const hp = Math.max(10, Math.round(18 * curve * archetype.hpFactor));
  const damage = Math.max(1, Math.round(2.8 * Math.pow(curve, 0.74) * archetype.damageFactor));
  const reward = Math.max(1, Math.round(5.5 * Math.pow(curve, 0.62) * archetype.rewardFactor * (1 + s * 0.018)));
  const xp = Math.max(1, Math.round(4.8 * Math.pow(curve, 0.59) * archetype.xpFactor * (1 + s * 0.012)));
  const enemyAttackIntervalMs = Math.max(380, Math.round(980 - Math.log2(s + 1) * 76));

  return {
    name: archetype.name,
    level: s,
    hpMax: hp,
    hp,
    damage,
    reward,
    xp,
    attackIntervalMs: enemyAttackIntervalMs
  };
}

function spawnEnemy() {
  state.enemy = enemyProfile(state.enemyTier);
  state.enemyAttackIntervalMs = state.enemy.attackIntervalMs;
  state.enemyAttackProgressMs = 0;
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

function playerAttack() {
  const crit = Math.random() * 100 < state.player.critChance;
  const hit = Math.round(state.player.damage * (crit ? 1.75 : 1));
  state.enemy.hp -= hit;
  animateAttack(el.playerSprite, el.enemyFighter, 'attack-player');

  if (state.enemy.hp <= 0) {
    const spiritBonus = 1 + state.attr.spirit * 0.06;
    const reward = Math.round(state.enemy.reward * spiritBonus);
    state.currency += reward;
    gainXp(state.enemy.xp);
    pushLog(`Defeated ${state.enemy.name}: +${reward} Spirit Stones.`);
    state.enemyTier += 1;
    spawnEnemy();
    state.player.hp = state.player.hpMax;
  }
}

function enemyAttack() {
  const dodged = Math.random() * 100 < state.player.evasion;
  animateAttack(el.enemySprite, el.playerFighter, 'attack-enemy');

  if (dodged) {
    pushLog(`You evaded ${state.enemy.name}'s strike.`);
    return;
  }

  state.player.hp -= state.enemy.damage;

  if (state.player.hp <= 0) {
    state.player.hp = state.player.hpMax;
    state.enemy.hp = state.enemy.hpMax;
    state.enemyAttackProgressMs = 0;
    state.player.attackProgressMs = 0;
    pushLog('Defeat. You meditate and recover.');
  }
}

function updateCombat(deltaMs) {
  if (!state.enemy) return;

  state.player.attackProgressMs += deltaMs;
  state.enemyAttackProgressMs += deltaMs;

  if (state.player.attackProgressMs >= state.player.attackIntervalMs) {
    state.player.attackProgressMs -= state.player.attackIntervalMs;
    playerAttack();
  }

  if (state.enemyAttackProgressMs >= state.enemyAttackIntervalMs) {
    state.enemyAttackProgressMs -= state.enemyAttackIntervalMs;
    enemyAttack();
  }
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
  state.player.attackProgressMs = 0;

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
        <button class="btn" data-attr="${attribute.key}" ${state.statPoints <= 0 ? 'disabled' : ''}>+1</button>
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
  el.statPoints.textContent = state.statPoints;
  el.currency.textContent = state.currency;
  el.daoInsight.textContent = state.daoInsight;

  const playerHpPct = (Math.max(0, state.player.hp) / state.player.hpMax) * 100;
  el.playerHpBar.style.width = `${playerHpPct}%`;
  el.playerHpLabel.textContent = `${playerHpPct.toFixed(0)}%`;

  el.enemyName.textContent = state.enemy.name;
  el.enemyLvl.textContent = state.enemy.level;
  el.enemyHp.textContent = Math.max(0, state.enemy.hp);
  el.enemyHpMax.textContent = state.enemy.hpMax;
  el.enemyReward.textContent = state.enemy.reward;

  const enemyHpPct = (Math.max(0, state.enemy.hp) / state.enemy.hpMax) * 100;
  el.enemyHpBar.style.width = `${enemyHpPct}%`;
  el.enemyHpLabel.textContent = `${enemyHpPct.toFixed(0)}%`;

  const playerCdPct = (state.player.attackProgressMs / state.player.attackIntervalMs) * 100;
  el.playerCooldownBar.style.width = `${Math.min(100, playerCdPct)}%`;
  el.playerCooldownLabel.textContent = `${Math.min(100, playerCdPct).toFixed(0)}%`;

  const enemyCdPct = (state.enemyAttackProgressMs / state.enemyAttackIntervalMs) * 100;
  el.enemyCooldownBar.style.width = `${Math.min(100, enemyCdPct)}%`;
  el.enemyCooldownLabel.textContent = `${Math.min(100, enemyCdPct).toFixed(0)}%`;

  el.log.innerHTML = state.log.map((entry) => `<li>${entry}</li>`).join('');

  el.damageBtn.textContent = `Upgrade Technique (+1 base damage) — ${state.costs.damage}`;
  el.healthBtn.textContent = `Temper Body (+8 base HP) — ${state.costs.health}`;
  el.damageBtn.disabled = state.currency < state.costs.damage;
  el.healthBtn.disabled = state.currency < state.costs.health;

  renderAttributes();
}

function frame(nowMs) {
  const deltaMs = Math.min(120, nowMs - state.lastFrameMs);
  state.lastFrameMs = nowMs;

  updateCombat(deltaMs);
  render();
  requestAnimationFrame(frame);
}

el.damageBtn.addEventListener('click', buyDamage);
el.healthBtn.addEventListener('click', buyHealth);
el.breakthroughBtn.addEventListener('click', breakthrough);

recalcDerivedStats();
state.player.hp = state.player.hpMax;
spawnEnemy();
render();
requestAnimationFrame(frame);
