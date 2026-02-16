import { executeMysqlSql } from "../runtime/mysqlClient.js";
import { toToolTextResult } from "../runtime/errors.js";
import { getBoolean, getString } from "../runtime/validators.js";
import { assertDatabaseIdentifier, escapeSqlIdentifier, requireConfirmation } from "../security/policy.js";
import { mysqlConnectionFromArgs } from "./shared.js";
import type { AppEnvironment } from "../config/env.js";
import type { RegisteredTool } from "./types.js";

const DEFAULT_DB_CHARACTER_SET = "utf8mb4";
const DEFAULT_DB_COLLATION = "utf8mb4_unicode_ci";

export function createDbCreateTool(environment: AppEnvironment): RegisteredTool {
  return {
    name: "db_create",
    description: "Creates a MySQL database",
    inputSchema: {
      type: "object",
      properties: {
        database: { type: "string" },
        ifNotExists: { type: "boolean" },
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
      title: "Create Database",
      destructiveHint: true,
      openWorldHint: false,
    },
    handler: async (args) => {
      const database = getString(args.database, "database");
      const confirmed = getBoolean(args.confirmed, "confirmed");
      const ifNotExists = getBoolean(args.ifNotExists, "ifNotExists", true);

      requireConfirmation(confirmed, "db_create");
      assertDatabaseIdentifier(database, "database");

      const sql = `CREATE DATABASE ${ifNotExists ? "IF NOT EXISTS " : ""}${escapeSqlIdentifier(database)} CHARACTER SET ${DEFAULT_DB_CHARACTER_SET} COLLATE ${DEFAULT_DB_COLLATION}`;

      await executeMysqlSql(environment, {
        ...mysqlConnectionFromArgs(args),
        sql,
      });

      return toToolTextResult(`Database ${database} created`, {
        database,
        ifNotExists,
        characterSet: DEFAULT_DB_CHARACTER_SET,
        collation: DEFAULT_DB_COLLATION,
      });
    },
  };
}
