import { parseFragment } from 'parse5';

import { Attr } from '../attr.js';
import { HTMLCollection, NamedNodeMap, createNamedNodeMap } from '../collections.js';
import { Namespaces, NodeType } from '../constants.js';
import { CSSStyleDeclaration, createCSSStyleDeclaration } from '../css-style-declaration.js';
import { DOMTokenList } from '../dom-token-list.js';
import {
  after as afterMixin,
  append as appendMixin,
  before as beforeMixin,
  getChildElementCount,
  getChildren,
  getElementsByClassName,
  getElementsByTagName,
  getFirstElementChild,
  getLastElementChild,
  getNextElementSibling,
  getPreviousElementSibling,
  prepend as prependMixin,
  querySelector,
  querySelectorAll,
  remove as removeMixin,
  replaceChildren as replaceChildrenMixin,
  replaceWith as replaceWithMixin,
} from '../mixins.js';
import { createTreeAdapter } from '../parser/tree-adapter.js';
import { closestSelector, matchesSelector } from '../selector-engine.js';
import { serializeChildren, serializeNode } from '../serialize.js';
import type { DocumentFragment } from './document-fragment.js';
import { Document } from './document.js';
import { Node } from './node.js';

export class Element extends Node {
  readonly nodeType = NodeType.ELEMENT_NODE;
  readonly namespaceURI: string | null;
  readonly prefix: string | null;
  readonly localName: string;

  _attributes: Attr[] = [];
  /** Backing fragment for <template> elements (HTMLTemplateElement.content). */
  _templateContent: Node | null = null;
  private _attributesMap: NamedNodeMap | null = null;
  private _classList: DOMTokenList | null = null;
  private _style: CSSStyleDeclaration | null = null;

  constructor(localName: string, namespaceURI: string | null = Namespaces.HTML, prefix: string | null = null) {
    super();
    this.localName = localName;
    this.namespaceURI = namespaceURI;
    this.prefix = prefix;
  }

  get tagName(): string {
    const qualified = this.prefix ? `${this.prefix}:${this.localName}` : this.localName;
    return this.namespaceURI === Namespaces.HTML && this._isHtmlDoc ? qualified.toUpperCase() : qualified;
  }

  get nodeName(): string {
    return this.tagName;
  }

  /**
   * `content` is overloaded in HTML: on `<template>` it is the inert content
   * fragment, while on `<meta>` (and other elements) it reflects the `content`
   * content attribute.
   */
  get content(): Node | string | null {
    if (this.localName === 'template') return this._templateContent;
    return this.getAttribute('content') ?? '';
  }

  set content(value: string) {
    if (this.localName === 'template') return;
    this.setAttribute('content', value);
  }

  /* ---------- attributes ---------- */
  get attributes(): NamedNodeMap {
    this._attributesMap ??= createNamedNodeMap(this);
    return this._attributesMap;
  }

  private get _isHtmlDoc(): boolean {
    return this.ownerDocument?._isHTMLDocument ?? true;
  }

  private _normalizeName(name: string): string {
    return this.namespaceURI === Namespaces.HTML && this._isHtmlDoc ? name.toLowerCase() : name;
  }

  private _findAttr(qualifiedName: string): Attr | null {
    const name = this._normalizeName(qualifiedName);
    return this._attributes.find(a => a.name === name) ?? null;
  }

  hasAttribute(qualifiedName: string): boolean {
    return this._findAttr(qualifiedName) !== null;
  }

  hasAttributes(): boolean {
    return this._attributes.length > 0;
  }

  getAttribute(qualifiedName: string): string | null {
    const attr = this._findAttr(qualifiedName);
    return attr ? attr.value : null;
  }

  getAttributeNames(): string[] {
    return this._attributes.map(a => a.name);
  }

  setAttribute(qualifiedName: string, value: string): void {
    const name = this._normalizeName(qualifiedName);
    const v = String(value);
    const existing = this._attributes.find(a => a.name === name);
    if (existing) {
      existing.value = v;
      return;
    }
    const attr = new Attr(name, v, null, null);
    attr.ownerElement = this;
    attr.ownerDocument = this.ownerDocument;
    this._attributes.push(attr);
  }

  removeAttribute(qualifiedName: string): void {
    const name = this._normalizeName(qualifiedName);
    const idx = this._attributes.findIndex(a => a.name === name);
    if (idx !== -1) {
      const [attr] = this._attributes.splice(idx, 1);
      if (attr) attr.ownerElement = null;
    }
  }

  toggleAttribute(qualifiedName: string, force?: boolean): boolean {
    const has = this.hasAttribute(qualifiedName);
    if (has) {
      if (force === undefined || force === false) {
        this.removeAttribute(qualifiedName);
        return false;
      }
      return true;
    }
    if (force === undefined || force === true) {
      this.setAttribute(qualifiedName, '');
      return true;
    }
    return false;
  }

