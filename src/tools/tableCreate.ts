import { executeMysqlSql } from "../runtime/mysqlClient.js";
import { toToolTextResult } from "../runtime/errors.js";
import { getBoolean, getString } from "../runtime/validators.js";
import { assertDatabaseIdentifier, assertIdentifier, requireConfirmation } from "../security/policy.js";
import { mysqlConnectionFromArgs } from "./shared.js";
import type { AppEnvironment } from "../config/env.js";
import type { RegisteredTool } from "./types.js";

function normalizeCreateStatement(statement: string, tableName: string): string {
  const compact = statement.trim();
  const upper = compact.toUpperCase();

  if (!upper.startsWith("CREATE TABLE")) {
    throw new Error("createStatement must start with CREATE TABLE");
  }

  if (!upper.includes(tableName.toUpperCase())) {
    throw new Error("createStatement must target the provided table");
  }

  return compact;
}

export function createTableCreateTool(environment: AppEnvironment): RegisteredTool {
  return {
    name: "table_create",
    description: "Creates a table using a CREATE TABLE statement",
    inputSchema: {
      type: "object",
      properties: {
        database: { type: "string" },
        table: { type: "string" },
        createStatement: { type: "string" },
        confirmed: { type: "boolean" },
        host: { type: "string" },
        port: { type: "number" },
        user: { type: "string" },
        password: { type: "string" },
      },
      required: ["database", "table", "createStatement", "confirmed"],
      additionalProperties: false,
    },
    annotations: {
      title: "Create Table",
      destructiveHint: true,
      openWorldHint: false,
    },
    handler: async (args) => {
      const database = getString(args.database, "database");
      const table = getString(args.table, "table");
      const createStatement = getString(args.createStatement, "createStatement");
      const confirmed = getBoolean(args.confirmed, "confirmed");

      requireConfirmation(confirmed, "table_create");
      assertDatabaseIdentifier(database, "database");
      assertIdentifier(table, "table");

      const sql = normalizeCreateStatement(createStatement, table);

      await executeMysqlSql(environment, {
        ...mysqlConnectionFromArgs(args),
        database,
        sql,
      });

      return toToolTextResult(`Table ${database}.${table} created`, {
        database,
        table,
      });
    },
  };
}
