import {
  clone,
  euclideanSort,
  testIntersection,
  testIntersections,
} from './utils';

import { MARGIN } from './constants';

export default class Context {
  constructor(getNodes) {
    if (typeof getNodes !== 'function') {
      throw new Error('getNodes function is required');
    }

    this.positions = new Map(); // current positions
    this.initialPositions = new Map(); // initial positions at drag start
    this.movedNodes = new Map(); // have we moved this node within this mousemove?
    this.causalNodes = new Map(); // what nodes have caused this one to move?
    this.attractedNodes = new Map(); // what nodes have we attracted?

    this.getNodes = getNodes; // how can we find nodes

    this.discoverPositions();
  }

  start() {
    this.discoverPositions();
    this.initialPositions.clear();
    this.causalNodes.clear();
    this.movedNodes.clear();

    // capture initial positions
    this.positions.forEach((v, k) => this.initialPositions.set(k, clone(v)));
  }

  move(target) {
    this.doRevert(target);
    this.doRepel(target, target);
  }

  end(target) {
    this.doRepel(target, null);
  }

  // go find the nodes and store the position data inside of this.positions
  discoverPositions() {
    this.getNodes()
      .forEach((node) => {
        this.positions.set(node, {
          id: node.id,
          rect: clone(node.getBoundingClientRect()),
        });
      });
  }

  // private
  doAttract(target, dx, dy, ignore) {
    const {
      attractedNodes,
      getNodes,
      positions,
    } = this;

    if (target === ignore) {
      return;
    }

    const tp = positions.get(target);
    const nodes = getNodes();

    nodes.sort(euclideanSort(tp.rect, x => positions.get(x).rect));

    nodes.forEach((node) => {
      if (target === node || ignore === node || attractedNodes.has(node)) {
        return;
      }

      const ep = positions.get(node);
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

        if (!testIntersections(cp, nodes.map(e => positions.get(e)))) {
          ep.rect.left += dx;
          ep.rect.right += dx;
          style.left = `${ep.rect.left}px`;
          attractedNodes.set(node, true);
          this.doAttract(node, dx, dy, ignore || target);
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
        if (!testIntersections(cp, nodes.map(e => positions.get(e)))) {
          ep.rect.top += dy;
          ep.rect.bottom += dy;
          style.top = `${ep.rect.top}px`;
          attractedNodes.set(node, true);
          this.doAttract(node, dx, dy, ignore || target);
        }
      }
    });
  }

  doRevert(target) {
    const {
      getNodes,
      initialPositions,
      movedNodes,
      positions,
    } = this;

    const ep = positions.get(target);

    // sort rects by proximity to the target so we remember
    // initial positions  with the right dependency order
    const nodes = getNodes().sort(euclideanSort(ep.rect, x => positions.get(x).rect));

    nodes.forEach((node) => {
      if (node === target) {
        return;
      }

      const initRect = initialPositions.get(node);
      const nodePosition = positions.get(node);
      const {
        classList,
        style,
      } = node;

      // revert items back to where they were if there's now room
      if (movedNodes.has(node) && !testIntersection(initRect, positions.get(target))) {
        const inter = testIntersections(initialPositions.get(node), nodes.map((cel) => {
          const p = positions.get(cel);
          p.id = cel.id;
          return p;
        }));

        if (!inter) {
          nodePosition.rect.left = initRect.left;
          nodePosition.rect.right = initRect.right;
          nodePosition.rect.top = initRect.top;
          nodePosition.rect.bottom = initRect.bottom;
          classList.add('repelling');
          style.left = `${nodePosition.rect.left}px`;
          style.top = `${nodePosition.rect.top}px`;
          nodePosition.id = node.id;
          positions.set(node, nodePosition);
          movedNodes.delete(node);
        }
      }
    });
  }

  doRepel(target, ignore) {
    const {
      causalNodes,
      getNodes,
      movedNodes,
      positions,
    } = this;

    // get our target position
    const tp = positions.get(target);

    getNodes().forEach((node) => {
      // don't try to move ourself out of our own way
      if (target === node) {
        return;
      }

      // get our element positions
      const ep = positions.get(node);

      if (testIntersection(tp, ep)) {
        // don't move the item the user is moving
        if (node === ignore) {
          return;
        }

        if (causalNodes.has(node) && causalNodes.get(node).has(target)) {
          // we have circular dependencies so give up
          //console.log("DEADLOCK!", target.id, node.id);
          return;
        }

        // don't move the thing responsible for moving this thing
        if (!causalNodes.has(node)) {
          causalNodes.set(node, new Map());
        }

        causalNodes.get(node).set(target, true);

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

        // our positions to move
        const ex = positions.get(node);
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

        movedNodes.set(node, true);
        ep.id = node.id;
        positions.set(node, ep);

        // recurse to move any nodes out of the way which might now intersect
        this.doRepel(node, ignore);
      }
    });
  }

  doToggleSize(el) {
    const {
      attractedNodes,
      causalNodes,
      discoverPositions,
      initialPositions,
      positions,
    } = this;

    attractedNodes.clear();
    causalNodes.clear();
    if (!el.classList.contains('collapsed')) {
      const {
        width: w0,
        height: h0,
      } = positions.get(el).rect;
      el.classList.add('collapsed');
      discoverPositions();
      const {
        width: w1,
        height: h1,
      } = positions.get(el).rect;
      this.doAttract(el, w1 - w0, h1 - h0, null);
      discoverPositions();
    } else {
      initialPositions.clear();
      positions.forEach((v, k) => initialPositions.set(k, clone(v)));
      el.setAttribute('expanding', 1);
      el.classList.remove('collapsed');
      discoverPositions();
      this.doRepel(el, null);
      el.removeAttribute('expanding');
    }
  }

  getPositions() {
    return this.positions;
  }

  getPositionForNode(node) {
    return this.positions.get(node);
  }

  setPositionForNode(node, position) {
    this.positions.set(node, position);
  }

  clearCausalNodes() {
    this.causalNodes.clear();
  }
}
