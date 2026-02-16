import { executeMysqlSql } from "../runtime/mysqlClient.js";
import { toToolTextResult } from "../runtime/errors.js";
import { getBoolean, getOptionalString, getString } from "../runtime/validators.js";
import {
  assertHost,
  assertUsername,
  escapeSqlLiteral,
  requireConfirmation,
} from "../security/policy.js";
import { mysqlConnectionFromArgs } from "./shared.js";
import type { AppEnvironment } from "../config/env.js";
import type { RegisteredTool } from "./types.js";

export function createUserCreateTool(environment: AppEnvironment): RegisteredTool {
  return {
    name: "user_create",
    description: "Creates a MySQL user",
    inputSchema: {
      type: "object",
      properties: {
        username: { type: "string" },
        hostScope: { type: "string", description: "Host scope for the user. Example: localhost or %" },
        userPassword: { type: "string", description: "Password for the user being created" },
        ifNotExists: { type: "boolean" },
        confirmed: { type: "boolean" },
        host: { type: "string" },
        port: { type: "number" },
        user: { type: "string" },
        password: { type: "string", description: "Admin password used to run CREATE USER" },
      },
      required: ["username", "userPassword", "confirmed"],
      additionalProperties: false,
    },
    annotations: {
      title: "Create User",
      destructiveHint: true,
      openWorldHint: false,
    },
    handler: async (args) => {
      const username = getString(args.username, "username");
      const userPassword = getString(args.userPassword, "userPassword");
      const hostScope = getOptionalString(args.hostScope, "hostScope") ?? "%";
      const ifNotExists = getBoolean(args.ifNotExists, "ifNotExists", true);
      const confirmed = getBoolean(args.confirmed, "confirmed");

      requireConfirmation(confirmed, "user_create");
      assertUsername(username);
      assertHost(hostScope);

      const sql = `CREATE USER ${ifNotExists ? "IF NOT EXISTS " : ""}${escapeSqlLiteral(username)}@${escapeSqlLiteral(hostScope)} IDENTIFIED BY ${escapeSqlLiteral(userPassword)}`;

      await executeMysqlSql(environment, {
        ...mysqlConnectionFromArgs(args),
        sql,
      });

      return toToolTextResult(`User ${username}@${hostScope} created`, {
        username,
        hostScope,
        ifNotExists,
      });
    },
  };
}
