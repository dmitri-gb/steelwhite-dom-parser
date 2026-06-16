import { describe, it, expect } from 'bun:test';
import { DOMParser } from '../src/index.js';

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html');

const doc = parse(`<body><div id="root"><!--c--><span>a</span> text <span>b</span><span>c</span></div></body>`);
const root = doc.getElementById('root')!;

describe('tree traversal', () => {
  it('childNodes includes all node types; children only elements', () => {
    expect(root.childNodes.length).toBe(5); // comment, span, text, span, span
    expect(root.children.length).toBe(3);
    expect(root.childElementCount).toBe(3);
  });

  it('firstChild / firstElementChild differ', () => {
    expect(root.firstChild?.nodeType).toBe(8); // comment
    expect(root.firstElementChild?.textContent).toBe('a');
    expect(root.lastElementChild?.textContent).toBe('c');
  });

  it('sibling navigation', () => {
    const first = root.firstElementChild!;
    expect(first.nextElementSibling?.textContent).toBe('b');
    expect(first.nextSibling?.nodeType).toBe(3); // the " text " node
    const last = root.lastElementChild!;
    expect(last.previousElementSibling?.textContent).toBe('b');
  });

  it('parentNode / parentElement / ownerDocument', () => {
    const span = root.firstElementChild!;
    expect(span.parentNode).toBe(root);
    expect(span.parentElement).toBe(root);
    expect(span.ownerDocument).toBe(doc);
    expect(doc.documentElement?.parentElement).toBeNull();
  });

  it('contains and compareDocumentPosition', () => {
    const a = root.children[0]!;
    const b = root.children[1]!;
    expect(root.contains(a)).toBe(true);
    expect(a.contains(root)).toBe(false);
    expect(root.contains(root)).toBe(true);
    const pos = a.compareDocumentPosition(b);
    expect(pos & a.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('getRootNode and isConnected', () => {
    expect(root.getRootNode()).toBe(doc);
    expect(root.isConnected).toBe(true);
    const detached = doc.createElement('div');
    expect(detached.isConnected).toBe(false);
    expect(detached.getRootNode()).toBe(detached);
  });

  it('getElementsByTagName / ClassName are scoped', () => {
    const d = parse(`<body><p class="x">1</p><div><p class="x y">2</p></div></body>`);
    expect(d.getElementsByTagName('p').length).toBe(2);
    expect(d.getElementsByClassName('x').length).toBe(2);
    expect(d.getElementsByClassName('x y').length).toBe(1);
    expect(d.body!.querySelector('div')!.getElementsByTagName('p').length).toBe(1);
  });
});
