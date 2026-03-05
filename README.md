# StickyDesk

StickyDesk 是一个基于 **Tauri + React + TypeScript** 的桌面便签与效率工具。  
当前发布版本：`v1.0.1`。

## 为什么迁移到 Tauri

- 保留原有核心功能（便签、Future Task、短时提醒、活跃时长统计）
- 更轻量的运行时与更快的整体响应
- Rust 桌面能力更易扩展（托盘、开机自启、单实例等）

## v1.0.1 重点

- Future Task 支持完成/撤销与删除二次确认
- Future Task 支持点击标题展开后重命名与时间编辑
- 托盘与静默开机自启能力可用（单实例约束已启用）

## 技术栈

- Tauri 2
- Rust
- React 19
- TypeScript
- Vite

## 开发与构建

```bash
npm install
npm run tauri dev
npm run tauri build
```

默认打包输出目录：`src-tauri/target/release/bundle/`

## 文档

- 使用说明：[使用说明.md](./使用说明.md)
- 后续规划：[预期规划.md](./预期规划.md)
