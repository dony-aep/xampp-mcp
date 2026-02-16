import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export class ToolExecutionError extends Error {
  readonly code: string;

  constructor(message: string, code = "TOOL_EXECUTION_ERROR") {
    super(message);
    this.name = "ToolExecutionError";
    this.code = code;
  }
}

function normalizeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unexpected error";
}

export function toToolErrorResult(error: unknown): CallToolResult {
  return {
    isError: true,
    content: [
      {
        type: "text",
        text: normalizeError(error),
      },
    ],
  };
}

export function toToolTextResult(text: string, structuredContent?: Record<string, unknown>): CallToolResult {
  return {
    content: [
      {
        type: "text",
        text,
      },
    ],
    structuredContent,
  };
}
