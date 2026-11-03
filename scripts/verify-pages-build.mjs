import { access, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const outputDirectory = resolve('dist')
const requiredFiles = ['index.html', 'manifest.webmanifest', 'favicon.svg', '.nojekyll']

await Promise.all(requiredFiles.map((file) => access(resolve(outputDirectory, file))))

const html = await readFile(resolve(outputDirectory, 'index.html'), 'utf8')
const htmlReferences = Array.from(
  html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi),
  (match) => match[1],
)

const manifest = JSON.parse(
  await readFile(resolve(outputDirectory, 'manifest.webmanifest'), 'utf8'),
)
const manifestReferences = [
  manifest.start_url,
  manifest.scope,
  ...(manifest.icons ?? []).map((icon) => icon.src),
].filter((value) => typeof value === 'string')

const rootAbsoluteReferences = [...htmlReferences, ...manifestReferences]
  .filter((reference) => reference.startsWith('/'))

if (rootAbsoluteReferences.length > 0) {
  throw new Error(
    `The Pages build contains root-absolute asset paths: ${rootAbsoluteReferences.join(', ')}`,
  )
}

console.log('GitHub Pages build verified: assets are safe to serve from any subdirectory.')
