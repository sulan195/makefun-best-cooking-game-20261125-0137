// Sizzle Station — configuration: canvas, recipes, ingredients, timings, layout.
// One chef, one kitchen: every number the rules use lives here, so world.js
// stays pure logic and render.js stays pure drawing.

export const VIEW = { width: 1280, height: 720 };
export const STEP = 1 / 60;
export const MAX_ORDERS = 4;
export const MAX_LIVES = 3;
export const INTERACT_RADIUS = 96;
export const CHEF_SPEED = 250;
export const CHEF_RADIUS = 22;
export const INTERACT_COOLDOWN = 0.15;
export const BURNER_COUNT = 2;
export const BURN_AT = 1.3;

// Prep chain per ingredient: 'none' is ready as taken; 'chop' needs the board;
// 'cook' needs a burner; 'chopcook' needs the board first, then a burner.
export const INGREDIENTS = {
  tomato: { name: 'Tomato', prep: 'chop', chopTime: 2, color: '#e23b2e', key: '1' },
  egg: { name: 'Egg', prep: 'cook', cookTime: 5, color: '#f7e8c8', key: '2' },
  rice: { name: 'Rice', prep: 'cook', cookTime: 6, color: '#f2ead8', key: '3' },
  chili: { name: 'Chili', prep: 'chop', chopTime: 2, color: '#c81e1e', key: '4' },
  noodle: { name: 'Noodle', prep: 'cook', cookTime: 5, color: '#f2c94c', key: '5' },
  chicken: { name: 'Chicken', prep: 'chopcook', chopTime: 2, cookTime: 6, color: '#e8a87c', key: '6' },
  greens: { name: 'Greens', prep: 'chop', chopTime: 2, color: '#3fa34d', key: '7' },
  peanut: { name: 'Peanut', prep: 'chop', chopTime: 2, color: '#a4713b', key: '8' },
  bun: { name: 'Bun', prep: 'none', color: '#e0a458', key: '9' },
  patty: { name: 'Patty', prep: 'cook', cookTime: 6, color: '#7a4a21', key: '0' },
  cheese: { name: 'Cheese', prep: 'none', color: '#f6c945', key: '-' },
};

export const INGREDIENT_ORDER = [
  'tomato', 'egg', 'rice', 'chili', 'noodle', 'chicken',
  'greens', 'peanut', 'bun', 'patty', 'cheese',
];

export const RECIPES = [
  { id: 'salad', name: 'Tomato Salad', items: ['tomato'], base: 100, minLevel: 1 },
  { id: 'egg', name: 'Fried Egg', items: ['egg'], base: 120, minLevel: 1 },
  { id: 'nasi', name: 'Nasi Goreng', items: ['rice', 'egg', 'chili'], base: 200, minLevel: 2 },
  { id: 'sate', name: 'Sate Skewers', items: ['chicken', 'peanut'], base: 220, minLevel: 2 },
  { id: 'mie', name: 'Mie Ayam', items: ['noodle', 'chicken', 'greens'], base: 260, minLevel: 3 },
  { id: 'burger', name: 'Burger Kilat', items: ['bun', 'patty', 'tomato', 'cheese'], base: 300, minLevel: 3 },
];

// Order time: base seconds + per-ingredient seconds.
export const ORDER_TIME_BASE = 55;
export const ORDER_TIME_PER_ITEM = 12;

// Spawn pacing: interval shrinks with level; rush doubles the next spawn.
export function spawnIntervalSeconds(level) {
  return Math.max(9, 22 - level * 2);
}
export function maxConcurrentOrders(served) {
  return Math.min(MAX_ORDERS, 2 + Math.floor(served / 4));
}
export function levelFor(served) {
  return 1 + Math.floor(served / 3);
}
// Score multiplier from the current serve streak (combo).
export function comboMultiplier(combo) {
  return 1 + Math.min(combo, 8) * 0.125;
}

// Kitchen layout, in logical 1280x720 units. Stations are rectangles the chef
// cannot walk through; each has an interaction point just outside it.
export const STATIONS = {
  pantry: { x: 20, y: 140, w: 180, h: 490, label: 'PANTRY', point: { x: 220, y: 385 }, cols: 3, cellH: 110 },
  board: { x: 250, y: 580, w: 220, h: 110, label: 'CHOPPING BOARD', point: { x: 360, y: 560 } },
  stove: { x: 1060, y: 180, w: 200, h: 250, label: 'STOVE', point: { x: 1040, y: 305 } },
  plate: { x: 560, y: 580, w: 220, h: 110, label: 'PLATING', point: { x: 670, y: 560 } },
  serve: { x: 1050, y: 8, w: 222, h: 100, label: 'SERVE', point: { x: 1161, y: 130 } },
  trash: { x: 1180, y: 580, w: 80, h: 110, label: 'TRASH', point: { x: 1160, y: 560 } },
};

// Solid obstacles for movement: the station rectangles themselves.
export const OBSTACLES = Object.values(STATIONS).map((s) => ({ x: s.x, y: s.y, w: s.w, h: s.h }));

// Palette: warm street-food kitchen, high contrast so stations read at a glance.
export const COLORS = {
  wall: '#f3e2c7',
  floor: '#c98f5f',
  floorTile: '#bb7f52',
  counter: '#8a5a33',
  counterTop: '#a9713f',
  steel: '#b9c0c7',
  steelDark: '#8d949c',
  board: '#2e2a26',
  boardTicket: '#fff8e7',
  ticketEdge: '#d9c48f',
  text: '#2e2a26',
  textLight: '#fff8e7',
  accent: '#d94f2b',
  accentGreen: '#2e7d32',
  accentGold: '#f6c945',
  danger: '#c81e1e',
};
