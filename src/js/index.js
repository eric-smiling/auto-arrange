import interact from 'interactjs';

const margin = 20;

// current positions
const pos = new Map();

// initial positions at drag start
const init = new Map();

// have we moved this node within this mousemove?
const moved = new Map();

// what nodes have caused this one to move?
const cause = new Map();

// what nodes have we attracted?
const attd = new Map();

let timer;

discoverPositions(Array.from(document.querySelectorAll('.draggable')));

function discoverPositions(els) {
  for (let el of els) {
    pos.set(el, readPosition(el));
  }
}

function readPosition(el) {
  const { top, left, bottom, right, width, height } = el.getBoundingClientRect();
  const { id } = el;
  return { id, top, left, bottom, right, width, height };
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
};

function attract(target, dx, dy, ignore) {

  if (target == ignore) return;

  const tp = pos.get(target);
  const rectEls = Array.from(document.querySelectorAll('.draggable'));
  rectEls.sort(euclideanSort(tp, pos.get.bind(pos)));

  for (let el of rectEls) {
    if (target == el) continue;
    if (ignore == el) continue;
    if (attd.has(el)) {
      continue;
    }
    const ep = pos.get(el);
    const mx = ep.left - tp.right + dx;
    if ((mx >= 0 && mx <= margin * 2) && ((ep.top < tp.bottom - dx && ep.bottom > tp.top - dx) || (ep.bottom > tp.top - dx && ep.top < tp.bottom - dx))) {
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
    if ((my >= 0 && my <= margin * 2) && ((ep.left < tp.right && ep.right > tp.left) || (ep.right > tp.left && ep.left < tp.right))) {
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

function repel(target, ignore) {

  // get our target position
  const tp = pos.get(target); 
  const rectEls = Array.from(document.querySelectorAll('.draggable'));

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
          xDisplacement = xDisplacement > 0 ? Math.ceil(xDisplacement) + margin : Math.floor(xDisplacement) - margin;
          el.style.left = ex.left + xDisplacement + "px";
          ex.left = parseInt(el.style.left);
          ex.right = ex.left + ex.width;
        } else {
          yDisplacement = yDisplacement > 0 ? Math.ceil(yDisplacement) + margin : Math.floor(yDisplacement) - margin;
          el.style.top = ex.top + yDisplacement + "px";
          ex.top = parseInt(el.style.top);
          ex.bottom = ex.top + ex.height;
        }

        moved.set(el, true);
        ep.id = el.id;
        pos.set(el, ep);
      }

      // recurse to move any nodes out of the way which might now intersect
      repel(el, ignore);
    }
  }
}

function revert(target) {

  const rectEls = Array.from(document.querySelectorAll('.draggable'));
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

function onmove (event) {

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
    revert(target);
    repel(target, target)
  }, 100);

}


function toggleSize(el) {
  attd.clear();
  cause.clear();
  if (!el.classList.contains('collapsed')) {
    const { width: w0, height: h0 } = pos.get(el);
    el.classList.add('collapsed');
    discoverPositions(Array.from(document.querySelectorAll('.draggable')));
    const { width: w1, height: h1 } = pos.get(el);
    attract(el, w1 - w0, h1 - h0);
    discoverPositions(Array.from(document.querySelectorAll('.draggable')));
  } else {
    init.clear();
    pos.forEach((v, k) => init.set(k, JSON.parse(JSON.stringify(v))))
    el.setAttribute("expanding", 1);
    el.classList.remove('collapsed');
    discoverPositions(Array.from(document.querySelectorAll('.draggable')));
    repel(el);
    el.removeAttribute("expanding");
  }
}

// target elements with the "draggable" class
interact('.draggable')
.draggable({
  onstart: (e) => {
    e.target.style.zIndex = Date.now();
    discoverPositions(Array.from(document.querySelectorAll('.draggable')));
    init.clear();
    moved.clear();
    pos.forEach((v, k) => init.set(k, JSON.parse(JSON.stringify(v))))
  },
  onmove: onmove,
  onend: (e) => {
    e.target.style.zIndex = 1;
    clearTimeout(timer);
    repel(e.target);
  }
});

for (let el of Array.from(document.querySelectorAll('.draggable'))) {
  interact(el).on('tap', e => toggleSize(e.target), true);
  interact(el).on('mousedown', e => e.target.classList.remove('repelling'), true);
}