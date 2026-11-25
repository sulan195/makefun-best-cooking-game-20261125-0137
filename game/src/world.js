// Sizzle Station — the kitchen itself: pure game state and rules.
// No DOM, no canvas, no Math.random here: every number comes from the
// seeded RNG, so a fixed seed replays the exact same kitchen. The renderer
// and the autopilot both read this module; tests import it in Node.
//
// Item stages: 'raw' -> (chop) -> 'prepped' -> (cook) -> 'ready'.
//   prep 'none': ready the moment it is taken.
//   prep 'chop': raw -> ready (one chop).
//   prep 'cook': raw -> ready (one cook).
//   prep 'chopcook': raw -> prepped (chop) -> ready (cook).
// A burnt item keeps its stage but is unusable and must be trashed.

import {
  BURN_AT,
  BURNER_COUNT,
  CHEF_RADIUS,
  CHEF_SPEED,
  INGREDIENTS,
  INGREDIENT_ORDER,
  INTERACT_COOLDOWN,
  INTERACT_RADIUS,
  MAX_LIVES,
  MAX_ORDERS,
  OBSTACLES,
  ORDER_TIME_BASE,
  ORDER_TIME_PER_ITEM,
  RECIPES,
  STATIONS,
  VIEW,
  comboMultiplier,
  levelFor,
  maxConcurrentOrders,
  spawnIntervalSeconds,
} from './config.js';
import { makeRng } from './random.js';

/** What an item still needs before it can go on a plate: 'chop', 'cook', or null. */
export function nextPrep(item) {
  if (item.burnt) return null;
  const prep = INGREDIENTS[item.ing].prep;
  if (prep === 'none') return null;
  if (prep === 'chop') return item.stage === 'raw' ? 'chop' : null;
  if (prep === 'cook') return item.stage === 'raw' ? 'cook' : null;
  if (item.stage === 'raw') return 'chop';
  if (item.stage === 'prepped') return 'cook';
  return null;
}

/** True when the item is finished and may go on a plate. */
export function isReady(item) {
  return !item.burnt && nextPrep(item) === null;
}

/** Multiset equality: the plate holds exactly this order's items, no more, no less. */
export function plateMatchesOrder(plateItems, order) {
  if (plateItems.length !== order.items.length) return false;
  const counts = new Map();
  for (const ing of plateItems) counts.set(ing, (counts.get(ing) ?? 0) + 1);
  for (const ing of order.items) {
    const left = (counts.get(ing) ?? 0) - 1;
    if (left < 0) return false;
    counts.set(ing, left);
  }
  return true;
}

/** The most urgent order the current plate completes, or null. */
export function readyOrderForPlate(world) {
  let best = null;
  for (const order of world.orders) {
    if (plateMatchesOrder(world.plate.items, order)) {
      if (best === null || order.timeLeft < best.timeLeft) best = order;
    }
  }
  return best;
}

function makeItem(ing) {
  return { ing, stage: 'raw', burnt: false, progress: 0 };
}

export function createWorld(seed) {
  const world = {
    seed,
    rng: makeRng(seed),
    time: 0,
    phase: 'title',
    score: 0,
    combo: 0,
    bestCombo: 0,
    served: 0,
    lost: 0,
    level: 1,
    spawnTimer: 6,
    rushUntil: -1,
    chef: {
      x: VIEW.width / 2,
      y: 400,
      dirX: 0,
      dirY: 1,
      carry: null,
      chop: null,
      cooldown: 0,
    },
    orders: [],
    burners: Array.from({ length: BURNER_COUNT }, () => ({ item: null })),
    plate: { items: [] },
    plateReady: null,
    particles: [],
    floats: [],
    message: null,
    events: [],
    stats: { takes: 0, chops: 0, cooks: 0, serves: 0, burns: 0, trashes: 0 },
    nextOrderId: 1,
  };
  return world;
}

