import interact from 'interactjs';

import {
  attract,
  clone,
  discoverPositions,
  euclideanSort,
  nodes,
  repel,
  revert,
  testIntersection,
  testIntersections,
  toggleSize,
} from './methods';

// current positions
const pos = new Map();

// initial positions at drag start
const init = new Map();

// have we moved this node within this mousemove?
const moved = new Map();

// what nodes have caused this one to move?
const cause = new Map();

let timer;


discoverPositions(pos);

// target elements with the "draggable" class
interact('.draggable')
.draggable({
  onstart: (e) => {
    e.target.style.zIndex = Date.now(); // move drag target to front
    discoverPositions(pos); // read the positions
    init.clear();
    moved.clear();
    pos.forEach((v, k) => init.set(k, clone(v)))
  },
  onmove: (event) => {

    clearTimeout(timer);

    const {
      dx: eventDX,
      dy: eventDY,
      target,
    } = event;
    const targetRect = target.getBoundingClientRect();
    const _pos = pos.get(target);

    // move the target
    target.style.left = `${targetRect.left +eventDX}px`;
    target.style.top = `${targetRect.top + eventDY}px`;
    
    // update the pos map
    pos.set(target, {
      left: _pos.left + eventDX,
      right: _pos.right + eventDX,
      top: _pos.top + eventDY,
      bottom: _pos.bottom + eventDY,
    });

    // clear the causes
    cause.clear();

    // set timer for delay of revert/repel
    timer = setTimeout(() => {
      revert(target, pos, init, moved);
      repel(target, target, pos, cause, moved)
    }, 100);

  },

  onend: (event) => {
    const { target } = event;
    
    target.style.zIndex = '';

    clearTimeout(timer);

    repel(target, null, pos, cause, moved);
  }
});


// other event handlers
for (let node of nodes()) {
  interact(node)
    .on('tap', e => toggleSize(e.target, pos, init, cause, moved), true)
    .on('mousedown', e => e.target.classList.remove('repelling'), true);
}