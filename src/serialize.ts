import { serialize, serializeOuter } from 'parse5';
import { createTreeAdapter } from './parser/tree-adapter.js';
import { serializeXmlChildren, serializeXmlNode } from './serialize-xml.js';
import type { Node } from './nodes/node.js';

// The serializer only calls the adapter's read methods, so the adapter needs no
// backing document and a single shared instance suffices.
const htmlAdapter = createTreeAdapter();

function isXml(node: Node): boolean {
  return node.ownerDocument?._isHTMLDocument === false;
}

/** Serialize the children (inner markup) of a node. */
export function serializeChildren(node: Node): string {
  if (isXml(node)) return serializeXmlChildren(node);
  return serialize(node as never, { treeAdapter: htmlAdapter });
}

/** Serialize a node and its descendants (outer markup). */
export function serializeNode(node: Node): string {
  if (isXml(node)) return serializeXmlNode(node);
  return serializeOuter(node as never, { treeAdapter: htmlAdapter });
}
