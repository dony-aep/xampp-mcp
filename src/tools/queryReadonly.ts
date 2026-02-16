import { executeMysqlSql } from "../runtime/mysqlClient.js";
import { toToolTextResult } from "../runtime/errors.js";
import { getOptionalString, getString } from "../runtime/validators.js";
import { mysqlConnectionFromArgs } from "./shared.js";
import type { AppEnvironment } from "../config/env.js";
import type { RegisteredTool } from "./types.js";

const READ_ONLY_PREFIXES = ["SELECT", "SHOW", "DESCRIBE", "EXPLAIN"];

function assertReadonlyQuery(sql: string): void {
  const normalized = sql.trim().replace(/\s+/g, " ").toUpperCase();
  if (READ_ONLY_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    return;
  }

  throw new Error("query_readonly only accepts SELECT/SHOW/DESCRIBE/EXPLAIN statements");
}

export function createQueryReadonlyTool(environment: AppEnvironment): RegisteredTool {
  return {
    name: "query_readonly",
    description: "Runs read-only SQL query for diagnostics",
    inputSchema: {
      type: "object",
      properties: {
        sql: { type: "string" },
        database: { type: "string" },
        host: { type: "string" },
        port: { type: "number" },
        user: { type: "string" },
        password: { type: "string" },
      },
      required: ["sql"],
      additionalProperties: false,
    },
    annotations: {
      title: "Read-only Query",
      readOnlyHint: true,
      openWorldHint: false,
    },
    handler: async (args) => {
      const sql = getString(args.sql, "sql");
      const database = getOptionalString(args.database, "database");
      assertReadonlyQuery(sql);

      const result = await executeMysqlSql(environment, {
        ...mysqlConnectionFromArgs(args),
        database,
        sql,
      });

      const text = result.stdout || "Query executed successfully (no rows in output)";
      return toToolTextResult(text, {
        stdout: result.stdout,
      });
    },
  };
}
