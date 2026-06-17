import { Parser } from 'htmlparser2';

import { Attr } from '../attr.js';
import { Namespaces, NodeType } from '../constants.js';
import type { CharacterData } from '../nodes/character-data.js';
import type { DocumentFragment } from '../nodes/document-fragment.js';
import { DocumentType } from '../nodes/document-type.js';
import { Document } from '../nodes/document.js';
import { Element } from '../nodes/element.js';
import type { Node } from '../nodes/node.js';
import type { ProcessingInstruction } from '../nodes/processing-instruction.js';
import { kParserAndSerializer } from '../symbols.js';

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

function baseNsScope(): NsScope {
  return new Map([
    ['xml', Namespaces.XML],
    ['xmlns', Namespaces.XMLNS],
  ]);
}

/**
 * Drive an htmlparser2 SAX parser over `source`, building nodes under `target`
 * within `doc`. `scope` is the initial xmlns scope, modified per-element via
 * the standard `xmlns` / `xmlns:prefix` attributes.
 */
function buildXmlInto(target: Node, source: string, doc: Document, scope: NsScope): void {
  let current: Node = target;
  const nodeStack: Node[] = [target];
  const scopeStack: NsScope[] = [scope];
  let inCdata = false;

  const resolve = (s: NsScope, prefix: string | null): string | null => {
    if (prefix === null) return s.get('') ?? null;
    return s.get(prefix) ?? null;
  };

  const parser = new Parser(
    {
      onopentag(name, attribs) {
        const parentScope = scopeStack[scopeStack.length - 1]!;
        const next: NsScope = new Map(parentScope);

        for (const [attrName, attrValue] of Object.entries(attribs)) {
          if (attrName === 'xmlns') {
            next.set('', attrValue === '' ? null : attrValue);
          } else if (attrName.startsWith('xmlns:')) {
            next.set(attrName.slice(6), attrValue === '' ? null : attrValue);
          }
        }

        const { prefix, localName } = splitName(name);
        const namespaceURI = resolve(next, prefix);
        const el = new Element(localName, namespaceURI, prefix);
        el.ownerDocument = doc;

        for (const [attrName, attrValue] of Object.entries(attribs)) {
          const split = splitName(attrName);
          let attrNs: string | null = null;
          if (attrName === 'xmlns') {
            attrNs = Namespaces.XMLNS;
          } else if (split.prefix !== null) {
            attrNs = resolve(next, split.prefix);
          }
          const attr = new Attr(split.localName, attrValue, attrNs, split.prefix);
          attr.ownerElement = el;
          attr.ownerDocument = doc;
          el._attributes.push(attr);
        }

        current.appendChild(el);
        nodeStack.push(el);
        scopeStack.push(next);
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
}

/**
 * Parse an XML string into a Document using htmlparser2's SAX-like callbacks,
 * building this library's own node instances directly. Namespaces are resolved
 * from `xmlns` / `xmlns:prefix` declarations as the tree is constructed.
 */
export function parseXml(source: string, contentType: string): Document {
  const doc = new Document(contentType);
  buildXmlInto(doc, source, doc, baseNsScope());
  doc[kParserAndSerializer] = {
    createNew: () => doc[kParserAndSerializer],
    parseFragmentInto: parseXmlFragmentInto,
    serializeChildren: serializeXmlChildren,
    serializeNode: serializeXmlNode,
  };
  return doc;
}

/**
 * Parse an XML fragment into `target`. When a `context` element is given, its
 * ancestor chain's `xmlns` / `xmlns:prefix` declarations seed the initial
 * scope, so unprefixed names in the fragment inherit the surrounding default
 * namespace.
 */
export function parseXmlFragmentInto(
  target: Element | DocumentFragment,
  source: string,
  context = target.nodeType === NodeType.ELEMENT_NODE ? (target as Element) : undefined,
): void {
  const doc = target.ownerDocument!;
  const scope = baseNsScope();
  if (context) {
    const chain: Element[] = [];
    let el: Element | null = context;
    while (el) {
      chain.unshift(el);
      el = el.parentElement;
    }
    for (const ancestor of chain) {
      for (const attr of ancestor._attributes) {
        if (attr.prefix === null && attr.localName === 'xmlns') {
          scope.set('', attr.value === '' ? null : attr.value);
        } else if (attr.prefix === 'xmlns') {
          scope.set(attr.localName, attr.value === '' ? null : attr.value);
        }
      }
    }
  }
  buildXmlInto(target, source, doc, scope);
}

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

function serializeXmlNode(node: Node): string {
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

function serializeXmlChildren(node: Node): string {
  let out = '';
  for (let n = node.firstChild; n; n = n.nextSibling) out += serializeXmlNode(n);
  return out;
}
