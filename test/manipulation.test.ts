import { describe, expect, it } from 'bun:test';
import { DOMParser, Text } from '../src/index.js';

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html');

describe('node manipulation', () => {
  it('appendChild moves an existing node', () => {
    const doc = parse("<body><div id='a'><span>x</span></div><div id='b'></div></body>");
    const span = doc.querySelector('span')!;
    const b = doc.getElementById('b')!;
    b.appendChild(span);
    expect(b.children.length).toBe(1);
    expect(doc.getElementById('a')!.children.length).toBe(0);
    expect(span.parentElement).toBe(b);
  });

  it('insertBefore places node correctly', () => {
    const doc = parse('<body><ul><li>1</li><li>3</li></ul></body>');
    const ul = doc.querySelector('ul')!;
    const li = doc.createElement('li');
    li.textContent = '2';
    ul.insertBefore(li, ul.children[1]!);
    expect([...ul.children].map(c => c.textContent)).toEqual(['1', '2', '3']);
  });

  it('removeChild and remove', () => {
    const doc = parse('<body><p>a</p><p>b</p></body>');
    const ps = doc.querySelectorAll('p');
    ps[0]!.remove();
    expect(doc.querySelectorAll('p').length).toBe(1);
    doc.body!.removeChild(doc.querySelector('p')!);
    expect(doc.querySelectorAll('p').length).toBe(0);
  });

  it('replaceChild swaps nodes', () => {
    const doc = parse('<body><p>old</p></body>');
    const p = doc.querySelector('p')!;
    const div = doc.createElement('div');
    doc.body!.replaceChild(div, p);
    expect(doc.querySelector('p')).toBeNull();
    expect(doc.querySelector('div')).toBe(div);
  });

  it('append/prepend/before/after/replaceWith with strings', () => {
    const doc = parse("<body><div id='x'></div></body>");
    const x = doc.getElementById('x')!;
    x.append('hello', doc.createElement('b'));
    expect(x.childNodes.length).toBe(2);
    expect(x.firstChild).toBeInstanceOf(Text);
    x.prepend('start');
    expect(x.firstChild?.textContent).toBe('start');
    x.before('beforeX');
    x.after('afterX');
    expect(x.previousSibling?.textContent).toBe('beforeX');
    expect(x.nextSibling?.textContent).toBe('afterX');
    x.replaceWith(doc.createElement('section'));
    expect(doc.getElementById('x')).toBeNull();
    expect(doc.querySelector('section')).not.toBeNull();
  });

  it('DocumentFragment inserts its children', () => {
    const doc = parse('<body><ul></ul></body>');
    const frag = doc.createDocumentFragment();
    for (const t of ['a', 'b', 'c']) {
      const li = doc.createElement('li');
      li.textContent = t;
      frag.appendChild(li);
    }
    doc.querySelector('ul')!.appendChild(frag);
    expect(doc.querySelectorAll('li').length).toBe(3);
    expect(frag.childNodes.length).toBe(0);
  });

  it('cloneNode shallow and deep', () => {
    const doc = parse("<body><div class='c'><span>hi</span></div></body>");
    const div = doc.querySelector('div')!;
    const shallow = div.cloneNode(false);
    expect(shallow.className).toBe('c');
    expect(shallow.children.length).toBe(0);
    const deep = div.cloneNode(true);
    expect(deep.querySelector('span')?.textContent).toBe('hi');
    expect(deep).not.toBe(div);
  });

  it('clone document', () => {
    const doc = parse("<body><div class='c'><span>hi</span></div></body>");
    const doc2 = doc.cloneNode(true);
    doc2.body!.insertAdjacentHTML('beforeend', '<p>new content</p>');
    expect(doc2.body!.children.length).toBe(2);
  });

  it('normalize merges adjacent text nodes', () => {
    const doc = parse('<body><p></p></body>');
    const p = doc.querySelector('p')!;
    p.appendChild(doc.createTextNode('a'));
    p.appendChild(doc.createTextNode('b'));
    expect(p.childNodes.length).toBe(2);
    p.normalize();
    expect(p.childNodes.length).toBe(1);
    expect(p.textContent).toBe('ab');
  });

  it('textContent setter replaces children', () => {
    const doc = parse('<body><div><span>x</span></div></body>');
    const div = doc.querySelector('div')!;
    div.textContent = 'plain';
    expect(div.children.length).toBe(0);
    expect(div.textContent).toBe('plain');
  });
});
