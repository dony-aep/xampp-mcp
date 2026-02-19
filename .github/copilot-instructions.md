# Copilot instructions for diagram flow

When the user asks for database diagrams in this repository, follow this order by default:

1. Call `mcp_xamppmcp_diagram_er` first to generate Mermaid from the real schema.
2. Immediately call `renderMermaidDiagram` using `structuredContent.previewRequest.args.markup` for quick preview in chat.
3. After preview, ask the user (in the current conversation language) whether they also want SVG output.
4. Only if the user says yes, call `mcp_xamppmcp_diagram_render` with `structuredContent.renderRequest.args` (keep this minimal for compatibility).

Notes:
- Prefer fast visual preview first (`renderMermaidDiagram`).
- Treat SVG generation as an optional second step.
- If preview render fails, still show the Mermaid text block and continue.
