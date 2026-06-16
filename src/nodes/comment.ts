import { NodeType } from '../constants.js';
import { CharacterData } from './character-data.js';

export class Comment extends CharacterData {
  readonly nodeType = NodeType.COMMENT_NODE;

  get nodeName(): string {
    return '#comment';
  }

  cloneNode(_deep?: boolean): Comment {
    const clone = new Comment(this.data);
    clone.ownerDocument = this.ownerDocument;
    return clone;
  }
}
