import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "React Express",
  description: "Documentation for React Express",
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide' }
    ],
    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'Getting Started', link: '/index' },
        ]
      },
      {
        text: 'Core Concepts',
        items: [
          { text: 'Context', link: '/context' },
          { text: 'Error Boundary', link: '/error-boundary' },
          { text: 'Forms', link: '/forms' },
          { text: 'Hot Module Replacement', link: '/hmr' },
          { text: 'Hooks', link: '/hooks' },
          { text: 'Lifecycle', link: '/lifecycle' },
          { text: 'Router', link: '/router' },
          { text: 'State Management', link: '/state-management' },
          { text: 'Reactive State', link: '/reactive-state' },
          { text: 'State', link: '/state' },
          { text: 'Suspense', link: '/suspense' },
          { text: 'Virtual DOM', link: '/vdom' },
          { text: 'Animations', link: '/animations' },
        ]
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/Emmanuek5/react-express' }
    ]
  }
})
