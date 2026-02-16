import path from "node:path";

import { exportDatabase } from "../runtime/mysqlClient.js";
import { toToolTextResult } from "../runtime/errors.js";
import { getBoolean, getOptionalString, getString } from "../runtime/validators.js";
import { assertDatabaseIdentifier, requireConfirmation } from "../security/policy.js";
import { mysqlConnectionFromArgs } from "./shared.js";
import type { AppEnvironment } from "../config/env.js";
import type { RegisteredTool } from "./types.js";

function defaultExportPath(database: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(process.cwd(), `${database}-${timestamp}.sql`);
}

export function createDbExportTool(environment: AppEnvironment): RegisteredTool {
  return {
    name: "db_export",
    description: "Exports a MySQL database to a SQL file",
    inputSchema: {
      type: "object",
      properties: {
        database: { type: "string" },
        outputPath: { type: "string" },
        includeCreateDatabase: { type: "boolean" },
        addDropTable: { type: "boolean" },
        confirmed: { type: "boolean" },
        host: { type: "string" },
        port: { type: "number" },
        user: { type: "string" },
        password: { type: "string" },
      },
      required: ["database", "confirmed"],
      additionalProperties: false,
    },
    annotations: {
      title: "Database Export",
      destructiveHint: false,
      openWorldHint: false,
    },
    handler: async (args) => {
      const database = getString(args.database, "database");
      const outputPath = getOptionalString(args.outputPath, "outputPath") ?? defaultExportPath(database);
      const includeCreateDatabase = getBoolean(args.includeCreateDatabase, "includeCreateDatabase", true);
      const addDropTable = getBoolean(args.addDropTable, "addDropTable", true);
      const confirmed = getBoolean(args.confirmed, "confirmed");

      requireConfirmation(confirmed, "db_export");
      assertDatabaseIdentifier(database, "database");

      await exportDatabase(environment, {
        ...mysqlConnectionFromArgs(args),
        database,
        outputPath,
        includeCreateDatabase,
        addDropTable,
      });

      return toToolTextResult(`Database ${database} exported to ${outputPath}`, {
        database,
        outputPath,
      });
    },
  };
}
