import { executeMysqlSql } from "../runtime/mysqlClient.js";
import { toToolTextResult } from "../runtime/errors.js";
import { getBoolean, getString } from "../runtime/validators.js";
import {
  assertHost,
  assertDatabaseIdentifier,
  assertUsername,
  escapeSqlIdentifier,
  escapeSqlLiteral,
  requireConfirmation,
} from "../security/policy.js";
import { mysqlConnectionFromArgs } from "./shared.js";
import type { AppEnvironment } from "../config/env.js";
import type { RegisteredTool } from "./types.js";

function normalizePrivileges(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error("privileges cannot be empty");
  }

  if (trimmed === "*") {
    return "ALL PRIVILEGES";
  }

  return trimmed
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .join(", ");
}

export function createGrantManageTool(environment: AppEnvironment): RegisteredTool {
  return {
    name: "grant_manage",
    description: "Grants privileges to a MySQL user on a database",
    inputSchema: {
      type: "object",
      properties: {
        database: { type: "string" },
        username: { type: "string" },
        hostScope: { type: "string" },
        privileges: { type: "string", description: "Comma-separated list or * for all" },
        withGrantOption: { type: "boolean" },
        confirmed: { type: "boolean" },
        host: { type: "string" },
        port: { type: "number" },
        user: { type: "string" },
        password: { type: "string" },
      },
      required: ["database", "username", "privileges", "confirmed"],
      additionalProperties: false,
    },
    annotations: {
      title: "Grant Privileges",
      destructiveHint: true,
      openWorldHint: false,
    },
    handler: async (args) => {
      const database = getString(args.database, "database");
      const username = getString(args.username, "username");
      const hostScope = getString(args.hostScope, "hostScope", { optional: true }) || "%";
      const privileges = normalizePrivileges(getString(args.privileges, "privileges"));
      const withGrantOption = getBoolean(args.withGrantOption, "withGrantOption", false);
      const confirmed = getBoolean(args.confirmed, "confirmed");

      requireConfirmation(confirmed, "grant_manage");
      assertDatabaseIdentifier(database, "database");
      assertUsername(username);
      assertHost(hostScope);

      const sql = [
        `GRANT ${privileges} ON ${escapeSqlIdentifier(database)}.* TO ${escapeSqlLiteral(username)}@${escapeSqlLiteral(hostScope)}`,
        withGrantOption ? "WITH GRANT OPTION" : "",
      ]
        .filter((part) => part.length > 0)
        .join(" ");

      await executeMysqlSql(environment, {
        ...mysqlConnectionFromArgs(args),
        sql,
      });

      return toToolTextResult(`Granted ${privileges} on ${database} to ${username}@${hostScope}`, {
        database,
        username,
        hostScope,
        privileges,
        withGrantOption,
      });
    },
  };
}
