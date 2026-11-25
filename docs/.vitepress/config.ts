import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "advanced-express",
  description: "Interactive, server-rendered Express apps without a front-end build step",
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide' }
    ],
    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'Getting Started', link: '/' },
        ]
      },
      {
        text: 'Guide',
        items: [
          { text: 'Server', link: '/guide#server' },
          { text: 'State and bindings', link: '/guide#state-and-bindings' },
          { text: 'Scopes', link: '/guide#scopes' },
          { text: 'Components', link: '/guide#components' },
          { text: 'Lists', link: '/guide#lists' },
          { text: 'Data fetching', link: '/guide#data-fetching' },
          { text: 'Forms', link: '/guide#forms' },
          { text: 'Router', link: '/guide#router' },
          { text: 'Animations', link: '/guide#animations' },
          { text: 'Live state', link: '/guide#live-state' },
          { text: 'Dev mode', link: '/guide#dev-mode' },
        ]
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/Emmanuek5/react-express' }
    ]
  }
})
