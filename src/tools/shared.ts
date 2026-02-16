import { existsSync } from "node:fs";

import type { AppEnvironment, RunMode } from "../config/env.js";
import { executeMysqlSql, type MysqlConnectionOptions } from "../runtime/mysqlClient.js";
import { getOptionalNumber, getOptionalString } from "../runtime/validators.js";

export function getMode(args: Record<string, unknown>, environment: AppEnvironment): RunMode {
  const mode = getOptionalString(args.mode, "mode");
  if (mode === undefined) {
    return environment.defaultMode;
  }

  return mode === "service" ? "service" : "console";
}

export function ensurePathExists(filePath: string, label: string): void {
  if (!existsSync(filePath)) {
    throw new Error(`${label} not found: ${filePath}`);
  }
}

export function mysqlConnectionFromArgs(args: Record<string, unknown>): MysqlConnectionOptions {
  return {
    host: getOptionalString(args.host, "host"),
    port: getOptionalNumber(args.port, "port"),
    user: getOptionalString(args.user, "user"),
    password: getOptionalString(args.password, "password"),
  };
}

export async function runMysqlStatement(
  environment: AppEnvironment,
  args: Record<string, unknown>,
  sql: string,
  database?: string,
): Promise<void> {
  const connection = mysqlConnectionFromArgs(args);

  await executeMysqlSql(environment, {
    ...connection,
    database,
    sql,
  });
}