/** Full reset back to a fresh shift (used by R and by the shot stager). */
export function resetWorld(world) {
  const fresh = createWorld(world.seed);
  fresh.phase = 'play';
  Object.assign(world, fresh);
  world.rng = makeRng(world.seed);
  // The shift opens with one order already on the board: an empty kitchen
  // for the first 6 seconds reads as a dead game in screenshots and play.
  spawnOrder(world);
  world.spawnTimer = spawnIntervalSeconds(world.level);
}

function showMessage(world, text, seconds = 2.5) {
  world.message = { text, until: world.time + seconds };
}

function spawnOrder(world) {
  const eligible = RECIPES.filter((r) => r.minLevel <= world.level);
  const recipe = world.rng.pick(eligible);
  const timeMax = ORDER_TIME_BASE + ORDER_TIME_PER_ITEM * recipe.items.length;
  world.orders.push({
    id: world.nextOrderId,
    name: recipe.name,
    recipeId: recipe.id,
    items: [...recipe.items],
    timeLeft: timeMax,
    timeMax,
  });
  world.nextOrderId += 1;
}

/** The ingredient the most urgent order still needs (and nothing is already prepping). */
/** True when every item on the plate belongs to the order (multiset). */
export function plateCompatibleWithOrder(plateItems, order) {
  const need = new Map();
  for (const ing of order.items) need.set(ing, (need.get(ing) ?? 0) + 1);
  for (const ing of plateItems) {
    const left = need.get(ing) ?? 0;
    if (left <= 0) return false;
    need.set(ing, left - 1);
  }
  return true;
}

/**
 * The ingredient the most urgent open order still needs. Prefers orders the
 * plate is already compatible with, so a started plate is never poisoned by
 * fetching an ingredient for a different order. Returns null when no open
 * order can still use the plate (the caller should clear it first).
 */
export function mostUrgentMissing(world) {
  const candidates = world.plate.items.length > 0
    ? world.orders.filter((o) => plateCompatibleWithOrder(world.plate.items, o))
    : world.orders;
  const urgent = [...candidates].sort((a, b) => a.timeLeft - b.timeLeft)[0];
  if (!urgent) return null;
  const onPlate = new Set(world.plate.items);
  const inProgress = new Set();
  for (const burner of world.burners) if (burner.item) inProgress.add(burner.item.ing);
  if (world.chef.carry && !world.chef.carry.plate) inProgress.add(world.chef.carry.ing);
  for (const ing of urgent.items) {
    if (!onPlate.has(ing) && !inProgress.has(ing)) return ing;
  }
  return null;
}

/** Distance from the chef to a station's interaction point. */
function stationDistance(world, key) {
  const point = STATIONS[key].point;
  const dx = world.chef.x - point.x;
  const dy = world.chef.y - point.y;
  return Math.hypot(dx, dy);
}

/** Nearest station within reach, or null. */
export function nearestStation(world) {
  let best = null;
  let bestDistance = Infinity;
  for (const key of Object.keys(STATIONS)) {
    const distance = stationDistance(world, key);
    if (distance < INTERACT_RADIUS && distance < bestDistance) {
      best = key;
      bestDistance = distance;
    }
  }
  return best;
}

/** Take an ingredient from the pantry. `ing` may be null for the smart pick. */
export function takeIngredient(world, ing = null) {
  const chef = world.chef;
  if (stationDistance(world, 'pantry') >= INTERACT_RADIUS) {
    return { ok: false, hint: 'Walk to the Pantry first!' };
  }
  if (chef.carry) return { ok: false, hint: 'Hands full!' };
  const wanted = ing ?? mostUrgentMissing(world);
  if (!wanted) return { ok: false, hint: 'No order needs anything right now.' };
  if (!INGREDIENTS[wanted]) return { ok: false, hint: 'Unknown ingredient.' };
  const item = makeItem(wanted);
  if (INGREDIENTS[wanted].prep === 'none') item.stage = 'ready';
  chef.carry = item;
  world.stats.takes += 1;
  world.events.push('pickup');
  return { ok: true };
}

