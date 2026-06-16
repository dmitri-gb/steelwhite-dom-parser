import { NodeList } from '../collections.js';
import { DocumentPosition, NodeType } from '../constants.js';
import type { Document } from './document.js';
import type { Element } from './element.js';

export abstract class Node {
  static readonly ELEMENT_NODE = NodeType.ELEMENT_NODE;
  static readonly ATTRIBUTE_NODE = NodeType.ATTRIBUTE_NODE;
  static readonly TEXT_NODE = NodeType.TEXT_NODE;
  static readonly CDATA_SECTION_NODE = NodeType.CDATA_SECTION_NODE;
  static readonly PROCESSING_INSTRUCTION_NODE = NodeType.PROCESSING_INSTRUCTION_NODE;
  static readonly COMMENT_NODE = NodeType.COMMENT_NODE;
  static readonly DOCUMENT_NODE = NodeType.DOCUMENT_NODE;
  static readonly DOCUMENT_TYPE_NODE = NodeType.DOCUMENT_TYPE_NODE;
  static readonly DOCUMENT_FRAGMENT_NODE = NodeType.DOCUMENT_FRAGMENT_NODE;

  static readonly DOCUMENT_POSITION_DISCONNECTED = DocumentPosition.DISCONNECTED;
  static readonly DOCUMENT_POSITION_PRECEDING = DocumentPosition.PRECEDING;
  static readonly DOCUMENT_POSITION_FOLLOWING = DocumentPosition.FOLLOWING;
  static readonly DOCUMENT_POSITION_CONTAINS = DocumentPosition.CONTAINS;
  static readonly DOCUMENT_POSITION_CONTAINED_BY = DocumentPosition.CONTAINED_BY;
  static readonly DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC = DocumentPosition.IMPLEMENTATION_SPECIFIC;

  abstract readonly nodeType: number;
  abstract readonly nodeName: string;

  ownerDocument: Document | null = null;

  _parentNode: Node | null = null;
  _firstChild: Node | null = null;
  _lastChild: Node | null = null;
  _nextSibling: Node | null = null;
  _previousSibling: Node | null = null;

  /* ----- node type constants (instance) ----- */
  readonly ELEMENT_NODE = NodeType.ELEMENT_NODE;
  readonly ATTRIBUTE_NODE = NodeType.ATTRIBUTE_NODE;
  readonly TEXT_NODE = NodeType.TEXT_NODE;
  readonly CDATA_SECTION_NODE = NodeType.CDATA_SECTION_NODE;
  readonly PROCESSING_INSTRUCTION_NODE = NodeType.PROCESSING_INSTRUCTION_NODE;
  readonly COMMENT_NODE = NodeType.COMMENT_NODE;
  readonly DOCUMENT_NODE = NodeType.DOCUMENT_NODE;
  readonly DOCUMENT_TYPE_NODE = NodeType.DOCUMENT_TYPE_NODE;
  readonly DOCUMENT_FRAGMENT_NODE = NodeType.DOCUMENT_FRAGMENT_NODE;

  readonly DOCUMENT_POSITION_DISCONNECTED = DocumentPosition.DISCONNECTED;
  readonly DOCUMENT_POSITION_PRECEDING = DocumentPosition.PRECEDING;
  readonly DOCUMENT_POSITION_FOLLOWING = DocumentPosition.FOLLOWING;
  readonly DOCUMENT_POSITION_CONTAINS = DocumentPosition.CONTAINS;
  readonly DOCUMENT_POSITION_CONTAINED_BY = DocumentPosition.CONTAINED_BY;
  readonly DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC = DocumentPosition.IMPLEMENTATION_SPECIFIC;

  /* ----- tree accessors ----- */
  get parentNode(): Node | null {
    return this._parentNode;
  }

  get parentElement(): Element | null {
    const p = this._parentNode;
    return p && p.nodeType === NodeType.ELEMENT_NODE ? (p as Element) : null;
  }

  get childNodes(): NodeList {
    const list = new NodeList<Node>();
    for (let n = this._firstChild; n; n = n._nextSibling) list.push(n);
    return list;
  }

  get firstChild(): Node | null {
    return this._firstChild;
  }

  get lastChild(): Node | null {
    return this._lastChild;
  }

  get nextSibling(): Node | null {
    return this._nextSibling;
  }

