import { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import NotFound from './404.vue'

export default {
  extends: DefaultTheme,
  NotFound: NotFound
} as Theme
