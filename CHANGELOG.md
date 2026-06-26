# Changelog

All notable changes to the MeowNacos project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] - 2026-06-26

### Added
- **Intelligent Metadata Recovery**: Automatically restores directory structures and data mapping using Nacos `.metadata.yml` files or fallback properties patterns.
- **Semantic Sorting diff**: Added sorting-based key matching for YAML, JSON, and Properties configuration files to eliminate ordering noise in diffs.
- **In-App Editing**: Integrated native full-screen text editor to modify configuration packs on the fly.
- **Atomic File Write-Back**: Implemented transaction-like, crash-safe ZIP overwriting using temporary file swapping (`.zip.tmp`).
- **High-Contrast Dark Mode**: Support for light and dark themes with optimized accessible diff colors and customizable programming fonts (JetBrains Mono, Fira Code, Intel One Mono, etc.).
- **Unsaved Changes (isDirty) Interceptors**: Native and frontend dialog blockers to prevent accidental close or page navigation when changes are unsaved.
- **Cross-Platform Native Desktop Shell**: Powered by Tauri v2 with responsive layouts, DPI-adapted window sizing, and fully translated native system menus for macOS and Windows.
