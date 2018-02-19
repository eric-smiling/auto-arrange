import {
  clone,
  euclideanSort,
  testIntersection,
  testIntersections,
} from './utils';

import { MARGIN } from './constants';

export default class Context {
  constructor() {
    this.positions = new Map(); // current positions
    this.initialPositions = new Map(); // initial positions at drag start
    this.movedNodes = new Map(); // have we moved this node within this mousemove?
    this.causalNodes = new Map(); // what nodes have caused this one to move?
    this.attractedNodes = new Map(); // what nodes have we attracted?
  }

  start(nodes) {
    this.discoverPositions(nodes);
    this.initialPositions.clear();
    this.causalNodes.clear();
    this.movedNodes.clear();

    // capture initial positions
    this.positions.forEach((v, k) => this.initialPositions.set(k, clone(v)));
  }

  beforeMove(node, DX, DY) {
    const nodePos = this.positions.get(node);
    this.setPositionForNode(node, {
      id: nodePos.id,
      rect: {
        left: nodePos.rect.left + DX,
        right: nodePos.rect.right + DX,
        top: nodePos.rect.top + DY,
        bottom: nodePos.rect.bottom + DY,
      },
    });
    this.causalNodes.clear();
  }

  doMove({
    target,
    nodes,
    onRevert = () => {},
    onRepel = () => {},
  }) {
    this.doRevert(target, nodes, onRevert);
    this.doRepel(target, nodes, target, onRepel);
  }

  endMove(target, nodes) {
    this.doRepel(target, nodes, null);
  }

  // go find the nodes and store the position data inside of this.positions
  discoverPositions(nodes) {
    nodes
      .forEach((node) => {
        this.positions.set(node, {
          id: node.id,
          rect: clone(node.getBoundingClientRect()),
        });
      });
  }

  // private
  doAttract(target, nodes, dx, dy, ignore) {
    const {
      attractedNodes,
      positions,
    } = this;

    if (target === ignore) {
      return;
    }

    const tp = positions.get(target);

    nodes
      .sort(euclideanSort(tp.rect, x => positions.get(x).rect))
      .forEach((node) => {
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
            this.doAttract(node, nodes, dx, dy, ignore || target);
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
            this.doAttract(node, nodes, dx, dy, ignore || target);
          }
        }
      });
  }

  doRevert(target, nodes, onRevert = () => {}) {
    const {
      initialPositions,
      movedNodes,
      positions,
    } = this;

    const ep = positions.get(target);

    // sort rects by proximity to the target so we remember
    // initial positions  with the right dependency order
    nodes
      .sort(euclideanSort(ep.rect, x => positions.get(x).rect))
      .forEach((node) => {
        if (node === target) {
          return;
        }

        const initialNodePosition = initialPositions.get(node);

        // revert items back to where they were if there's now room
        if (movedNodes.has(node) && !testIntersection(initialNodePosition, positions.get(target))) {
          const inter = testIntersections(initialPositions.get(node), nodes.map((cel) => {
            const p = positions.get(cel);
            p.id = cel.id;
            return p;
          }));

          if (!inter) {
            positions.set(node, {
              id: node.id,
              rect: {
                ...initialNodePosition.rect,
              },
            });
            movedNodes.delete(node);

            onRevert(node, initialNodePosition);
          }
        }
      });
  }

  doRepel(target, nodes, ignore, onRepel = () => {}) {
    const {
      causalNodes,
      movedNodes,
      positions,
    } = this;

    // get our target position
    const tp = positions.get(target);

    nodes.forEach((node) => {
      // this will contain values passed to the onRepel callback
      const result = {};

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
          // console.log("DEADLOCK!", target.id, node.id);
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

        // our positions to move
        const ex = positions.get(node);
        // should we move vertically or horizontally?
        if (Math.abs(xDisplacement) < Math.abs(yDisplacement)) {
          xDisplacement = (
            xDisplacement > 0 ?
              Math.ceil(xDisplacement) + MARGIN :
              Math.floor(xDisplacement) - MARGIN
          );
          result.left = ex.rect.left + xDisplacement;
          ex.rect.left = result.left;
          ex.rect.right = ex.rect.left + ex.rect.width;
        } else {
          yDisplacement = (
            yDisplacement > 0 ?
              Math.ceil(yDisplacement) + MARGIN :
              Math.floor(yDisplacement) - MARGIN
          );
          result.top = ex.rect.top + yDisplacement;
          ex.rect.top = result.top;
          ex.rect.bottom = ex.rect.top + ex.rect.height;
        }

        movedNodes.set(node, true);
        ep.id = node.id;
        positions.set(node, ep);

        onRepel(node, {
          id: node.id,
          rect: result,
        });

        // recurse to move any nodes out of the way which might now intersect
        this.doRepel(node, nodes, ignore);
      }
    });
  }

  doToggleSize(el, nodes) {
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
      this.doAttract(el, nodes, w1 - w0, h1 - h0, null);
      discoverPositions();
    } else {
      initialPositions.clear();
      positions.forEach((v, k) => initialPositions.set(k, clone(v)));
      el.setAttribute('expanding', 1);
      el.classList.remove('collapsed');
      discoverPositions();
      this.doRepel(el, nodes, null);
      el.removeAttribute('expanding');
    }
  }

  getPositions() {
    return this.positions;
  }

  setPositionForNode(node, position) {
    this.positions.set(node, position);
  }

}
