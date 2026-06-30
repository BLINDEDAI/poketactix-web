// Neutral inline sprite placeholder (AC-7). Sprites are a best-effort NETWORK image and are NOT
// bundled; when the network image is absent or fails to load (offline / 404) the card falls back to
// this placeholder so it still renders every data-driven field with no broken-image artifact on stream.
//
// It is a tiny inline SVG `data:` URI — no network request, allowed by the CSP `img-src … data:`
// directive (kept intact by the DevOps phase). A Poké-Ball glyph in muted neutral tones.

export const SPRITE_PLACEHOLDER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="37" height="37" viewBox="0 0 37 37" role="img" aria-hidden="true">' +
      '<circle cx="18.5" cy="18.5" r="16" fill="#2b303b" stroke="#5b6172" stroke-width="2"/>' +
      '<path d="M3 18.5h12a3.5 3.5 0 0 0 7 0h12" fill="none" stroke="#5b6172" stroke-width="2"/>' +
      '<circle cx="18.5" cy="18.5" r="3.5" fill="#1c2029" stroke="#5b6172" stroke-width="2"/>' +
      '</svg>',
  )
