# OrcaQ <img src="https://orca-q.com/images/logo.png" width="48">

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](TODO)
[![Version](https://img.shields.io/badge/version-1.0.4-blue.svg)](package.json)

---

## Overview

**OrcaQ** is a modern desktop application designed for managing, querying, and manipulating data across various database management systems (DBMS) in an intuitive, fast, and secure manner. Built with [Electron](https://www.electronjs.org/), [Vue 3](https://vuejs.org/), [TypeScript](https://www.typescriptlang.org/), and [Vite](https://vitejs.dev/), it targets developers, data engineers, analysts, DBAs, or anyone who needs to work with SQL/PostgreSQL data on the desktop.

---

## Features

- 🚀 **Cross-platform Desktop App**: Runs smoothly on Windows, macOS, and Linux thanks to Electron.
- 🖥️ **Modern UI/UX**: Minimalist interface with dark mode support, drag & drop, and flexible sidebar.
- ⚡ **Quick Query**: Fast data querying with preview, filtering, and dynamic field search.
- 📝 **Raw SQL Editor**: Write and execute SQL queries with multiple layout modes (vertical/horizontal).
- 🗂️ **Explorer**: Browse database structures, tables, schemas, and files.
- 🔒 **Workspace & Connection Management**: Manage multiple connections and independent workspaces.
- 🧩 **Extensible**: Easily customizable via configuration.
- 🛠️ **Hotkey Support**: Supports shortcuts for faster operations.
- 🧪 **Type-safe**: Uses TypeScript and Zod for type safety.
- ⚙️ **Electron Backend**: Leverages Node.js, native modules, and OS integration.

---

## Installation

### Requirements

- **Node.js** >= 18.x
- **npm** >= 9.x or **yarn**
- **pnpm** (optional)
- **macOS, Windows, or Linux**

### Steps

1. **Clone the repository:**

   ```sh
   git clone https://github.com/your-org/orcaq.git
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

> **Note**: Ensure you have the correct Node.js version and necessary dependencies installed to run Electron. See more at [Electron Docs](https://www.electronjs.org/docs/latest/tutorial/quick-start).

---

## Usage

- **Launch the app**:  
  Run `npm run dev` to start the application in development mode.
- **Connect to a database**:  
  Add a workspace, create a new connection, and enter DB details (PostgreSQL, etc.).
- **Quick Query**:  
  Use the Quick Query tab to filter, search, and view table data.
- **SQL Editing**:  
  Switch to the Raw Query tab to write and execute custom SQL queries.
- **Manage Layout**:  
  Use the sidebar and hotkeys (`Cmd+Shift+B` on Mac) to show/hide panels.

### Example Commands

```sh
npm run dev
# or
yarn dev
```

---

## Configuration

- **Environment Variables**:
  <!-- TODO: List required environment variables (e.g., DB_HOST, DB_PORT, etc.). -->

- **Config File**:
  <!-- TODO: Describe the configuration file (if applicable), e.g., `orcaq.config.json`, `.env`, etc. -->

- **Interface Customization**:
  - Change editor layout: Vertical/Horizontal in settings.
  - Customize workspace, sidebar, and theme (TODO: detailed guide).

---

## API / Documentation

- **User Guide**:  
  TODO: Add link to detailed user documentation.

- **Developer Docs**:

  - [Electron Documentation](https://www.electronjs.org/docs/latest)
  - [Vue 3 Docs](https://vuejs.org/guide/introduction.html)
  - [Vite Docs](https://vitejs.dev/guide/)

---

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

---

## Roadmap

- [x] Quick Query UI/UX
- [x] Raw SQL Editor
- [x] Sidebar/Panel Layout
- [ ] Support for multiple DBMS (MySQL, SQLite, etc.)
- [ ] Plugin/Extension system
- [ ] Export/Import workspace
- [ ] Multi-language support (i18n)
- [ ] AI query assistant integration
- [ ] Detailed user documentation

---

## Changelog

See details at [CHANGELOG.md](CHANGELOG.md)

- **1.0.4**: Updated UI, fixed layout bugs, optimized user experience.
- **1.0.2**: First public release.

---

## Community / Contact

- **Issues**: [GitHub Issues](https://github.com/your-org/orcaq/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/orcaq/discussions)
- **Email**: taccin03@gmail.com

---

## License

This project is licensed under the [MIT License](LICENSE).

---

## Acknowledgements

- [Electron](https://www.electronjs.org/) - Build cross-platform desktop apps with JavaScript
- [Vue 3](https://vuejs.org/) - Progressive JavaScript framework
- [Vite](https://vitejs.dev/) - Next Generation Frontend Tooling
- [TypeScript](https://www.typescriptlang.org/)
- [Zod](https://zod.dev/) - TypeScript-first schema validation
- [@vueuse/core](https://vueuse.org/) - Vue Composition API utilities
- Icon design: [Figma Community](https://www.figma.com/design/wAm0jjPdhpKsEGXjtUw3tk/macOS-App-Icon-Template--Community-?node-id=102-4&t=B0v343GshmaCBMqU-0)
- Contributions from the open-source community

---

> _Made with ❤️ by the OrcaQ team and open-source contributors._
