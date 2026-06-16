# @steelwhite/dom-parser

A browser-compatible implementation of the **[DOMParser API](https://developer.mozilla.org/en-US/docs/Web/API/DOMParser)** for Node.js and other JS runtimes, focused on
document traversal and manipulation (not layout/rendering).

The actual parsing of HTML and XML is delegated to the excellent [`parse5`](https://github.com/inikulin/parse5) and [`htmlparser2`](https://github.com/fb55/htmlparser2) libraries respectively.
CSS selector queries are performed using
[`@asamuzakjp/dom-selector`](https://github.com/asamuzaK/domSelector) which has comprehensive support for CSS Selectors Level 4 (`:is()`, `:not()`, `:where()`, `:has()` etc).

```ts
import { DOMParser } from '@steelwhite/dom-parser';

const doc = new DOMParser().parseFromString(
  `<!DOCTYPE html><ul class="list">
     <li data-id="1">One</li>
     <li class="active" data-id="2">Two</li>
   </ul>`,
  'text/html',
);

doc.querySelector('li.active')?.textContent; // "Two"
doc.querySelectorAll('ul.list > li').length; // 2
doc.querySelector('[data-id="2"]')?.closest('ul')?.className; // "list"
```

## Scope

This library deliberately implements the **document model** — the parts of the
DOM concerned with structure, traversal, querying and mutation. Layout- and
rendering-related APIs (`getBoundingClientRect`, `offsetWidth`, `scrollTop`,
`getComputedStyle`, event dispatching, etc.) are intentionally **not** included.

The library comes with its own set of `Document`, `Element`, `Node` and related classes.
