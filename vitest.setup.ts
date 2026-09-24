// src/lib/api.ts reads location.hostname when it loads; modules that import it (useTips, and
// so courseCategories) need a location in Node.
if (!('location' in globalThis)) Object.defineProperty(globalThis, 'location', { value: new URL('http://localhost/'), configurable: true });
