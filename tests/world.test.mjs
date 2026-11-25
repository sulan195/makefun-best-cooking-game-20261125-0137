// Sizzle Station — world logic tests (Node, no DOM).
// Run: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createWorld, step, interact, trashAction, takeIngredient, resetWorld,
  nextPrep, isReady, plateMatchesOrder, readyOrderForPlate, mostUrgentMissing,
} from '../game/src/world.js';
import { INGREDIENTS, RECIPES, STATIONS, STEP } from '../game/src/config.js';

function playWorld(seed = 7) {
  const w = createWorld(seed);
  w.phase = 'play';
  return w;
}
function nearStation(w, key) {
  w.chef.x = STATIONS[key].point.x;
  w.chef.y = STATIONS[key].point.y;
}
function forceOrder(w, recipeId, timeLeft = 60) {
  const recipe = RECIPES.find((r) => r.id === recipeId);
  const order = { id: w.nextOrderId, name: recipe.name, recipeId, items: [...recipe.items], timeLeft, timeMax: timeLeft };
  w.nextOrderId += 1;
  w.orders.push(order);
  return order;
}

test('prep chains: none/chop/cook/chopcook reach ready', () => {
  assert.equal(nextPrep({ ing: 'bun', stage: 'raw', burnt: false }), null);
  assert.equal(nextPrep({ ing: 'tomato', stage: 'raw', burnt: false }), 'chop');
  assert.equal(nextPrep({ ing: 'tomato', stage: 'ready', burnt: false }), null);
  assert.equal(nextPrep({ ing: 'egg', stage: 'raw', burnt: false }), 'cook');
  assert.equal(nextPrep({ ing: 'chicken', stage: 'raw', burnt: false }), 'chop');
  assert.equal(nextPrep({ ing: 'chicken', stage: 'prepped', burnt: false }), 'cook');
  assert.equal(nextPrep({ ing: 'chicken', stage: 'ready', burnt: false }), null);
  assert.equal(isReady({ ing: 'egg', stage: 'raw', burnt: false }), false);
  assert.equal(isReady({ ing: 'egg', stage: 'raw', burnt: true }), false);
});

test('plate matching is exact multiset (order and duplicates matter)', () => {
  const order = { items: ['rice', 'egg', 'chili'] };
  assert.equal(plateMatchesOrder(['rice', 'egg', 'chili'], order), true);
  assert.equal(plateMatchesOrder(['chili', 'egg', 'rice'], order), true);
  assert.equal(plateMatchesOrder(['rice', 'egg'], order), false);
  assert.equal(plateMatchesOrder(['rice', 'egg', 'chili', 'egg'], order), false);
  assert.equal(plateMatchesOrder(['rice', 'egg', 'tomato'], order), false);
});

test('take: hands full rejected; far from pantry rejected; smart pick takes urgent need', () => {
  const w = playWorld();
  forceOrder(w, 'salad');
  nearStation(w, 'pantry');
  const first = takeIngredient(w);
  assert.equal(first.ok, true);
  assert.equal(w.chef.carry.ing, 'tomato');
  const second = takeIngredient(w);
  assert.equal(second.ok, false);
  assert.match(second.hint, /Hands full/);
  const far = playWorld();
  forceOrder(far, 'salad');
  far.chef.x = 640; far.chef.y = 400;
  assert.equal(takeIngredient(far).ok, false);
});

test('chop: completes to ready, movement locked while chopping', () => {
  const w = playWorld();
  forceOrder(w, 'salad');
  nearStation(w, 'pantry');
  takeIngredient(w, 'tomato');
  nearStation(w, 'board');
  const started = interact(w);
  assert.equal(started.ok, true);
  assert.ok(w.chef.chop);
  const x0 = w.chef.x;
  step(w, 0.5, { mx: 1, my: 0 });
  assert.equal(w.chef.x, x0, 'chef must not move while chopping');
  step(w, 2, { mx: 0, my: 0 });
  assert.equal(w.chef.chop, null);
  assert.equal(w.chef.carry.stage, 'ready');
  assert.equal(w.stats.chops, 1);
});

test('cook: burner readies, then burns if left; burnt cannot be plated', () => {
  const w = playWorld();
  forceOrder(w, 'egg');
  nearStation(w, 'pantry');
  takeIngredient(w, 'egg');
  nearStation(w, 'stove');
  assert.equal(interact(w).ok, true);
  assert.equal(w.chef.carry, null);
  step(w, 5.2, { mx: 0, my: 0 });
  assert.ok(w.burners[0].item.progress >= 1);
  assert.equal(w.burners[0].item.burnt, false);
  step(w, 2, { mx: 0, my: 0 });
  assert.equal(w.burners[0].item.burnt, true);
  assert.equal(w.stats.burns, 1);
  const took = interact(w);
  assert.equal(took.ok, true);
  assert.equal(w.chef.carry.burnt, true);
  nearStation(w, 'plate');
  const plated = interact(w);
  assert.equal(plated.ok, false);
  assert.equal(w.plate.items.length, 0);
});

