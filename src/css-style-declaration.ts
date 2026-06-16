import type { Element } from './nodes/element.js';

interface Decl {
  name: string;
  value: string;
  priority: '' | 'important';
}

const IMPORTANT = /\s*!\s*important\s*$/i;

function parse(cssText: string): Decl[] {
  const decls: Decl[] = [];
  for (const part of cssText.split(';')) {
    const segment = part.trim();
    if (segment === '') continue;
    const colon = segment.indexOf(':');
    if (colon === -1) continue;
    const name = segment.slice(0, colon).trim().toLowerCase();
    let value = segment.slice(colon + 1).trim();
    if (name === '') continue;
    let priority: '' | 'important' = '';
    if (IMPORTANT.test(value)) {
      priority = 'important';
      value = value.replace(IMPORTANT, '').trim();
    }
    if (value === '') continue;
    const existing = decls.find(d => d.name === name);
    if (existing) {
      existing.value = value;
      existing.priority = priority;
    } else {
      decls.push({ name, value, priority });
    }
  }
  return decls;
}

function serialize(decls: Decl[]): string {
  return decls.map(d => `${d.name}: ${d.value}${d.priority ? ' !important' : ''};`).join(' ');
}

/** Convert a camelCase IDL name (e.g. `backgroundColor`) to a CSS property. */
function toCssProperty(prop: string): string {
  if (prop === 'cssFloat') return 'float';
  const dashed = prop.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
  // A leading uppercase produces a leading dash already (e.g. WebkitFoo ->
  // -webkit-foo); a lowercase vendor prefix needs the dash added.
  if (/^(webkit|moz|ms|o)-/.test(dashed)) return '-' + dashed;
  return dashed;
}

export class CSSStyleDeclaration {
  constructor(private readonly owner: Element) {}

  private read(): Decl[] {
    return parse(this.owner.getAttribute('style') ?? '');
  }

  private write(decls: Decl[]): void {
    if (decls.length === 0) {
      if (this.owner.hasAttribute('style')) {
        this.owner.setAttribute('style', '');
      }
      return;
    }
    this.owner.setAttribute('style', serialize(decls));
  }

  get cssText(): string {
    return serialize(this.read());
  }

  set cssText(value: string) {
    this.owner.setAttribute('style', serialize(parse(value)));
  }

  get length(): number {
    return this.read().length;
  }

  item(index: number): string {
    return this.read()[index]?.name ?? '';
  }

  getPropertyValue(property: string): string {
    const name = property.trim().toLowerCase();
    return this.read().find(d => d.name === name)?.value ?? '';
  }

  getPropertyPriority(property: string): string {
    const name = property.trim().toLowerCase();
    return this.read().find(d => d.name === name)?.priority ?? '';
  }

  setProperty(property: string, value: string, priority = ''): void {
    const name = property.trim().toLowerCase();
    if (!name) return;
    const decls = this.read();
    if (value === '' || value == null) {
      this.write(decls.filter(d => d.name !== name));
      return;
    }
    const prio: '' | 'important' = priority.toLowerCase() === 'important' ? 'important' : '';
    const existing = decls.find(d => d.name === name);
    if (existing) {
      existing.value = String(value);
      existing.priority = prio;
    } else {
      decls.push({ name, value: String(value), priority: prio });
    }
    this.write(decls);
  }

  removeProperty(property: string): string {
    const name = property.trim().toLowerCase();
    const decls = this.read();
    const removed = decls.find(d => d.name === name)?.value ?? '';
    this.write(decls.filter(d => d.name !== name));
    return removed;
  }

  [Symbol.iterator](): IterableIterator<string> {
    return this.read()
      .map(d => d.name)
      [Symbol.iterator]();
  }

  [index: number]: string;
  [property: string]: unknown;
}

const OWN_MEMBERS = new Set([
  'cssText',
  'length',
  'item',
  'getPropertyValue',
  'getPropertyPriority',
  'setProperty',
  'removeProperty',
]);

export function createCSSStyleDeclaration(owner: Element): CSSStyleDeclaration {
  const target = new CSSStyleDeclaration(owner);
  return new Proxy(target, {
    get(obj, prop) {
      if (typeof prop === 'string') {
        if (/^\d+$/.test(prop)) return obj.item(Number(prop));
        if (!OWN_MEMBERS.has(prop) && !(prop in CSSStyleDeclaration.prototype)) {
          return obj.getPropertyValue(toCssProperty(prop));
        }
      }
      // Run accessors/methods against the real target, never the proxy, to
      // avoid recursing through these traps.
      const value = Reflect.get(obj, prop, obj);
      return typeof value === 'function' ? value.bind(obj) : value;
    },
    set(obj, prop, value) {
      if (typeof prop === 'string' && prop !== 'cssText' && !OWN_MEMBERS.has(prop)) {
        obj.setProperty(toCssProperty(prop), value == null ? '' : String(value));
        return true;
      }
      return Reflect.set(obj, prop, value, obj);
    },
  });
}
