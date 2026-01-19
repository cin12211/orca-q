# Changelogs

This folder contains release notes for each version of OrcaQ.

## File Format

Each changelog file should be named `{version}.md` (e.g., `1.0.20.md`) and include frontmatter:

```markdown
---
version: '1.0.20'
date: '2026-01-13'
---

# 🎉 Title for this release

Your changelog content here in markdown format...

## ✨ New Features

- Feature 1
- Feature 2

## 🔧 Improvements

- Improvement 1

## 🐛 Bug Fixes

- Fix 1
```

## How it works

1. The app reads all `.md` files from this folder
2. Compares the latest version with the user's last seen version (stored in localStorage)
3. Automatically shows a popup if there's a new version

## Emoji Guide

- 🎉 Major release
- ✨ New features
- 🔧 Improvements / Changes
- 🐛 Bug fixes
- 🗑️ Removed features
- ⚠️ Breaking changes
