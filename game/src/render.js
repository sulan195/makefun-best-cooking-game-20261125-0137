// Sizzle Station — every pixel the player (and the judge) sees, drawn on one
// canvas in logical 1280x720 units. All art is procedural: no images, no
// fonts, no network. Screens: 'title' | 'play' | 'pause' | 'over'.

import {
  COLORS,
  INGREDIENTS,
  INGREDIENT_ORDER,
  STATIONS,
  VIEW,
  comboMultiplier,
} from './config.js';
import { isReady, nearestStation } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSE = 'pause';
export const SCREEN_OVER = 'over';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, weight = 'bold', align = 'left') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

/** One ingredient's icon, drawn at (x, y) with radius r. Original vector art. */
export function drawIngredient(ctx, ing, x, y, r) {
  const color = INGREDIENTS[ing]?.color ?? '#888888';
  ctx.save();
  ctx.translate(x, y);
  switch (ing) {
    case 'tomato': {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(0, 1, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3fa34d';
      for (let i = 0; i < 3; i += 1) {
        ctx.save(); ctx.rotate((i - 1) * 0.7); ctx.beginPath(); ctx.ellipse(0, -r * 0.8, r * 0.45, r * 0.22, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      break;
    }
    case 'egg': {
      ctx.fillStyle = '#fdf6e3';
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.95, r * 0.75, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f6c945';
      ctx.beginPath(); ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'rice': {
      ctx.fillStyle = '#7a4a21';
      ctx.beginPath(); ctx.arc(0, r * 0.3, r * 0.9, 0, Math.PI, false); ctx.fill();
      ctx.fillStyle = '#f2ead8';
      ctx.beginPath(); ctx.arc(0, r * 0.1, r * 0.75, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#d9cdb2';
      for (let i = -1; i <= 1; i += 1) { ctx.fillRect(i * r * 0.4 - 1, -r * 0.5, 2, r * 0.3); }
      break;
    }
    case 'chili': {
      ctx.strokeStyle = color; ctx.lineWidth = r * 0.55; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, -r * 0.2, r * 0.8, Math.PI * 0.15, Math.PI * 0.95); ctx.stroke();
      ctx.fillStyle = '#3fa34d'; ctx.fillRect(-r * 0.15, -r * 1.05, r * 0.3, r * 0.4);
      break;
    }
    case 'noodle': {
      ctx.fillStyle = '#7a4a21';
      ctx.beginPath(); ctx.arc(0, r * 0.3, r * 0.9, 0, Math.PI, false); ctx.fill();
      ctx.strokeStyle = '#f2c94c'; ctx.lineWidth = r * 0.28; ctx.lineCap = 'round';
      for (let i = -1; i <= 1; i += 1) {
        ctx.beginPath(); ctx.moveTo(-r * 0.7, i * r * 0.35); ctx.quadraticCurveTo(0, i * r * 0.35 - r * 0.3, r * 0.7, i * r * 0.35); ctx.stroke();
      }
      break;
    }
    case 'chicken': {
      ctx.fillStyle = '#e8a87c';
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.8, r * 0.6, -0.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fdf6e3';
      ctx.beginPath(); ctx.arc(r * 0.75, -r * 0.55, r * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.95, -r * 0.3, r * 0.22, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'greens': {
      ctx.fillStyle = '#3fa34d';
      for (let i = -1; i <= 1; i += 1) {
        ctx.save(); ctx.rotate(i * 0.5); ctx.beginPath(); ctx.ellipse(0, -r * 0.3, r * 0.35, r * 0.7, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      break;
    }
    case 'peanut': {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(-r * 0.35, 0, r * 0.4, r * 0.62, 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(r * 0.4, 0, r * 0.4, r * 0.62, -0.3, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'bun': {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(0, r * 0.3, r * 0.9, Math.PI, 0); ctx.fill();
      ctx.fillRect(-r * 0.9, r * 0.3, r * 1.8, r * 0.35);
      ctx.fillStyle = '#fff8e7';
      for (const [dx, dy] of [[-0.4, -0.35], [0, -0.55], [0.4, -0.35]]) { ctx.beginPath(); ctx.arc(dx * r, dy * r, r * 0.09, 0, Math.PI * 2); ctx.fill(); }
      break;
    }
    case 'patty': {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.95, r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5d3413';
      ctx.beginPath(); ctx.ellipse(0, -r * 0.1, r * 0.6, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'cheese': {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(-r * 0.9, r * 0.6); ctx.lineTo(r * 0.9, r * 0.6); ctx.lineTo(0, -r * 0.8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#d9a521';
      ctx.beginPath(); ctx.arc(-r * 0.25, r * 0.15, r * 0.12, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.3, -r * 0.2, r * 0.1, 0, Math.PI * 2); ctx.fill();
      break;
    }
    default: {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      break;
    }
  }
  ctx.restore();
}

function drawStationBase(ctx, station, fill, label, near) {
  const { x, y, w, h } = station;
  ctx.fillStyle = fill;
  roundRect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.lineWidth = near ? 5 : 2;
  ctx.strokeStyle = near ? COLORS.accentGold : 'rgba(46,42,38,0.35)';
  ctx.stroke();
  text(ctx, label, x + w / 2, y + 20, 20, COLORS.textLight, 'bold', 'center');
}

function drawPantry(ctx, world, near) {
  const s = STATIONS.pantry;
  drawStationBase(ctx, s, COLORS.counter, s.label, near);
  ctx.fillStyle = COLORS.counterTop;
  ctx.fillRect(s.x + 8, s.y + 34, s.w - 16, 4);
  // Four rows of ingredient icons with their number keys (3 columns, so the
  // names fit without running into each other).
  const cols = s.cols;
  const cellW = (s.w - 16) / cols;
  INGREDIENT_ORDER.forEach((ing, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = s.x + 8 + cellW * (col + 0.5);
    const cy = s.y + 78 + row * s.cellH;
    ctx.fillStyle = 'rgba(255,248,231,0.14)';
    roundRect(ctx, cx - cellW / 2 + 4, cy - 44, cellW - 8, 88, 10);
    ctx.fill();
    drawIngredient(ctx, ing, cx, cy - 8, 22);
    text(ctx, INGREDIENTS[ing].name, cx, cy + 26, 11, COLORS.textLight, 'bold', 'center');
    text(ctx, `[${INGREDIENTS[ing].key}]`, cx, cy + 42, 10, '#e8d9b0', 'normal', 'center');
  });
  if (near) text(ctx, 'E: take needed · 1-0: pick one', s.x + s.w / 2, s.y + s.h - 12, 12, COLORS.accentGold, 'bold', 'center');
}

function drawBoard(ctx, world, near) {
  const s = STATIONS.board;
  drawStationBase(ctx, s, '#6b4a2f', s.label, near);
  ctx.fillStyle = '#e8dcc3';
  roundRect(ctx, s.x + 16, s.y + 38, s.w - 32, s.h - 54, 8);
  ctx.fill();
  const chef = world.chef;
  if (chef.chop) {
    const ratio = Math.min(1, chef.chop.t / chef.chop.need);
    ctx.strokeStyle = '#d9c48f';
    ctx.lineWidth = 10;
    ctx.beginPath(); ctx.arc(s.x + s.w / 2, s.y + 74, 26, -Math.PI / 2, -Math.PI / 2 + ratio * Math.PI * 2); ctx.stroke();
    text(ctx, 'CHOP!', s.x + s.w / 2, s.y + 74, 15, '#2e2a26', 'bold', 'center');
  } else {
    // A chef's knife resting on the board (the label above already says
    // what the station is for).
    ctx.save();
    ctx.translate(s.x + s.w / 2, s.y + 66);
    ctx.rotate(-0.5);
    ctx.fillStyle = '#c8ccd2';
    ctx.fillRect(-34, -4, 46, 8);
    ctx.fillStyle = '#6b4a2f';
    ctx.fillRect(12, -5, 22, 10);
    ctx.restore();
  }
}

function drawStove(ctx, world, near) {
  const s = STATIONS.stove;
  drawStationBase(ctx, s, '#3a3f45', s.label, near);
  world.burners.forEach((burner, i) => {
    const cx = s.x + 55 + i * 90;
    const cy = s.y + 105;
    ctx.fillStyle = '#22252a';
    ctx.beginPath(); ctx.arc(cx, cy, 38, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#5a6068';
    ctx.lineWidth = 3;
    ctx.stroke();
    const item = burner.item;
    if (item) {
      const ratio = Math.min(1, item.progress);
      ctx.strokeStyle = item.burnt ? '#3a3a3a' : ratio >= 1 ? COLORS.accentGreen : '#e07840';
      ctx.lineWidth = 7;
      ctx.beginPath(); ctx.arc(cx, cy, 30, -Math.PI / 2, -Math.PI / 2 + ratio * Math.PI * 2); ctx.stroke();
      drawIngredient(ctx, item.ing, cx, cy, item.burnt ? 20 : 22);
      if (item.burnt) {
        text(ctx, 'BURNT', cx, cy - 48, 14, '#ff8a7a', 'bold', 'center');
      } else if (ratio >= 1) {
        text(ctx, 'READY!', cx, cy - 48, 15, '#9be15d', 'bold', 'center');
      } else {
        text(ctx, `${Math.ceil((1 - ratio) * (INGREDIENTS[item.ing].cookTime ?? 5))}s`, cx, cy - 48, 14, COLORS.textLight, 'bold', 'center');
      }
    } else {
      text(ctx, '—', cx, cy, 24, '#5a6068', 'bold', 'center');
    }
  });
  text(ctx, 'burner 1 · burner 2', s.x + s.w / 2, s.y + s.h - 36, 13, '#c8ccd2', 'normal', 'center');
  text(ctx, 'take it out before it burns!', s.x + s.w / 2, s.y + s.h - 16, 13, '#e8a87c', 'bold', 'center');
}

function drawPlateStation(ctx, world, near) {
  const s = STATIONS.plate;
  const ready = world.plateReady !== null;
  drawStationBase(ctx, s, ready ? '#2e7d32' : COLORS.counter, s.label, near);
  const cx = s.x + s.w / 2;
  const cy = s.y + 68;
  ctx.fillStyle = '#f4f1ea';
  ctx.beginPath(); ctx.ellipse(cx, cy, 86, 22, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#c9c2b2';
  ctx.lineWidth = 2;
  ctx.stroke();
  world.plate.items.forEach((ing, i) => {
    const offset = (i - (world.plate.items.length - 1) / 2) * 34;
    drawIngredient(ctx, ing, cx + offset, cy - 6, 15);
  });
  if (world.plate.items.length === 0) text(ctx, 'empty plate', cx, cy - 4, 14, '#8a7a5f', 'bold', 'center');
  // The hint lives under the plate, clear of the station label above it.
  if (ready) {
    text(ctx, 'READY TO SERVE!', cx, s.y + s.h - 8, 15, '#d8ffd8', 'bold', 'center');
  } else if (world.plate.items.length > 0) {
    text(ctx, 'add more — or X to clear', cx, s.y + s.h - 8, 13, COLORS.textLight, 'normal', 'center');
  }
}

function drawServeWindow(ctx, world, near) {
  const s = STATIONS.serve;
  drawStationBase(ctx, s, '#7a4a21', s.label, near);
  ctx.fillStyle = '#2e2a26';
  roundRect(ctx, s.x + 12, s.y + 34, s.w - 24, s.h - 46, 8);
  ctx.fill();
  ctx.fillStyle = '#f6c945';
  ctx.beginPath(); ctx.arc(s.x + s.w / 2, s.y + 56, 12, 0, Math.PI * 2); ctx.fill();
  const carried = world.chef.carry;
  text(ctx, carried && carried.plate ? 'serve it! (E)' : 'DING!', s.x + s.w / 2, s.y + 80, 15, COLORS.textLight, 'bold', 'center');
}

function drawTrash(ctx, world, near) {
  const s = STATIONS.trash;
  drawStationBase(ctx, s, '#5a6068', s.label, near);
  ctx.fillStyle = '#3a3f45';
  ctx.beginPath(); ctx.moveTo(s.x + 18, s.y + 44); ctx.lineTo(s.x + s.w - 18, s.y + 44);
  ctx.lineTo(s.x + s.w - 26, s.y + s.h - 14); ctx.lineTo(s.x + 26, s.y + s.h - 14); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#8d949c'; ctx.lineWidth = 3; ctx.stroke();
}

function drawOrderBoard(ctx, world) {
  const x0 = 8;
  const y0 = 8;
  const w = 852;
  const h = 100;
  ctx.fillStyle = COLORS.board;
  roundRect(ctx, x0, y0, w, h, 12);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(46,42,38,0.35)';
  ctx.stroke();
  text(ctx, 'ORDERS', x0 + 14, y0 + 20, 18, '#8a7a5f', 'bold');
  if (world.orders.length === 0) {
    text(ctx, 'No orders yet — the lunch rush is coming…', x0 + 110, y0 + 58, 16, '#8a7a5f', 'bold');
    return;
  }
  // Four tickets must end before the score panel starts at x=870:
  // 112 + 3 * 182 + 178 = 836.
  const ticketW = 178;
  world.orders.forEach((order, i) => {
    const tx = x0 + 104 + i * (ticketW + 4);
    const ty = y0 + 8;
    const tw = ticketW;
    const th = 84;
    const urgent = order.timeLeft < 15;
    ctx.fillStyle = COLORS.boardTicket;
    roundRect(ctx, tx, ty, tw, th, 8);
    ctx.fill();
    ctx.strokeStyle = urgent ? COLORS.danger : COLORS.ticketEdge;
    ctx.lineWidth = urgent ? 3 : 1.5;
    ctx.stroke();
    text(ctx, order.name, tx + 10, ty + 16, 15, COLORS.text, 'bold');
    order.items.forEach((ing, j) => {
      const cx = tx + 20 + j * 34;
      const cy = ty + 44;
      drawIngredient(ctx, ing, cx, cy, 13);
      const onPlateCount = world.plate.items.filter((p) => p === ing).length;
      const neededCount = order.items.filter((o) => o === ing).length;
      if (onPlateCount >= neededCount) {
        ctx.strokeStyle = COLORS.accentGreen;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(cx, cy, 15, 0, Math.PI * 2); ctx.stroke();
        text(ctx, '✓', cx + 13, cy - 12, 15, COLORS.accentGreen, 'bold', 'center');
      }
    });
    const ratio = Math.max(0, order.timeLeft / order.timeMax);
    ctx.fillStyle = '#e8dcc3';
    roundRect(ctx, tx + 10, ty + 66, tw - 20, 10, 5);
    ctx.fill();
    ctx.fillStyle = ratio > 0.5 ? COLORS.accentGreen : ratio > 0.25 ? '#e0a030' : COLORS.danger;
    if (ratio > 0) {
      roundRect(ctx, tx + 10, ty + 66, (tw - 20) * ratio, 10, 5);
      ctx.fill();
    }
    text(ctx, `${Math.ceil(order.timeLeft)}s`, tx + tw - 12, ty + 16, 14, urgent ? COLORS.danger : '#6b5d43', 'bold', 'right');
  });
}

function drawScorePanel(ctx, world) {
  const x0 = 870;
  const y0 = 8;
  const w = 170;
  const h = 100;
  ctx.fillStyle = COLORS.board;
  roundRect(ctx, x0, y0, w, h, 12);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(46,42,38,0.35)';
  ctx.stroke();
  text(ctx, 'SCORE', x0 + 12, y0 + 18, 13, '#8a7a5f', 'bold');
  text(ctx, `${world.score}`, x0 + 12, y0 + 42, 26, '#f5e6c8', 'bold');
  const mult = comboMultiplier(world.combo);
  text(ctx, world.combo > 1 ? `COMBO x${mult.toFixed(2)}` : 'no combo yet', x0 + 12, y0 + 66, 14, world.combo > 1 ? COLORS.accent : '#8a7a5f', 'bold');
  text(ctx, `LEVEL ${world.level} · ${world.served} served`, x0 + 12, y0 + 86, 13, '#6b5d43', 'bold');
  // Hearts (strikes left) as small circles top-right of the panel.
  for (let i = 0; i < 3; i += 1) {
    const hx = x0 + w - 18 - i * 22;
    const hy = y0 + 18;
    ctx.fillStyle = i < 3 - world.lost ? COLORS.danger : '#d9cdb2';
    ctx.beginPath(); ctx.arc(hx, hy, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff8e7';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('♥', hx, hy + 1);
  }
}

function drawChef(ctx, world) {
  const chef = world.chef;
  const { x, y } = chef;
  ctx.save();
  ctx.translate(x, y);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(0, 20, 22, 7, 0, 0, Math.PI * 2); ctx.fill();
  // Body: teal shirt, white apron.
  ctx.fillStyle = '#2b7a78';
  roundRect(ctx, -15, -6, 30, 26, 10);
  ctx.fill();
  ctx.fillStyle = '#fff8e7';
  roundRect(ctx, -11, 0, 22, 20, 7);
  ctx.fill();
  // Head + toque.
  ctx.fillStyle = '#f2c9a0';
  ctx.beginPath(); ctx.arc(0, -18, 12, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff8e7';
  roundRect(ctx, -13, -36, 26, 12, 6);
  ctx.fill();
  ctx.beginPath(); ctx.arc(-8, -36, 7, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -39, 8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(8, -36, 7, 0, Math.PI * 2); ctx.fill();
  // Eyes look where the chef faces.
  const ex = chef.dirX * 3;
  ctx.fillStyle = '#2e2a26';
  ctx.beginPath(); ctx.arc(-4 + ex, -18, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(4 + ex, -18, 1.8, 0, Math.PI * 2); ctx.fill();
  // Chopping animation: arms up while chopping.
  if (chef.chop) {
    ctx.strokeStyle = '#2b7a78';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-20, -14); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(20, -14); ctx.stroke();
  }
  // Carried item floats above the toque.
  const carried = chef.carry;
  if (carried) {
    ctx.fillStyle = 'rgba(255,248,231,0.95)';
    ctx.beginPath(); ctx.arc(0, -58, 20, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#d9c48f';
    ctx.lineWidth = 2;
    ctx.stroke();
    if (carried.plate) {
      ctx.fillStyle = '#f4f1ea';
      ctx.beginPath(); ctx.ellipse(0, -58, 15, 6, 0, 0, Math.PI * 2); ctx.fill();
      carried.items.forEach((ing, i) => {
        drawIngredient(ctx, ing, (i - (carried.items.length - 1) / 2) * 10, -62, 5);
      });
    } else {
      drawIngredient(ctx, carried.ing, 0, -58, 14);
      if (carried.burnt) text(ctx, '✕', 12, -70, 14, COLORS.danger, 'bold', 'center');
      // Prep-stage badge: green tick when ready, amber half when prepped.
      else if (isReady(carried)) text(ctx, '✓', 12, -70, 14, '#3f7d4e', 'bold', 'center');
      else if (carried.stage === 'prepped') text(ctx, '½', 12, -70, 14, '#b8860b', 'bold', 'center');
    }
  }
  ctx.restore();
}

function drawParticles(ctx, world) {
  for (const p of world.particles) {
    ctx.globalAlpha = Math.max(0, 1 - p.t / p.life);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const f of world.floats) {
    ctx.globalAlpha = Math.max(0, 1 - f.t / f.life);
    text(ctx, f.text, f.x, f.y - f.t * 30, 24, COLORS.accentGold, 'bold', 'center');
  }
  ctx.globalAlpha = 1;
}

function drawMessage(ctx, world) {
  // Persistent RUSH HOUR badge while rush is active and no toast shows.
  if (!world.message && world.time < world.rushUntil) {
    const label = 'RUSH HOUR — double orders, half the wait';
    ctx.font = 'bold 18px system-ui, sans-serif';
    const w = ctx.measureText(label).width + 36;
    const x = (VIEW.width - w) / 2;
    const y = 118;
    ctx.fillStyle = 'rgba(166,44,32,0.95)';
    roundRect(ctx, x, y, w, 34, 17);
    ctx.fill();
    text(ctx, label, VIEW.width / 2, y + 18, 18, '#fff8e7', 'bold', 'center');
    return;
  }
  if (!world.message) return;
  const label = world.message.text;
  ctx.font = 'bold 18px system-ui, sans-serif';
  const w = ctx.measureText(label).width + 36;
  const x = (VIEW.width - w) / 2;
  const y = 118;
  ctx.fillStyle = 'rgba(46,42,38,0.92)';
  roundRect(ctx, x, y, w, 34, 17);
  ctx.fill();
  text(ctx, label, VIEW.width / 2, y + 18, 18, '#fff8e7', 'bold', 'center');
}

function drawHints(ctx) {
  text(ctx, 'WASD / Arrows — move      E — interact      X — trash      P — pause      R — restart', VIEW.width / 2, 709, 14, '#6b5d43', 'bold', 'center');
}

function drawOverlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(30,25,20,0.72)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  text(ctx, title, VIEW.width / 2, 250, 64, accent, 'bold', 'center');
  lines.forEach((line, i) => {
    text(ctx, line, VIEW.width / 2, 320 + i * 34, 20, '#fff8e7', 'bold', 'center');
  });
}

/** Draw the whole world for the given screen. */
export function render(ctx, world, screen) {
  // Wall and floor.
  ctx.fillStyle = COLORS.wall;
  ctx.fillRect(0, 0, VIEW.width, 118);
  ctx.fillStyle = COLORS.floor;
  ctx.fillRect(0, 118, VIEW.width, VIEW.height - 118);
  ctx.fillStyle = COLORS.floorTile;
  for (let y = 118; y < VIEW.height; y += 56) {
    for (let x = ((y / 56) % 2) * 28; x < VIEW.width; x += 56) {
      ctx.fillRect(x, y, 52, 52);
    }
  }
  // Warm wall stripe.
  ctx.fillStyle = '#d94f2b';
  ctx.fillRect(0, 112, VIEW.width, 6);

  const near = world.phase === 'play' ? nearestStation(world) : null;
  drawPantry(ctx, world, near === 'pantry');
  drawBoard(ctx, world, near === 'board');
  drawStove(ctx, world, near === 'stove');
  drawPlateStation(ctx, world, near === 'plate');
  drawServeWindow(ctx, world, near === 'serve');
  drawTrash(ctx, world, near === 'trash');
  drawOrderBoard(ctx, world);
  drawScorePanel(ctx, world);
  drawChef(ctx, world);
  drawParticles(ctx, world);
  drawMessage(ctx, world);
  drawHints(ctx);

  if (screen === SCREEN_TITLE) {
    drawOverlay(ctx, 'SIZZLE STATION', [
      'One chef. One kitchen. Lunch rush.',
      'Take ingredients, chop, cook, plate, serve — before the timer runs out.',
      'WASD move · E interact · X trash · P pause',
      'Press ENTER or click to start your shift',
    ], '#f6c945');
  } else if (screen === SCREEN_PAUSE) {
    drawOverlay(ctx, 'PAUSED', ['Press P to keep cooking.'], '#fff8e7');
  } else if (screen === SCREEN_OVER) {
    drawOverlay(ctx, 'SHIFT OVER!', [
      `Score ${world.score} · ${world.served} orders served · best combo x${comboMultiplier(world.bestCombo).toFixed(2)}`,
      'Three orders were lost. The kitchen closes for today.',
      'Press R to start a new shift',
    ], '#ff8a7a');
  }
}
