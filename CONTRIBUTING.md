# Contributing to MeowNacos 🐾

First of all, thank you for your interest in contributing to MeowNacos! We welcome issues, suggestions, and pull requests to help make MeowNacos better for everyone.

---

## 🐛 Reporting Issues

If you encounter any bugs, crashes, or unexpected behavior, please file an issue in our issue tracker. When reporting, please provide the following details:

- **OS / Platform:** (e.g., macOS Sequoia, Windows 11, Linux Ubuntu 22.04)
- **MeowNacos Version:** (e.g., v0.1.0)
- **Steps to Reproduce:** Clear, numbered instructions on how to reproduce the issue.
- **Expected vs. Actual Behavior:** What should have happened, and what actually did.
- **Screenshots / Recordings:** Visuals are highly appreciated if the issue is UI-related.

---

## 🛠️ Pull Requests

We love pull requests! To help us review and merge your changes smoothly, please follow these guidelines:

1. **Keep PRs Focused:** A single PR should address one bug fix or feature enhancement. Large, sweeping PRs are much harder to review.
2. **Follow Existing Style:** Maintain the coding style found throughout the repository (TypeScript/React on the frontend, Rust on the backend).
3. **Test Your Changes:** Run the app locally and verify your changes do not break existing features.
4. **Update Documentation:** If you are adding a new feature, please update the README or relevant docs.

---

## 💻 Local Development

MeowNacos is built with **Tauri v2**, **React (Vite)**, and **Rust**.

### 1. Prerequisites
Ensure you have the following installed on your system:
- **Node.js** (v18 or higher) and `npm`
- **Rust Toolchain** (rustc, cargo v1.75 or higher)
- Build tools: Xcode Command Line Tools (macOS) or Visual Studio C++ Build Tools (Windows).

### 2. Setup
Clone the repository and install the frontend dependencies:
```bash
git clone https://github.com/huyue/MeowNacos.git
cd MeowNacos
npm install
```

### 3. Run in Development Mode
To start the React development server and launch the desktop window:
```bash
npm run tauri dev
```

---

## 📦 Building from Source

To compile the application and bundle it into native installers (e.g., `.dmg`/`.app` on macOS, `.msi`/`.exe` on Windows):
```bash
npm run tauri build
```
The compiled binaries will be output to `src-tauri/target/release/bundle/`.

Thank you for making MeowNacos awesome! ❤️
