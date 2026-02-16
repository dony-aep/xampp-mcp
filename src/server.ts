#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";

import { loadEnvironment } from "./config/env.js";
import { createToolRegistry } from "./tools/registry.js";
import { toToolErrorResult } from "./runtime/errors.js";
import type { RegisteredTool } from "./tools/types.js";

async function main(): Promise<void> {
  const environment = loadEnvironment();
  const toolRegistry = createToolRegistry(environment);

  const server = new Server(
    {
      name: "xampp-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools: Tool[] = toolRegistry.list().map((tool: RegisteredTool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      annotations: tool.annotations,
    }));

    return { tools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
    const tool = toolRegistry.get(request.params.name);

    if (!tool) {
      return toToolErrorResult(`Unknown tool: ${request.params.name}`);
    }

    const rawArgs = request.params.arguments ?? {};

    try {
      return await tool.handler(rawArgs);
    } catch (error) {
      return toToolErrorResult(error);
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  process.stderr.write(`Fatal error: ${String(error)}\n`);
  process.exit(1);
});
