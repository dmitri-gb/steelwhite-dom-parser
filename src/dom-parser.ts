import { parse } from 'parse5';

import { Document } from './nodes/document.js';
import { createTreeAdapter } from './parser/tree-adapter.js';
import { parseXml } from './parser/xml-builder.js';

export type SupportedType = 'text/html' | 'text/xml' | 'application/xml' | 'application/xhtml+xml' | 'image/svg+xml';

const XML_TYPES = new Set(['text/xml', 'application/xml', 'application/xhtml+xml', 'image/svg+xml']);

/**
 * A browser-compatible `DOMParser`.
 *
 * - `text/html` is parsed with parse5 (WHATWG HTML parsing).
 * - The XML mime types are parsed with htmlparser2 in `xmlMode`.
 */
export class DOMParser {
  parseFromString(string: string, type: SupportedType): Document {
    if (type === 'text/html') {
      const doc = new Document();
      const adapter = createTreeAdapter(doc);
      parse(string, { treeAdapter: adapter });
      return doc;
    }
    if (XML_TYPES.has(type)) {
      return parseXml(string, type);
    }
    throw new TypeError(
      `Failed to execute 'parseFromString' on 'DOMParser': The provided value '${type}' is not a valid enum value of type SupportedType.`,
    );
  }
}
