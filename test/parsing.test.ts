import { describe, it, expect } from 'bun:test';
import { DOMParser, Document, NodeType } from '../src/index.js';

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html');

describe('DOMParser.parseFromString', () => {
  it('returns a Document', () => {
    const doc = parse('<!DOCTYPE html><html><head></head><body></body></html>');
    expect(doc).toBeInstanceOf(Document);
    expect(doc.nodeType).toBe(NodeType.DOCUMENT_NODE);
    expect(doc.contentType).toBe('text/html');
  });

  it('exposes doctype, documentElement, head and body', () => {
    const doc = parse('<!DOCTYPE html><html><head><title>T</title></head><body><p>hi</p></body></html>');
    expect(doc.doctype?.name).toBe('html');
    expect(doc.documentElement?.tagName).toBe('HTML');
    expect(doc.head?.tagName).toBe('HEAD');
    expect(doc.body?.tagName).toBe('BODY');
    expect(doc.title).toBe('T');
  });

  it('implicitly creates html/head/body for fragments', () => {
    const doc = parse('<p>hello</p>');
    expect(doc.documentElement?.tagName).toBe('HTML');
    expect(doc.body?.querySelector('p')?.textContent).toBe('hello');
  });

  it('preserves text and comment nodes', () => {
    const doc = parse('<body>text<!--c--></body>');
    const body = doc.body!;
    const text = body.firstChild!;
    expect(text.nodeType).toBe(NodeType.TEXT_NODE);
    expect(text.nodeValue).toBe('text');
    const comment = body.lastChild!;
    expect(comment.nodeType).toBe(NodeType.COMMENT_NODE);
    expect(comment.nodeValue).toBe('c');
  });

  it('throws for unsupported mime types', () => {
    expect(() => new DOMParser().parseFromString('<a/>', 'application/json' as 'text/html')).toThrow(TypeError);
  });

  it('sets quirks mode based on the doctype', () => {
    const standards = parse('<!DOCTYPE html><html></html>');
    expect(standards.compatMode).toBe('CSS1Compat');
    const quirks = parse('<html></html>');
    expect(quirks.compatMode).toBe('BackCompat');
  });

  it('parses nested tables correctly (tree construction)', () => {
    const doc = parse('<table><tr><td>cell</td></tr></table>');
    const td = doc.querySelector('td');
    expect(td?.textContent).toBe('cell');
    // <tbody> is implicitly inserted by the HTML parser.
    expect(doc.querySelector('tbody')).not.toBeNull();
  });
});
