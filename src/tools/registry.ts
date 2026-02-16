import type { AppEnvironment } from "../config/env.js";

import { createDbCreateTool } from "./dbCreate.js";
import { createDbExportTool } from "./dbExport.js";
import { createDbImportTool } from "./dbImport.js";
import { createDbInspectTool } from "./dbInspect.js";
import { createGrantManageTool } from "./grantManage.js";
import { createPhpCliRunTool } from "./phpCliRun.js";
import { createQueryExecuteTool } from "./queryExecute.js";
import { createPreflightCheckTool } from "./preflightCheck.js";
import { createQueryReadonlyTool } from "./queryReadonly.js";
import { createStackStatusTool } from "./stackStatus.js";
import { createTableCreateTool } from "./tableCreate.js";
import { createUserCreateTool } from "./userCreate.js";
import type { RegisteredTool, ToolRegistry } from "./types.js";

export function createToolRegistry(environment: AppEnvironment): ToolRegistry {
  const tools: RegisteredTool[] = [
    createPreflightCheckTool(environment),
    createStackStatusTool(environment),
    createQueryReadonlyTool(environment),
    createQueryExecuteTool(environment),
    createDbInspectTool(environment),
    createDbCreateTool(environment),
    createTableCreateTool(environment),
    createUserCreateTool(environment),
    createGrantManageTool(environment),
    createDbExportTool(environment),
    createDbImportTool(environment),
    createPhpCliRunTool(environment),
  ];

  const toolMap = new Map<string, RegisteredTool>();
  for (const tool of tools) {
    toolMap.set(tool.name, tool);
  }

  return {
    list: () => tools,
    get: (name: string) => toolMap.get(name),
  };
}
