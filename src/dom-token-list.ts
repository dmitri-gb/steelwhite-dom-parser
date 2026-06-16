import type { Element } from './nodes/element.js';

const ASCII_WHITESPACE = /[\t\n\f\r ]+/;

/**
 * DOMTokenList backed live by an element attribute (e.g. `class`).
 */
export class DOMTokenList {
  constructor(
    private readonly owner: Element,
    private readonly attrName: string,
  ) {}

  private tokens(): string[] {
    const value = this.owner.getAttribute(this.attrName) ?? '';
    const trimmed = value.trim();
    if (trimmed === '') return [];
    return trimmed.split(ASCII_WHITESPACE);
  }

  private write(tokens: string[]): void {
    this.owner.setAttribute(this.attrName, tokens.join(' '));
  }

  private unique(tokens: string[]): string[] {
    return [...new Set(tokens)];
  }

  get length(): number {
    return this.tokens().length;
  }

  get value(): string {
    return this.owner.getAttribute(this.attrName) ?? '';
  }

  set value(v: string) {
    this.owner.setAttribute(this.attrName, v);
  }

  item(index: number): string | null {
    return this.tokens()[index] ?? null;
  }

  contains(token: string): boolean {
    return this.tokens().includes(token);
  }

  add(...tokens: string[]): void {
    this.validate(tokens);
    const current = this.tokens();
    for (const t of tokens) {
      if (!current.includes(t)) current.push(t);
    }
    this.write(this.unique(current));
  }

  remove(...tokens: string[]): void {
    this.validate(tokens);
    const set = new Set(tokens);
    this.write(this.tokens().filter(t => !set.has(t)));
  }

  toggle(token: string, force?: boolean): boolean {
    this.validate([token]);
    const has = this.contains(token);
    if (force === undefined) {
      if (has) {
        this.remove(token);
        return false;
      }
      this.add(token);
      return true;
    }
    if (force) {
      if (!has) this.add(token);
      return true;
    }
    if (has) this.remove(token);
    return false;
  }

  replace(oldToken: string, newToken: string): boolean {
    this.validate([oldToken, newToken]);
    const tokens = this.tokens();
    const idx = tokens.indexOf(oldToken);
    if (idx === -1) return false;
    tokens[idx] = newToken;
    this.write(this.unique(tokens));
    return true;
  }

  toString(): string {
    return this.value;
  }

  forEach(callback: (value: string, index: number, list: DOMTokenList) => void, thisArg?: unknown): void {
    this.tokens().forEach((value, index) => callback.call(thisArg, value, index, this));
  }

  values(): IterableIterator<string> {
    return this.tokens()[Symbol.iterator]();
  }

  [Symbol.iterator](): IterableIterator<string> {
    return this.tokens()[Symbol.iterator]();
  }

  private validate(tokens: string[]): void {
    for (const t of tokens) {
      if (t === '') {
        throw new DOMException('The token provided must not be empty.', 'SyntaxError');
      }
      if (ASCII_WHITESPACE.test(t)) {
        throw new DOMException(
          'The token provided contains HTML space characters, which are not valid in tokens.',
          'InvalidCharacterError',
        );
      }
    }
  }
}
