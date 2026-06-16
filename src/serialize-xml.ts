import { NodeType } from './constants.js';
import type { Node } from './nodes/node.js';
import type { Element } from './nodes/element.js';
import type { CharacterData } from './nodes/character-data.js';
import type { ProcessingInstruction } from './nodes/processing-instruction.js';
import type { DocumentType } from './nodes/document-type.js';

function escapeText(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function escapeAttr(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
}

function serializeElement(el: Element): string {
  const tag = el.prefix ? `${el.prefix}:${el.localName}` : el.localName;
  let attrs = '';
  for (const attr of el._attributes) {
    attrs += ` ${attr.name}="${escapeAttr(attr.value)}"`;
  }
  if (!el.firstChild) return `<${tag}${attrs}/>`;
  return `<${tag}${attrs}>${serializeXmlChildren(el)}</${tag}>`;
}

function serializeOne(node: Node): string {
  switch (node.nodeType) {
    case NodeType.ELEMENT_NODE:
      return serializeElement(node as Element);
    case NodeType.TEXT_NODE:
      return escapeText((node as CharacterData).data);
    case NodeType.CDATA_SECTION_NODE:
      return `<![CDATA[${(node as CharacterData).data}]]>`;
    case NodeType.COMMENT_NODE:
      return `<!--${(node as CharacterData).data}-->`;
    case NodeType.PROCESSING_INSTRUCTION_NODE: {
      const pi = node as ProcessingInstruction;
      return `<?${pi.target} ${pi.data}?>`;
    }
    case NodeType.DOCUMENT_TYPE_NODE: {
      const dt = node as DocumentType;
      let s = `<!DOCTYPE ${dt.name}`;
      if (dt.publicId) s += ` PUBLIC "${dt.publicId}"`;
      else if (dt.systemId) s += ' SYSTEM';
      if (dt.systemId) s += ` "${dt.systemId}"`;
      return s + '>';
    }
    default:
      return '';
  }
}

export function serializeXmlChildren(node: Node): string {
  let out = '';
  for (let n = node.firstChild; n; n = n.nextSibling) out += serializeOne(n);
  return out;
}

export function serializeXmlNode(node: Node): string {
  return serializeOne(node);
}
