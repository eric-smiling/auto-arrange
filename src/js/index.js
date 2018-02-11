/* global document */

import interact from 'interactjs';

import {
  clone,
} from './utils';

import {
  discoverPositions,
  repel,
  revert,
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

const getNodes = () => Array.from(document.querySelectorAll('.draggable'));

let timer;


discoverPositions(pos, getNodes); // DEPENDENCY

// target elements with the "draggable" class
interact('.draggable')
  .draggable({
    onstart: (e) => {
      e.target.style.zIndex = Date.now(); // move drag target to front
      discoverPositions(pos, getNodes); // DEPENDENCY
      init.clear();
      moved.clear();
      pos.forEach((v, k) => init.set(k, clone(v)));
    },

    onmove: (event) => {
      clearTimeout(timer);

      const {
        dx: eventDX,
        dy: eventDY,
        target,
      } = event;
      const targetRect = target.getBoundingClientRect();
      const targetPos = pos.get(target);

      // move the target
      target.style.left = `${targetRect.left + eventDX}px`;
      target.style.top = `${targetRect.top + eventDY}px`;

      // update the pos map
      pos.set(target, {
        id: targetPos.id,
        rect: {
          left: targetPos.rect.left + eventDX,
          right: targetPos.rect.right + eventDX,
          top: targetPos.rect.top + eventDY,
          bottom: targetPos.rect.bottom + eventDY,
        },
      });

      // clear the causes
      cause.clear();

      // set timer for delay of changes
      timer = setTimeout(() => {
        revert(target, pos, init, moved, getNodes); // DEPENDENCY
        repel(target, target, pos, cause, moved, getNodes); // DEPENDENCY
      }, 100);
    },

    onend: (event) => {
      const { target } = event;

      target.style.zIndex = '';

      clearTimeout(timer);

      repel(target, null, pos, cause, moved, getNodes); // DEPENDENCY
    },
  });


// other event handlers
getNodes().forEach((node) => { // DEPENDENCY
  interact(node)
    .on('tap', e => toggleSize(e.target, pos, init, cause, moved), true, getNodes) // DEPENDENCY
    .on('mousedown', e => e.target.classList.remove('repelling'), true);
});
