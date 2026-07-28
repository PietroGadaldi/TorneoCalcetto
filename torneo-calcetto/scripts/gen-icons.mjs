import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const outDir = fileURLToPath(new URL('../public/icons/', import.meta.url))
mkdirSync(outDir, { recursive: true })

const favicon = fileURLToPath(new URL('../public/favicon.svg', import.meta.url))
const maskableSource = fileURLToPath(new URL('../public/icon-maskable-source.svg', import.meta.url))

async function render(svgPath, size, outName) {
  await sharp(svgPath, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(path.join(outDir, outName))
  console.log('wrote', outName)
}

await render(favicon, 192, 'icon-192.png')
await render(favicon, 512, 'icon-512.png')
await render(maskableSource, 192, 'maskable-192.png')
await render(maskableSource, 512, 'maskable-512.png')
await render(maskableSource, 180, 'apple-touch-icon.png')
