import interact from 'interactjs';

import {
  attract,
  clone,
  discoverPositions,
  euclideanSort,
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

discoverPositions(pos, Array.from(document.querySelectorAll('.draggable')));


// target elements with the "draggable" class
interact('.draggable')
.draggable({
  onstart: (e) => {
    e.target.style.zIndex = Date.now();
    discoverPositions(pos, Array.from(document.querySelectorAll('.draggable')));
    init.clear();
    moved.clear();
    pos.forEach((v, k) => init.set(k, clone(v)))
  },
  onmove: (event) => {

    clearTimeout(timer);
    var target = event.target;

    const x = target.getBoundingClientRect().left + event.dx;
    const y = target.getBoundingClientRect().top + event.dy;

    target.style.left = x + "px";
    target.style.top = y + "px";

    const ep = pos.get(target);

    ep.left = ep.left + event.dx;
    ep.right = ep.right + event.dx;
    ep.top = ep.top + event.dy;
    ep.bottom = ep.bottom + event.dy;
    pos.set(target, ep);

    cause.clear();

    timer = setTimeout(() => {
      revert(target, pos, init, moved);
      repel(target, target, pos, cause, moved)
    }, 100);

  },

  onend: (e) => {
    e.target.style.zIndex = 1;
    clearTimeout(timer);
    repel(e.target, null, pos, cause, moved);
  }
});

for (let el of Array.from(document.querySelectorAll('.draggable'))) {
  interact(el).on('tap', e => toggleSize(e.target, pos, init, cause, moved), true);
  interact(el).on('mousedown', e => e.target.classList.remove('repelling'), true);
}