  getAttributeNS(namespace: string | null, localName: string): string | null {
    const attr = this.getAttributeNodeNS(namespace, localName);
    return attr ? attr.value : null;
  }

  hasAttributeNS(namespace: string | null, localName: string): boolean {
    return this.getAttributeNodeNS(namespace, localName) !== null;
  }

  setAttributeNS(namespace: string | null, qualifiedName: string, value: string): void {
    const ns = namespace || null;
    let prefix: string | null = null;
    let localName = qualifiedName;
    const colon = qualifiedName.indexOf(':');
    if (colon !== -1) {
      prefix = qualifiedName.slice(0, colon);
      localName = qualifiedName.slice(colon + 1);
    }
    const existing = this._attributes.find(a => a.namespaceURI === ns && a.localName === localName);
    if (existing) {
      existing.value = String(value);
      existing.prefix = prefix;
      return;
    }
    const attr = new Attr(localName, String(value), ns, prefix);
    attr.ownerElement = this;
    attr.ownerDocument = this.ownerDocument;
    this._attributes.push(attr);
  }

  removeAttributeNS(namespace: string | null, localName: string): void {
    const ns = namespace || null;
    const idx = this._attributes.findIndex(a => a.namespaceURI === ns && a.localName === localName);
    if (idx !== -1) {
      const [attr] = this._attributes.splice(idx, 1);
      if (attr) attr.ownerElement = null;
    }
  }

  getAttributeNode(qualifiedName: string): Attr | null {
    return this._findAttr(qualifiedName);
  }

  getAttributeNodeNS(namespace: string | null, localName: string): Attr | null {
    const ns = namespace || null;
    return this._attributes.find(a => a.namespaceURI === ns && a.localName === localName) ?? null;
  }

  setAttributeNode(attr: Attr): Attr | null {
    const existingIdx = this._attributes.findIndex(
      a => a.namespaceURI === attr.namespaceURI && a.localName === attr.localName,
    );
    attr.ownerElement = this;
    attr.ownerDocument = this.ownerDocument;
    if (existingIdx !== -1) {
      const [old] = this._attributes.splice(existingIdx, 1, attr);
      if (old) old.ownerElement = null;
      return old ?? null;
    }
    this._attributes.push(attr);
    return null;
  }

  setAttributeNodeNS(attr: Attr): Attr | null {
    return this.setAttributeNode(attr);
  }

  removeAttributeNode(attr: Attr): Attr {
    const idx = this._attributes.indexOf(attr);
    if (idx === -1) {
      throw new DOMException('The attribute is not owned by this element.', 'NotFoundError');
    }
    this._attributes.splice(idx, 1);
    attr.ownerElement = null;
    return attr;
  }

  /* ---------- reflected attributes ---------- */
  get id(): string {
    return this.getAttribute('id') ?? '';
  }

  set id(value: string) {
    this.setAttribute('id', value);
  }

  get className(): string {
    return this.getAttribute('class') ?? '';
  }

  set className(value: string) {
    this.setAttribute('class', value);
  }

  get classList(): DOMTokenList {
    this._classList ??= new DOMTokenList(this, 'class');
    return this._classList;
  }

  /** Live CSSStyleDeclaration backed by the `style` content attribute. */
  get style(): CSSStyleDeclaration {
    this._style ??= createCSSStyleDeclaration(this);
    return this._style;
  }

  set style(value: string | CSSStyleDeclaration) {
    if (typeof value === 'string') this.style.cssText = value;
  }

  get slot(): string {
    return this.getAttribute('slot') ?? '';
  }

  set slot(value: string) {
    this.setAttribute('slot', value);
  }

  /* ---------- reflected form/IDL state ----------
   * This DOM does not run scripts, so IDL state mirrors the content
   * attributes. These are needed by CSS selectors such as :checked,
   * :disabled, :required and :read-only.
   */
  indeterminate = false;

  private _reflectBool(name: string): boolean {
    return this.hasAttribute(name);
  }

  private _setBool(name: string, value: boolean): void {
    if (value) this.setAttribute(name, '');
    else this.removeAttribute(name);
  }

  get checked(): boolean {
    return this._reflectBool('checked');
  }
  set checked(v: boolean) {
    this._setBool('checked', v);
  }

  get disabled(): boolean {
    return this._reflectBool('disabled');
  }
  set disabled(v: boolean) {
    this._setBool('disabled', v);
  }

  get required(): boolean {
    return this._reflectBool('required');
  }
  set required(v: boolean) {
    this._setBool('required', v);
  }

  get multiple(): boolean {
    return this._reflectBool('multiple');
  }
  set multiple(v: boolean) {
    this._setBool('multiple', v);
  }

