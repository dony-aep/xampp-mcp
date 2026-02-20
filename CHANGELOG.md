# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog,
and this project adheres to Semantic Versioning.

## [Unreleased]

## [1.1.1] - 2026-02-19

### Fixed
- Fixed installation guidance by prioritizing global (`npm install -g xampp-mcp`) and local (`npm i xampp-mcp`) npm flows.
- Fixed VS Code MCP setup examples to clearly separate global command usage from local project execution.
- Fixed documentation ambiguity that could make `npx` behavior look like a runtime failure when the MCP server is waiting on stdio.

## [1.1.0] - 2026-02-19

### Added
- Added `diagram_er` tool to generate Mermaid ER diagrams from the real MySQL schema.
- Added `diagram_render` tool to validate Mermaid and render SVG output.
- Added preview-first diagram flow metadata (`previewRequest`) for VS Code chat rendering.
- Added SVG export defaults under `diagrams/<database>.svg` with optional `outputPath` override.
- Added Mermaid database hint support (`%% database: <db>`) to infer file naming when only `code` is provided.
- Added repository-level Copilot instructions for diagram flow orchestration.
- Added this `CHANGELOG.md` file.

### Changed
- Changed diagram UX to preview-first (`renderMermaidDiagram`) and SVG as optional follow-up.
- Changed `diagram_er` to provide minimal `renderRequest.args` (`code`) for strict client compatibility.
- Changed SVG follow-up prompt guidance to use the active conversation language.
- Updated documentation in `README.md` and `docs/tools.md` for the current diagram workflow and SVG persistence behavior.

### Removed
- Removed `table_create` tool because `query_execute` already covers `CREATE TABLE` workflows.

### Fixed
- Fixed Mermaid ER type normalization issues that could break visual rendering.
- Fixed cross-client behavior where strict schema validation rejected optional render properties.
- Fixed fallback naming so generated SVG files avoid generic `diagram.svg` when database context is available.

## [1.0.0] - 2026-02-15

### Added
- Initial MCP server release for XAMPP/MySQL administration on Windows via stdio transport.
- Core toolset for diagnostics, SQL execution, database lifecycle, import/export, users/grants, and PHP CLI execution.

### Changed
- Release packaging and metadata finalized for npm distribution.

---

[Unreleased]: https://github.com/dony-aep/xampp-mcp/compare/v1.1.1...HEAD
[1.1.1]: https://github.com/dony-aep/xampp-mcp/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/dony-aep/xampp-mcp/releases/tag/v1.1.0
[1.0.0]: https://github.com/dony-aep/xampp-mcp/releases/tag/v1.0.0