test('both burners busy rejects a third cookable', () => {
  const w = playWorld();
  forceOrder(w, 'nasi');
  for (const ing of ['rice', 'egg']) {
    nearStation(w, 'pantry');
    takeIngredient(w, ing);
    nearStation(w, 'stove');
    assert.equal(interact(w).ok, true);
    step(w, 0.2, { mx: 0, my: 0 });
  }
  assert.ok(w.burners.every((b) => b.item));
  nearStation(w, 'pantry');
  takeIngredient(w, 'egg');
  nearStation(w, 'stove');
  const third = interact(w);
  assert.equal(third.ok, false);
  assert.match(third.hint, /busy/);
});

test('full serve loop: salad scores base + time bonus, combo rises', () => {
  const w = playWorld();
  const order = forceOrder(w, 'salad', 60);
  nearStation(w, 'pantry');
  takeIngredient(w, 'tomato');
  nearStation(w, 'board');
  interact(w);
  step(w, 2.1, { mx: 0, my: 0 });
  nearStation(w, 'plate');
  assert.equal(interact(w).ok, true);
  assert.deepEqual(w.plate.items, ['tomato']);
  assert.equal(readyOrderForPlate(w), order);
  step(w, 0.2, { mx: 0, my: 0 });
  nearStation(w, 'plate');
  assert.equal(interact(w).ok, true, 'pick up the ready plate');
  assert.ok(w.chef.carry.plate);
  step(w, 0.2, { mx: 0, my: 0 });
  nearStation(w, 'serve');
  const before = w.score;
  assert.equal(interact(w).ok, true);
  assert.ok(w.score > before);
  assert.equal(w.served, 1);
  assert.equal(w.combo, 1);
  assert.equal(w.orders.length, 0);
});

test('serve rejects a plate whose order expired; plate returns intact', () => {
  const w = playWorld();
  const order = forceOrder(w, 'salad', 60);
  nearStation(w, 'pantry');
  takeIngredient(w, 'tomato');
  nearStation(w, 'board');
  interact(w);
  step(w, 2.1, { mx: 0, my: 0 });
  nearStation(w, 'plate');
  interact(w);
  step(w, 0.2, { mx: 0, my: 0 });
  nearStation(w, 'plate');
  interact(w);
  assert.ok(w.chef.carry.plate);
  order.timeLeft = 0.05;
  step(w, 0.1, { mx: 0, my: 0 });
  assert.equal(w.orders.length, 0);
  nearStation(w, 'serve');
  assert.equal(interact(w).ok, false);
  const back = trashAction(w);
  assert.equal(back.ok, true);
  assert.deepEqual(w.plate.items, ['tomato']);
  assert.equal(w.chef.carry, null);
});

test('order expiry: lost++, combo reset; three losses end the shift', () => {
  const w = playWorld();
  w.combo = 3;
  forceOrder(w, 'salad', 0.1);
  forceOrder(w, 'egg', 0.1);
  forceOrder(w, 'salad', 0.1);
  step(w, 0.2, { mx: 0, my: 0 });
  assert.equal(w.lost, 3);
  assert.equal(w.combo, 0);
  assert.equal(w.phase, 'over');
});

test('spawn respects the concurrent cap and speeds up with level', () => {
  const w = playWorld();
  w.served = 0;
  for (let i = 0; i < 40; i += 1) step(w, 1, { mx: 0, my: 0 });
  assert.ok(w.orders.length <= 2, `early cap is 2, got ${w.orders.length}`);
  w.served = 12;
  w.level = 5;
  w.spawnTimer = 0;
  for (let i = 0; i < 60; i += 1) step(w, 1, { mx: 0, my: 0 });
  assert.ok(w.orders.length <= 4, `late cap is 4, got ${w.orders.length}`);
});

test('determinism: same seed + same inputs = same state', () => {
  function run() {
    const w = playWorld(42);
    forceOrder(w, 'nasi', 90);
    nearStation(w, 'pantry');
    takeIngredient(w, 'rice');
    nearStation(w, 'stove');
    interact(w);
    for (let i = 0; i < 600; i += 1) step(w, STEP, { mx: 0.3, my: -0.2 });
    return JSON.stringify({ score: w.score, served: w.served, lost: w.lost, orders: w.orders, burners: w.burners, chef: { x: w.chef.x, y: w.chef.y } });
  }
  assert.equal(run(), run());
});

test('resetWorld restores a fresh shift', () => {
  const w = playWorld();
  w.score = 500; w.served = 4; w.lost = 2;
  forceOrder(w, 'salad');
  resetWorld(w);
  assert.equal(w.score, 0);
  assert.equal(w.served, 0);
  assert.equal(w.lost, 0);
  assert.equal(w.orders.length, 1, 'resetWorld opens with the first order already on the board');
  assert.equal(w.phase, 'play');
});