function startChopping(world) {
  const chef = world.chef;
  const item = chef.carry;
  if (chef.chop) return { ok: true };
  if (!item || item.plate) return { ok: false, hint: 'Nothing to chop.' };
  if (nextPrep(item) !== 'chop') {
    return { ok: false, hint: item.burnt ? 'Burnt! Trash it (X).' : 'This needs the stove, not the board.' };
  }
  chef.chop = { t: 0, need: INGREDIENTS[item.ing].chopTime };
  world.events.push('chop-start');
  return { ok: true };
}

function placeOnBurner(world) {
  const chef = world.chef;
  const item = chef.carry;
  if (!item || item.plate) return { ok: false, hint: 'Nothing to cook.' };
  if (nextPrep(item) !== 'cook') {
    return { ok: false, hint: item.burnt ? 'Burnt! Trash it (X).' : 'This needs the chopping board first.' };
  }
  const free = world.burners.find((b) => b.item === null);
  if (!free) return { ok: false, hint: 'Both burners are busy!' };
  free.item = { ...item, progress: 0 };
  chef.carry = null;
  world.events.push('place');
  return { ok: true };
}

function takeFromBurner(world) {
  const chef = world.chef;
  if (chef.carry) return { ok: false, hint: 'Hands full!' };
  const ready = world.burners.find((b) => b.item && b.item.progress >= 1 && !b.item.burnt);
  const burnt = world.burners.find((b) => b.item && b.item.burnt);
  const slot = ready ?? burnt;
  if (!slot) {
    const cooking = world.burners.find((b) => b.item);
    return { ok: false, hint: cooking ? 'Still cooking — wait for the ding!' : 'Nothing on the stove.' };
  }
  const item = slot.item;
  slot.item = null;
  if (item.burnt) {
    chef.carry = item;
    return { ok: true, hint: 'Burnt! Trash it (X).' };
  }
  item.stage = 'ready';
  chef.carry = item;
  world.events.push('pickup');
  return { ok: true };
}

function addToPlate(world) {
  const chef = world.chef;
  const item = chef.carry;
  if (!item || item.plate) return { ok: false, hint: 'Nothing to plate.' };
  if (!isReady(item)) {
    return { ok: false, hint: item.burnt ? 'Burnt! Trash it (X).' : 'Finish prepping it first.' };
  }
  world.plate.items.push(item.ing);
  chef.carry = null;
  world.plateReady = readyOrderForPlate(world);
  world.events.push('plate');
  return { ok: true };
}

function pickUpPlate(world) {
  const chef = world.chef;
  if (chef.carry) return { ok: false, hint: 'Hands full!' };
  if (world.plate.items.length === 0) return { ok: false, hint: 'The plate is empty.' };
  if (!world.plateReady) return { ok: false, hint: 'Not a full order yet — keep adding!' };
  chef.carry = { plate: true, items: [...world.plate.items] };
  world.plate.items = [];
  world.plateReady = null;
  world.events.push('pickup');
  return { ok: true };
}

function servePlate(world) {
  const chef = world.chef;
  const carried = chef.carry;
  if (!carried || !carried.plate) return { ok: false, hint: 'Bring a finished plate here.' };
  const order = world.orders.find((o) => plateMatchesOrder(carried.items, o));
  if (!order) {
    return { ok: false, hint: 'That order expired — take the plate back (X).' };
  }
  const recipe = RECIPES.find((r) => r.id === order.recipeId);
  const points = Math.round((recipe?.base ?? 100) + order.timeLeft * 5) * 1;
  const gained = Math.round(points * comboMultiplier(world.combo));
  world.score += gained;
  world.combo += 1;
  world.bestCombo = Math.max(world.bestCombo, world.combo);
  world.served += 1;
  world.level = levelFor(world.served);
  world.orders = world.orders.filter((o) => o !== order);
  chef.carry = null;
  world.floats.push({ x: STATIONS.serve.point.x, y: STATIONS.serve.point.y + 30, text: `+${gained}`, t: 0, life: 1.4 });
  for (let i = 0; i < 14; i += 1) {
    world.particles.push({
      x: STATIONS.serve.point.x, y: STATIONS.serve.point.y,
      vx: (world.rng.next() - 0.5) * 160, vy: -40 - world.rng.next() * 120,
      t: 0, life: 0.9, color: '#f6c945', size: 3 + world.rng.next() * 3,
    });
  }
  world.stats.serves += 1;
  world.events.push('serve');
  if (world.served % 5 === 0) {
    world.rushUntil = world.time + 20;
    showMessage(world, 'RUSH HOUR! Double orders!', 3);
    world.events.push('rush');
    if (world.orders.length < maxConcurrentOrders(world.served)) spawnOrder(world);
  }
  return { ok: true };
}

