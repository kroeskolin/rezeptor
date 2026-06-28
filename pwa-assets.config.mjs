import { defineConfig } from '@vite-pwa/assets-generator/config'

// Alle Icons vollflächig (padding: 0), damit weder iOS noch Android einen
// transparenten/weißen Rand zeigen. Quelle ist bereits ein volles grünes Quadrat.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    transparent: { sizes: [64, 192, 512], favicons: [[48, 'favicon.ico']], padding: 0 },
    maskable: { sizes: [512], padding: 0 },
    apple: { sizes: [180], padding: 0 },
  },
  images: ['public/icons/icon.svg'],
})
