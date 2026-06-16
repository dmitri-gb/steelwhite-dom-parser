import { NodeType } from '../constants.js';
import { Node } from './node.js';
import { before, after, replaceWith, remove } from '../mixins.js';

export class DocumentType extends Node {
  readonly nodeType = NodeType.DOCUMENT_TYPE_NODE;
  name: string;
  publicId: string;
  systemId: string;

  constructor(name: string, publicId = '', systemId = '') {
    super();
    this.name = name;
    this.publicId = publicId;
    this.systemId = systemId;
  }

  get nodeName(): string {
    return this.name;
  }

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

  cloneNode(_deep?: boolean): DocumentType {
    const clone = new DocumentType(this.name, this.publicId, this.systemId);
    clone.ownerDocument = this.ownerDocument;
    return clone;
  }

  protected override _equalsOwn(other: Node): boolean {
    const o = other as DocumentType;
    return o.name === this.name && o.publicId === this.publicId && o.systemId === this.systemId;
  }
}
