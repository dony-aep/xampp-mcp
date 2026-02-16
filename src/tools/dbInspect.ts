import { executeMysqlSql } from "../runtime/mysqlClient.js";
import { toToolTextResult } from "../runtime/errors.js";
import { getString } from "../runtime/validators.js";
import { assertDatabaseIdentifier, escapeSqlLiteral } from "../security/policy.js";
import { mysqlConnectionFromArgs } from "./shared.js";
import type { AppEnvironment } from "../config/env.js";
import type { RegisteredTool } from "./types.js";

export function createDbInspectTool(environment: AppEnvironment): RegisteredTool {
  return {
    name: "db_inspect",
    description: "Shows database status summary with table-level information",
    inputSchema: {
      type: "object",
      properties: {
        database: { type: "string" },
        host: { type: "string" },
        port: { type: "number" },
        user: { type: "string" },
        password: { type: "string" },
      },
      required: ["database"],
      additionalProperties: false,
    },
    annotations: {
      title: "Inspect Database",
      readOnlyHint: true,
      openWorldHint: false,
    },
    handler: async (args) => {
      const database = getString(args.database, "database");
      assertDatabaseIdentifier(database, "database");

      const connection = mysqlConnectionFromArgs(args);
      const literalDb = escapeSqlLiteral(database);

      const schemaResult = await executeMysqlSql(environment, {
        ...connection,
        sql: `
SELECT
  SCHEMA_NAME AS database_name,
  DEFAULT_CHARACTER_SET_NAME AS charset_name,
  DEFAULT_COLLATION_NAME AS collation_name
FROM information_schema.SCHEMATA
WHERE SCHEMA_NAME = ${literalDb}
        `,
      });

      const summaryResult = await executeMysqlSql(environment, {
        ...connection,
        sql: `
SELECT
  COUNT(*) AS table_count,
  COALESCE(ROUND(SUM(TABLE_ROWS), 0), 0) AS estimated_rows,
  COALESCE(ROUND(SUM(DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2), 0) AS total_size_mb
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = ${literalDb}
        `,
      });

      const tablesResult = await executeMysqlSql(environment, {
        ...connection,
        sql: `
SELECT
  TABLE_NAME,
  ENGINE,
  TABLE_ROWS,
  ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) AS size_mb,
  CREATE_TIME,
  UPDATE_TIME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = ${literalDb}
ORDER BY TABLE_NAME
        `,
      });

      const text = [
        `Database inspection: ${database}`,
        "",
        "Schema:",
        schemaResult.stdout || "No schema metadata found",
        "",
        "Summary:",
        summaryResult.stdout || "No summary available",
        "",
        "Tables:",
        tablesResult.stdout || "No tables found",
      ].join("\n");

      return toToolTextResult(text, {
        database,
        schema: schemaResult.stdout,
        summary: summaryResult.stdout,
        tables: tablesResult.stdout,
      });
    },
  };
}
