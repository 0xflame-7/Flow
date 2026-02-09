# Change Log

All notable changes to the "Flow" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1] - 2026-02-10

### Added

- Initial release of Flow VSCode extension
- Custom editor provider for `.flow` files
- Modern webview with Tailwind CSS integration
- VSCode theme-aware UI components
- Responsive layout with scrolling support
- Interactive buttons with hover effects
- Basic terminal infrastructure setup with xterm.js and node-pty
- React-based webview architecture
- TypeScript support throughout the codebase

### Fixed

- Webview scrolling functionality
- Button click and hover interactions
- CSS utility classes for VSCode theme colors
- Content overflow handling

### Infrastructure

- ESBuild-based build system for fast compilation
- Tailwind CSS v4 integration with custom VSCode color palette
- Comprehensive TypeScript configuration
- ESLint configuration for code quality
- Automated testing setup with @vscode/test-electron

## [0.0.2] - 2026-02-10

### Added

- Demo webview showcasing Tailwind utilities and VSCode theme integration
- Version management scripts (patch, minor, major)

### Infrastructure

- Build scripts for CSS compilation (build:css, watch:css)
- Updated FlowEditorProvider with stylesheet inclusion
- Comprehensive .gitignore configuration

### Documentation

- Phase 1 "Vertical Slice" complete
- Ready for Phase 2: Block system and masonry layout implementation

## [Unreleased]

### Planned Features

- Full terminal emulation with xterm.js
- Multi-terminal split view
- Command history and autocomplete
- Terminal session persistence
- Drag-and-drop terminal management
- Advanced terminal search functionality
