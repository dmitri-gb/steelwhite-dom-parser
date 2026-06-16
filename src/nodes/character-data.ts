import { after, before, getNextElementSibling, getPreviousElementSibling, remove, replaceWith } from '../mixins.js';
import type { Element } from './element.js';
import { Node } from './node.js';

export abstract class CharacterData extends Node {
  data: string;

  constructor(data: string) {
    super();
    this.data = data;
  }

  get length(): number {
    return this.data.length;
  }

  override get nodeValue(): string {
    return this.data;
  }

  override set nodeValue(value: string | null) {
    this.data = value ?? '';
  }

  override get textContent(): string {
    return this.data;
  }

  override set textContent(value: string | null) {
    this.data = value ?? '';
  }

  substringData(offset: number, count: number): string {
    return this.data.substring(offset, offset + count);
  }

  appendData(data: string): void {
    this.data += data;
  }

  insertData(offset: number, data: string): void {
    this.data = this.data.slice(0, offset) + data + this.data.slice(offset);
  }

  deleteData(offset: number, count: number): void {
    this.data = this.data.slice(0, offset) + this.data.slice(offset + count);
  }

  replaceData(offset: number, count: number, data: string): void {
    this.data = this.data.slice(0, offset) + data + this.data.slice(offset + count);
  }

  /* NonDocumentTypeChildNode */
  get nextElementSibling(): Element | null {
    return getNextElementSibling(this);
  }

  get previousElementSibling(): Element | null {
    return getPreviousElementSibling(this);
  }

  /* ChildNode */
  before(...nodes: (Node | string)[]): void {
    before(this, nodes);
  }

  after(...nodes: (Node | string)[]): void {
    after(this, nodes);
  }

  replaceWith(...nodes: (Node | string)[]): void {
    replaceWith(this, nodes);
  }

  remove(): void {
    remove(this);
  }

  protected override _equalsOwn(other: Node): boolean {
    return (other as CharacterData).data === this.data;
  }
}