test('mostUrgentMissing skips items already on the plate or cooking', () => {
  const w = playWorld();
  const order = forceOrder(w, 'nasi', 90);
  w.plate.items = ['rice'];
  assert.equal(mostUrgentMissing(w), 'egg');
  w.burners[0].item = { ing: 'egg', stage: 'raw', burnt: false, progress: 0.5 };
  assert.equal(mostUrgentMissing(w), 'chili');
  void order;
});

test('interact events survive step() for the main-loop drain (F2 regression)', () => {
  // The main loop drains world.events after each step and clears them;
  // step() itself must NOT clear them, or interaction sounds never play.
  const w = playWorld();
  forceOrder(w, 'salad');
  nearStation(w, 'pantry');
  takeIngredient(w, 'tomato');
  assert.ok(w.events.includes('pickup'));
  step(w, STEP, { mx: 0, my: 0 });
  assert.ok(w.events.includes('pickup'), 'step() must not wipe interact events');
});

test('rush staging stops while rush is actually running (F1 regression)', async () => {
  const { stageShot } = await import('../game/src/shots.js');
  const w = playWorld(1);
  const staged = stageShot('rush', w);
  assert.equal(staged.screen, 'play');
  assert.ok(w.time < 180, `rush staging must stop early, ran ${w.time}s`);
  assert.ok(w.time < w.rushUntil, 'rush hour must still be running at capture');
  assert.ok(w.orders.length >= 2, 'at least 2 orders must be on the board');
  assert.ok(w.served >= 5, 'rush only starts after the 5th serve');
});

test('bestCombo survives the final order expiring (H1 regression)', () => {
  const w = playWorld();
  // Serve two salads in a row: combo reaches 2.
  for (let round = 0; round < 2; round += 1) {
    forceOrder(w, 'salad', 60);
    nearStation(w, 'pantry');
    takeIngredient(w, 'tomato');
    nearStation(w, 'board');
    interact(w);
    step(w, 2.1, { mx: 0, my: 0 });
    nearStation(w, 'plate');
    interact(w);
    step(w, 0.2, { mx: 0, my: 0 });
    nearStation(w, 'plate');
    interact(w);
    step(w, 0.2, { mx: 0, my: 0 });
    nearStation(w, 'serve');
    assert.equal(interact(w).ok, true);
    step(w, 0.2, { mx: 0, my: 0 }); // clear the 150 ms interact cooldown
  }
  assert.equal(w.combo, 2);
  // Lose three orders: the shift ends and combo resets — bestCombo must not.
  for (let i = 0; i < 3; i += 1) {
    forceOrder(w, 'salad', 0.05);
    step(w, 0.2, { mx: 0, my: 0 });
  }
  assert.equal(w.phase, 'over');
  assert.equal(w.combo, 0);
  assert.equal(w.bestCombo, 2, 'game-over screen must show the real best combo');
});

test('mostUrgentMissing never poisons a started plate (H2 regression)', () => {
  const w = playWorld();
  w.plate.items = ['rice'];
  forceOrder(w, 'sate', 30); // most urgent, but incompatible with rice
  forceOrder(w, 'nasi', 60); // compatible: rice + egg + chili
  const wanted = mostUrgentMissing(w);
  assert.ok(['egg', 'chili'].includes(wanted), `must fetch for nasi, got ${wanted}`);
  // No compatible order at all: returns null so the caller clears the plate.
  w.orders = [w.orders[0]];
  assert.equal(mostUrgentMissing(w), null);
});

test('trash cancels an in-progress chop (H4 regression)', () => {
  const w = playWorld();
  forceOrder(w, 'salad');
  nearStation(w, 'pantry');
  takeIngredient(w, 'tomato');
  nearStation(w, 'board');
  interact(w);
  assert.ok(w.chef.chop, 'chopping must have started');
  trashAction(w);
  assert.equal(w.chef.carry, null);
  assert.equal(w.chef.chop, null, 'chef must not stay locked chopping air');
  // Step away from the counter (the board point sits 20px from the counter
  // while the chef radius is 22px, so horizontal slides hug the counter;
  // moving up proves the chop lock, not the counter, is gone).
  const y0 = w.chef.y;
  step(w, 0.2, { mx: 0, my: -1 });
  assert.ok(w.chef.y < y0, 'chef must be able to move again after trashing');
});

test('resetWorld opens with one order on the board (H6 regression)', () => {
  const w = createWorld(7);
  assert.equal(w.orders.length, 0);
  resetWorld(w);
  assert.equal(w.phase, 'play');
  assert.equal(w.orders.length, 1, 'first order must be on the board at t=0');
  assert.ok(w.orders[0].timeLeft > 0);
});
