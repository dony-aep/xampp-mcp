import { executeMysqlSql } from "../runtime/mysqlClient.js";
import { toToolTextResult } from "../runtime/errors.js";
import { getBoolean, getOptionalString, getString } from "../runtime/validators.js";
import { requireConfirmation } from "../security/policy.js";
import { mysqlConnectionFromArgs } from "./shared.js";
import type { AppEnvironment } from "../config/env.js";
import type { RegisteredTool } from "./types.js";

export function createQueryExecuteTool(environment: AppEnvironment): RegisteredTool {
  return {
    name: "query_execute",
    description: "Runs SQL query with write capability (INSERT/UPDATE/DELETE/DDL)",
    inputSchema: {
      type: "object",
      properties: {
        sql: { type: "string" },
        database: { type: "string" },
        confirmed: { type: "boolean" },
        host: { type: "string" },
        port: { type: "number" },
        user: { type: "string" },
        password: { type: "string" },
      },
      required: ["sql", "confirmed"],
      additionalProperties: false,
    },
    annotations: {
      title: "Execute Query",
      destructiveHint: true,
      openWorldHint: false,
    },
    handler: async (args) => {
      const sql = getString(args.sql, "sql");
      const database = getOptionalString(args.database, "database");
      const confirmed = getBoolean(args.confirmed, "confirmed");

      requireConfirmation(confirmed, "query_execute");

      const result = await executeMysqlSql(environment, {
        ...mysqlConnectionFromArgs(args),
        database,
        sql,
      });

      const text = result.stdout || "Query executed successfully";
      return toToolTextResult(text, {
        database,
        stdout: result.stdout,
      });
    },
  };
}
