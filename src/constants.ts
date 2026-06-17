export const NodeType = {
  ELEMENT_NODE: 1,
  ATTRIBUTE_NODE: 2,
  TEXT_NODE: 3,
  CDATA_SECTION_NODE: 4,
  ENTITY_REFERENCE_NODE: 5,
  ENTITY_NODE: 6,
  PROCESSING_INSTRUCTION_NODE: 7,
  COMMENT_NODE: 8,
  DOCUMENT_NODE: 9,
  DOCUMENT_TYPE_NODE: 10,
  DOCUMENT_FRAGMENT_NODE: 11,
  NOTATION_NODE: 12,
} as const;

export const DocumentPosition = {
  DISCONNECTED: 0x01,
  PRECEDING: 0x02,
  FOLLOWING: 0x04,
  CONTAINS: 0x08,
  CONTAINED_BY: 0x10,
  IMPLEMENTATION_SPECIFIC: 0x20,
} as const;

export const FILTER_ACCEPT = 1;
export const FILTER_REJECT = 2;
export const FILTER_SKIP = 3;

export const NodeFilter = {
  FILTER_ACCEPT,
  FILTER_REJECT,
  FILTER_SKIP,
  SHOW_ALL: 0xffffffff,
  SHOW_ELEMENT: 0x1,
  SHOW_ATTRIBUTE: 0x2,
  SHOW_TEXT: 0x4,
  SHOW_CDATA_SECTION: 0x8,
  SHOW_ENTITY_REFERENCE: 0x10,
  SHOW_ENTITY: 0x20,
  SHOW_PROCESSING_INSTRUCTION: 0x40,
  SHOW_COMMENT: 0x80,
  SHOW_DOCUMENT: 0x100,
  SHOW_DOCUMENT_TYPE: 0x200,
  SHOW_DOCUMENT_FRAGMENT: 0x400,
  SHOW_NOTATION: 0x800,
} as const;

export const Namespaces = {
  HTML: 'http://www.w3.org/1999/xhtml',
  MATHML: 'http://www.w3.org/1998/Math/MathML',
  SVG: 'http://www.w3.org/2000/svg',
  XLINK: 'http://www.w3.org/1999/xlink',
  XML: 'http://www.w3.org/XML/1998/namespace',
  XMLNS: 'http://www.w3.org/2000/xmlns/',
} as const;

export interface NodeFilter {
  acceptNode(node: unknown): number;
}
