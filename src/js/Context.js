import { clone } from './utils';
import {
  repel,
  revert,
  toggleSize,
} from './actions';

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
    this.clearInitialPositions();
    this.clearCausalNodes();
    this.clearMovedNodes();

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

  doRevert(target) {
    revert(target, this.positions, this.initialPositions, this.movedNodes, this.getNodes);
  }

  doRepel(target, ignore) {
    repel(target, ignore, this.positions, this.causalNodes, this.movedNodes, this.getNodes);
  }

  doToggleSize(target) {
    toggleSize(
      target,
      this.positions,
      this.initialPositions,
      this.causalNodes,
      this.movedNodes,
      this.attractedNodes,
      this.getNodes.bind(this),
      this.discoverPositions.bind(this),
    );
  }

  getPositionForNode(node) {
    return this.positions.get(node);
  }

  setPositionForNode(node, position) {
    this.positions.set(node, position);
  }

  clearMovedNodes() {
    this.movedNodes.clear();
  }

  clearInitialPositions() {
    this.initialPositions.clear();
  }

  clearCausalNodes() {
    this.causalNodes.clear();
  }
}
