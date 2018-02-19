/* global document */
import interact from 'interactjs';
import Context from './Context';

// query selector for draggable nodes
const NODE_QUERY_SELECTOR = '.draggable';

// primary method for obtaining draggable nodes from the dom
const getNodes = () => Array.from(document.querySelectorAll(NODE_QUERY_SELECTOR));

// create context for auto-arranging nodes
const context = new Context();

// timer used for event handling while dragging
let timer;

// target elements with the "draggable" class
interact(NODE_QUERY_SELECTOR)
  .draggable({
    onstart: (e) => {
      e.target.style.zIndex = Date.now();

      // handle drag start within context
      context.start(getNodes());
    },

    onmove: (event) => {
      clearTimeout(timer);

      const {
        dx,
        dy,
        target,
      } = event;

      // move the target (basic interact dnd, nothing to do w/ auto arrange context)
      const targetRect = target.getBoundingClientRect();
      target.style.left = `${targetRect.left + dx}px`;
      target.style.top = `${targetRect.top + dy}px`;

      // update the context
      context.beforeMove(target, dx, dy);
      //

      // set timer for delay of changes
      timer = setTimeout(() => {
        // handle drag move within context
        context.doMove({
          target,
          nodes: getNodes(),
          onRevert: (node, { id, rect }) => {
            const { classList, style } = node;
            const { top, left } = rect;
            classList.add('repelling');
            style.left = left ? `${left}px` : '';
            style.top = top ? `${top}px` : '';
          },
          onRepel: (node, { id, rect }) => {
            const { classList, style } = node;
            const { top, left } = rect;
            classList.add('repelling');
            style.left = left ? `${left}px` : '';
            style.top = top ? `${top}px` : '';
          },
        });
      }, 100);
    },

    onend: (event) => {
      const { target } = event;
      target.style.zIndex = '';
      clearTimeout(timer);

      // handle drag end within context
      context.endMove(target, getNodes());
    },
  });


// other event handlers
getNodes().forEach((node) => {
  interact(node)
    .on('tap', e => context.doToggleSize(e.target, getNodes()), true)
    .on('mousedown', e => e.target.classList.remove('repelling'), true);
});
