# <img src="https://orca-q.com/images/logo.png" width="32"> OrcaQ - Next Generation database editor

<div align="center">

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![npx version](https://img.shields.io/npm/v/orcaq?label=npx)](https://www.npmjs.com/package/orcaq)
[![Downloads](https://img.shields.io/npm/dm/orcaq?label=downloads)](https://www.npmjs.com/package/orcaq)
[![GitHub stars](https://img.shields.io/github/stars/cin12211/orca-q?style=social)](https://github.com/cin12211/orca-q/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/cin12211/orca-q)](https://github.com/cin12211/orca-q/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/cin12211/orca-q)](https://github.com/cin12211/orca-q/pulls)

</div>

## Orca Query

<img src="https://orca-q.com/images/editor-preview.png" style="border: 1px solid #ccc; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);" >

## Overview

**OrcaQ** is a modern database editor for managing, querying, and exploring SQL/PostgreSQL data in a fast, intuitive, and secure way.

## Features

- 🖥️ **Modern UI/UX**: Minimalist interface with dark mode support, drag & drop, and flexible sidebar.
- ⚡ **Quick Query**: Fast data querying with preview, filtering, and dynamic field search.
- 📝 **Raw SQL Editor**: Write and execute SQL queries with multiple layout modes (vertical/horizontal).
- 🗂️ **Explorer**: Browse database structures, tables, schemas, and files.
- 🔒 **Workspace & Connection Management**: Manage multiple connections and independent workspaces.
- 🛠️ **Hotkey Support**: Supports shortcuts for faster operations.
- 🍎 **Desktop App for macOS**: Currently in development.

## Installation

### Requirements

- **Node.js** >= 18.x
- **pnpm** or **bun**
- **macOS, Windows, or Linux**

### Steps (Web setup)

1. **Clone the repository:**

   ```sh
   git clone https://github.com/cin12211/orca-q.git
   cd orcaq
   ```

2. **Install dependencies:**

   ```sh
   bun install
   ```

3. **Run in development mode:**

   ```sh
   npm run nuxt:dev
   ```

4. **Build for production:**

   ```sh
   npm run nuxt:build
   ```

### NPX Setup

Run OrcaQ directly with `npx` if you do not want to clone the repository or build Docker images.

1. **Run OrcaQ:**

   ```sh
   npx orcaq
   ```

   Requires **Node.js >= 18**. By default OrcaQ starts on [http://localhost:9432](http://localhost:9432) and opens your browser automatically.

### Docker Setup

Run OrcaQ instantly with Docker — no local Node.js or build tools required.

#### Guide 1 — Run with the published Docker image

Use the prebuilt image if you just want to start OrcaQ quickly.

1. **Pull the image:**

   ```sh
   docker pull cinny09/orcaq:latest
   ```

2. **Run the container:**

   ```sh
   docker run -d \
     --name orcaq \
     --restart unless-stopped \
     -p 9432:9432 \
     cinny09/orcaq:latest
   ```

3. **Open OrcaQ:**

   Visit [http://localhost:9432](http://localhost:9432)

> **Note**: If you are still using the old image name `cinny09/orca-q`, switch to `cinny09/orcaq`.

#### Guide 2 — Build locally with Docker Compose

Use this if you want to build the image from the current source code.

1. **Clone the repository:**

   ```sh
   git clone https://github.com/cin12211/orca-q.git
   cd orcaq
   ```

2. **Configure environment (optional):**

   ```sh
   cp .env.example .env
   # Default Docker port is 9432
   # Edit .env if you want to change it
   ```

3. **Start with Docker Compose:**

   ```sh
   docker compose up -d --build orcaq
   ```

4. **Open OrcaQ:**

   Visit [http://localhost:9432](http://localhost:9432)

> **Note**: The demo PostgreSQL service is currently commented out in `docker-compose.yml`. OrcaQ is stateless — it connects to your databases at runtime. If you want a local demo database, uncomment the `postgres-demo` service first.

## Contributing

We welcome all contributions!

1. **Fork the repo and create a new branch**:

   ```sh
   git checkout -b feat/my-feature
   ```

2. **Follow commit conventions**:

   - `feat: ...` Add a new feature
   - `fix: ...` Fix a bug
   - `chore: ...` Miscellaneous tasks
   - `docs: ...` Update documentation
   - `refactor: ...` Improve code without changing logic

3. **Create a Pull Request**:  
   Clearly describe changes and link to relevant issues (if any).

4. **Review & Merge**:  
   The core team will review and provide feedback promptly.

**See more**: [CONTRIBUTING.md](CONTRIBUTING.md)

## Community / Contact

- **Issues**: [GitHub Issues](https://github.com/cin12211/orca-q/issues)
- **Discussions**: [GitHub Discussions](https://github.com/cin12211/orca-q/discussions)
- **Email**: taccin03@gmail.com

## License

This project is licensed under the [MIT License](LICENSE).

## Acknowledgements

- [Electron](https://www.electronjs.org/) - Build cross-platform desktop apps with JavaScript
- [Vue 3](https://vuejs.org/) - Progressive JavaScript framework
- [Vite](https://vitejs.dev/) - Next Generation Frontend Tooling
- [TypeScript](https://www.typescriptlang.org/)
- [Zod](https://zod.dev/) - TypeScript-first schema validation
- [@vueuse/core](https://vueuse.org/) - Vue Composition API utilities
- Icon design: [Figma Community](https://www.figma.com/design/wAm0jjPdhpKsEGXjtUw3tk/macOS-App-Icon-Template--Community-?node-id=102-4&t=B0v343GshmaCBMqU-0)
- Contributions from the open-source community

## Contributors

Many thanks to everyone who has contributed to OrcaQ.

<a href="https://github.com/cin12211/orca-q/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=cin12211/orca-q" />
</a>

## ⭐ Stargazers

Many thanks to the kind individuals who leave a star.
Your support is much appreciated!

> _Made with ❤️ by the OrcaQ team and open-source contributors._
