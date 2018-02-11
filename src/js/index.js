/* global document */
import interact from 'interactjs';

import Context from './Context';

// query selector for draggable nodes
const NODE_QUERY_SELECTOR = '.draggable';

// primary method for obtaining draggable nodes from the dom
const getNodes = () => Array.from(document.querySelectorAll(NODE_QUERY_SELECTOR));

// create context for auto-arranging nodes
const context = new Context(getNodes);
context.discoverPositions();

// timer used for event handling while dragging
let timer;

// target elements with the "draggable" class
interact(NODE_QUERY_SELECTOR)
  .draggable({
    onstart: (e) => {
      e.target.style.zIndex = Date.now();

      // update context
      context.discoverPositions();
      context.clearInit();
      context.clearCause();
      context.clearMoved();
      context.captureInitialPositions();
      //
    },

    onmove: (event) => {
      clearTimeout(timer);

      const {
        dx: eventDX,
        dy: eventDY,
        target,
      } = event;

      // move the target (basic interact dnd, nothing to do w/ auto arrange context)
      const targetRect = target.getBoundingClientRect();
      target.style.left = `${targetRect.left + eventDX}px`;
      target.style.top = `${targetRect.top + eventDY}px`;

      // update context
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
      //

      // set timer for delay of changes
      timer = setTimeout(() => {
        // update context
        context.doRevert(target);
        context.doRepel(target, target);
        //
      }, 100);
    },

    onend: (event) => {
      const { target } = event;
      target.style.zIndex = '';
      clearTimeout(timer);

      // update context
      context.doRepel(target, null);
      //
    },
  });


// other event handlers
getNodes().forEach((node) => {
  interact(node)
    .on('tap', e => context.doToggleSize(e.target), true)
    .on('mousedown', e => e.target.classList.remove('repelling'), true);
});
