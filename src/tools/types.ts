import type { CallToolResult, ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";

import type { AppEnvironment } from "../config/env.js";

export interface ToolContext {
  environment: AppEnvironment;
}

export interface RegisteredTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties?: Record<string, object>;
    required?: string[];
    additionalProperties?: boolean;
  };
  annotations?: ToolAnnotations;
  handler: (args: Record<string, unknown>) => Promise<CallToolResult>;
}

export interface ToolRegistry {
  list: () => RegisteredTool[];
  get: (name: string) => RegisteredTool | undefined;
}
