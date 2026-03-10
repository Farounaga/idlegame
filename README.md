# IDLE DAO Prototype

A browser idle-game prototype in a xianxia-inspired setting with a combat-scene layout:
- your cultivator on the left;
- enemy on the right;
- progression, upgrades, and attributes in the center.

## Gameplay features
- automatic combat with visible attack animations;
- HP bars above both fighter portraits;
- attack charge progress bars for both fighters;
- XP, levels, and progression;
- multiple character attributes (Strength, Vitality, Agility, Dexterity, Spirit, Willpower, Luck);
- breakthrough (prestige) with Dao Insight bonuses.

## Enemy scaling system (non-linear idle curve)
Enemy strength now uses a multi-layer mathematical curve designed for long-term idle retention:

- `curve(stage) = baseExp * lateExp * polynomialPressure * wave * milestoneSpike * softRebalance`
- `baseExp = 1.145^(stage + 1)`
- `lateExp = 1.018^max(0, stage - 35)`
- `polynomialPressure = 1 + 0.025 * (stage + 1)^1.15`
- `wave = 1 + 0.09*sin(0.7*stage) + 0.04*sin(0.17*stage + 1.1)`
- `milestoneSpike = 1.42` on every 10th stage, `1.18` on every 5th stage
- `softRebalance = 1 / (1 + max(0, stage - 140)*0.0018)`

From this curve, enemy parameters are derived with separate exponents (common in idle games):

- `HP = round(18 * curve * archetype.hpFactor)`
- `Damage = round(2.8 * curve^0.74 * archetype.damageFactor)`
- `Reward = round(5.5 * curve^0.62 * archetype.rewardFactor * (1 + stage*0.018))`
- `XP = round(4.8 * curve^0.59 * archetype.xpFactor * (1 + stage*0.012))`

This keeps enemy HP scaling faster than rewards, creating strategic pressure to optimize builds, while periodic spikes/waves prevent repetitive pacing.

## UI approach
- Minimal custom component-like UI.
- Token-based styling inspired by clean systems like Radix UI.

## Run locally

Use any static server, for example:

```bash
python -m http.server 4173
```

Then open `http://localhost:4173`.
