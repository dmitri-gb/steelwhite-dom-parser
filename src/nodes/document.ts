import { Attr } from '../attr.js';
import { HTMLCollection } from '../collections.js';
import { Namespaces, NodeFilter, NodeType } from '../constants.js';
import {
  append,
  getChildElementCount,
  getChildren,
  getElementsByClassName,
  getElementsByTagName,
  getFirstElementChild,
  getLastElementChild,
  prepend,
  querySelector,
  querySelectorAll,
  replaceChildren,
  walkDescendantElements,
} from '../mixins.js';
import { kParserAndSerializer } from '../symbols.js';
import { TreeWalker, type TreeWalkerFilter } from '../tree-walker.js';
import { CDATASection } from './cdata-section.js';
import { Comment } from './comment.js';
import { DocumentFragment } from './document-fragment.js';
import { DocumentType } from './document-type.js';
import { Element } from './element.js';
import { createHtmlElement } from './html-elements.js';
import { Node } from './node.js';
import { ProcessingInstruction } from './processing-instruction.js';
import { Text } from './text.js';

type ParserAndSerializer = {
  createNew(doc: Document): ParserAndSerializer;
  parseFragmentInto: (target: Element | DocumentFragment, html: string, context?: Element) => void;
  /** Serialize the children (inner markup) of a node. */
  serializeChildren: (element: Element) => string;
  /** Serialize a node and its descendants (outer markup). */
  serializeNode: (node: Node) => string;
};

export class Document extends Node {
  readonly nodeType = NodeType.DOCUMENT_NODE;
  readonly contentType: string;
  /** Whether this is an HTML document (affects tag/attribute case folding). */
  readonly _isHTMLDocument: boolean;
  _mode: 'no-quirks' | 'quirks' | 'limited-quirks' = 'no-quirks';
  URL = 'about:blank';
  readonly characterSet = 'UTF-8';
  readonly defaultView = null;

  constructor(contentType = 'text/html') {
    super();
    this.contentType = contentType;
    this._isHTMLDocument = contentType === 'text/html';
    this.ownerDocument = this;
  }

  get nodeName(): string {
    return '#document';
  }

  get compatMode(): 'CSS1Compat' | 'BackCompat' {
    return this._mode === 'quirks' ? 'BackCompat' : 'CSS1Compat';
  }

  get documentURI(): string {
    return this.URL;
  }

  override get baseURI(): string {
    return this.URL;
  }

  get charset(): string {
    return this.characterSet;
  }

  get inputEncoding(): string {
    return this.characterSet;
  }

