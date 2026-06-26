# MeowNacos Architecture & Design Details ⚙️

This document describes the technical architecture, platform branch isolation, and compile-time optimizations used in MeowNacos.

English | [简体中文](#简体中文)

---

## English

### 1. Tauri Native API & OS Branch Isolation
* **macOS Integration**: On macOS, Rust's `#[cfg(target_os = "macos")]` compile-time attributes are used to dynamically inject Apple-specific native menus (such as "About MeowNacos", "Services", "Hide", and "Quit") and bind macOS-standard shortcuts like `Cmd + Shift + H` for app menus.
* **Windows/Linux Integration**: When compiled on Windows or Linux, the build system automatically excludes Apple-exclusive menu structures, retaining only "File", "Edit", "Window", and "Help", mapping the default menus to Windows-friendly shortcuts like `Ctrl + Shift + H`.
* **Platform Independence**: Frontend path operations automatically handle differences between Windows backslashes (`\`) and Unix forward slashes (`/`), ensuring seamless display and parsing of file paths inside ZIP files on all systems.

### 2. DPI & Native Window Resolution Adaptation
* During the Tauri application startup phase (`setup` stage in Rust), the backend calls `monitor.scale_factor()` to read the physical screen's DPI scale.
* It dynamically computes a logical window size equivalent to 80% width and 60% height of the user's primary monitor, and centers the window. This prevents layout issues on high-DPI displays (e.g., Apple Retina screens or 4K Windows setups).

### 3. Release Optimizations & Packaging
* Running `npm run tauri build` executes the Rust compiler with release optimizations:
  - Link-Time Optimization (`lto = true`) is enabled for cross-crate code minimization.
  - Optimization level set to maximum (`opt-level = 3`) to maximize execution speed.
  - Debug symbols are stripped to keep binary sizes lightweight.
* Icons are bundled natively: `.icns` for macOS and `.ico` for Windows, packaged directly into distribution installers (`.dmg`/`.msi`).

---

## 简体中文

### 1. Tauri Native API 平台分支隔离
* **macOS 适配**：在 macOS 下，利用 Rust 的 `#[cfg(target_os = "macos")]` 编译属性动态注入 Apple 专属菜单（“关于 MeowNacos”、“服务”、“隐藏”、“退出”等），并绑定 macOS 原生的 `Cmd + Shift + H` 快捷键，确保与系统操作逻辑一致。
* **Windows/Linux 适配**：在 Windows 或 Linux 下编译时，会自动屏蔽苹果专属的应用菜单，仅保留“文件”、“编辑”、“窗口”、“帮助”，并自动将快捷键映射为 `Ctrl + Shift + H`，完美符合 Windows 操作系统原生窗口菜单交互标准。
* **抹平路径分隔符**：前端在文件名截取上自动过滤并兼容 Windows 的反斜杠 `\` 与 Unix 系统的正斜杠 `/`，保证在跨平台下文件名都能优雅展示。

### 2. DPI 与窗口自适应
* 在 Rust 启动生命周期（`setup` 阶段）中，通过 `monitor.scale_factor()` 动态获取物理显示器的 DPI 缩放率。
* 动态计算出占当前屏幕宽度 80%、高度 60% 的逻辑分辨率并居中，防止在高分屏（如 Mac Retina 屏与 Windows 4K 屏）上出现界面过大或缩水，实现极致的跨平台视觉一致性。

### 3. Release 构建包编译验证
* 执行 `npm run tauri build` 时，Tauri CLI 会启动 Rust 编译器的发布版打包流程（开启 `lto` 链路时优化和最高级别 `opt-level = 3` 的速度优化，并剥离全部不必要的调试符号）。
* 系统会自动读取重制后的 Squircle 透明投影 `icon.icns`（macOS 平台）或 `icon.ico`（Windows 平台），将其作为成品图标嵌入到打包生成的可执行二进制文件与安装包包体中。