/** The E / click action at the nearest station. */
export function interact(world) {
  const chef = world.chef;
  if (chef.cooldown > 0) return { ok: false, hint: null };
  chef.cooldown = INTERACT_COOLDOWN;
  const station = nearestStation(world);
  if (!station) return { ok: false, hint: 'Walk up to a station first!' };
  let result;
  if (station === 'pantry') result = takeIngredient(world);
  else if (station === 'board') result = startChopping(world);
  else if (station === 'stove') {
    result = chef.carry ? placeOnBurner(world) : takeFromBurner(world);
  } else if (station === 'plate') {
    result = chef.carry ? addToPlate(world) : pickUpPlate(world);
  } else if (station === 'serve') result = servePlate(world);
  else if (station === 'trash') result = trashAction(world);
  else result = { ok: false, hint: null };
  if (!result.ok && result.hint) showMessage(world, result.hint);
  if (result.ok && result.hint) showMessage(world, result.hint);
  return result;
}

/** The X action: trash what is carried, or clear the plate when empty-handed. */
export function trashAction(world) {
  const chef = world.chef;
  if (chef.carry && chef.carry.plate) {
    world.plate.items = [...chef.carry.items];
    world.plateReady = readyOrderForPlate(world);
    chef.carry = null;
    showMessage(world, 'Plate put back.');
    return { ok: true };
  }
  if (chef.carry) {
    chef.carry = null;
    chef.chop = null; // discarding the carried item also cancels its chop.
    world.stats.trashes += 1;
    world.events.push('trash');
    return { ok: true };
  }
  if (stationDistance(world, 'plate') < INTERACT_RADIUS && world.plate.items.length > 0) {
    world.plate.items = [];
    world.plateReady = null;
    world.stats.trashes += 1;
    world.events.push('trash');
    showMessage(world, 'Plate cleared.');
    return { ok: true };
  }
  return { ok: false, hint: 'Nothing to trash.' };
}

function moveChef(world, dt, mx, my) {
  const chef = world.chef;
  if (chef.chop) return;
  const length = Math.hypot(mx, my);
  if (length < 0.01) return;
  const nx = mx / length;
  const ny = my / length;
  chef.dirX = nx;
  chef.dirY = ny;
  const step = CHEF_SPEED * dt;
  // Axis-separated movement so the chef slides along counters instead of sticking.
  tryMove(world, chef.x + nx * step, chef.y);
  tryMove(world, chef.x, chef.y + ny * step);
}

function tryMove(world, x, y) {
  const chef = world.chef;
  const r = CHEF_RADIUS;
  const clampedX = Math.min(VIEW.width - r - 4, Math.max(r + 4, x));
  const clampedY = Math.min(VIEW.height - r - 30, Math.max(118 + r, y));
  for (const o of OBSTACLES) {
    const nearestX = Math.min(o.x + o.w, Math.max(o.x, clampedX));
    const nearestY = Math.min(o.y + o.h, Math.max(o.y, clampedY));
    const dx = clampedX - nearestX;
    const dy = clampedY - nearestY;
    if (dx * dx + dy * dy < r * r) return;
  }
  chef.x = clampedX;
  chef.y = clampedY;
}

