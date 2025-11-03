<p align="center">
  <a href="https://github.com/EricV29">
    <img src="./src/assets/typira.png" />
  </a>
</p>

<div align="center">
<h1 align="center">🚀 React + TypeScript + Vite + Electron + Tailwind</h1>
</div>

<p align="center">
  <a href="https://skillicons.dev">
    <img src="https://skillicons.dev/icons?i=react,typescript,vite,electron,tailwind" />
  </a>
</p>

This template provides a ready-to-use setup that integrates **React**, **Vite**, **Electron**, and **Tailwind CSS**, allowing you to build modern desktop applications with a fast and stylish interface.

---

## 📁 Clone Repository

To use this project locally, run the following commands in your terminal:

```bash
git clone https://github.com/EricV29/electron-react-vite-tailwind-template.git
cd electron-react-vite-tailwind-template
npm install
```

## 🧩 Available Scripts

### 🔧 Development

Run the app in development mode (starts Vite and launches Electron):

```bash
npm run dev
```

### 🏗️ Build

Create a production package with electron-builder:

```bash
npm run build
```

### 📦 Distribution

Create a production package with electron-builder:

```bash
npm run dist
```

### 🧹 Clean

Remove all output folders (`dist` and `releases`):

```bash
npm run clean
```

### 🧩 Full Package

Clean, build, and package everything in one command:

```bash
npm run package
```

### 📁 Directory Structure

```
📁 project/
┣ 📂 electron/ -> Electron backend
┃ ┣ 📜 main.cjs
┃ ┗ 📜 preload.js
┣ 📂 src/ → React frontend
┃ ┣ 📜 App.tsx
┃ ┣ 📜 main.tsx
┃ ┣ 📜 index.css
┃ ┣ 📂 types/
┃   ┗ 📜 electron.d.ts
┣ 📦 dist/ → Vite build output
┣ 📦 releases/ → Electron Builder output (installers)
┣ 📜 package.json
┣ ⚙️ tailwind.config.js
┗ ⚙️ vite.config.ts
```
