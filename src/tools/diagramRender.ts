import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { promises as fs } from "node:fs";
import path from "node:path";
import { request } from "node:https";

import { ToolExecutionError, toToolTextResult } from "../runtime/errors.js";
import { getBoolean, getOptionalString, getString } from "../runtime/validators.js";
import type { AppEnvironment } from "../config/env.js";
import type { RegisteredTool } from "./types.js";

const SUPPORTED_DIAGRAM_TYPES = [
  "erDiagram",
  "flowchart",
  "graph",
  "sequenceDiagram",
  "classDiagram",
  "stateDiagram-v2",
  "stateDiagram",
  "journey",
  "gantt",
  "pie",
  "gitGraph",
  "gitgraph",
  "mindmap",
  "timeline",
  "quadrantChart",
  "sankey-beta",
  "sankey",
  "xychart-beta",
  "xychart",
  "block-beta",
  "block",
] as const;

function sanitizeFileName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120);
}

function resolveOutputPath(args: {
  outputPath?: string;
  database?: string;
  title?: string;
}): string {
  if (args.outputPath && args.outputPath.trim().length > 0) {
    const normalized = args.outputPath.trim();
    return normalized.toLowerCase().endsWith(".svg") ? normalized : `${normalized}.svg`;
  }

  const baseFromDatabase = args.database ? sanitizeFileName(args.database) : "";
  const baseFromTitle = args.title ? sanitizeFileName(args.title) : "";
  const fileBase = baseFromDatabase || baseFromTitle || "diagram";

  return path.join(process.cwd(), "diagrams", `${fileBase}.svg`);
}

function extractDatabaseHint(code: string): string | undefined {
  const lines = code.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    const match = /^%%\s*database\s*:\s*([A-Za-z0-9_\-]+)\s*$/i.exec(line);
    if (!match) {
      continue;
    }

    const database = match[1]?.trim();
    if (database && database.length > 0) {
      return database;
    }
  }

  return undefined;
}

function detectDiagramType(code: string): string {
  const firstNonEmptyLine = code
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0 && !line.startsWith("%%"));

  if (!firstNonEmptyLine) {
    throw new ToolExecutionError("code cannot be empty", "INVALID_INPUT");
  }

  const matched = SUPPORTED_DIAGRAM_TYPES.find((diagramType) =>
    firstNonEmptyLine.toLowerCase().startsWith(diagramType.toLowerCase()),
  );

  if (!matched) {
    throw new ToolExecutionError(
      `Unsupported Mermaid diagram type. Start your code with one of: ${SUPPORTED_DIAGRAM_TYPES.join(", ")}`,
      "INVALID_INPUT",
    );
  }

  return matched;
}

export async function renderMermaidToSvg(code: string): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const req = request(
      "https://kroki.io/mermaid/svg",
      {
        method: "POST",
        headers: {
          "content-type": "text/plain; charset=utf-8",
          accept: "image/svg+xml",
          "content-length": Buffer.byteLength(code, "utf8"),
        },
      },
      (response) => {
        let payload = "";

        response.setEncoding("utf8");
        response.on("data", (chunk: string) => {
          payload += chunk;
        });

        response.on("end", () => {
          const statusCode = response.statusCode ?? 0;
          if (statusCode < 200 || statusCode >= 300) {
            reject(new ToolExecutionError(`Remote Mermaid render failed (${statusCode})`, "RENDER_FAILED"));
            return;
          }

          if (!payload.toLowerCase().includes("<svg")) {
            reject(new ToolExecutionError("Renderer did not return valid SVG content", "RENDER_FAILED"));
            return;
          }

          resolve(payload);
        });
      },
    );

    req.on("error", (error) => {
      reject(new ToolExecutionError(`Remote Mermaid render error: ${error.message}`, "RENDER_FAILED"));
    });

    req.write(code);
    req.end();
  });
}

export function createDiagramRenderTool(_environment: AppEnvironment): RegisteredTool {
  return {
    name: "diagram_render",
    description: "Validates Mermaid code and returns a rendered SVG image when possible",
    inputSchema: {
      type: "object",
      properties: {
        code: { type: "string", description: "Mermaid diagram source" },
        title: { type: "string" },
        database: { type: "string", description: "Database name for default output file naming" },
        render_image: { type: "boolean", description: "Render remote SVG image (default true)" },
        save_file: { type: "boolean", description: "Save SVG to disk (default true)" },
        outputPath: { type: "string", description: "Optional absolute or relative SVG output path" },
      },
      required: ["code"],
      additionalProperties: false,
    },
    annotations: {
      title: "Render Mermaid Diagram",
      readOnlyHint: false,
      openWorldHint: true,
    },
    handler: async (args) => {
      const code = getString(args.code, "code");
      const title = getOptionalString(args.title, "title");
      const database = getOptionalString(args.database, "database") ?? extractDatabaseHint(code);
      const renderImage = getBoolean(args.render_image, "render_image", true);
      const saveFile = getBoolean(args.save_file, "save_file", true);
      const outputPathInput = getOptionalString(args.outputPath, "outputPath");
      const diagramType = detectDiagramType(code);

      const titleLine = title ? `Title: ${title}\n` : "";
      const text = [
        "Mermaid diagram ready.",
        titleLine.length > 0 ? titleLine.trimEnd() : "",
        `Type: ${diagramType}`,
        "",
        "```mermaid",
        code,
        "```",
      ]
        .filter((line) => line.length > 0)
        .join("\n");

      if (!renderImage) {
        return toToolTextResult(text, {
          title,
          diagramType,
          mermaid: code,
          rendered: false,
        });
      }

      try {
        const svg = await renderMermaidToSvg(code);
        const outputPath = resolveOutputPath({
          outputPath: outputPathInput,
          database,
          title,
        });

        if (saveFile) {
          const outputDir = path.dirname(outputPath);
          await fs.mkdir(outputDir, { recursive: true });
          await fs.writeFile(outputPath, svg, "utf8");
        }

        const imageBase64 = Buffer.from(svg, "utf8").toString("base64");

        const savedLine = saveFile ? `\nSaved SVG: ${outputPath}` : "\nSVG file was not saved (save_file=false).";

        const result: CallToolResult = {
          content: [
            {
              type: "text",
              text: `${text}${savedLine}`,
            },
            {
              type: "image",
              data: imageBase64,
              mimeType: "image/svg+xml",
            },
          ],
          structuredContent: {
            title,
            diagramType,
            mermaid: code,
            rendered: true,
            mimeType: "image/svg+xml",
            saved: saveFile,
            outputPath: saveFile ? outputPath : undefined,
          },
        };

        return result;
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Unknown render error";
        const fallbackText = `${text}\n\nSVG render fallback: ${reason}`;

        return toToolTextResult(fallbackText, {
          title,
          diagramType,
          mermaid: code,
          rendered: false,
          renderError: reason,
        });
      }
    },
  };
}
