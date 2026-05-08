---
layout: home

hero:
  name: SakuraNav
  text: An Elegant Personal Navigation Page
  tagline: A full-stack navigation page based on Next.js 16 + React 19, supporting public browsing and login management
  image:
    src: /browser-tab-logo.png
    alt: SakuraNav
  actions:
    - theme: brand
      text: Development Docs
      link: /en/guide/architecture
    - theme: alt
      text: Docker Deployment
      link: /en/docker
    - theme: alt
      text: GitHub
      link: https://github.com/QingYu-Su/SakuraNav

features:
  - icon: 🎨
    title: Refined Interface
    details: Light/dark themes, sakura/star dynamic backgrounds, responsive design, customizable wallpaper & frosted glass, tag switch animations
  - icon: 🤖
    title: AI-Powered
    details: Smart site analysis, keyword recommendations, intelligent browser bookmark import, related site suggestions
  - icon: 📝
    title: Note Cards
    details: Markdown editing & preview, image/file upload, sakura-site:// reference syncs site Todo items
  - icon: 🏷️
    title: Flexible Management
    details: Drag & drop sorting, multi-tag association, online detection, memo notes, alternate URLs, context menu
  - icon: 📱
    title: Social Cards
    details: 12 social platform card types with dedicated detail pages showing account info and QR codes
  - icon: 👥
    title: Multi-user
    details: Independent data spaces, OAuth login (GitHub/WeChat/Feishu/DingTalk), setup wizard, version snapshots & restore
  - icon: 💾
    title: Multi-Database
    details: SQLite / MySQL / PostgreSQL, one-click switch; ZIP import/export, browser bookmark import
  - icon: 🔐
    title: Security
    details: CSRF/SSRF/XSS protection, rate limiting, JWT + HttpOnly Cookie, token revocation
---

<style>
:root {
  --vp-home-hero-name-color: transparent;
  --vp-home-hero-name-background: -webkit-linear-gradient(120deg, #f472b6, #ec4899);
  --vp-home-hero-image-background-image: linear-gradient(-45deg, #fce7f3 50%, #fdf2f8 50%);
  --vp-home-hero-image-filter: blur(44px);
}
</style>