  get selected(): boolean {
    return this._reflectBool('selected');
  }
  set selected(v: boolean) {
    this._setBool('selected', v);
  }

  get readOnly(): boolean {
    return this.hasAttribute('readonly');
  }
  set readOnly(v: boolean) {
    this._setBool('readonly', v);
  }

  get type(): string {
    const t = this.getAttribute('type');
    if (this.localName === 'input') return (t ?? 'text').toLowerCase();
    return t ?? '';
  }
  set type(v: string) {
    this.setAttribute('type', v);
  }

  get value(): string {
    return this.getAttribute('value') ?? '';
  }
  set value(v: string) {
    this.setAttribute('value', v);
  }

  get name(): string {
    return this.getAttribute('name') ?? '';
  }
  set name(v: string) {
    this.setAttribute('name', v);
  }

  get isContentEditable(): boolean {
    const v = this.getAttribute('contenteditable');
    return v === '' || v === 'true';
  }

  /* ---------- text & markup ---------- */
  override get textContent(): string {
    let text = '';
    for (let n = this.firstChild; n; n = n.nextSibling) {
      if (
        n.nodeType === NodeType.TEXT_NODE ||
        n.nodeType === NodeType.CDATA_SECTION_NODE ||
        n.nodeType === NodeType.ELEMENT_NODE
      ) {
        text += n.textContent ?? '';
      }
    }
    return text;
  }

  override set textContent(value: string | null) {
    while (this.firstChild) this.removeChild(this.firstChild);
    const str = value ?? '';
    if (str !== '') {
      const doc = this.ownerDocument;
      if (doc) this.appendChild(doc.createTextNode(str));
    }
  }

  get innerHTML(): string {
    return serializeChildren(this);
  }

  set innerHTML(html: string) {
    while (this.firstChild) this.removeChild(this.firstChild);
    parseFragmentInto(this, html);
  }

  get outerHTML(): string {
    return serializeNode(this);
  }

  set outerHTML(html: string) {
    const parent = this.parentNode;
    if (!parent) {
      throw new DOMException('Cannot set outerHTML on a node without a parent.', 'NoModificationAllowedError');
    }
    if (parent.nodeType === NodeType.DOCUMENT_NODE) {
      throw new DOMException('Cannot set outerHTML on a document child.', 'NoModificationAllowedError');
    }
    const doc = this.ownerDocument!;
    const frag = doc.createDocumentFragment();
    parseFragmentInto(frag, html, parent as Element);
    parent.replaceChild(frag, this);
  }

  get innerText(): string {
    return this.textContent;
  }

  set innerText(value: string) {
    this.textContent = value;
  }

  insertAdjacentHTML(position: string, html: string): void {
    const where = position.toLowerCase();
    const doc = this.ownerDocument!;
    const frag = doc.createDocumentFragment();
    const context = where === 'beforebegin' || where === 'afterend' ? (this.parentNode as Element) : this;
    parseFragmentInto(frag, html, context);
    switch (where) {
      case 'beforebegin':
        this.parentNode?.insertBefore(frag, this);
        break;
      case 'afterbegin':
        this.insertBefore(frag, this.firstChild);
        break;
      case 'beforeend':
        this.appendChild(frag);
        break;
      case 'afterend':
        this.parentNode?.insertBefore(frag, this.nextSibling);
        break;
      default:
        throw new DOMException(
          `The value provided ('${position}') is not one of 'beforeBegin', 'afterBegin', 'beforeEnd', or 'afterEnd'.`,
          'SyntaxError',
        );
    }
  }

  insertAdjacentElement(position: string, element: Element): Element | null {
    const where = position.toLowerCase();
    switch (where) {
      case 'beforebegin':
        this.parentNode?.insertBefore(element, this);
        return element;
      case 'afterbegin':
        this.insertBefore(element, this.firstChild);
        return element;
      case 'beforeend':
        this.appendChild(element);
        return element;
      case 'afterend':
        this.parentNode?.insertBefore(element, this.nextSibling);
        return element;
      default:
        throw new DOMException(`The value provided ('${position}') is not a valid position.`, 'SyntaxError');
    }
  }

  insertAdjacentText(position: string, data: string): void {
    const text = this.ownerDocument!.createTextNode(data);
    this.insertAdjacentElement(position, text as unknown as Element);
  }

  /* ---------- selectors ---------- */
  matches(selector: string): boolean {
    return matchesSelector(selector, this);
  }

  closest(selector: string): Element | null {
    return closestSelector(selector, this);
  }

  querySelector(selector: string): Element | null {
    return querySelector(this, selector);
  }

  querySelectorAll(selector: string): Element[] {
    return querySelectorAll(this, selector);
  }

