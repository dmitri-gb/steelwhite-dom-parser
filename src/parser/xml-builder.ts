import { Parser } from 'htmlparser2';

import { Attr } from '../attr.js';
import { Namespaces } from '../constants.js';
import { DocumentType } from '../nodes/document-type.js';
import { Document } from '../nodes/document.js';
import { Element } from '../nodes/element.js';
import type { Node } from '../nodes/node.js';

type NsScope = Map<string, string | null>;

function splitName(name: string): { prefix: string | null; localName: string } {
  const colon = name.indexOf(':');
  if (colon === -1) return { prefix: null, localName: name };
  return {
    prefix: name.slice(0, colon),
    localName: name.slice(colon + 1),
  };
}

/** Parse a `<!DOCTYPE ...>` declaration body into a DocumentType. */
function parseDoctype(doc: Document, value: string): DocumentType | null {
  // `value` looks like: DOCTYPE root PUBLIC "pub" "sys"  (case may vary)
  const match = /^doctype\s+(\S+)(?:\s+(.*))?$/i.exec(value.trim());
  if (!match) return null;
  const name = match[1] ?? '';
  let publicId = '';
  let systemId = '';
  const rest = match[2] ?? '';
  const pub = /public\s+("([^"]*)"|'([^']*)')(?:\s+("([^"]*)"|'([^']*)'))?/i.exec(rest);
  const sys = /system\s+("([^"]*)"|'([^']*)')/i.exec(rest);
  if (pub) {
    publicId = pub[2] ?? pub[3] ?? '';
    systemId = pub[5] ?? pub[6] ?? '';
  } else if (sys) {
    systemId = sys[2] ?? sys[3] ?? '';
  }
  const dt = new DocumentType(name, publicId, systemId);
  dt.ownerDocument = doc;
  return dt;
}

/**
 * Parse an XML string into a Document using htmlparser2's SAX-like callbacks,
 * building this library's own node instances directly. Namespaces are resolved
 * from `xmlns` / `xmlns:prefix` declarations as the tree is constructed.
 */
export function parseXml(source: string, contentType: string): Document {
  const doc = new Document(contentType);

  const baseScope: NsScope = new Map([
    ['xml', Namespaces.XML],
    ['xmlns', Namespaces.XMLNS],
  ]);
  let current: Node = doc;
  const nodeStack: Node[] = [doc];
  const scopeStack: NsScope[] = [baseScope];
  let inCdata = false;

  const resolve = (scope: NsScope, prefix: string | null): string | null => {
    if (prefix === null) return scope.get('') ?? null;
    return scope.get(prefix) ?? null;
  };

  const parser = new Parser(
    {
      onopentag(name, attribs) {
        const parentScope = scopeStack[scopeStack.length - 1]!;
        const scope: NsScope = new Map(parentScope);

        // First pass: collect namespace declarations into the new scope.
        for (const [attrName, attrValue] of Object.entries(attribs)) {
          if (attrName === 'xmlns') {
            scope.set('', attrValue === '' ? null : attrValue);
          } else if (attrName.startsWith('xmlns:')) {
            scope.set(attrName.slice(6), attrValue === '' ? null : attrValue);
          }
        }

        const { prefix, localName } = splitName(name);
        const namespaceURI = resolve(scope, prefix);
        const el = new Element(localName, namespaceURI, prefix);
        el.ownerDocument = doc;

        // Second pass: attach attributes (default namespace never applies).
        for (const [attrName, attrValue] of Object.entries(attribs)) {
          const split = splitName(attrName);
          let attrNs: string | null = null;
          if (attrName === 'xmlns') {
            attrNs = Namespaces.XMLNS;
          } else if (split.prefix !== null) {
            attrNs = resolve(scope, split.prefix);
          }
          const attr = new Attr(split.localName, attrValue, attrNs, split.prefix);
          attr.ownerElement = el;
          attr.ownerDocument = doc;
          el._attributes.push(attr);
        }

        current.appendChild(el);
        nodeStack.push(el);
        scopeStack.push(scope);
        current = el;
      },

      onclosetag() {
        nodeStack.pop();
        scopeStack.pop();
        current = nodeStack[nodeStack.length - 1]!;
      },

      ontext(data) {
        const node = inCdata ? doc.createCDATASection(data) : doc.createTextNode(data);
        current.appendChild(node);
      },

      oncdatastart() {
        inCdata = true;
      },

      oncdataend() {
        inCdata = false;
      },

      oncomment(data) {
        current.appendChild(doc.createComment(data));
      },

      onprocessinginstruction(name, data) {
        // `name`/`data` are prefixed by htmlparser2: '?' for PIs, '!' for declarations (e.g. DOCTYPE).
        if (name.startsWith('!')) {
          const dt = parseDoctype(doc, data.slice(1));
          if (dt) current.appendChild(dt);
          return;
        }
        const body = data.startsWith('?') ? data.slice(1) : data;
        const space = body.search(/\s/);
        const target = space === -1 ? body : body.slice(0, space);
        const piData = space === -1 ? '' : body.slice(space + 1).trim();
        // The XML declaration is not represented in the DOM.
        if (target.toLowerCase() === 'xml') return;
        current.appendChild(doc.createProcessingInstruction(target, piData));
      },
    },
    { xmlMode: true },
  );

  parser.end(source);

  return doc;
}
