import { NodeType } from '../constants.js';
import { Text } from './text.js';

export class CDATASection extends Text {
  override readonly nodeType: number = NodeType.CDATA_SECTION_NODE;

  override get nodeName(): string {
    return '#cdata-section';
  }

  override cloneNode(_deep?: boolean): CDATASection {
    const clone = new CDATASection(this.data);
    clone.ownerDocument = this.ownerDocument;
    return clone;
  }
}
