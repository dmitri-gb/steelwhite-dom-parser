import { NodeType } from '../constants.js';
import { CharacterData } from './character-data.js';
import type { Node } from './node.js';

export class ProcessingInstruction extends CharacterData {
  readonly nodeType = NodeType.PROCESSING_INSTRUCTION_NODE;
  readonly target: string;

  constructor(target: string, data: string) {
    super(data);
    this.target = target;
  }

  get nodeName(): string {
    return this.target;
  }

  cloneNode(_deep?: boolean): ProcessingInstruction {
    const clone = new ProcessingInstruction(this.target, this.data);
    clone.ownerDocument = this.ownerDocument;
    return clone;
  }

  protected override _equalsOwn(other: Node): boolean {
    const o = other as ProcessingInstruction;
    return o.target === this.target && o.data === this.data;
  }
}
