# MeowNacos (=•́ܫ•̀=)

[English](README.md) | 简体中文

<p align="center">
  <img src="public/cat_only.png" alt="MeowNacos Logo" width="140" height="140" />
</p>

<p align="center">
  <strong>您的橘猫配置比对与归档管理助手，像小猫咪一样灵敏且温柔。</strong>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg" alt="License" /></a>
  <img src="https://img.shields.io/badge/Tauri-v2-orange.svg" alt="Tauri v2" />
  <img src="https://img.shields.io/badge/React-v19-61dafb.svg" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-v5-blue.svg" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Rust-2021-black.svg?logo=rust" alt="Rust" />
  <img src="https://img.shields.io/badge/Platform-macOS%20%7C%20Windows-lightgrey.svg" alt="Platforms" />
</p>

MeowNacos 是一款专为 **Nacos 导出配置压缩包（.zip）比对** 打造的高对比度桌面 GUI 工具。基于最新的 **Tauri v2 + React + TypeScript + Modern CSS** 构建，兼具 Rust 的极致安全性能与现代化前端的流畅交互设计。

---

## ✨ 核心特性 (Features)

* **✨ 语义化排序比对**：支持 YAML/JSON/Properties 按键（Key）字典序递归重排比对，彻底消除环境乱序噪音。
* **📦 智能归档提取**：读取 `.metadata.yml` 自动重建目录结构，若缺失元数据则自动基于 `<Group>/<DataId>` 恢复。
* **📝 在线编辑配置**：内置双栏/全屏文本编辑器，支持直接修改 Base（A包）或 Target（B包）中的配置。
* **💾 原子级安全写回**：使用 `.zip.tmp` 临时交换流式写入，确保中途断电/闪退时原 ZIP 包绝对不受损。
* **🌙 极佳的明暗主题**：明亮（Light）与暗黑（Dark）高对比度双主题，配备加宽行距（`1.65`）以降低视觉疲劳。
* **📂 高阶 IDE 交互设计**：支持左侧文件树平滑折叠、无级拖拽双栏比例（`15% ~ 85%`）、完全自适应伸缩布局。
* **🕒 最近对比历史**：自动记忆最近 5 次的对比配对，支持在开屏界面快速秒级重载。
* **🖥️ 跨平台原生汉化**：完美适配 macOS (Retina/DPI 自适应) 和 Windows (DPI 自适应)，原生系统菜单栏完全汉化。

---

## ❓ 为什么选择 MeowNacos？ (Why MeowNacos?)

在日常微服务开发和运维中，比对不同环境（如开发、测试、生产）的 Nacos 配置是一项高频且敏感的操作：
- **普通 Diff 工具的痛点**：因为配置导出顺序随机，普通的文本 Diff 工具会产生大量“仅仅是顺序不同”的干扰噪音。
- **解压修改的繁琐**：想修补压缩包内的配置需要“解压 -> 修改 -> 重新压缩”，稍有不慎还会破坏 Nacos 导入规范。

**MeowNacos 为此而生**：它通过 **Rust 后端在内存中进行字典重排序**，并提供**原子级 ZIP 安全修改回写**，让您的配置管理如同猫咪理毛般顺滑、安全。

💡 详细使用场景请参阅 [典型使用案例 🐾](docs/use-cases.md)。

---

## 🛠️ 安装与运行 (Installation & Usage)

### 运行环境准备
- **Node.js** (v18+)
- **Rust** (rustc, cargo v1.75+)

### 本地运行步骤
```bash
# 1. 克隆仓库
git clone https://github.com/huyue/MeowNacos.git
cd MeowNacos

# 2. 安装前端依赖
npm install

# 3. 运行开发联调模式（会自动拉起 React 服务和 Tauri 桌面窗口）
npm run tauri dev
```

### 打包发布版本
如果您需要将软件打包成独立分发的安装包（macOS 下输出 `.dmg`/`.app`，Windows 下输出 `.msi`/`.exe`）：
```bash
npm run tauri build
```
关于平台适配和编译选项的更多技术细节，请阅读 [架构与平台适配 ⚙️](docs/architecture.md)。

---

## 🗺️ 项目路线图 (Roadmap)

- [x] Tauri v2 & React 19 核心框架搭建
- [x] YAML / JSON / Properties 字典重排语义比对
- [x] ZIP 压缩包内配置直接编辑与原子级写回
- [x] 跨平台原生系统菜单汉化与快捷键
- [ ] 支持更多配置格式（如 XML / TOML / INI）的语义排序
- [ ] 导出配置 Diff 差异报告（HTML / Markdown 格式）
- [ ] 支持直连 Nacos Server 进行线上配置同步与比对

---

## 🤝 贡献指南 (Contributing)

我们非常欢迎并感谢您的任何贡献！请阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 了解如何向项目提交 Issue、Pull Request 以及本地开发规范。

---

## 📄 开源协议 (License)

本项目采用 **[Apache License 2.0](LICENSE)** 协议开源。

---

## (=•́ܫ•̀=) 橘猫寄语
> 祝您的系统稳定运行，无 Bug，无故障，配置次次一致，下班喵呜一声，轻松回家！🐾
