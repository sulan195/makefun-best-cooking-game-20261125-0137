// Sizzle Station — boot and game loop.
// Parses ?shot=<name>&seed=<n>: in shot mode the world is staged once and
// drawn once, synchronously, so a headless screenshot captures the final
// frame. In play mode the loop runs on a fixed 1/60s timestep with
// requestAnimationFrame, pausing on blur.

import { STEP, VIEW, INGREDIENT_ORDER, STATIONS } from './config.js';
import { createWorld, interact, nearestStation, pantryIngredientAt, resetWorld, step, takeIngredient, trashAction } from './world.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { SCREEN_OVER, SCREEN_PAUSE, SCREEN_PLAY, SCREEN_TITLE, render } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusLine = document.getElementById('status');
const audio = createAudio();

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number.parseInt(params.get('seed') ?? '1', 10) || 1;

const world = createWorld(seed);
let screen = SCREEN_TITLE;
let best = 0;

function fitCanvas() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(VIEW.width * dpr);
  canvas.height = Math.round(VIEW.height * dpr);
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function draw() {
  ctx.clearRect(0, 0, VIEW.width, VIEW.height);
  render(ctx, world, screen);
  const carried = world.chef.carry;
  const carrying = carried ? (carried.plate ? 'a finished plate' : INGREDIENT_ORDER.includes(carried.ing) ? carried.ing : 'an item') : 'nothing';
  statusLine.textContent = `Score ${world.score}. ${world.orders.length} orders open. Carrying ${carrying}.`;
}

/** Convert a client click into logical canvas coordinates. */
function toLogical(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * VIEW.width,
    y: ((clientY - rect.top) / rect.height) * VIEW.height,
  };
}

function startShift() {
  if (screen === SCREEN_TITLE) {
    resetWorld(world);
    screen = SCREEN_PLAY;
  } else if (screen === SCREEN_OVER) {
    resetWorld(world);
    screen = SCREEN_PLAY;
  }
}

const input = createInput({
  interact: () => {
    audio.ensure();
    if (screen !== SCREEN_PLAY) return;
    const result = interact(world);
    if (!result.ok && result.hint) audio.play('error');
  },
  trash: () => {
    audio.ensure();
    if (screen !== SCREEN_PLAY) return;
    trashAction(world);
  },
  pause: () => {
    if (screen === SCREEN_PLAY) screen = SCREEN_PAUSE;
    else if (screen === SCREEN_PAUSE) screen = SCREEN_PLAY;
  },
  restart: () => {
    // R restarts the shift from any screen — the hint line promises it.
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSE || screen === SCREEN_OVER) {
      resetWorld(world);
      screen = SCREEN_PLAY;
    }
  },
  confirm: () => {
    audio.ensure();
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER) startShift();
  },
  pantryPick: (index) => {
    audio.ensure();
    if (screen !== SCREEN_PLAY) return;
    const ing = pantryIngredientAt(index);
    if (ing && nearestStation(world) === 'pantry') takeIngredient(world, ing);
  },
  click: (clientX, clientY) => {
    audio.ensure();
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
      startShift();
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    // Clicking a pantry icon picks that ingredient; clicking any other
    // station runs the same interact the E key runs.
    const point = toLogical(clientX, clientY);
    const station = nearestStation(world);
    if (station === 'pantry') {
      const pantry = STATIONS.pantry;
      const cols = pantry.cols;
      const cellW = (pantry.w - 16) / cols;
      const col = Math.floor((point.x - (pantry.x + 8)) / cellW);
      const row = Math.floor((point.y - (pantry.y + 34)) / pantry.cellH);
      const index = row * cols + col;
      const ing = pantryIngredientAt(index);
      if (ing && point.x > pantry.x && point.x < pantry.x + pantry.w && point.y > pantry.y + 34 && point.y < pantry.y + 34 + 4 * pantry.cellH) {
        takeIngredient(world, ing);
        return;
      }
    }
    const result = interact(world);
    if (!result.ok && result.hint) audio.play('error');
  },
  blur: () => {
    if (screen === SCREEN_PLAY) screen = SCREEN_PAUSE;
  },
});

if (shotName) {
  // Deterministic screenshot mode: stage, draw once, stop.
  fitCanvas();
  const staged = stageShot(shotName, world);
  screen = staged.screen;
  best = staged.best;
  draw();
  document.title = `Sizzle Station — shot ${shotName}`;
} else {
  fitCanvas();
  window.addEventListener('resize', fitCanvas);
  input.attach(window);
  let last = performance.now();
  let accumulator = 0;
  function frame(now) {
    const elapsed = Math.min(0.25, (now - last) / 1000);
    last = now;
    if (screen === SCREEN_PLAY) {
      accumulator += elapsed;
      while (accumulator >= STEP) {
        step(world, STEP, input.state);
        accumulator -= STEP;
        // Drain world events into sounds (and clear them: an event must
        // play exactly once, not on every frame after it happened).
        for (const event of world.events) audio.play(event);
        world.events.length = 0;
        if (world.phase === 'over') {
          screen = SCREEN_OVER;
          best = world.score;
          break;
        }
      }
    }
    draw();
    requestAnimationFrame(frame);
  }
  draw();
  requestAnimationFrame(frame);
}

void best;
