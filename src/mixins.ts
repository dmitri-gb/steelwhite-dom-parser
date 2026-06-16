import { HTMLCollection } from './collections.js';
import { NodeType } from './constants.js';
import type { Document } from './nodes/document.js';
import type { Element } from './nodes/element.js';
import type { Node } from './nodes/node.js';
import { querySelectorMany, querySelectorOne } from './selector-engine.js';

const isElement = (n: Node): n is Element => n.nodeType === NodeType.ELEMENT_NODE;

/**
 * Implements the WHATWG "convert nodes into a node" step shared by append,
 * prepend, before, after, replaceWith and replaceChildren: a lone node is
 * returned as-is, otherwise the nodes (with strings coerced to Text) are
 * wrapped in a DocumentFragment.
 */
function nodesFrom(node: Node, nodes: (Node | string)[]): Node {
  const first = nodes[0];
  if (nodes.length === 1 && first !== undefined && typeof first !== 'string') {
    return first;
  }
  const doc = node.ownerDocument ?? (node as unknown as Document);
  const frag = doc.createDocumentFragment();
  for (const item of nodes) {
    frag.appendChild(typeof item === 'string' ? doc.createTextNode(item) : item);
  }
  return frag;
}

/* ---------- ParentNode ---------- */

export function getChildren(node: Node): HTMLCollection {
  const els = new HTMLCollection();
  for (let n = node.firstChild; n; n = n.nextSibling) {
    if (isElement(n)) els.push(n);
  }
  return els;
}

export function getFirstElementChild(node: Node): Element | null {
  for (let n = node.firstChild; n; n = n.nextSibling) {
    if (isElement(n)) return n;
  }
  return null;
}

export function getLastElementChild(node: Node): Element | null {
  for (let n = node.lastChild; n; n = n.previousSibling) {
    if (isElement(n)) return n;
  }
  return null;
}

export function getChildElementCount(node: Node): number {
  let count = 0;
  for (let n = node.firstChild; n; n = n.nextSibling) {
    if (isElement(n)) count++;
  }
  return count;
}

export function append(node: Node, nodes: (Node | string)[]): void {
  if (nodes.length === 0) return;
  node.appendChild(nodesFrom(node, nodes));
}

export function prepend(node: Node, nodes: (Node | string)[]): void {
  if (nodes.length === 0) return;
  node.insertBefore(nodesFrom(node, nodes), node.firstChild);
}

export function replaceChildren(node: Node, nodes: (Node | string)[]): void {
  while (node.firstChild) node.removeChild(node.firstChild);
  if (nodes.length > 0) node.appendChild(nodesFrom(node, nodes));
}

export function querySelector(node: Node, selector: string): Element | null {
  return querySelectorOne(selector, node);
}

export function querySelectorAll(node: Node, selector: string): Element[] {
  return querySelectorMany(selector, node);
}

export function getElementsByTagName(node: Node, qualifiedName: string): HTMLCollection {
  const all = qualifiedName === '*';
  const lower = qualifiedName.toLowerCase();
  const result = new HTMLCollection();
  walkDescendantElements(node, el => {
    if (all || el.localName === lower || el.tagName.toLowerCase() === lower) {
      result.push(el);
    }
  });
  return result;
}

export function getElementsByClassName(node: Node, classNames: string): HTMLCollection {
  const names = classNames
    .trim()
    .split(/[\t\n\f\r ]+/)
    .filter(Boolean);
  const result = new HTMLCollection();
  if (names.length === 0) return result;
  walkDescendantElements(node, el => {
    if (names.every(c => el.classList.contains(c))) result.push(el);
  });
  return result;
}

export function walkDescendantElements(node: Node, visit: (el: Element) => void): void {
  for (let n = node.firstChild; n; n = n.nextSibling) {
    if (isElement(n)) {
      visit(n);
      walkDescendantElements(n, visit);
    }
  }
}

/* ---------- ChildNode ---------- */

export function getNextElementSibling(node: Node): Element | null {
  for (let n = node.nextSibling; n; n = n.nextSibling) {
    if (isElement(n)) return n;
  }
  return null;
}

export function getPreviousElementSibling(node: Node): Element | null {
  for (let n = node.previousSibling; n; n = n.previousSibling) {
    if (isElement(n)) return n;
  }
  return null;
}

export function before(node: Node, nodes: (Node | string)[]): void {
  const parent = node.parentNode;
  if (!parent || nodes.length === 0) return;
  let viablePrev = node.previousSibling;
  const set = new Set(nodes.filter((n): n is Node => typeof n !== 'string'));
  while (viablePrev && set.has(viablePrev)) viablePrev = viablePrev.previousSibling;
  const frag = nodesFrom(node, nodes);
  const ref = viablePrev ? viablePrev.nextSibling : parent.firstChild;
  parent.insertBefore(frag, ref);
}

export function after(node: Node, nodes: (Node | string)[]): void {
  const parent = node.parentNode;
  if (!parent || nodes.length === 0) return;
  let viableNext = node.nextSibling;
  const set = new Set(nodes.filter((n): n is Node => typeof n !== 'string'));
  while (viableNext && set.has(viableNext)) viableNext = viableNext.nextSibling;
  parent.insertBefore(nodesFrom(node, nodes), viableNext);
}

export function replaceWith(node: Node, nodes: (Node | string)[]): void {
  const parent = node.parentNode;
  if (!parent) return;
  let viableNext = node.nextSibling;
  const set = new Set(nodes.filter((n): n is Node => typeof n !== 'string'));
  while (viableNext && set.has(viableNext)) viableNext = viableNext.nextSibling;
  const frag = nodesFrom(node, nodes);
  if (node.parentNode === parent) {
    parent.replaceChild(frag, node);
  } else {
    parent.insertBefore(frag, viableNext);
  }
}

export function remove(node: Node): void {
  if (node.parentNode) node.parentNode.removeChild(node);
}
