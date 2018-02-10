const MARGIN = 20;

// what nodes have we attracted?
const attd = new Map();

function clone (o) {
  return JSON.parse(JSON.stringify(o));
}

function readPosition(el) {
  const { top, left, bottom, right, width, height } = el.getBoundingClientRect();
  const { id } = el;
  return { id, top, left, bottom, right, width, height };
}

// TODO: invert control
const nodes = () => {
  return Array.from(document.querySelectorAll('.draggable'));
};

function discoverPositions(pos) {

  for (let el of nodes()) {
    pos.set(el, readPosition(el));
  }
}

function attract(target, dx, dy, ignore, pos) {

  if (target == ignore) return;

  const tp = pos.get(target);
  const rectEls = nodes();
  rectEls.sort(euclideanSort(tp, pos.get.bind(pos)));

  for (let el of rectEls) {
    if (target == el) continue;
    if (ignore == el) continue;
    if (attd.has(el)) {
      continue;
    }
    const ep = pos.get(el);
    const mx = ep.left - tp.right + dx;
    if ((mx >= 0 && mx <= MARGIN * 2) && ((ep.top < tp.bottom - dx && ep.bottom > tp.top - dx) || (ep.bottom > tp.top - dx && ep.top < tp.bottom - dx))) {
      // move left
      const cp = { id: el.id, top: ep.top, bottom: ep.bottom, left: ep.left + dx, right: ep.right + dx };
      if (!testIntersections(cp, rectEls.map(e => pos.get(e)))) {
        ep.left += dx;
        ep.right += dx;
        el.style.left = ep.left + "px";
        attd.set(el, true);
        attract(el, dx, dy, ignore || target);
      }
    }
    const my = ep.top - tp.bottom + dy;
    if ((my >= 0 && my <= MARGIN * 2) && ((ep.left < tp.right && ep.right > tp.left) || (ep.right > tp.left && ep.left < tp.right))) {
      // move up
      const cp = { id: el.id, top: ep.top + dy, bottom: ep.bottom + dy, left: ep.left, right: ep.right };
      if (!testIntersections(cp, rectEls.map(e => pos.get(e)))) {
        ep.top += dy;
        ep.bottom += dy;
        el.style.top = ep.top + "px";
        attd.set(el, true);
        attract(el, dx, dy, ignore || target);
      }
    }
  }
}

function euclideanSort(r, getter) {
  // return a comparator fn to see which is closer to our reference
  return function(a, b) {
    if (getter) {
      a = getter(a)
      b = getter(b);
    }
    const aDist = Math.sqrt(Math.pow((a.left + a.width/2) - (r.left + r.width/2), 2) + 
                            Math.pow((a.top + a.height/2) - (r.top + r.height/2), 2));
    const bDist = Math.sqrt(Math.pow((b.left + b.width/2) - (r.left + r.width/2), 2) + 
                            Math.pow((b.top + b.height/2) - (r.top + r.height/2), 2));
    return aDist - bDist;
  }
}

function repel(target, ignore, pos, cause, moved) {

  // get our target position
  const tp = pos.get(target); 
  const rectEls = nodes();

  for (let el of rectEls) {

    // don't try to move ourself out of our own way
    if (target == el) continue;

    // get our element position
    const ep = pos.get(el);

    if (testIntersection(tp, ep)) {

      // don't move the item the user is moving
      if (el == ignore) continue;

      if (cause.has(el) && cause.get(el).has(target)) {
        // we have circular dependencies so give up
        console.log("DEADLOCK!", target.id, el.id);
        continue;

      } else {

        // don't move the thing responsible for moving this thing
        if (!cause.has(el)) cause.set(el, new Map());
        cause.get(el).set(target, true);

        // find horizontal overlap
        const ox1 = Math.max(tp.left, ep.left);
        const ox2 = Math.min(tp.right, ep.right);

        const xSign = (ep.right + ep.left) / 2 > (tp.right + tp.left) / 2 ? 1 : -1;
        let xDisplacement = xSign * (ox2 - ox1);

        const oy1 = Math.max(tp.top, ep.top);
        const oy2 = Math.min(tp.bottom, ep.bottom);

        const ySign = (ep.bottom + ep.top) / 2 > (tp.bottom + tp.top) / 2 ? 1 : -1;
        let yDisplacement = ySign * (oy2 - oy1);

        el.classList.add("repelling");

        // our position to move
        const ex = pos.get(el);

        // should we move vertically or horizontally?
        if (Math.abs(xDisplacement) < Math.abs(yDisplacement)) {
          xDisplacement = xDisplacement > 0 ? Math.ceil(xDisplacement) + MARGIN : Math.floor(xDisplacement) - MARGIN;
          el.style.left = ex.left + xDisplacement + "px";
          ex.left = parseInt(el.style.left);
          ex.right = ex.left + ex.width;
        } else {
          yDisplacement = yDisplacement > 0 ? Math.ceil(yDisplacement) + MARGIN : Math.floor(yDisplacement) - MARGIN;
          el.style.top = ex.top + yDisplacement + "px";
          ex.top = parseInt(el.style.top);
          ex.bottom = ex.top + ex.height;
        }

        moved.set(el, true);
        ep.id = el.id;
        pos.set(el, ep);
      }

      // recurse to move any nodes out of the way which might now intersect
      repel(el, ignore, pos, cause, moved);
    }
  }
}

function revert(target, pos, init, moved) {

  const rectEls = nodes();
  const ep = pos.get(target);

  // sort rects by proximity to the target so we remember initial positions with the right dependency order
  rectEls.sort(euclideanSort(ep, pos.get.bind(pos)));

  for (let el of rectEls) {

    if (el == target) continue;
    const elRect = pos.get(target);
    const initRect = init.get(el);

    const tpos = pos.get(el);

    // revert items back to where they were if there's now room

    if (moved.has(el) && !testIntersection(initRect, elRect)) {

      const inter = testIntersections(init.get(el), rectEls.map(cel => {
        const p = pos.get(cel); 
        p.id = cel.id; 
        return p;
      }));

      if (!inter) {
        tpos.left = initRect.left;
        tpos.right = initRect.right;
        tpos.top = initRect.top;
        tpos.bottom = initRect.bottom;
        el.classList.add("repelling");
        el.style.left = tpos.left + "px";
        el.style.top = tpos.top + "px";
        tpos.id = el.id;
        pos.set(el, tpos);
        moved.delete(el);
      }
    }
  }
}

function testIntersection(r1, r2) {
  if (r1.left > r2.right || r2.left > r1.right) return false;
  if (r1.top > r2.bottom || r1.bottom < r2.top) return false;
  return true;
}

function testIntersections(r0, rs) {
  let inter = false;
  for (let r of rs) {
    if (r0 == r || r.id == r0.id) continue;
    if (testIntersection(r0, r)) inter = true;
  }
  return inter;
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
    pos.forEach((v, k) => init.set(k, clone(v)))
    el.setAttribute("expanding", 1);
    el.classList.remove('collapsed');
    discoverPositions(pos);
    repel(el, null, pos, cause, moved);
    el.removeAttribute("expanding");
  }
}

export {
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
};