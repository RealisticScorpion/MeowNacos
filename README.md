# MeowNacos (=•́ܫ•̀=)

English | [简体中文](README.zh-CN.md)

<p align="center">
  <img src="public/cat_only.png" alt="MeowNacos Logo" width="140" height="140" />
</p>

<p align="center">
  <strong>Your friendly orange cat config comparison & archive management assistant, sensitive and gentle.</strong>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg" alt="License" /></a>
  <img src="https://img.shields.io/badge/Tauri-v2-orange.svg" alt="Tauri v2" />
  <img src="https://img.shields.io/badge/React-v19-61dafb.svg" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-v5-blue.svg" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Rust-2021-black.svg?logo=rust" alt="Rust" />
  <img src="https://img.shields.io/badge/Platform-macOS%20%7C%20Windows-lightgrey.svg" alt="Platforms" />
</p>

MeowNacos is a beautiful, high-contrast desktop GUI application built for **Nacos configuration ZIP archive comparison**. Built with the latest **Tauri v2 + React + TypeScript + Modern CSS** architecture, it combines the extreme performance and safety of Rust with the clean, smooth interactions of modern frontend technologies.

---

## ✨ Features

* **✨ Semantic Sorting Diff**: Recursively sorts YAML, JSON, and Properties keys alphabetically before comparison, completely eliminating out-of-order environment noises.
* **📦 Smart Archive Extraction**: Auto-restores directory structures using Nacos `.metadata.yml` files, with a fallback pattern matching `<Group>/<DataId>` for metadata-less packages.
* **📝 In-App Editor**: Native split-screen and full-screen text editors to directly modify base (A) and target (B) packages on the fly.
* **💾 Atomic Safe Write-Back**: Stream-writes modifications using temporary files (`.zip.tmp`) and atomically overwrites the original archive, keeping files safe from crashes.
* **🌙 Dark & Light Themes**: High-contrast dark and light modes with optimized colors and adjustable monospaced coding fonts (JetBrains Mono, Fira Code, Intel One Mono, etc.).
* **📂 Advanced IDE Interactions**: Fluid folder tree collapsing, step-less dragging divider (`15% ~ 85%`), and fully adaptive layout configurations.
* **🕒 Recent History Memory**: Automatically remembers the last 5 comparison pairs with timestamps for quick reload on startup.
* **🖥️ Native OS Integration**: Multi-channel localizations (menus, shortcuts, dialogs) tailored for macOS and Windows, featuring automatic high-DPI window centering.

---

## ❓ Why MeowNacos?

When deploying microservices across environments (e.g., DEV, TEST, PROD), comparing and adjusting Nacos configuration files is frequent yet high-risk:
- **Pain Point of Standard Diff Tools**: Exported Nacos archives often scramble the physical key order. Plain diff tools show countless false-positive diff lines where properties simply swapped places, obscuring real value modifications.
- **Pain Point of Pack Management**: Adjusting small values in archives requires unzipping, editing, and zipping them back, which is error-prone and can easily break Nacos' import formats.

**MeowNacos solves this**: By sorting keys semantically in Rust memory and providing crash-safe atomic ZIP modifications, managing your configuration archives becomes as smooth as an orange cat grooming its fur.

💡 For detailed use cases, check out [Typical Use Cases 🐾](docs/use-cases.md).

---

## 🛠️ Installation & Getting Started

### Prerequisites
- **Node.js** (v18 or higher)
- **Rust Toolchain** (rustc, cargo v1.75 or higher)

### Setup & Local Development
```bash
# 1. Clone the repository
git clone https://github.com/huyue/MeowNacos.git
cd MeowNacos

# 2. Install dependencies
npm install

# 3. Start development server (launches the React app & Tauri shell)
npm run tauri dev
```

### Build Installers
To build standalone distribution installers (`.dmg`/`.app` on macOS, `.msi`/`.exe` on Windows):
```bash
npm run tauri build
```
For deep-dive compilation and OS branch isolation details, check out [Architecture & Adaptation ⚙️](docs/architecture.md).

---

## 🗺️ Roadmap

- [x] Tauri v2 & React 19 core desktop framework
- [x] YAML / JSON / Properties alphabetical sorting comparison
- [x] Direct archive file editing & atomic safe write-back
- [x] Multi-platform translated native menus & system shortcuts
- [ ] Add semantic sorting for XML / TOML / INI configuration files
- [ ] Export diff difference reports in HTML or Markdown format
- [ ] Direct Nacos Server connection for online sync & remote diffs

---

## 🤝 Contributing

We highly appreciate contributions! Please read [CONTRIBUTING.md](CONTRIBUTING.md) to learn how to open issues, make pull requests, and follow code styling conventions.

---

## 📄 License

This project is licensed under the **[Apache License 2.0](LICENSE)**.

---

## (=•́ܫ•̀=) Orange Cat Wish
> May your systems run stably with no bugs, no outages, and perfectly matched configurations. Meow out loud at the end of the day and go home relaxed! 🐾
