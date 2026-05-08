---
layout: home

hero:
  name: SakuraNav
  text: 优雅的个人导航页
  tagline: 基于 Next.js 16 + React 19 的全栈导航页，支持公开浏览与登录管理
  image:
    src: /browser-tab-logo.png
    alt: SakuraNav
  actions:
    - theme: brand
      text: 开发文档
      link: /guide/architecture
    - theme: alt
      text: Docker 部署
      link: /docker
    - theme: alt
      text: GitHub
      link: https://github.com/QingYu-Su/SakuraNav

features:
  - icon: 🎨
    title: 精致界面
    details: 明暗主题切换、樱花/星空动态背景、响应式设计、壁纸与毛玻璃独立定制、标签切换动画
  - icon: 🤖
    title: AI 驱动
    details: 智能网站分析、关键词推荐、浏览器书签智能导入、网站关联推荐
  - icon: 📝
    title: 笔记卡片
    details: Markdown 编辑预览、图片/文件上传、sakura-site:// 引用同步网站 Todo
  - icon: 🏷️
    title: 灵活管理
    details: 拖拽排序、多标签关联、在线检测、备忘便签、备选 URL、右键菜单
  - icon: 📱
    title: 社交卡片
    details: 12 种社交平台卡片，独立详情页展示账号与二维码
  - icon: 👥
    title: 多用户
    details: 独立数据空间、OAuth 登录（GitHub/微信/飞书/钉钉）、引导页注册、版本快照与恢复
  - icon: 💾
    title: 多数据库
    details: SQLite / MySQL / PostgreSQL 一键切换；ZIP 导入导出、浏览器书签导入
  - icon: 🔐
    title: 安全加固
    details: CSRF/SSRF/XSS 防护、速率限制、JWT + HttpOnly Cookie、Token 吊销
---

<style>
:root {
  --vp-home-hero-name-color: transparent;
  --vp-home-hero-name-background: -webkit-linear-gradient(120deg, #f472b6, #ec4899);
  --vp-home-hero-image-background-image: linear-gradient(-45deg, #fce7f3 50%, #fdf2f8 50%);
  --vp-home-hero-image-filter: blur(44px);
}
</style>
