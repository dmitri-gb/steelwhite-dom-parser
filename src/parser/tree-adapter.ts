import { html, Token, TreeAdapter, TreeAdapterTypeMap } from 'parse5';

import { Attr } from '../attr.js';
import { NodeType } from '../constants.js';
import { Comment } from '../nodes/comment.js';
import { DocumentFragment } from '../nodes/document-fragment.js';
import { DocumentType } from '../nodes/document-type.js';
import { Document } from '../nodes/document.js';
import { Element } from '../nodes/element.js';
import { createHtmlElement, type HTMLTemplateElement } from '../nodes/html-elements.js';
import { Node } from '../nodes/node.js';
import { Text } from '../nodes/text.js';

export interface DomTreeAdapterMap extends TreeAdapterTypeMap {
  node: Node;
  parentNode: Document | DocumentFragment | Element;
  childNode: Node;
  document: Document;
  documentFragment: DocumentFragment;
  element: Element;
  commentNode: Comment;
  textNode: Text;
  template: HTMLTemplateElement;
  documentType: DocumentType;
}

function toAttr(a: Token.Attribute): Attr {
  return new Attr(a.name, a.value, a.namespace ?? null, a.prefix ?? null);
}

/**
 * Build a parse5 tree adapter backed by this library's node classes.
 *
 * `doc` is the document that created nodes are attached to.
 */
export function createTreeAdapter(doc: Document): TreeAdapter<DomTreeAdapterMap> {
  const adapter: TreeAdapter<DomTreeAdapterMap> = {
    createDocument(): Document {
      return doc;
    },

    createDocumentFragment() {
      const frag = new DocumentFragment();
      frag.ownerDocument = doc;
      return frag;
    },

    createElement(tagName: string, namespaceURI: html.NS, attrs: Token.Attribute[]) {
      const el = createHtmlElement(tagName, namespaceURI, null);
      el.ownerDocument = doc;
      for (const a of attrs) {
        const attr = toAttr(a);
        attr.ownerElement = el;
        attr.ownerDocument = doc;
        el._attributes.push(attr);
      }
      return el;
    },

    createCommentNode(data: string) {
      const node = new Comment(data);
      node.ownerDocument = doc;
      return node;
    },

    createTextNode(value: string) {
      const node = new Text(value);
      node.ownerDocument = doc;
      return node;
    },

    appendChild(parentNode, newNode) {
      parentNode.appendChild(newNode);
    },

    insertBefore(parentNode, newNode, referenceNode) {
      parentNode.insertBefore(newNode, referenceNode);
    },

    setTemplateContent(templateElement, contentElement) {
      templateElement._templateContent = contentElement;
      contentElement.ownerDocument = doc;
    },

    getTemplateContent(templateElement) {
      return templateElement._templateContent as DocumentFragment;
    },

    setDocumentType(document, name, publicId, systemId) {
      const existing = document.doctype;
      if (existing) {
        existing.name = name;
        existing.publicId = publicId;
        existing.systemId = systemId;
        return;
      }
      const doctype = new DocumentType(name, publicId, systemId);
      doctype.ownerDocument = document;
      document.appendChild(doctype);
    },

    setDocumentMode(document, mode) {
      document._mode = mode;
    },

    getDocumentMode(document) {
      return document._mode as html.DOCUMENT_MODE;
    },

    detachNode(node) {
      node.parentNode?.removeChild(node);
    },

    insertText(parentNode, text) {
      const last = parentNode.lastChild;
      if (last && last.nodeType === NodeType.TEXT_NODE) {
        (last as Text).data += text;
        return;
      }
      adapter.appendChild(parentNode, adapter.createTextNode(text));
    },

    insertTextBefore(parentNode, text, referenceNode) {
      const prev = referenceNode.previousSibling;
      if (prev && prev.nodeType === NodeType.TEXT_NODE) {
        (prev as Text).data += text;
        return;
      }
      adapter.insertBefore(parentNode, adapter.createTextNode(text), referenceNode);
    },

    adoptAttributes(recipient, attrs) {
      const present = new Set(recipient._attributes.map(a => a.name));
      for (const a of attrs) {
        const attr = toAttr(a);
        if (!present.has(attr.name)) {
          attr.ownerElement = recipient;
          attr.ownerDocument = doc;
          recipient._attributes.push(attr);
        }
      }
    },

    getFirstChild(node) {
      return node.firstChild;
    },

    getChildNodes(node) {
      const list: Node[] = [];
      for (let n = node.firstChild; n; n = n.nextSibling) list.push(n);
      return list;
    },

    getParentNode(node) {
      return node.parentNode as DomTreeAdapterMap['parentNode'] | null;
    },

    getAttrList(element) {
      return element._attributes.map(a => ({
        name: a.localName,
        value: a.value,
        prefix: a.prefix ?? undefined,
        namespace: a.namespaceURI ?? undefined,
      }));
    },

    getTagName(element) {
      return element.localName;
    },

    getNamespaceURI(element) {
      return (element.namespaceURI ?? html.NS.HTML) as html.NS;
    },

    getTextNodeContent(textNode) {
      return textNode.data;
    },

    getCommentNodeContent(commentNode) {
      return commentNode.data;
    },

    getDocumentTypeNodeName(doctypeNode) {
      return doctypeNode.name;
    },

    getDocumentTypeNodePublicId(doctypeNode) {
      return doctypeNode.publicId;
    },

    getDocumentTypeNodeSystemId(doctypeNode) {
      return doctypeNode.systemId;
    },

    isTextNode(node): node is Text {
      return node.nodeType === NodeType.TEXT_NODE;
    },

    isCommentNode(node): node is Comment {
      return node.nodeType === NodeType.COMMENT_NODE;
    },

    isDocumentTypeNode(node): node is DocumentType {
      return node.nodeType === NodeType.DOCUMENT_TYPE_NODE;
    },

    isElementNode(node): node is Element {
      return node.nodeType === NodeType.ELEMENT_NODE;
    },

    setNodeSourceCodeLocation() {},
    getNodeSourceCodeLocation: () => undefined,
    updateNodeSourceCodeLocation() {},
  };

  return adapter;
}