  getElementsByTagName(qualifiedName: string): HTMLCollection {
    return getElementsByTagName(this, qualifiedName);
  }

  getElementsByClassName(classNames: string): HTMLCollection {
    return getElementsByClassName(this, classNames);
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
    appendMixin(this, nodes);
  }

  prepend(...nodes: (Node | string)[]): void {
    prependMixin(this, nodes);
  }

  replaceChildren(...nodes: (Node | string)[]): void {
    replaceChildrenMixin(this, nodes);
  }

  /* ---------- ChildNode / NonDocumentTypeChildNode ---------- */
  get nextElementSibling(): Element | null {
    return getNextElementSibling(this);
  }

  get previousElementSibling(): Element | null {
    return getPreviousElementSibling(this);
  }

  before(...nodes: (Node | string)[]): void {
    beforeMixin(this, nodes);
  }

  after(...nodes: (Node | string)[]): void {
    afterMixin(this, nodes);
  }

  replaceWith(...nodes: (Node | string)[]): void {
    replaceWithMixin(this, nodes);
  }

  remove(): void {
    removeMixin(this);
  }

  /* ---------- namespace lookup ---------- */
  override lookupNamespaceURI(prefix: string | null): string | null {
    const p = prefix || null;
    for (const attr of this._attributes) {
      if (p === null && attr.name === 'xmlns') return attr.value || null;
      if (p !== null && attr.prefix === 'xmlns' && attr.localName === p) {
        return attr.value || null;
      }
    }
    if (this.namespaceURI && this.prefix === p) return this.namespaceURI;
    return this.parentElement?.lookupNamespaceURI(p) ?? null;
  }

  /* ---------- clone & equality ---------- */
  cloneNode(deep = false): Element {
    const clone = new Element(this.localName, this.namespaceURI, this.prefix);
    clone.ownerDocument = this.ownerDocument;
    for (const attr of this._attributes) {
      const copy = new Attr(attr.localName, attr.value, attr.namespaceURI, attr.prefix);
      copy.ownerElement = clone;
      copy.ownerDocument = clone.ownerDocument;
      clone._attributes.push(copy);
    }
    this._cloneChildrenInto(clone, deep);
    return clone;
  }

  protected override _equalsOwn(other: Node): boolean {
    const o = other as Element;
    if (
      o.localName !== this.localName ||
      o.namespaceURI !== this.namespaceURI ||
      o.prefix !== this.prefix ||
      o._attributes.length !== this._attributes.length
    ) {
      return false;
    }
    for (const attr of this._attributes) {
      const match = o._attributes.find(a => a.namespaceURI === attr.namespaceURI && a.localName === attr.localName);
      if (!match || match.value !== attr.value) return false;
    }
    return true;
  }

  /* ---------- dataset ---------- */
  private _dataset: Record<string, string> | null = null;
  get dataset(): Record<string, string> {
    this._dataset ??= createDataset(this);
    return this._dataset;
  }
}

function toDataAttr(prop: string): string {
  return 'data-' + prop.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
}

function toDatasetKey(attr: string): string | null {
  if (!attr.startsWith('data-')) return null;
  return attr.slice(5).replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

function createDataset(el: Element): Record<string, string> {
  return new Proxy(Object.create(null), {
    get(_t, prop: string) {
      if (typeof prop !== 'string') return undefined;
      return el.getAttribute(toDataAttr(prop)) ?? undefined;
    },
    set(_t, prop: string, value) {
      el.setAttribute(toDataAttr(prop), String(value));
      return true;
    },
    deleteProperty(_t, prop: string) {
      el.removeAttribute(toDataAttr(prop));
      return true;
    },
    has(_t, prop: string) {
      return el.hasAttribute(toDataAttr(prop));
    },
    ownKeys() {
      const keys: string[] = [];
      for (const name of el.getAttributeNames()) {
        const key = toDatasetKey(name);
        if (key !== null) keys.push(key);
      }
      return keys;
    },
    getOwnPropertyDescriptor(_t, prop: string) {
      if (el.hasAttribute(toDataAttr(prop))) {
        return {
          enumerable: true,
          configurable: true,
          value: el.getAttribute(toDataAttr(prop)) ?? undefined,
        };
      }
      return undefined;
    },
  });
}

/**
 * Parse an HTML fragment and append the resulting nodes into `target`.
 * `context` provides the parsing context element (defaults to `target`),
 * which influences tokenization for elements like `<table>` or `<select>`.
 */
function parseFragmentInto(target: Element | DocumentFragment, html: string, context?: Element): void {
  const doc = target.ownerDocument ?? new Document();
  const adapter = createTreeAdapter(doc);
  const frag = parseFragment(context ?? target, html, { treeAdapter: adapter });
  while (frag.firstChild) {
    target.appendChild(frag.firstChild);
  }
}
