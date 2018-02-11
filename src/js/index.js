/* global document */

import interact from 'interactjs';

import Context from './Context';

const getNodes = () => Array.from(document.querySelectorAll('.draggable'));

const context = new Context(getNodes);

let timer;

context.discoverPositions();

// target elements with the "draggable" class
interact('.draggable')
  .draggable({
    onstart: (e) => {
      e.target.style.zIndex = Date.now(); // move drag target to front

      context.discoverPositions();
      context.clearInit();
      context.clearCause();
      context.clearMoved();
      context.captureInitialPositions();
    },

    onmove: (event) => {
      clearTimeout(timer);

      const {
        dx: eventDX,
        dy: eventDY,
        target,
      } = event;
      const targetRect = target.getBoundingClientRect();

      // move the target
      target.style.left = `${targetRect.left + eventDX}px`;
      target.style.top = `${targetRect.top + eventDY}px`;

      // update the pos map
      const targetPos = context.getPositionForNode(target);
      context.setPositionForNode(target, {
        id: targetPos.id,
        rect: {
          left: targetPos.rect.left + eventDX,
          right: targetPos.rect.right + eventDX,
          top: targetPos.rect.top + eventDY,
          bottom: targetPos.rect.bottom + eventDY,
        },
      });

      context.clearCause();

      // set timer for delay of changes
      timer = setTimeout(() => {
        context.doRevert(target);
        context.doRepel(target, target);
      }, 100);
    },

    onend: (event) => {
      const { target } = event;

      target.style.zIndex = '';

      clearTimeout(timer);

      context.doRepel(target, null);
    },
  });


// other event handlers
getNodes().forEach((node) => { // DEPENDENCY
  interact(node)
    .on('tap', e => context.doToggleSize(e.target), true)
    .on('mousedown', e => e.target.classList.remove('repelling'), true);
});
