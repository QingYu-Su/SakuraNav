import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'SakuraNav',
  description: '优雅的个人导航页',
  base: '/SakuraNav/',

  ignoreDeadLinks: [/^http:\/\/localhost/],

  head: [['link', { rel: 'icon', href: '/SakuraNav/browser-tab-logo.png' }]],

  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
      themeConfig: {
        nav: [
          { text: '首页', link: '/' },
          { text: '开发文档', link: '/guide/architecture', activeMatch: '/guide/' },
          { text: 'Docker 部署', link: '/docker' },
          { text: '更新日志', link: '/changelog' },
        ],
        sidebar: {
          '/guide/': [
            {
              text: '基础',
              items: [
                { text: '项目架构', link: '/guide/architecture' },
                { text: '目录结构', link: '/guide/directory-structure' },
                { text: '数据存储', link: '/guide/data-storage' },
              ],
            },
            {
              text: '核心模块',
              items: [
                { text: '认证与安全', link: '/guide/auth' },
                { text: '数据库与服务层', link: '/guide/database' },
                { text: '撤销与数据可移植性', link: '/guide/undo-portability' },
                { text: '在线检查机制', link: '/guide/online-check' },
                { text: 'Hooks 与 React 19', link: '/guide/hooks' },
                { text: 'MCP', link: '/guide/mcp' },
              ],
            },
            {
              text: '接口与指南',
              items: [
                { text: 'API', link: '/guide/api' },
                { text: '路由参考', link: '/guide/routes' },
                { text: '开发指南', link: '/guide/dev-guide' },
                { text: '常见问题', link: '/guide/faq' },
              ],
            },
          ],
        },
        outline: { label: '本页目录', level: [2, 3] },
        docFooter: { prev: '上一篇', next: '下一篇' },
        lastUpdated: { text: '最后更新于' },
        editLink: {
          pattern: 'https://github.com/QingYu-Su/SakuraNav/edit/main/docs/:path',
          text: '在 GitHub 上编辑此页',
        },
      },
    },
    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      themeConfig: {
        nav: [
          { text: 'Home', link: '/en/' },
          { text: 'Development', link: '/en/guide/architecture', activeMatch: '/en/guide/' },
          { text: 'Docker', link: '/en/docker' },
          { text: 'Changelog', link: '/en/changelog' },
        ],
        sidebar: {
          '/en/guide/': [
            {
              text: 'Basics',
              items: [
                { text: 'Architecture', link: '/en/guide/architecture' },
                { text: 'Directory Structure', link: '/en/guide/directory-structure' },
                { text: 'Data Storage', link: '/en/guide/data-storage' },
              ],
            },
            {
              text: 'Core Modules',
              items: [
                { text: 'Auth & Security', link: '/en/guide/auth' },
                { text: 'Database & Services', link: '/en/guide/database' },
                { text: 'Undo & Data Portability', link: '/en/guide/undo-portability' },
                { text: 'Online Check', link: '/en/guide/online-check' },
                { text: 'Hooks & React 19', link: '/en/guide/hooks' },
                { text: 'MCP', link: '/en/guide/mcp' },
              ],
            },
            {
              text: 'API & Guides',
              items: [
                { text: 'API', link: '/en/guide/api' },
                { text: 'Routes Reference', link: '/en/guide/routes' },
                { text: 'Development Guide', link: '/en/guide/dev-guide' },
                { text: 'FAQ', link: '/en/guide/faq' },
              ],
            },
          ],
        },
        outline: { label: 'On This Page', level: [2, 3] },
        docFooter: { prev: 'Previous', next: 'Next' },
        lastUpdated: { text: 'Last updated' },
        editLink: {
          pattern: 'https://github.com/QingYu-Su/SakuraNav/edit/main/docs/:path',
          text: 'Edit this page on GitHub',
        },
      },
    },
  },

  themeConfig: {
    socialLinks: [
      { icon: 'github', link: 'https://github.com/QingYu-Su/SakuraNav' },
    ],
    search: {
      provider: 'local',
    },
  },
})
