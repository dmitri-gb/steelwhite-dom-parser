import { NodeType } from '../constants.js';
import { CharacterData } from './character-data.js';

export class Text extends CharacterData {
  readonly nodeType: number = NodeType.TEXT_NODE;

  get nodeName(): string {
    return '#text';
  }

  /** Whether the text node contains only whitespace and is inter-element. */
  get wholeText(): string {
    let start: CharacterData = this;
    while (start.previousSibling && start.previousSibling.nodeType === NodeType.TEXT_NODE) {
      start = start.previousSibling as CharacterData;
    }
    let text = '';
    let n: CharacterData | null = start;
    while (n && n.nodeType === NodeType.TEXT_NODE) {
      text += n.data;
      n = n.nextSibling as CharacterData | null;
    }
    return text;
  }

  splitText(offset: number): Text {
    if (offset > this.data.length) {
      throw new DOMException('The offset is out of bounds.', 'IndexSizeError');
    }
    const rest = this.data.slice(offset);
    this.data = this.data.slice(0, offset);
    const newNode = new Text(rest);
    newNode.ownerDocument = this.ownerDocument;
    if (this.parentNode) {
      this.parentNode.insertBefore(newNode, this.nextSibling);
    }
    return newNode;
  }

  cloneNode(_deep?: boolean): Text {
    const clone = new Text(this.data);
    clone.ownerDocument = this.ownerDocument;
    return clone;
  }
}
