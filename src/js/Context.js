import {
  clone,
} from './utils';

import {
  repel,
  revert,
  toggleSize,
} from './methods';

export default class Context {
  constructor(getNodes) {
    if (typeof getNodes !== 'function') {
      throw new Error('getNodes function is required');
    }
    this.pos = new Map(); // current positions
    this.init = new Map(); // initial positions at drag start
    this.moved = new Map(); // have we moved this node within this mousemove?
    this.cause = new Map(); // what nodes have caused this one to move?

    this.getNodes = getNodes;

    this.discoverPositions();

    console.log('CONTEXT CONSTRUCTED');
  }

  captureInitialPositions() {
    this.pos.forEach((v, k) => this.init.set(k, clone(v)));
  }

  discoverPositions() {
    this.getNodes()
      .forEach((node) => {
        this.pos.set(node, {
          id: node.id,
          rect: clone(node.getBoundingClientRect()),
        });
      });
  }

  doRevert(target) {
    revert(target, this.pos, this.init, this.moved, this.getNodes);
  }

  doRepel(target, ignore) {
    repel(target, ignore, this.pos, this.cause, this.moved, this.getNodes);
  }

  doToggleSize(target) {
    toggleSize(target, this.pos, this.init, this.cause, this.moved, this.getNodes);
  }

  getPositionForNode(node) {
    return this.pos.get(node);
  }

  setPositionForNode(node, position) {
    this.pos.set(node, position);
  }

  clearMoved() {
    this.moved.clear();
  }

  clearInit() {
    this.init.clear();
  }

  clearCause() {
    this.cause.clear();
  }

}