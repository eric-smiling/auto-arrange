/* global document */

const MARGIN = 20;

// what nodes have we attracted?
const attd = new Map();

function clone(o) {
  return JSON.parse(JSON.stringify(o));
}

function readPosition(node) {
  const rect = node.getBoundingClientRect();

  return {
    id: node.id,
    top: rect.top,
    left: rect.left,
    bottom: rect.bottom,
    right: rect.right,
    width: rect.width,
    height: rect.height,
  };
}

// TODO: invert control
function nodes() {
  return Array.from(document.querySelectorAll('.draggable'));
}

function discoverPositions(pos) {
  nodes().forEach((node) => {
    pos.set(node, readPosition(node));
  });
}

function euclideanSort(r, getter) {
  // return a comparator fn to see which is closer to our reference
  return (a, b) => {
    const aX = getter ? getter(a) : a;
    const bX = getter ? getter(b) : b;

    /* eslint-disable no-restricted-properties */
    const aDist = Math.sqrt((
      Math.pow((aX.left + (aX.width / 2)) - (r.left + (r.width / 2)), 2) +
      Math.pow((aX.top + (aX.height / 2)) - (r.top + (r.height / 2)), 2)
    ));

    const bDist = Math.sqrt((
      Math.pow((bX.left + (bX.width / 2)) - (r.left + (r.width / 2)), 2) +
      Math.pow((bX.top + (bX.height / 2)) - (r.top + (r.height / 2)), 2)
    ));
    /* eslint-disable no-restricted-properties */

    return aDist - bDist;
  };
}

function testIntersection(r1, r2) {
  if (r1.left > r2.right || r2.left > r1.right) return false;
  if (r1.top > r2.bottom || r1.bottom < r2.top) return false;
  return true;
}

function testIntersections(r0, rs) {
  let inter = false;
  rs.forEach((r) => {
    if (r0 === r || r.id === r0.id) return;
    if (testIntersection(r0, r)) inter = true;
  });
  return inter;
}

function attract(target, dx, dy, ignore, pos) {
  if (target === ignore) {
    return;
  }

  const tp = pos.get(target);
  const rectNodes = nodes();

  rectNodes.sort(euclideanSort(tp, pos.get.bind(pos)));

  rectNodes.forEach((node) => {
    if (target === node || ignore === node || attd.has(node)) {
      return;
    }

    const ep = pos.get(node);
    const { style } = node;

    const mx = (ep.left - tp.right) + dx;
    if ((mx >= 0 && mx <= MARGIN * 2) &&
      (
        (ep.top < tp.bottom - dx && ep.bottom > tp.top - dx) ||
        (ep.bottom > tp.top - dx && ep.top < tp.bottom - dx)
      )
    ) {
      // move left
      const cp = {
        id: node.id,
        top: ep.top,
        bottom: ep.bottom,
        left: ep.left + dx,
        right: ep.right + dx,
      };

      if (!testIntersections(cp, rectNodes.map(e => pos.get(e)))) {
        ep.left += dx;
        ep.right += dx;
        style.left = `${ep.left}px`;
        attd.set(node, true);
        attract(node, dx, dy, ignore || target);
      }
    }
    const my = (ep.top - tp.bottom) + dy;
    if ((my >= 0 && my <= MARGIN * 2) &&
      (
        (ep.left < tp.right && ep.right > tp.left) ||
        (ep.right > tp.left && ep.left < tp.right)
      )
    ) {
      // move up
      const cp = {
        id: node.id,
        top: ep.top + dy,
        bottom: ep.bottom + dy,
        left: ep.left,
        right: ep.right,
      };
      if (!testIntersections(cp, rectNodes.map(e => pos.get(e)))) {
        ep.top += dy;
        ep.bottom += dy;
        style.top = `${ep.top}px`;
        attd.set(node, true);
        attract(node, dx, dy, ignore || target);
      }
    }
  });
}

function repel(target, ignore, pos, cause, moved) {
  // get our target position
  const tp = pos.get(target);

  nodes().forEach((node) => {
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
      const ox1 = Math.max(tp.left, ep.left);
      const ox2 = Math.min(tp.right, ep.right);

      const xSign = (ep.right + ep.left) / 2 > (tp.right + tp.left) / 2 ? 1 : -1;
      let xDisplacement = xSign * (ox2 - ox1);

      const oy1 = Math.max(tp.top, ep.top);
      const oy2 = Math.min(tp.bottom, ep.bottom);

      const ySign = (ep.bottom + ep.top) / 2 > (tp.bottom + tp.top) / 2 ? 1 : -1;
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
        style.left = `${ex.left + xDisplacement}px`;
        ex.left = parseInt(node.style.left, 10);
        ex.right = ex.left + ex.width;
      } else {
        yDisplacement = (
          yDisplacement > 0 ?
            Math.ceil(yDisplacement) + MARGIN :
            Math.floor(yDisplacement) - MARGIN
        );
        style.top = `${ex.top + yDisplacement}px`;
        ex.top = parseInt(node.style.top, 10);
        ex.bottom = ex.top + ex.height;
      }

      moved.set(node, true);
      ep.id = node.id;
      pos.set(node, ep);

      // recurse to move any nodes out of the way which might now intersect
      repel(node, ignore, pos, cause, moved);
    }
  });
}

function revert(target, pos, init, moved) {
  const rectNodes = nodes();
  const ep = pos.get(target);

  // sort rects by proximity to the target so we remember
  // initial positions  with the right dependency order
  rectNodes.sort(euclideanSort(ep, pos.get.bind(pos)));

  rectNodes.forEach((el) => {
    if (el === target) {
      return;
    }

    const elRect = pos.get(target);
    const initRect = init.get(el);
    const tpos = pos.get(el);
    const {
      classList,
      style,
    } = el;

    // revert items back to where they were if there's now room
    if (moved.has(el) && !testIntersection(initRect, elRect)) {
      const inter = testIntersections(init.get(el), rectNodes.map((cel) => {
        const p = pos.get(cel);
        p.id = cel.id;
        return p;
      }));

      if (!inter) {
        tpos.left = initRect.left;
        tpos.right = initRect.right;
        tpos.top = initRect.top;
        tpos.bottom = initRect.bottom;
        classList.add('repelling');
        style.left = `${tpos.left}px`;
        style.top = `${tpos.top}px`;
        tpos.id = el.id;
        pos.set(el, tpos);
        moved.delete(el);
      }
    }
  });
}

function toggleSize(el, pos, init, cause, moved) {
  attd.clear();
  cause.clear();
  if (!el.classList.contains('collapsed')) {
    const { width: w0, height: h0 } = pos.get(el);
    el.classList.add('collapsed');
    discoverPositions(pos);
    const { width: w1, height: h1 } = pos.get(el);
    attract(el, w1 - w0, h1 - h0, null, pos);
    discoverPositions(pos);
  } else {
    init.clear();
    pos.forEach((v, k) => init.set(k, clone(v)));
    el.setAttribute('expanding', 1);
    el.classList.remove('collapsed');
    discoverPositions(pos);
    repel(el, null, pos, cause, moved);
    el.removeAttribute('expanding');
  }
}

export {
  clone,
  discoverPositions,
  nodes,
  repel,
  revert,
  toggleSize,
};
