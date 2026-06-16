import { describe, it, expect } from 'bun:test';
import { DOMParser, DocumentFragment } from '../src/index.js';

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html');

describe('serialization & HTML mutation', () => {
  it('innerHTML round-trips', () => {
    const doc = parse('<body><div><b>bold</b> and <i>italic</i></div></body>');
    const div = doc.querySelector('div')!;
    expect(div.innerHTML).toBe('<b>bold</b> and <i>italic</i>');
  });

  it('outerHTML includes the element and attributes', () => {
    const doc = parse("<body><a href='/x' class='c'>link</a></body>");
    const a = doc.querySelector('a')!;
    expect(a.outerHTML).toBe('<a href="/x" class="c">link</a>');
  });

  it('setting innerHTML parses and replaces', () => {
    const doc = parse('<body><div></div></body>');
    const div = doc.querySelector('div')!;
    div.innerHTML = '<p>new <span>child</span></p>';
    expect(div.querySelector('span')?.textContent).toBe('child');
    expect(div.childNodes.length).toBe(1);
  });

  it("setting innerHTML uses the element's parsing context", () => {
    const doc = parse('<body><table></table></body>');
    const table = doc.querySelector('table')!;
    table.innerHTML = '<tr><td>x</td></tr>';
    expect(table.querySelector('td')?.textContent).toBe('x');
  });

  it('insertAdjacentHTML positions content', () => {
    const doc = parse("<body><div id='t'>mid</div></body>");
    const t = doc.getElementById('t')!;
    t.insertAdjacentHTML('beforebegin', '<p>before</p>');
    t.insertAdjacentHTML('afterbegin', '<span>start</span>');
    t.insertAdjacentHTML('beforeend', '<span>end</span>');
    t.insertAdjacentHTML('afterend', '<p>after</p>');
    expect(t.previousElementSibling?.textContent).toBe('before');
    expect(t.firstElementChild?.textContent).toBe('start');
    expect(t.lastElementChild?.textContent).toBe('end');
    expect(t.nextElementSibling?.textContent).toBe('after');
  });

  it('attributes and classList manipulation', () => {
    const doc = parse("<body><div class='a b'></div></body>");
    const div = doc.querySelector('div')!;
    expect(div.classList.contains('a')).toBe(true);
    div.classList.add('c');
    div.classList.remove('a');
    expect(div.className).toBe('b c');
    expect(div.classList.toggle('b')).toBe(false);
    div.setAttribute('data-x', '1');
    expect(div.getAttribute('data-x')).toBe('1');
    expect(div.dataset.x).toBe('1');
    expect(div.getAttributeNames()).toContain('data-x');
    div.removeAttribute('data-x');
    expect(div.hasAttribute('data-x')).toBe(false);
  });

  it('style reflects the style attribute as a CSSStyleDeclaration', () => {
    const doc = parse(`<body><div style="color: red; margin-top: 4px !important"></div></body>`);
    const div = doc.querySelector('div')!;
    expect(div.style.color).toBe('red');
    expect(div.style.getPropertyValue('margin-top')).toBe('4px');
    expect(div.style.getPropertyPriority('margin-top')).toBe('important');
    expect(div.style.length).toBe(2);

    div.style.color = 'green';
    div.style.backgroundColor = 'blue';
    expect(div.getAttribute('style')).toContain('color: green;');
    expect(div.getAttribute('style')).toContain('background-color: blue;');

    div.style.removeProperty('margin-top');
    expect(div.style.getPropertyValue('margin-top')).toBe('');

    div.style.cssText = 'display: none';
    expect(div.style.display).toBe('none');
    expect(div.getAttribute('style')).toBe('display: none;');

    div.style = 'position: absolute';
    expect(div.style.position).toBe('absolute');
  });

  it('template content is parsed inertly', () => {
    const doc = parse('<body><template><p>inert</p></template></body>');
    const tpl = doc.querySelector('template')!;
    const content = tpl.content as DocumentFragment;
    expect(content.childNodes.length).toBe(1);
    expect(tpl.childNodes.length).toBe(0);
  });

  it('content reflects the attribute on <meta>', () => {
    const doc = parse(`<head><meta name="viewport" content="width=device-width"></head>`);
    const meta = doc.querySelector('meta')!;
    expect(meta.content).toBe('width=device-width');
    meta.content = 'no-cache';
    expect(meta.getAttribute('content')).toBe('no-cache');
  });
});
