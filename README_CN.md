# StickyDesk

[English](./README.md)

StickyDesk 是一个基于 Electron、React 和 Vite 构建的紧凑型桌面便签侧栏。
它的定位是一个贴边停靠的轻量桌面面板，用于快速记录、快速浏览，以及提供一些轻度专注辅助能力。

> 状态：`v0.1` 原型版本。当前核心外壳已经可用，本地便签持久化已经接通，但任务系统和高级设置仍在后续规划中。

## 当前功能

### 便签

- 面向桌面侧边停靠的窄面板布局
- 本地 JSON 持久化存储（`data/notes.json`）
- 支持通过内联表单新建便签
- 支持单条便签展开 / 收起
- 支持标题、正文、标签的内联编辑
- 支持在展开态删除便签
- 支持通过开关切换 Pin 状态，并在置顶区与普通区之间移动
- 支持按标题、正文、标签进行快速搜索

### 活跃时间统计

- 基于 Electron `powerMonitor.getSystemIdleTime()` 统计活跃时间
- 显示 `Today` 与 `Total` 两类活跃时长
- 显示当前状态（`Active now`、`Idle` 或不可用）
- 支持清零当天与总计时
- 活跃时长数据持久化在 `localStorage`

### 窗口外壳

- 无原生标题栏的半透明桌面面板
- 内置悬浮自定义按钮：设置、最小化、关闭
- 内置窗口尺寸预设
- 支持 `Always on Top` 全局置顶
- 隐藏原生滚动条，保持紧凑外观
- 支持生成 Windows 便携版打包产物

## 当前限制

- 设置面板中的主题与排序仍是占位项
- 还没有短时倒计时 / 专注计时功能
- 还没有系统托盘集成
- 便携单文件版本在启动和关闭时可能偏慢，因为运行前会解压、退出时会清理临时文件

## 技术栈

- Electron
- React 19
- TypeScript
- Vite
- 存储：当前优先使用本地 JSON；只有当后续确实出现更重的查询或索引需求时，再考虑升级到 SQLite

## 项目结构

- `main.cjs`：Electron 主进程、本地 JSON 存储与 IPC
- `preload.cjs`：安全的渲染进程桥接层
- `src/pages/NotesBoard.tsx`：主页面组合
- `src/components/notes/`：便签 UI、编辑器、卡片与窗口控制组件
- `src/hooks/useActiveTime.ts`：活跃时间统计逻辑
- `src/hooks/useNotes.ts`：便签加载、筛选与增删改封装
- `src/data/notes.ts`：渲染层便签 I/O 适配器
- `data/notes.json`：运行时便签数据文件（缺失时自动创建）

## 开发

### 安装依赖

```bash
npm install
```

### 启动开发环境

```bash
npm run dev
```

### 校验

```bash
npm run typecheck
npm run build
```

### 打包（Windows 便携版）

```bash
npm run package:win
```

## 路线图

### 下一阶段（`v0.2`）

- [ ] 优化启动与关闭速度，重点改善便携版体验
- [ ] 在保持观感的前提下，降低半透明毛玻璃外壳的渲染成本
- [ ] 增加短时倒计时 / 专注计时能力
- [ ] 将主题和排序从占位项改为真实设置

### 后续阶段

- [ ] 增加系统托盘与后台控制能力
- [ ] 增加便签与设置的导入 / 导出
- [ ] 只有在本地 JSON 明显不够用时，再评估 SQLite

## 许可

MIT