  get previousSibling(): Node | null {
    return this._previousSibling;
  }

  hasChildNodes(): boolean {
    return this._firstChild !== null;
  }

  get nodeValue(): string | null {
    return null;
  }

  set nodeValue(_value: string | null) {
    /* no-op for nodes without character data */
  }

  get textContent(): string | null {
    return null;
  }

  set textContent(_value: string | null) {
    /* overridden by subclasses */
  }

  get isConnected(): boolean {
    return this.getRootNode().nodeType === NodeType.DOCUMENT_NODE;
  }

  get baseURI(): string {
    return this.ownerDocument?.URL ?? 'about:blank';
  }

  getRootNode(_options?: { composed?: boolean }): Node {
    let node: Node = this;
    while (node._parentNode) node = node._parentNode;
    return node;
  }

  /* ----- mutation primitives ----- */

  private _isInclusiveAncestorOf(node: Node | null): boolean {
    for (let n = node; n; n = n._parentNode) {
      if (n === this) return true;
    }
    return false;
  }

  private _ensurePreInsertionValidity(node: Node, child: Node | null): void {
    const t = this.nodeType;
    if (t !== NodeType.DOCUMENT_NODE && t !== NodeType.DOCUMENT_FRAGMENT_NODE && t !== NodeType.ELEMENT_NODE) {
      throw new DOMException('This node type does not support children.', 'HierarchyRequestError');
    }
    if (node._isInclusiveAncestorOf(this)) {
      throw new DOMException('The new child is an ancestor of the parent.', 'HierarchyRequestError');
    }
    if (child && child._parentNode !== this) {
      throw new DOMException('The reference child is not a child of this node.', 'NotFoundError');
    }
    const nt = node.nodeType;
    if (
      nt !== NodeType.ELEMENT_NODE &&
      nt !== NodeType.TEXT_NODE &&
      nt !== NodeType.COMMENT_NODE &&
      nt !== NodeType.DOCUMENT_FRAGMENT_NODE &&
      nt !== NodeType.DOCUMENT_TYPE_NODE &&
      nt !== NodeType.PROCESSING_INSTRUCTION_NODE &&
      nt !== NodeType.CDATA_SECTION_NODE
    ) {
      throw new DOMException('The node to insert is not a valid child.', 'HierarchyRequestError');
    }
  }

  private _linkInsert(node: Node, child: Node | null): void {
    node._parentNode = this;
    if (child) {
      const prev = child._previousSibling;
      node._previousSibling = prev;
      node._nextSibling = child;
      child._previousSibling = node;
      if (prev) prev._nextSibling = node;
      else this._firstChild = node;
    } else {
      const last = this._lastChild;
      node._previousSibling = last;
      node._nextSibling = null;
      if (last) last._nextSibling = node;
      else this._firstChild = node;
      this._lastChild = node;
    }
    node.ownerDocument = this.nodeType === NodeType.DOCUMENT_NODE ? (this as unknown as Document) : this.ownerDocument;
    propagateOwnerDocument(node, node.ownerDocument);
  }

  private _unlink(node: Node): void {
    const prev = node._previousSibling;
    const next = node._nextSibling;
    if (prev) prev._nextSibling = next;
    else this._firstChild = next;
    if (next) next._previousSibling = prev;
    else this._lastChild = prev;
    node._parentNode = null;
    node._previousSibling = null;
    node._nextSibling = null;
  }

  insertBefore<T extends Node>(node: T, child: Node | null): T {
    this._ensurePreInsertionValidity(node, child);
    if (node === child) return node;

    if (node.nodeType === NodeType.DOCUMENT_FRAGMENT_NODE) {
      const moved: Node[] = [];
      for (let n = node._firstChild; n; n = n._nextSibling) moved.push(n);
      for (const m of moved) {
        node._unlink(m);
        this._linkInsert(m, child);
      }
      return node;
    }

    if (node._parentNode) node._parentNode.removeChild(node);
    this._linkInsert(node, child);
    return node;
  }

  appendChild<T extends Node>(node: T): T {
    return this.insertBefore(node, null);
  }

  removeChild<T extends Node>(node: T): T {
    if (node._parentNode !== this) {
      throw new DOMException('The node to be removed is not a child of this node.', 'NotFoundError');
    }
    this._unlink(node);
    return node;
  }

