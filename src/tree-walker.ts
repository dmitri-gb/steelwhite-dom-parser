import { FILTER_ACCEPT, FILTER_REJECT, FILTER_SKIP, NodeFilter } from './constants.js';
import type { Node } from './nodes/node.js';

export type TreeWalkerFilter = ((node: Node) => number) | { acceptNode(node: Node): number } | null;

function maskFor(node: Node): number {
  return 1 << (node.nodeType - 1);
}

export class TreeWalker {
  currentNode: Node;

  constructor(
    readonly root: Node,
    readonly whatToShow: number = NodeFilter.SHOW_ALL,
    readonly filter: TreeWalkerFilter = null,
  ) {
    this.currentNode = root;
  }

  private accept(node: Node): number {
    if ((this.whatToShow & maskFor(node)) === 0) return FILTER_SKIP;
    if (!this.filter) return FILTER_ACCEPT;
    const result = typeof this.filter === 'function' ? this.filter(node) : this.filter.acceptNode(node);
    return result;
  }

  parentNode(): Node | null {
    let node: Node | null = this.currentNode;
    while (node && node !== this.root) {
      node = node.parentNode;
      if (node && this.accept(node) === FILTER_ACCEPT) {
        this.currentNode = node;
        return node;
      }
    }
    return null;
  }

  firstChild(): Node | null {
    return this.traverseChildren('first');
  }

  lastChild(): Node | null {
    return this.traverseChildren('last');
  }

  private traverseChildren(type: 'first' | 'last'): Node | null {
    let node: Node | null = type === 'first' ? this.currentNode.firstChild : this.currentNode.lastChild;
    while (node) {
      const result = this.accept(node);
      if (result === FILTER_ACCEPT) {
        this.currentNode = node;
        return node;
      }
      if (result === FILTER_SKIP) {
        const child = type === 'first' ? node.firstChild : node.lastChild;
        if (child) {
          node = child;
          continue;
        }
      }
      // FILTER_REJECT or no children: move to next sibling, walking up.
      while (node) {
        const sibling = type === 'first' ? node.nextSibling : node.previousSibling;
        if (sibling) {
          node = sibling;
          break;
        }
        const parent: Node | null = node.parentNode;
        if (!parent || parent === this.root || parent === this.currentNode) {
          return null;
        }
        node = parent;
      }
    }
    return null;
  }

  previousSibling(): Node | null {
    return this.traverseSiblings('previous');
  }

  nextSibling(): Node | null {
    return this.traverseSiblings('next');
  }

  private traverseSiblings(type: 'next' | 'previous'): Node | null {
    let node: Node | null = this.currentNode;
    if (node === this.root) return null;
    while (true) {
      let sibling: Node | null = type === 'next' ? node!.nextSibling : node!.previousSibling;
      while (sibling) {
        node = sibling;
        const result = this.accept(node);
        if (result === FILTER_ACCEPT) {
          this.currentNode = node;
          return node;
        }
        sibling = type === 'next' ? node.firstChild : node.lastChild;
        if (result === FILTER_REJECT || !sibling) {
          sibling = type === 'next' ? node.nextSibling : node.previousSibling;
        }
      }
      node = node!.parentNode;
      if (!node || node === this.root) return null;
      if (this.accept(node) === FILTER_ACCEPT) return null;
    }
  }

  previousNode(): Node | null {
    let node: Node = this.currentNode;
    while (node !== this.root) {
      let sibling: Node | null = node.previousSibling;
      while (sibling) {
        node = sibling;
        let result = this.accept(node);
        while (result !== FILTER_REJECT && node.lastChild) {
          node = node.lastChild;
          result = this.accept(node);
        }
        if (result === FILTER_ACCEPT) {
          this.currentNode = node;
          return node;
        }
        sibling = node.previousSibling;
      }
      if (node === this.root) return null;
      const parent: Node | null = node.parentNode;
      if (!parent) return null;
      node = parent;
      if (this.accept(node) === FILTER_ACCEPT) {
        this.currentNode = node;
        return node;
      }
    }
    return null;
  }

  nextNode(): Node | null {
    let node: Node = this.currentNode;
    let result = FILTER_ACCEPT;
    while (true) {
      while (result !== FILTER_REJECT && node.firstChild) {
        node = node.firstChild;
        result = this.accept(node);
        if (result === FILTER_ACCEPT) {
          this.currentNode = node;
          return node;
        }
      }
      let following: Node | null = nextSkippingChildren(node, this.root);
      if (!following) return null;
      node = following;
      result = this.accept(node);
      if (result === FILTER_ACCEPT) {
        this.currentNode = node;
        return node;
      }
    }
  }
}

function nextSkippingChildren(node: Node, root: Node): Node | null {
  if (node === root) return null;
  let current: Node | null = node;
  while (current) {
    if (current === root) return null;
    if (current.nextSibling) return current.nextSibling;
    current = current.parentNode;
  }
  return null;
}
