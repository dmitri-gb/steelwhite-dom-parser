import { describe, it, expect } from 'bun:test';
import { DOMParser } from '../src/index.js';

const doc = new DOMParser().parseFromString(
  `<body>
    <nav><a href="#a" class="link">A</a><a href="#b" class="link active">B</a></nav>
    <main>
      <section id="s1"><p>one</p><p class="hl">two</p></section>
      <section id="s2"><p>three</p></section>
    </main>
    <input type="text" required>
    <input type="checkbox" checked>
  </body>`,
  'text/html',
);

describe('CSS selector querying', () => {
  it('querySelector basic and compound', () => {
    expect(doc.querySelector('a.active')?.textContent).toBe('B');
    expect(doc.querySelector('section#s1 p.hl')?.textContent).toBe('two');
  });

  it('querySelectorAll returns all matches', () => {
    expect(doc.querySelectorAll('a.link').length).toBe(2);
    expect(doc.querySelectorAll('section p').length).toBe(3);
  });

  it('child and sibling combinators', () => {
    expect(doc.querySelectorAll('section > p').length).toBe(3);
    expect(doc.querySelector('p + p')?.textContent).toBe('two');
  });

  it('multiple branches return matches in document order', () => {
    const all = doc.querySelector('main')!.querySelectorAll('#s2, #s1');
    expect(all[0]?.id).toBe('s1');
    expect(all[1]?.id).toBe('s2');
  });

  it('structural pseudo-classes', () => {
    expect(doc.querySelector('#s1 p:first-child')?.textContent).toBe('one');
    expect(doc.querySelector('#s1 p:last-child')?.textContent).toBe('two');
    expect(doc.querySelector('#s1 p:nth-child(2)')?.textContent).toBe('two');
  });

  it(':is / :not / :has level-4 selectors', () => {
    expect(doc.querySelectorAll('p:not(.hl)').length).toBe(2);
    expect(doc.querySelectorAll(':is(#s1, #s2) p').length).toBe(3);
    expect(doc.querySelector('section:has(p.hl)')?.id).toBe('s1');
  });

  it('attribute selectors', () => {
    expect(doc.querySelectorAll("a[href^='#']").length).toBe(2);
    expect(doc.querySelector("input[type='text']")).not.toBeNull();
    expect(doc.querySelector(':checked')).not.toBeNull();
    expect(doc.querySelector(':required')).not.toBeNull();
  });

  it('matches and closest', () => {
    const hl = doc.querySelector('.hl')!;
    expect(hl.matches('p.hl')).toBe(true);
    expect(hl.matches('div')).toBe(false);
    expect(hl.closest('section')?.id).toBe('s1');
    expect(hl.closest('nav')).toBeNull();
  });

  it('scoped querying on an element only searches descendants', () => {
    const s1 = doc.getElementById('s1')!;
    expect(s1.querySelectorAll('p').length).toBe(2);
    expect(s1.querySelector('a')).toBeNull();
  });

  it('invalid selector throws', () => {
    expect(() => doc.querySelector('a..b')).toThrow();
  });
});