  get doctype(): DocumentType | null {
    for (let n = this.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === NodeType.DOCUMENT_TYPE_NODE) {
        return n as DocumentType;
      }
    }
    return null;
  }

  get documentElement(): Element | null {
    return getFirstElementChild(this);
  }

  get head(): Element | null {
    const html = this.documentElement;
    if (!html) return null;
    for (let n = html.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === NodeType.ELEMENT_NODE && (n as Element).localName === 'head') {
        return n as Element;
      }
    }
    return null;
  }

  get body(): Element | null {
    const html = this.documentElement;
    if (!html) return null;
    for (let n = html.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === NodeType.ELEMENT_NODE) {
        const local = (n as Element).localName;
        if (local === 'body' || local === 'frameset') return n as Element;
      }
    }
    return null;
  }

  get title(): string {
    const titleEl = this.querySelector('title');
    return titleEl ? titleEl.textContent.replace(/[\t\n\f\r ]+/g, ' ').trim() : '';
  }

  set title(value: string) {
    let titleEl = this.querySelector('title');
    if (!titleEl) {
      const head = this.head;
      if (!head) return;
      titleEl = this.createElement('title');
      head.appendChild(titleEl);
    }
    titleEl.textContent = value;
  }

  get activeElement(): Element | null {
    return this.body ?? this.documentElement;
  }

  /* ---------- factories ---------- */
  createElement(localName: string): Element {
    const el = this._isHTMLDocument
      ? createHtmlElement(localName.toLowerCase(), Namespaces.HTML, null)
      : new Element(localName, null, null);
    el.ownerDocument = this;
    return el;
  }

  createElementNS(namespace: string | null, qualifiedName: string): Element {
    let prefix: string | null = null;
    let localName = qualifiedName;
    const colon = qualifiedName.indexOf(':');
    if (colon !== -1) {
      prefix = qualifiedName.slice(0, colon);
      localName = qualifiedName.slice(colon + 1);
    }
    const el = createHtmlElement(localName, namespace || null, prefix);
    el.ownerDocument = this;
    return el;
  }

  createTextNode(data: string): Text {
    const node = new Text(data);
    node.ownerDocument = this;
    return node;
  }

  createComment(data: string): Comment {
    const node = new Comment(data);
    node.ownerDocument = this;
    return node;
  }

  createCDATASection(data: string): CDATASection {
    if (this._isHTMLDocument) {
      throw new DOMException('This operation is not supported for HTML documents.', 'NotSupportedError');
    }
    if (data.includes(']]>')) {
      throw new DOMException("String contains an illegal character ']]>'.", 'InvalidCharacterError');
    }
    const node = new CDATASection(data);
    node.ownerDocument = this;
    return node;
  }

  createProcessingInstruction(target: string, data: string): ProcessingInstruction {
    const node = new ProcessingInstruction(target, data);
    node.ownerDocument = this;
    return node;
  }

  createDocumentFragment(): DocumentFragment {
    const frag = new DocumentFragment();
    frag.ownerDocument = this;
    return frag;
  }

  createAttribute(localName: string): Attr {
    const attr = new Attr(localName.toLowerCase(), '', null, null);
    attr.ownerDocument = this;
    return attr;
  }

  createAttributeNS(namespace: string | null, qualifiedName: string): Attr {
    let prefix: string | null = null;
    let localName = qualifiedName;
    const colon = qualifiedName.indexOf(':');
    if (colon !== -1) {
      prefix = qualifiedName.slice(0, colon);
      localName = qualifiedName.slice(colon + 1);
    }
    const attr = new Attr(localName, '', namespace || null, prefix);
    attr.ownerDocument = this;
    return attr;
  }

  createTreeWalker(root: Node, whatToShow: number = NodeFilter.SHOW_ALL, filter: TreeWalkerFilter = null): TreeWalker {
    return new TreeWalker(root, whatToShow, filter);
  }

  importNode<T extends Node>(node: T, deep = false): T {
    const clone = node.cloneNode(deep);
    setOwnerDeep(clone, this);
    return clone as T;
  }

  adoptNode<T extends Node>(node: T): T {
    if (node.parentNode) node.parentNode.removeChild(node);
    setOwnerDeep(node, this);
    return node;
  }

  /* ---------- lookups ---------- */
  getElementById(id: string): Element | null {
    let found: Element | null = null;
    walkDescendantElements(this, el => {
      if (!found && el.getAttribute('id') === id) found = el;
    });
    return found;
  }

  getElementsByName(name: string): HTMLCollection {
    const list = new HTMLCollection();
    walkDescendantElements(this, el => {
      if (el.getAttribute('name') === name) list.push(el);
    });
    return list;
  }

  getElementsByTagName(qualifiedName: string): HTMLCollection {
    return getElementsByTagName(this, qualifiedName);
  }

  getElementsByClassName(classNames: string): HTMLCollection {
    return getElementsByClassName(this, classNames);
  }

  querySelector(selector: string): Element | null {
    return querySelector(this, selector);
  }

  querySelectorAll(selector: string): Element[] {
    return querySelectorAll(this, selector);
  }

  /* ---------- ParentNode ---------- */
  get children(): HTMLCollection {
    return getChildren(this);
  }

  get firstElementChild(): Element | null {
    return getFirstElementChild(this);
  }

  get lastElementChild(): Element | null {
    return getLastElementChild(this);
  }

  get childElementCount(): number {
    return getChildElementCount(this);
  }

  append(...nodes: (Node | string)[]): void {
    append(this, nodes);
  }

  prepend(...nodes: (Node | string)[]): void {
    prepend(this, nodes);
  }

  replaceChildren(...nodes: (Node | string)[]): void {
    replaceChildren(this, nodes);
  }

  cloneNode(deep = false): Document {
    const clone = new Document(this.contentType);
    clone.URL = this.URL;
    clone._mode = this._mode;
    this._cloneChildrenInto(clone, deep);
    clone[kParserAndSerializer] = this[kParserAndSerializer].createNew(clone);
    return clone;
  }

  [kParserAndSerializer]!: ParserAndSerializer;
}

function setOwnerDeep(node: Node, doc: Document): void {
  node.ownerDocument = doc;
  if (node.nodeType === NodeType.ELEMENT_NODE) {
    for (const attr of (node as Element)._attributes) attr.ownerDocument = doc;
  }
  for (let n = node.firstChild; n; n = n.nextSibling) setOwnerDeep(n, doc);
}
