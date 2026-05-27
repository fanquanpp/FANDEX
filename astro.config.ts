import { defineConfig } from 'astro/config'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import vue from '@astrojs/vue'

export default defineConfig({
  site: 'https://fanquanpp.github.io',
  base: '/MyNotebook/',
  integrations: [
    mdx(),
    sitemap(),
    vue(),
  ],
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
      wrap: true,
    },
  },
  build: {
    inlineStylesheets: 'auto',
  },
})
