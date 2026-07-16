# Geometry Draft Board

面向初中和高中课堂的轻量几何草稿板。它保留了 CAD 式的便利性，但尽量去掉复杂工程化操作，重点服务学生和老师的课堂草图、几何辅助作图、函数图像绘制和 AI 交互讲解。

在线体验：`https://sailing52188.github.io/geometry-draft-board/`

仓库地址：`https://github.com/sailing52188/geometry-draft-board`

离线版只需要一个浏览器即可运行。

## 主要能力

- 可见且分类陈列的绘图命令，核心工具不隐藏。
- 更适合中学数学的几何作图：线段、射线、折线、多边形、三角形、直角三角形、矩形、圆、圆弧、标注。
- 坐标系与函数图像：直线、二次函数、正弦、余弦、椭圆、双曲线。
- 函数解析式展示与交点坐标计算。
- 吸附增强：端点、交点、坐标轴、整数刻度、函数曲线、平行/垂直等关系提示。
- 精确定点：可直接输入坐标生成点，再继续完成直线、折线、多边形等绘制。
- 课堂友好的快捷键：兼容 macOS `Cmd` 与 Windows `Ctrl` 常用组合键。
- iPad 触控优化：较大的点击区域与适配后的控制面板。
- AI 助手：支持根据文字描述画图、分步解题、基于画布做几何分析。

## 快速开始

### 直接打开

双击 `index.html`，或拖入浏览器即可使用。

### 本地预览

```bash
npm test
npm run check:syntax
npm run serve
```

然后打开 `http://127.0.0.1:8765/`。

## 项目结构

- `index.html`：单文件应用，包含 UI、Canvas 渲染与交互逻辑。
- `tests/geometry_ux_regression_test.js`：几何与 UX 静态回归测试。
- `scripts/check-syntax.js`：检查 `index.html` 内嵌脚本语法。
- `docs/feature-spec.md`：这轮中学数学绘图增强的功能说明。

## AI 使用说明

- AI 功能默认对接 DeepSeek 接口。
- API Key 由用户在浏览器中自行输入。
- Key 仅保存在当前浏览器的 `localStorage`，不会随仓库上传。
- 如果不配置 Key，几何草稿和函数绘图功能仍可独立使用。

## 适用场景

- 老师课堂板书前快速构图
- 学生几何题草图、辅助线和函数草稿
- 在坐标系中观察图形关系、交点和解析式
- 用 AI 辅助解释图形与分步讲题

## 开发命令

- `npm test`：运行回归测试
- `npm run check:syntax`：校验内嵌脚本语法
- `npm run serve`：本地启动静态预览

## License

MIT
