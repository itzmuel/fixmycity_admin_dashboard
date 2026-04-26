# 网站 UI 设计与代码规范 (Web UI Design System)

本规范专为 FixMyCity 提供，旨在构建一个现代、极简、干净且带有手绘温度的 Web 应用。整体视觉美学强调结构清晰与充足的留白。

## 1. 核心系统指令 (System Prompt for AI Agent)

You are an expert frontend developer building a modern, minimalist web application using React and Tailwind CSS. Use the following design system strictly. The overall aesthetic is highly clean, structural, and elegant. Do not use heavy drop shadows or bright, saturated colors. Use generous whitespace, crisp typography, and full-rounded pill buttons for primary actions. Incorporate hand-drawn SVG accents for key highlights to add warmth.

## 2. 色彩与视觉变量 (Tailwind 配置)

请将以下配置合并到项目的 `tailwind.config.js` 中，严格使用这些自定义变量进行开发。

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        background: {
          base: '#F8F6FB', // 全局极浅灰紫色基底 [cite: 148]
          card: '#FFFFFF', // 卡片纯白背景 [cite: 150]
          hero: '#F2F2F6', // Hero 区域独有的冷灰白，用于制造内部画中画层次
        },
        primary: {
          DEFAULT: '#7776AB', // 主强调色（长春花蓝/灰紫），用于按钮、手绘圈选、插画阴影
          hover: '#646395',   // 交互悬停状态
          light: '#E7E1F5',   // 极浅的紫色，用于辅助背景或 Tag [cite: 158]
        },
        text: {
          main: '#1A1A1A',      // 主标题深炭黑，提供极强对比度
          secondary: '#6E7185', // 次要文本与辅助说明 [cite: 153]
          muted: '#A1A3B1',     // 占位符或极弱提示
        },
        border: {
          light: '#E7E1F1',   // 极细柔和的浅色边框 [cite: 59]
          divider: '#EEE8F5', // 模块间的底层分割线 [cite: 161]
        }
      },
      boxShadow: {
        'card-soft': '0 8px 30px rgba(120, 100, 160, 0.08)', // 卡片专属的柔和扩散阴影 [cite: 60]
        'float': '0 12px 40px rgba(120, 100, 170, 0.08)',    // 悬浮组件的高层级阴影 [cite: 201]
      },
      borderRadius: {
        'card': '20px', // 模块化卡片标准圆角 [cite: 61]
      }
    }
  }
}