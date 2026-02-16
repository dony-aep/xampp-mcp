import { importDatabase } from "../runtime/mysqlClient.js";
import { toToolTextResult } from "../runtime/errors.js";
import { getBoolean, getString } from "../runtime/validators.js";
import { assertDatabaseIdentifier, requireConfirmation } from "../security/policy.js";
import { mysqlConnectionFromArgs } from "./shared.js";
import type { AppEnvironment } from "../config/env.js";
import type { RegisteredTool } from "./types.js";

export function createDbImportTool(environment: AppEnvironment): RegisteredTool {
  return {
    name: "db_import",
    description: "Imports SQL file into a MySQL database",
    inputSchema: {
      type: "object",
      properties: {
        database: { type: "string" },
        inputPath: { type: "string" },
        confirmed: { type: "boolean" },
        host: { type: "string" },
        port: { type: "number" },
        user: { type: "string" },
        password: { type: "string" },
      },
      required: ["database", "inputPath", "confirmed"],
      additionalProperties: false,
    },
    annotations: {
      title: "Database Import",
      destructiveHint: true,
      openWorldHint: false,
    },
    handler: async (args) => {
      const database = getString(args.database, "database");
      const inputPath = getString(args.inputPath, "inputPath");
      const confirmed = getBoolean(args.confirmed, "confirmed");

      requireConfirmation(confirmed, "db_import");
      assertDatabaseIdentifier(database, "database");

      await importDatabase(environment, {
        ...mysqlConnectionFromArgs(args),
        database,
        inputPath,
      });

      return toToolTextResult(`Imported ${inputPath} into ${database}`, {
        database,
        inputPath,
      });
    },
  };
}