  replaceChild<T extends Node>(node: Node, child: T): T {
    if (child._parentNode !== this) {
      throw new DOMException('The node to be replaced is not a child of this node.', 'NotFoundError');
    }
    const ref = child._nextSibling;
    this.removeChild(child);
    this.insertBefore(node, ref);
    return child;
  }

  /* ----- comparison & search ----- */
  contains(other: Node | null): boolean {
    for (let n = other; n; n = n._parentNode) {
      if (n === this) return true;
    }
    return false;
  }

  isSameNode(other: Node | null): boolean {
    return other === this;
  }

  isEqualNode(other: Node | null): boolean {
    if (!other || other.nodeType !== this.nodeType) return false;
    if (!this._equalsOwn(other)) return false;
    let a = this._firstChild;
    let b = other._firstChild;
    while (a && b) {
      if (!a.isEqualNode(b)) return false;
      a = a._nextSibling;
      b = b._nextSibling;
    }
    return a === null && b === null;
  }

  /** Subclasses compare their own type-specific fields. */
  protected _equalsOwn(_other: Node): boolean {
    return true;
  }

  compareDocumentPosition(other: Node): number {
    if (other === this) return 0;
    const ancestorsA: Node[] = [];
    for (let n: Node | null = this; n; n = n._parentNode) ancestorsA.push(n);
    const ancestorsB: Node[] = [];
    for (let n: Node | null = other; n; n = n._parentNode) ancestorsB.push(n);

    if (ancestorsA[ancestorsA.length - 1] !== ancestorsB[ancestorsB.length - 1]) {
      return DocumentPosition.DISCONNECTED | DocumentPosition.IMPLEMENTATION_SPECIFIC | DocumentPosition.PRECEDING;
    }
    if (ancestorsA.includes(other)) {
      return DocumentPosition.CONTAINS | DocumentPosition.PRECEDING;
    }
    if (ancestorsB.includes(this)) {
      return DocumentPosition.CONTAINED_BY | DocumentPosition.FOLLOWING;
    }
    // Find the closest common ancestor and compare branch order.
    const setA = new Set(ancestorsA);
    let childB: Node = other;
    let common: Node | null = null;
    for (let n: Node | null = other; n; n = n._parentNode) {
      if (setA.has(n)) {
        common = n;
        break;
      }
      childB = n;
    }
    let childA: Node = this;
    for (let n: Node | null = this; n; n = n._parentNode) {
      if (n._parentNode === common) {
        childA = n;
        break;
      }
    }
    if (!common) {
      return DocumentPosition.DISCONNECTED | DocumentPosition.PRECEDING;
    }
    for (let n = common._firstChild; n; n = n._nextSibling) {
      if (n === childA) return DocumentPosition.FOLLOWING;
      if (n === childB) return DocumentPosition.PRECEDING;
    }
    return DocumentPosition.DISCONNECTED;
  }

  /* ----- misc ----- */
  normalize(): void {
    let n = this._firstChild;
    while (n) {
      const next = n._nextSibling;
      if (n.nodeType === NodeType.TEXT_NODE) {
        const text = n as unknown as { data: string };
        if (text.data === '') {
          this.removeChild(n);
        } else {
          let sib = next;
          while (sib && sib.nodeType === NodeType.TEXT_NODE) {
            text.data += (sib as unknown as { data: string }).data;
            const after = sib._nextSibling;
            this.removeChild(sib);
            sib = after;
          }
          n = sib;
          continue;
        }
      } else {
        n.normalize();
      }
      n = next;
    }
  }

  lookupNamespaceURI(prefix: string | null): string | null {
    void prefix;
    return null;
  }

  lookupPrefix(namespace: string | null): string | null {
    void namespace;
    return null;
  }

  isDefaultNamespace(namespace: string | null): boolean {
    return this.lookupNamespaceURI(null) === (namespace || null);
  }

  abstract cloneNode(deep?: boolean): Node;

  protected _cloneChildrenInto(target: Node, deep: boolean): void {
    if (!deep) return;
    for (let n = this._firstChild; n; n = n._nextSibling) {
      target.appendChild(n.cloneNode(true));
    }
  }
}

function propagateOwnerDocument(node: Node, doc: Document | null): void {
  if (!doc) return;
  for (let n = node._firstChild; n; n = n._nextSibling) {
    n.ownerDocument = doc;
    propagateOwnerDocument(n, doc);
  }
}
