# StickyDesk

[English](./README.md)
[使用说明](./使用说明.md)

StickyDesk 是一个紧凑型桌面侧栏工具，整合了便签、未来倒计时任务和短时专注计时。  
它以窄栏无原生标题栏窗口运行，并将运行数据保存在程序旁的 `data/` 文件夹中。

> 当前版本：`v0.3.0`

## 核心功能

- 便签：
  - 本地 JSON 存储（`data/notes.json`）
  - 新建、搜索、展开、编辑、删除
  - 标签、Pin 开关、按时间排序
- 未来任务：
  - 独立 JSON 存储（`data/future-tasks.json`）
  - 独立的长时倒计时列表
  - 支持新建和二次确认删除
- 活跃与专注：
  - 基于系统空闲时间的活跃时长统计
  - `Today` / `Total` 计时
  - 短时专注计时器、到时提醒、完成计次
- 窗口外壳：
  - 无边框半透明侧栏
  - 设置、最小化、关闭按钮
  - 可调窗口尺寸、UI 缩放、主题、排序和背板透明度
  - `Always on Top` 与可选的闲置自动淡出
- 发布形式：
  - Windows 便携版
  - Windows 目录版

## 数据文件

StickyDesk 会自动创建并维护以下文件：

- `data/notes.json`
- `data/future-tasks.json`
- `data/settings.json`

## 结构概览

- `main.cjs`：Electron 主进程、存储、窗口控制、IPC
- `preload.cjs`：渲染层桥接
- `src/components/notes/`：便签、未来任务、计时器和窗口控件 UI
- `src/hooks/`：活跃时间、设置、便签、未来任务、专注计时逻辑
- `src/pages/NotesBoard.tsx`：主界面组合

## 下一步

### v0.4.0

- 继续优化启动与冷启动体验
- 将未来任务扩展成更完整的日程 / 计划型倒计时
- 增加托盘与后台控制
- 增加本地数据导入 / 导出
- 评估引入 `electron-vite`，进一步整理构建链路

### 后续方向

- 在可行范围内继续压缩 Electron 带来的开销
- 继续扩展筛选、组织与任务管理能力
- 只有当启动速度和包体积成为硬性瓶颈时，再认真评估迁移到 Tauri

## 许可证

MIT
