// Sizzle Station — keyboard and mouse input, normalised to one shape:
//   { mx, my } movement in -1..1, plus edge-triggered callbacks for the
//   discrete actions (interact, trash, pause, restart, pantry pick).
// The world never sees a DOM event; main.js wires these callbacks to it.

export function createInput(callbacks) {
  const keys = new Set();
  const state = { mx: 0, my: 0 };

  function recompute() {
    const left = keys.has('ArrowLeft') || keys.has('KeyA');
    const right = keys.has('ArrowRight') || keys.has('KeyD');
    const up = keys.has('ArrowUp') || keys.has('KeyW');
    const down = keys.has('ArrowDown') || keys.has('KeyS');
    state.mx = (right ? 1 : 0) - (left ? 1 : 0);
    state.my = (down ? 1 : 0) - (up ? 1 : 0);
  }

  function onKeyDown(event) {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (event.repeat) return;
    keys.add(event.code);
    recompute();
    if (event.code === 'KeyE' || event.code === 'Space') callbacks.interact();
    else if (event.code === 'KeyX') callbacks.trash();
    else if (event.code === 'KeyP' || event.code === 'Escape') callbacks.pause();
    else if (event.code === 'KeyR') callbacks.restart();
    else if (event.code === 'Enter') callbacks.confirm();
    const pantryIndex = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus'].indexOf(event.code);
    if (pantryIndex !== -1) callbacks.pantryPick(pantryIndex);
  }

  function onKeyUp(event) {
    keys.delete(event.code);
    recompute();
  }

  function onBlur() {
    keys.clear();
    recompute();
    callbacks.blur();
  }

  function onPointerDown(event) {
    callbacks.click(event.clientX, event.clientY);
  }

  function attach(target) {
    target.addEventListener('keydown', onKeyDown);
    target.addEventListener('keyup', onKeyUp);
    target.addEventListener('blur', onBlur);
    target.addEventListener('pointerdown', onPointerDown);
  }

  function detach(target) {
    target.removeEventListener('keydown', onKeyDown);
    target.removeEventListener('keyup', onKeyUp);
    target.removeEventListener('blur', onBlur);
    target.removeEventListener('pointerdown', onPointerDown);
  }

  return { state, attach, detach };
}
