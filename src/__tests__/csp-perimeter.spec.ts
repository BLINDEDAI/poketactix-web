// Perimeter assertion (AS-* / public-facing-deploy): assert the CSP in web/index.html has
// no external connect-src host (only 'self') and img-src is limited to 'self' data: + the
// sprite host only. A string/grep assertion on the static file is the correct approach for a
// CSP in a static SPA (no header server — the policy lives in a <meta http-equiv> tag).

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
// Path: src/__tests__/ → ../../ = web/ → index.html
const INDEX_HTML = readFileSync(resolve(__dirname, '../../index.html'), 'utf-8')

function extractCsp(html: string): string {
  const match = html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/)
  if (!match || !match[1]) throw new Error('CSP meta tag not found in index.html')
  return match[1]
}

describe('CSP perimeter — AS-* assertions on web/index.html (public-facing-deploy)', () => {
  it('CSP meta tag exists in index.html', () => {
    expect(INDEX_HTML).toContain('Content-Security-Policy')
  })

  it('connect-src is only self — no external data host (PokéAPI removed after ADR-004)', () => {
    const csp = extractCsp(INDEX_HTML)
    // Must contain connect-src 'self'
    expect(csp).toMatch(/connect-src\s+'self'/)
    // Must NOT contain any pokeapi host
    expect(csp).not.toContain('pokeapi.co')
  })

  it("connect-src directive contains only 'self' and no external HTTPS host", () => {
    const csp = extractCsp(INDEX_HTML)
    const connectSrcMatch = csp.match(/connect-src([^;]+)/)
    expect(connectSrcMatch).toBeTruthy()
    const connectSrc = connectSrcMatch![1]!.trim()
    // The only token should be 'self'
    expect(connectSrc).toBe("'self'")
  })

  it('img-src includes self, data:, and the sprite host (raw.githubusercontent.com)', () => {
    const csp = extractCsp(INDEX_HTML)
    expect(csp).toContain('img-src')
    expect(csp).toContain('data:')
    expect(csp).toContain('https://raw.githubusercontent.com')
  })

  it('img-src contains no unexpected external HTTPS host beyond raw.githubusercontent.com', () => {
    const csp = extractCsp(INDEX_HTML)
    const imgSrcMatch = csp.match(/img-src([^;]+)/)
    expect(imgSrcMatch).toBeTruthy()
    const imgSrc = imgSrcMatch![1]!
    // Remove the known-allowed tokens and assert nothing external remains
    const cleaned = imgSrc
      .replace(/['"]self['"]/g, '')
      .replace('data:', '')
      .replace('https://raw.githubusercontent.com', '')
      .trim()
    expect(cleaned).not.toMatch(/https?:\/\//)
  })

  it('script-src has no unsafe-eval', () => {
    const csp = extractCsp(INDEX_HTML)
    const scriptSrcMatch = csp.match(/script-src([^;]+)/)
    expect(scriptSrcMatch).toBeTruthy()
    expect(scriptSrcMatch![1]).not.toContain('unsafe-eval')
  })

  it('script-src has no unsafe-inline', () => {
    const csp = extractCsp(INDEX_HTML)
    const scriptSrcMatch = csp.match(/script-src([^;]+)/)
    expect(scriptSrcMatch).toBeTruthy()
    expect(scriptSrcMatch![1]).not.toContain('unsafe-inline')
  })
})