function updateBurners(world, dt) {
  for (const burner of world.burners) {
    const item = burner.item;
    if (!item) continue;
    const cookTime = INGREDIENTS[item.ing].cookTime ?? 5;
    const before = item.progress;
    item.progress += dt / cookTime;
    if (before < 1 && item.progress >= 1 && !item.burnt) {
      world.events.push('cook-ready');
      world.floats.push({ x: STATIONS.stove.point.x, y: STATIONS.stove.y - 10, text: 'READY!', t: 0, life: 1.2 });
    }
    if (!item.burnt && item.progress >= BURN_AT) {
      item.burnt = true;
      world.stats.burns += 1;
      world.events.push('burnt');
      showMessage(world, 'Something burnt! Trash it (X).');
    }
    // Steam while cooking.
    if (!item.burnt && world.rng.next() < dt * 6) {
      world.particles.push({
        x: STATIONS.stove.x + 40 + world.rng.next() * 120, y: STATIONS.stove.y + 30,
        vx: (world.rng.next() - 0.5) * 12, vy: -30 - world.rng.next() * 20,
        t: 0, life: 0.8, color: '#e8e8e8', size: 2 + world.rng.next() * 3,
      });
    }
  }
}

function updateOrders(world, dt) {
  for (const order of [...world.orders]) {
    order.timeLeft -= dt;
    if (order.timeLeft <= 0) {
      world.orders = world.orders.filter((o) => o !== order);
      world.lost += 1;
      world.combo = 0;
      world.plateReady = readyOrderForPlate(world);
      world.events.push('expire');
      showMessage(world, `Order lost: ${order.name}! (${MAX_LIVES - world.lost} strikes left)`, 3);
      if (world.lost >= MAX_LIVES) {
        world.phase = 'over';
        world.events.push('gameover');
      }
    }
  }
  if (world.phase !== 'play') return;
  world.spawnTimer -= dt;
  if (world.spawnTimer <= 0) {
    if (world.orders.length < maxConcurrentOrders(world.served)) {
      spawnOrder(world);
      if (world.time < world.rushUntil && world.orders.length < maxConcurrentOrders(world.served)) {
        spawnOrder(world);
      }
    }
    const interval = spawnIntervalSeconds(world.level) * (world.time < world.rushUntil ? 0.5 : 1);
    world.spawnTimer = interval;
  }
}

function updateParticles(world, dt) {
  for (const p of world.particles) {
    p.t += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 60 * dt;
  }
  world.particles = world.particles.filter((p) => p.t < p.life);
  for (const f of world.floats) f.t += dt;
  world.floats = world.floats.filter((f) => f.t < f.life);
}

/**
 * Advance the world by dt seconds. `input` is { mx, my } movement (-1..1).
 * Discrete actions (interact / trash / take) are separate calls.
 */
export function step(world, dt, input = { mx: 0, my: 0 }) {
  // NOTE: events are NOT cleared here. Discrete actions (interact / trash /
  // take) push events between steps, and the main loop drains + clears them
  // after each step; clearing here would wipe those events before any sound
  // could play.
  if (world.phase !== 'play') return;
  world.time += dt;
  const chef = world.chef;
  if (chef.cooldown > 0) chef.cooldown -= dt;
  if (chef.chop) {
    chef.chop.t += dt;
    if (chef.chop.t >= chef.chop.need) {
      const item = chef.carry;
      if (item && !item.plate) {
        item.stage = INGREDIENTS[item.ing].prep === 'chopcook' ? 'prepped' : 'ready';
        world.stats.chops += 1;
        world.events.push('chop-done');
      }
      chef.chop = null;
    }
  } else {
    moveChef(world, dt, input.mx, input.my);
  }
  updateBurners(world, dt);
  updateOrders(world, dt);
  updateParticles(world, dt);
  if (world.message && world.time > world.message.until) world.message = null;
}

/** Ingredient index for pantry clicks/keys (0-based into INGREDIENT_ORDER). */
export function pantryIngredientAt(index) {
  return INGREDIENT_ORDER[index] ?? null;
}
