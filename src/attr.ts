import { NodeType } from './constants.js';
import type { Element } from './nodes/element.js';
import type { Document } from './nodes/document.js';

/**
 * Attr node. Implemented as a lightweight standalone object (not part of the
 * Node tree traversal) since attributes are accessed through their owner
 * element in this library.
 */
export class Attr {
  readonly nodeType = NodeType.ATTRIBUTE_NODE;
  namespaceURI: string | null;
  prefix: string | null;
  localName: string;
  value: string;
  ownerElement: Element | null = null;
  ownerDocument: Document | null = null;
  readonly specified = true;

  constructor(localName: string, value: string, namespaceURI: string | null = null, prefix: string | null = null) {
    this.localName = localName;
    this.value = value;
    this.namespaceURI = namespaceURI;
    this.prefix = prefix;
  }

  get name(): string {
    return this.prefix ? `${this.prefix}:${this.localName}` : this.localName;
  }

  get nodeName(): string {
    return this.name;
  }

  get nodeValue(): string {
    return this.value;
  }

  set nodeValue(v: string) {
    this.value = v;
  }

  get textContent(): string {
    return this.value;
  }
}
