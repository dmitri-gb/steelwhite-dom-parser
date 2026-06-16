import { HTMLCollection } from '../collections.js';
import { NodeType } from '../constants.js';
import {
  append as appendMixin,
  getChildElementCount,
  getChildren,
  getElementsByClassName,
  getElementsByTagName,
  getFirstElementChild,
  getLastElementChild,
  prepend as prependMixin,
  querySelector,
  querySelectorAll,
  replaceChildren as replaceChildrenMixin,
  walkDescendantElements,
} from '../mixins.js';
import type { Element } from './element.js';
import { Node } from './node.js';

export class DocumentFragment extends Node {
  readonly nodeType = NodeType.DOCUMENT_FRAGMENT_NODE;
  /** Present for shadow roots; always null here. */
  readonly host: Element | null = null;

  get nodeName(): string {
    return '#document-fragment';
  }

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
    if (str !== '' && this.ownerDocument) {
      this.appendChild(this.ownerDocument.createTextNode(str));
    }
  }

  getElementById(id: string): Element | null {
    let found: Element | null = null;
    walkDescendantElements(this, el => {
      if (!found && el.getAttribute('id') === id) found = el;
    });
    return found;
  }

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

  cloneNode(deep = false): DocumentFragment {
    const clone = new DocumentFragment();
    clone.ownerDocument = this.ownerDocument;
    this._cloneChildrenInto(clone, deep);
    return clone;
  }
}
