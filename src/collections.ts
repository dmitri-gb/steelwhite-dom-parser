import type { Attr } from './attr.js';
import type { Element } from './nodes/element.js';
import type { Node } from './nodes/node.js';

/**
 * Unlike in browsers, NodeList is always static (not live).
 */
export class NodeList<T extends Node = Node> extends Array<T> {
  static override get [Symbol.species](): ArrayConstructor {
    return Array;
  }

  item(index: number): T | null {
    return this[index] ?? null;
  }
}

/**
 * Unlike in browsers, HTMLCollection is always static (not live).
 */
export class HTMLCollection<T extends Element = Element> extends Array<T> {
  static override get [Symbol.species](): ArrayConstructor {
    return Array;
  }

  item(index: number): T | null {
    return this[index] ?? null;
  }

  namedItem(name: string): T | null {
    if (!name) return null;
    for (const el of this) {
      if (el.getAttribute('id') === name) return el;
    }
    for (const el of this) {
      if (el.getAttribute('name') === name) return el;
    }
    return null;
  }
}

/**
 * Minimal NamedNodeMap over an element's live attribute list.
 */
export class NamedNodeMap {
  constructor(private readonly owner: Element) {}

  get length(): number {
    return this.owner._attributes.length;
  }

  item(index: number): Attr | null {
    return this.owner._attributes[index] ?? null;
  }

  getNamedItem(qualifiedName: string): Attr | null {
    return this.owner.getAttributeNode(qualifiedName);
  }

  getNamedItemNS(namespace: string | null, localName: string): Attr | null {
    return this.owner.getAttributeNodeNS(namespace, localName);
  }

  setNamedItem(attr: Attr): Attr | null {
    return this.owner.setAttributeNode(attr);
  }

  setNamedItemNS(attr: Attr): Attr | null {
    return this.owner.setAttributeNodeNS(attr);
  }

  removeNamedItem(qualifiedName: string): Attr {
    const attr = this.owner.getAttributeNode(qualifiedName);
    if (!attr) {
      throw new DOMException(`No attribute named '${qualifiedName}'`, 'NotFoundError');
    }
    this.owner.removeAttributeNode(attr);
    return attr;
  }

  [Symbol.iterator](): IterableIterator<Attr> {
    return this.owner._attributes[Symbol.iterator]();
  }

  [index: number]: Attr;
}

const proxify = (map: NamedNodeMap): NamedNodeMap =>
  new Proxy(map, {
    get(target, prop, receiver) {
      if (typeof prop === 'string' && /^\d+$/.test(prop)) {
        return target.item(Number(prop));
      }
      return Reflect.get(target, prop, receiver);
    },
  });

export function createNamedNodeMap(owner: Element): NamedNodeMap {
  return proxify(new NamedNodeMap(owner));
}
