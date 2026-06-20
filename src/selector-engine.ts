import { DOMSelector } from '@asamuzakjp/dom-selector';

import { NodeType } from './constants.js';
import { Element } from './nodes/element.js';
import { Node } from './nodes/node.js';

/**
 * A minimal `window`-like object exposing exactly the globals that
 * @asamuzakjp/dom-selector's Finder engine touches.
 *
 * The Finder resolves the relevant document from the queried node itself
 * (not from `window.document`), so a single shared engine serves every
 * document. We also hand the engine a sentinel "document" that never
 * strict-equals a real document, which keeps the embedded nwsapi fast path
 * (`#canUseNwsapi`) disabled and routes all queries through Finder.
 */

const SENTINEL_DOCUMENT = { nodeType: NodeType.DOCUMENT_NODE, contentType: 'text/html', compatMode: 'CSS1Compat' };

function buildWindow() {
  return {
    Node,
    Element,
    HTMLElement: Element,
    SVGElement: class {},
    ElementInternals: class {},
    DOMException,
    TypeError,
    addEventListener: () => {},
  };
}

let engine: DOMSelector | undefined;

function getEngine() {
  engine ??= new DOMSelector(buildWindow() as any, SENTINEL_DOCUMENT as any);
  return engine;
}

export function matchesSelector(selector: string, node: Element) {
  return getEngine().matches(selector, node as any);
}

export function closestSelector(selector: string, node: Element) {
  return getEngine().closest(selector, node as any) as Element | null;
}

export function querySelectorOne(selector: string, node: Node) {
  return getEngine().querySelector(selector, node as any) as Element | null;
}

export function querySelectorMany(selector: string, node: Node) {
  return getEngine().querySelectorAll(selector, node as any) as unknown[] as Element[];
}
