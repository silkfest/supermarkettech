const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')

const css = fs.readFileSync('app/globals.css', 'utf8')
const nav = fs.readFileSync('components/layout/MobileBottomNav.tsx', 'utf8')

/** The padding-bottom declaration of a class in globals.css. */
const rule = (name) => {
  const match = css.match(new RegExp(`\\.${name}\\s*{([^}]*)}`))
  assert.ok(match, `globals.css defines .${name}`)
  return match[1].trim()
}

test('the bottom nav does not stack its own padding on the home indicator', () => {
  // The buttons carry py-3. Adding the whole inset underneath put 46px of white
  // below the labels on a notched phone where 34px is the clearance needed, so
  // the inset absorbs that 0.75rem instead of sitting on top of it.
  assert.match(nav, /className="nav-inset /, 'nav uses the absorbing inset')
  assert.doesNotMatch(nav, /className="safe-bottom /, 'nav no longer adds the raw inset')
  assert.match(rule('nav-inset'), /max\(\s*env\(safe-area-inset-bottom\)\s*-\s*0\.75rem\s*,\s*0px\s*\)/)
})

test('content padding stays in step with the nav height', () => {
  // pb-nav reserves space for the fixed nav. If it keeps the old expression
  // while the nav shrinks, every page over-pads and content floats; if it
  // under-reserves, the last row hides behind the nav.
  const padding = rule('pb-nav')
  assert.match(padding, /3\.5rem/, 'still clears the 3.5rem button row')
  assert.match(
    padding,
    /max\(\s*env\(safe-area-inset-bottom\)\s*-\s*0\.75rem\s*,\s*0px\s*\)/,
    'pb-nav must use the same inset expression as .nav-inset',
  )
})

test('a phone with no home indicator is left exactly as it was', () => {
  // max(0 - 0.75rem, 0px) is 0, so a flat phone keeps the plain py-3 and the
  // nav stays 3.5rem tall — this change is only meant to affect notched ones.
  for (const name of ['nav-inset', 'pb-nav']) {
    assert.match(rule(name), /,\s*0px\s*\)/, `.${name} floors at 0px`)
  }
})
