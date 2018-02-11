import {
  clone,
  euclideanSort,
  testIntersection,
  testIntersections,
} from './utils';
import { MARGIN } from './constants';

/*
 * Private Functions
 */
function attract(target, dx, dy, ignore, pos, getNodes, attd) {
  if (target === ignore) {
    return;
  }

  const tp = pos.get(target);
  const rectNodes = getNodes();

  rectNodes.sort(euclideanSort(tp.rect, x => pos.get(x).rect));

  rectNodes.forEach((node) => {
    if (target === node || ignore === node || attd.has(node)) {
      return;
    }

    const ep = pos.get(node);
    const { style } = node;

    const mx = (ep.rect.left - tp.rect.right) + dx;
    if ((mx >= 0 && mx <= MARGIN * 2) &&
      (
        (ep.rect.top < tp.rect.bottom - dx && ep.rect.bottom > tp.rect.top - dx) ||
        (ep.rect.bottom > tp.rect.top - dx && ep.rect.top < tp.rect.bottom - dx)
      )
    ) {
      // move left
      const cp = {
        id: node.id,
        rect: {
          top: ep.rect.top,
          bottom: ep.rect.bottom,
          left: ep.rect.left + dx,
          right: ep.rect.right + dx,
        },
      };

      if (!testIntersections(cp, rectNodes.map(e => pos.get(e)))) {
        ep.rect.left += dx;
        ep.rect.right += dx;
        style.left = `${ep.rect.left}px`;
        attd.set(node, true);
        attract(node, dx, dy, ignore || target, getNodes, attd);
      }
    }
    const my = (ep.rect.top - tp.rect.bottom) + dy;
    if ((my >= 0 && my <= MARGIN * 2) &&
      (
        (ep.rect.left < tp.rect.right && ep.rect.right > tp.rect.left) ||
        (ep.rect.right > tp.rect.left && ep.rect.left < tp.rect.right)
      )
    ) {
      // move up
      const cp = {
        id: node.id,
        rect: {
          top: ep.rect.top + dy,
          bottom: ep.rect.bottom + dy,
          left: ep.rect.left,
          right: ep.rect.right,
        },
      };
      if (!testIntersections(cp, rectNodes.map(e => pos.get(e)))) {
        ep.rect.top += dy;
        ep.rect.bottom += dy;
        style.top = `${ep.rect.top}px`;
        attd.set(node, true);
        attract(node, dx, dy, ignore || target, getNodes, attd);
      }
    }
  });
}

/*
 * Public Functions
 */
function repel(target, ignore, pos, cause, moved, getNodes) {
  // get our target position
  const tp = pos.get(target);

  getNodes().forEach((node) => {
    // don't try to move ourself out of our own way
    if (target === node) {
      return;
    }

    // get our element position
    const ep = pos.get(node);

    if (testIntersection(tp, ep)) {
      // don't move the item the user is moving
      if (node === ignore) {
        return;
      }

      if (cause.has(node) && cause.get(node).has(target)) {
        // we have circular dependencies so give up
        // console.log("DEADLOCK!", target.id, node.id);
        return;
      }

      // don't move the thing responsible for moving this thing
      if (!cause.has(node)) {
        cause.set(node, new Map());
      }

      cause.get(node).set(target, true);

      // find horizontal overlap
      const ox1 = Math.max(tp.rect.left, ep.rect.left);
      const ox2 = Math.min(tp.rect.right, ep.rect.right);

      const xSign = (ep.rect.right + ep.rect.left) / 2 > (tp.rect.right + tp.rect.left) / 2 ? 1 : -1;
      let xDisplacement = xSign * (ox2 - ox1);

      const oy1 = Math.max(tp.rect.top, ep.rect.top);
      const oy2 = Math.min(tp.rect.bottom, ep.rect.bottom);

      const ySign = (ep.rect.bottom + ep.rect.top) / 2 > (tp.rect.bottom + tp.rect.top) / 2 ? 1 : -1;
      let yDisplacement = ySign * (oy2 - oy1);

      node.classList.add('repelling');

      // our position to move
      const ex = pos.get(node);
      const { style } = node;
      // should we move vertically or horizontally?
      if (Math.abs(xDisplacement) < Math.abs(yDisplacement)) {
        xDisplacement = (
          xDisplacement > 0 ?
            Math.ceil(xDisplacement) + MARGIN :
            Math.floor(xDisplacement) - MARGIN
        );
        style.left = `${ex.rect.left + xDisplacement}px`;
        ex.rect.left = parseInt(style.left, 10);
        ex.rect.right = ex.rect.left + ex.rect.width;
      } else {
        yDisplacement = (
          yDisplacement > 0 ?
            Math.ceil(yDisplacement) + MARGIN :
            Math.floor(yDisplacement) - MARGIN
        );
        style.top = `${ex.rect.top + yDisplacement}px`;
        ex.rect.top = parseInt(style.top, 10);
        ex.rect.bottom = ex.rect.top + ex.rect.height;
      }

      moved.set(node, true);
      ep.id = node.id;
      pos.set(node, ep);

      // recurse to move any nodes out of the way which might now intersect
      repel(node, ignore, pos, cause, moved, getNodes);
    }
  });
}

function revert(target, pos, init, moved, getNodes) {
  const ep = pos.get(target);

  // sort rects by proximity to the target so we remember
  // initial positions  with the right dependency order
  const rectNodes = getNodes().sort(euclideanSort(ep.rect, x => pos.get(x).rect));

  rectNodes.forEach((el) => {
    if (el === target) {
      return;
    }

    const initRect = init.get(el);
    const tpos = pos.get(el);
    const {
      classList,
      style,
    } = el;

    // revert items back to where they were if there's now room
    if (moved.has(el) && !testIntersection(initRect, pos.get(target))) {
      const inter = testIntersections(init.get(el), rectNodes.map((cel) => {
        const p = pos.get(cel);
        p.id = cel.id;
        return p;
      }));

      if (!inter) {
        tpos.rect.left = initRect.left;
        tpos.rect.right = initRect.right;
        tpos.rect.top = initRect.top;
        tpos.rect.bottom = initRect.bottom;
        classList.add('repelling');
        style.left = `${tpos.rect.left}px`;
        style.top = `${tpos.rect.top}px`;
        tpos.id = el.id;
        pos.set(el, tpos);
        moved.delete(el);
      }
    }
  });
}

function toggleSize(el, pos, init, cause, moved, attd, getNodes, discoverPositions) {
  attd.clear();
  cause.clear();
  if (!el.classList.contains('collapsed')) {
    const {
      width: w0,
      height: h0,
    } = pos.get(el).rect;
    el.classList.add('collapsed');
    discoverPositions();
    const {
      width: w1,
      height: h1,
    } = pos.get(el).rect;
    attract(el, w1 - w0, h1 - h0, null, pos, getNodes, attd);
    discoverPositions();
  } else {
    init.clear();
    pos.forEach((v, k) => init.set(k, clone(v)));
    el.setAttribute('expanding', 1);
    el.classList.remove('collapsed');
    discoverPositions();
    repel(el, null, pos, cause, moved, getNodes);
    el.removeAttribute('expanding');
  }
}

export {
  repel,
  revert,
  toggleSize,
};
