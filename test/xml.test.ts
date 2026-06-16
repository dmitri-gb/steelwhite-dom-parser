import { describe, it, expect } from 'bun:test';
import { DOMParser, CDATASection, ProcessingInstruction, NodeType } from '../src/index.js';

const parseXml = (xml: string, type = 'application/xml') =>
  new DOMParser().parseFromString(xml, type as 'application/xml');

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="style.xsl"?>
<library xmlns="urn:books" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <book id="b1" dc:title="The DOM">
    <Title>Learning the DOM</Title>
    <note><![CDATA[ raw <unescaped> & text ]]></note>
    <!-- a comment -->
  </book>
</library>`;

describe('XML parsing', () => {
  it('produces an XML (non-HTML) document', () => {
    const doc = parseXml('<root/>', 'text/xml');
    expect(doc.contentType).toBe('text/xml');
    expect(doc.nodeType).toBe(NodeType.DOCUMENT_NODE);
    expect(doc.documentElement?.tagName).toBe('root');
  });

  it('preserves tag and attribute case', () => {
    const doc = parseXml('<Root DataValue="x"><Child/></Root>');
    const root = doc.documentElement!;
    expect(root.tagName).toBe('Root');
    expect(root.localName).toBe('Root');
    expect(root.getAttribute('DataValue')).toBe('x');
    expect(root.getAttribute('datavalue')).toBeNull();
    expect(root.firstElementChild?.tagName).toBe('Child');
  });

  it('uses case-sensitive selectors', () => {
    const doc = parseXml(SAMPLE);
    expect(doc.querySelector('Title')?.textContent).toBe('Learning the DOM');
    expect(doc.querySelector('title')).toBeNull();
    expect(doc.querySelectorAll('book').length).toBe(1);
  });

  it('resolves default and prefixed namespaces', () => {
    const doc = parseXml(SAMPLE);
    const root = doc.documentElement!;
    expect(root.namespaceURI).toBe('urn:books');
    const book = doc.querySelector('book')!;
    expect(book.namespaceURI).toBe('urn:books');
    expect(book.getAttribute('dc:title')).toBe('The DOM');
    expect(book.getAttributeNS('http://purl.org/dc/elements/1.1/', 'title')).toBe('The DOM');
    // Default namespace does not apply to attributes.
    const idAttr = book.getAttributeNode('id')!;
    expect(idAttr.namespaceURI).toBeNull();
  });

  it('builds CDATA sections', () => {
    const doc = parseXml(SAMPLE);
    const note = doc.querySelector('note')!;
    expect(note.firstChild).toBeInstanceOf(CDATASection);
    expect(note.firstChild?.nodeType).toBe(NodeType.CDATA_SECTION_NODE);
    expect(note.textContent).toBe(' raw <unescaped> & text ');
  });

  it('represents processing instructions but not the XML declaration', () => {
    const doc = parseXml(SAMPLE);
    const pis = [...doc.childNodes].filter((n): n is ProcessingInstruction => n instanceof ProcessingInstruction);
    expect(pis.length).toBe(1);
    expect(pis[0]!.target).toBe('xml-stylesheet');
    expect(pis[0]!.data).toBe('type="text/xsl" href="style.xsl"');
  });

  it('parses a DOCTYPE declaration', () => {
    const doc = parseXml('<!DOCTYPE note SYSTEM "Note.dtd"><note/>');
    expect(doc.doctype?.name).toBe('note');
    expect(doc.doctype?.systemId).toBe('Note.dtd');
  });

  it('round-trips through XML serialization', () => {
    const doc = parseXml('<a xmlns:dc="urn:dc"><b id="1" dc:k="v"><c><![CDATA[<raw> & ]]></c><e/></b></a>');
    const a = doc.documentElement!;
    expect(a.outerHTML).toBe('<a xmlns:dc="urn:dc"><b id="1" dc:k="v"><c><![CDATA[<raw> & ]]></c><e/></b></a>');
    expect(doc.querySelector('c')!.innerHTML).toBe('<![CDATA[<raw> & ]]>');
  });

  it('escapes text content on serialization', () => {
    const doc = parseXml('<x>a &amp; b &lt; c</x>');
    expect(doc.documentElement!.textContent).toBe('a & b < c');
    expect(doc.documentElement!.outerHTML).toBe('<x>a &amp; b &lt; c</x>');
  });

  it('supports DOM manipulation on XML nodes', () => {
    const doc = parseXml('<root><item>1</item></root>');
    const root = doc.documentElement!;
    const item = doc.createElement('Item');
    item.textContent = '2';
    root.appendChild(item);
    expect(root.children.length).toBe(2);
    expect(root.lastElementChild?.tagName).toBe('Item');
    expect(root.outerHTML).toBe('<root><item>1</item><Item>2</Item></root>');
  });
});
