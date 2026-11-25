// Sizzle Station — deterministic screenshot scenes behind
// ?shot=start|play|rush|serve&seed=1.
// Each scene plays the real rules forward from a fresh world, steered by a
// simple goal-directed autopilot (walk to the station the next step needs,
// press E there, wait out chopping and cooking), so the frame is what a
// short game really looks like — and the same seed always gives the same
// frame. Nothing here edits the world by hand: the autopilot only moves the
// chef and calls the same interact()/trashAction() the player uses.

import { STEP } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import {
  interact,
  mostUrgentMissing,
  nearestStation,
  nextPrep,
  plateCompatibleWithOrder,
  readyOrderForPlate,
  resetWorld,
  step,
  takeIngredient,
  trashAction,
} from './world.js';

const START_SECONDS = 8;
const PLAY_SECONDS = 30;
const RUSH_CAP_SECONDS = 180;
const SERVE_LIMIT_SECONDS = 150;

/** Steer the chef toward a point; returns movement input for one step. */
function steer(world, tx, ty) {
  const dx = tx - world.chef.x;
  const dy = ty - world.chef.y;
  const length = Math.hypot(dx, dy);
  if (length < 6) return { mx: 0, my: 0 };
  return { mx: dx / length, my: dy / length };
}

function stationPoint(world, key) {
  // Station interaction points live in config; re-derive them here so the
  // autopilot never imports render-only data.
  const points = {
    pantry: { x: 220, y: 335 },
    board: { x: 360, y: 560 },
    stove: { x: 1040, y: 305 },
    plate: { x: 670, y: 560 },
    serve: { x: 1161, y: 130 },
    trash: { x: 1160, y: 560 },
  };
  return points[key];
}

/**
 * One autopilot decision: where to walk and whether to press E or X.
 * Priority: serve a ready plate > pick up a ready plate > plate a ready
 * item > prep what is carried > take a ready burner item > trash a burnt
 * item > fetch the most urgent missing ingredient.
 */
function autopilot(world) {
  const chef = world.chef;
  const carry = chef.carry;
  const plateReady = readyOrderForPlate(world);

  // Carrying a finished plate: go serve it.
  if (carry && carry.plate) {
    return { target: 'serve', act: 'interact' };
  }
  // A finished plate waits on the plating station: go pick it up.
  if (!carry && plateReady) {
    return { target: 'plate', act: 'interact' };
  }
  // Carrying a finished ingredient: go plate it.
  if (carry && !carry.plate && nextPrep(carry) === null && !carry.burnt) {
    return { target: 'plate', act: 'interact' };
  }
  // Carrying something burnt: go trash it.
  if (carry && carry.burnt) {
    return { target: 'trash', act: 'trash' };
  }
  // Carrying something that needs chopping: go to the board.
  if (carry && !carry.plate && nextPrep(carry) === 'chop') {
    return { target: 'board', act: 'interact' };
  }
  // Carrying something that needs cooking: go to the stove.
  if (carry && !carry.plate && nextPrep(carry) === 'cook') {
    return { target: 'stove', act: 'interact' };
  }
  // Plate holds items no open order can still use: clear it before fetching
  // more, or the plate would stay jammed forever.
  if (!carry && world.plate.items.length > 0 && !world.orders.some((o) => plateCompatibleWithOrder(world.plate.items, o))) {
    return { target: 'plate', act: 'trash' };
  }
  // Hands empty and a burner item is ready: go take it.
  if (!carry) {
    const ready = world.burners.find((b) => b.item && b.item.progress >= 1 && !b.item.burnt);
    if (ready) return { target: 'stove', act: 'interact' };
  }
  // Hands empty: fetch what the most urgent order still needs.
  if (!carry) {
    const wanted = mostUrgentMissing(world);
    if (wanted) return { target: 'pantry', act: 'take', ing: wanted };
  }
  // Nothing to do: wait near the plating station.
  return { target: 'plate', act: null };
}

/** Run the autopilot for `seconds` of game time, in fixed steps. */
function runFor(world, seconds) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const decision = autopilot(world);
    const point = stationPoint(world, decision.target);
    const input = steer(world, point.x, point.y);
    const near = nearestStation(world) === decision.target;
    step(world, STEP, input);
    if (near && decision.act === 'interact') interact(world);
    else if (near && decision.act === 'trash') trashAction(world);
    else if (near && decision.act === 'take') takeIngredient(world, decision.ing);
    if (world.phase === 'over') break;
  }
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * 'start' shows the title over a fresh kitchen; 'play' a mid-shift frame;
 * 'rush' keeps playing until rush hour is running with orders on the board;
 * 'serve' freezes once the chef lifts a finished multi-ingredient plate
 * after at least one order was already served (score > 0, real dish).
 */
export function stageShot(name, world) {
  resetWorld(world);
  if (name === 'play') {
    runFor(world, PLAY_SECONDS);
    return { screen: world.phase === 'over' ? SCREEN_OVER : SCREEN_PLAY, best: world.score };
  }
  if (name === 'rush') {
    // Keep playing until rush hour is actually running with orders on the
    // board (or the cap hits): a rush shot with no orders says nothing.
    let elapsed = 0;
    while (elapsed < RUSH_CAP_SECONDS && !(world.time < world.rushUntil && world.orders.length >= 2) && world.phase !== 'over') {
      runFor(world, 5);
      elapsed += 5;
    }
    return { screen: world.phase === 'over' ? SCREEN_OVER : SCREEN_PLAY, best: world.score };
  }
  if (name === 'serve') {
    const steps = Math.floor(SERVE_LIMIT_SECONDS / STEP);
    for (let i = 0; i < steps; i += 1) {
      const decision = autopilot(world);
      const point = stationPoint(world, decision.target);
      const input = steer(world, point.x, point.y);
      const near = nearestStation(world) === decision.target;
      step(world, STEP, input);
      if (near && decision.act === 'interact') interact(world);
      else if (near && decision.act === 'trash') trashAction(world);
      else if (near && decision.act === 'take') takeIngredient(world, decision.ing);
      // Freeze once the chef lifts a finished multi-ingredient plate and
      // at least one order was already served (score > 0, real dish).
      if (world.chef.carry && world.chef.carry.plate && world.chef.carry.items.length >= 2 && world.served >= 1) break;
      if (world.phase === 'over') break;
    }
    return { screen: world.phase === 'over' ? SCREEN_OVER : SCREEN_PLAY, best: world.score };
  }
  // Default: the title scene.
  runFor(world, START_SECONDS);
  return { screen: SCREEN_TITLE, best: 0 };
}
