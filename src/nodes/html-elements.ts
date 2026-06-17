import { HTMLCollection } from '../collections.js';
import { Namespaces, NodeType } from '../constants.js';
import { DocumentFragment } from './document-fragment.js';
import { Element } from './element.js';

export class HTMLAnchorElement extends Element {
  get href(): string {
    return this.getAttribute('href') ?? '';
  }
  set href(value: string) {
    this.setAttribute('href', value);
  }

  get target(): string {
    return this.getAttribute('target') ?? '';
  }
  set target(value: string) {
    this.setAttribute('target', value);
  }
}

export class HTMLMetaElement extends Element {
  get content(): string {
    return this.getAttribute('content') ?? '';
  }
  set content(value: string) {
    this.setAttribute('content', value);
  }
}

export class HTMLTableElement extends Element {
  get rows(): HTMLCollection {
    const list = new HTMLCollection();
    for (let n = this.firstChild; n; n = n.nextSibling) {
      if (n.nodeType !== NodeType.ELEMENT_NODE) continue;
      const el = n as Element;
      if (el.localName === 'tr') {
        list.push(el);
      } else if (el.localName === 'thead' || el.localName === 'tbody' || el.localName === 'tfoot') {
        for (let m = el.firstChild; m; m = m.nextSibling) {
          if (m.nodeType === NodeType.ELEMENT_NODE && (m as Element).localName === 'tr') {
            list.push(m as Element);
          }
        }
      }
    }
    return list;
  }

  get tHead(): Element | null {
    for (let n = this.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === NodeType.ELEMENT_NODE && (n as Element).localName === 'thead') {
        return n as Element;
      }
    }
    return null;
  }

  get tFoot(): Element | null {
    for (let n = this.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === NodeType.ELEMENT_NODE && (n as Element).localName === 'tfoot') {
        return n as Element;
      }
    }
    return null;
  }

  get tBodies(): HTMLCollection {
    const list = new HTMLCollection();
    for (let n = this.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === NodeType.ELEMENT_NODE && (n as Element).localName === 'tbody') {
        list.push(n as Element);
      }
    }
    return list;
  }
}

export class HTMLTableRowElement extends Element {
  get cells(): HTMLCollection {
    const list = new HTMLCollection();
    for (let n = this.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === NodeType.ELEMENT_NODE) {
        const el = n as Element;
        if (el.localName === 'td' || el.localName === 'th') list.push(el);
      }
    }
    return list;
  }
}

export class HTMLTemplateElement extends Element {
  _templateContent: DocumentFragment | null = null;

  get content(): DocumentFragment {
    this._templateContent ??= (() => {
      const frag = new DocumentFragment();
      frag.ownerDocument = this.ownerDocument;
      return frag;
    })();
    return this._templateContent;
  }

  override cloneNode(deep = false): HTMLTemplateElement {
    const clone = super.cloneNode(false) as HTMLTemplateElement;
    if (this._templateContent) {
      clone._templateContent = this._templateContent.cloneNode(deep);
      clone._templateContent.ownerDocument = clone.ownerDocument;
    }
    return clone;
  }
}

type ElementCtor = new (localName: string, namespaceURI: string | null, prefix: string | null) => Element;
const htmlElements: Record<string, ElementCtor> = {
  a: HTMLAnchorElement,
  meta: HTMLMetaElement,
  table: HTMLTableElement,
  tr: HTMLTableRowElement,
  template: HTMLTemplateElement,
};

export function createHtmlElement(localName: string, namespaceURI: string | null, prefix: string | null): Element {
  if (namespaceURI === Namespaces.HTML) {
    const Ctor = htmlElements[localName];
    if (Ctor) return new Ctor(localName, namespaceURI, prefix);
  }
  return new Element(localName, namespaceURI, prefix);
}
