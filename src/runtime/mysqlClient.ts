import { promises as fs } from "node:fs";
import { type AppEnvironment } from "../config/env.js";
import { runCommand, type CommandExecutionResult } from "./commandRunner.js";
import { ToolExecutionError } from "./errors.js";

const MYSQL_CHARACTER_SET = "utf8mb4";
const MYSQL_COLLATION = "utf8mb4_unicode_ci";

export interface MysqlConnectionOptions {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
}

export interface MysqlExecutionOptions extends MysqlConnectionOptions {
  sql: string;
  timeoutMs?: number;
}

export interface MysqlDumpOptions extends MysqlConnectionOptions {
  database: string;
  outputPath: string;
  includeCreateDatabase?: boolean;
  addDropTable?: boolean;
  timeoutMs?: number;
}

export interface MysqlImportOptions extends MysqlConnectionOptions {
  database: string;
  inputPath: string;
  timeoutMs?: number;
}

function isMysqlUnavailable(detail: string): boolean {
  const normalized = detail.toLowerCase();

  return (
    normalized.includes("can't connect to mysql server") ||
    normalized.includes("cannot connect to mysql server") ||
    normalized.includes("connection refused") ||
    normalized.includes("actively refused") ||
    normalized.includes("error 2002") ||
    normalized.includes("errno 2002")
  );
}

function resolveConnection(environment: AppEnvironment, options: MysqlConnectionOptions): Required<Omit<MysqlConnectionOptions, "database">> {
  return {
    host: options.host ?? environment.mysqlDefaultHost,
    port: options.port ?? environment.mysqlDefaultPort,
    user: options.user ?? environment.mysqlDefaultUser,
    password: options.password ?? environment.mysqlDefaultPassword ?? "",
  };
}

function baseMysqlArgs(connection: Required<Omit<MysqlConnectionOptions, "database">>): string[] {
  const args = [
    "--protocol=tcp",
    `--default-character-set=${MYSQL_CHARACTER_SET}`,
    "--host",
    connection.host,
    "--port",
    String(connection.port),
    "--user",
    connection.user,
  ];

  if (connection.password.length > 0) {
    args.push(`--password=${connection.password}`);
  }

  return args;
}

function assertSuccess(
  result: CommandExecutionResult,
  context: string,
  connection?: Required<Omit<MysqlConnectionOptions, "database">>,
): void {
  if (result.timedOut) {
    throw new ToolExecutionError(`${context} timed out after ${result.durationMs}ms`, "COMMAND_TIMEOUT");
  }

  if (result.exitCode !== 0) {
    const detail = result.stderr.length > 0 ? result.stderr : result.stdout;

    if (connection && isMysqlUnavailable(detail)) {
      throw new ToolExecutionError(
        `MySQL is not reachable at ${connection.host}:${connection.port}. Ask the user to open XAMPP Control Panel, start MySQL, and confirm when done before retrying this operation. Do not run mysql_start.bat automatically.`,
        "MYSQL_UNREACHABLE",
      );
    }

    throw new ToolExecutionError(`${context} failed (${result.exitCode ?? "unknown"}): ${detail}`, "COMMAND_FAILED");
  }
}

export async function executeMysqlSql(
  environment: AppEnvironment,
  options: MysqlExecutionOptions,
): Promise<CommandExecutionResult> {
  const connection = resolveConnection(environment, options);
  const args = baseMysqlArgs(connection);

  if (options.database) {
    args.push(options.database);
  }

  const sessionHeader = `SET NAMES ${MYSQL_CHARACTER_SET} COLLATE ${MYSQL_COLLATION};`;
  const sqlStatement = options.sql.endsWith(";") ? options.sql : `${options.sql};`;

  const result = await runCommand({
    command: environment.paths.mysqlExe,
    args,
    stdin: `${sessionHeader}\n${sqlStatement}\n`,
    timeoutMs: options.timeoutMs ?? 30_000,
  });

  assertSuccess(result, "MySQL query", connection);
  return result;
}

export async function exportDatabase(
  environment: AppEnvironment,
  options: MysqlDumpOptions,
): Promise<CommandExecutionResult> {
  const connection = resolveConnection(environment, options);

  const args = [
    "--protocol=tcp",
    `--default-character-set=${MYSQL_CHARACTER_SET}`,
    "--host",
    connection.host,
    "--port",
    String(connection.port),
    "--user",
    connection.user,
  ];

  if (connection.password.length > 0) {
    args.push(`--password=${connection.password}`);
  }

  if (options.includeCreateDatabase) {
    args.push("--databases");
  }

  if (options.addDropTable) {
    args.push("--add-drop-table");
  }

  args.push(options.database);

  const result = await runCommand({
    command: environment.paths.mysqldumpExe,
    args,
    timeoutMs: options.timeoutMs ?? 120_000,
  });

  assertSuccess(result, "MySQL export", connection);

  await fs.writeFile(options.outputPath, `${result.stdout}\n`, "utf8");

  return result;
}

export async function importDatabase(
  environment: AppEnvironment,
  options: MysqlImportOptions,
): Promise<CommandExecutionResult> {
  const sql = await fs.readFile(options.inputPath, "utf8");

  const result = await executeMysqlSql(environment, {
    host: options.host,
    port: options.port,
    user: options.user,
    password: options.password,
    database: options.database,
    sql,
    timeoutMs: options.timeoutMs ?? 180_000,
  });

  return result;
}
