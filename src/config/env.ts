import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type RunMode = "console" | "service";

export interface AppEnvironment {
  xamppDir: string;
  defaultMode: RunMode;
  apacheServiceName: string;
  mysqlServiceName: string;
  mysqlDefaultHost: string;
  mysqlDefaultPort: number;
  mysqlDefaultUser: string;
  mysqlDefaultPassword?: string;
  paths: {
    apacheStart: string;
    apacheStop: string;
    apacheExe: string;
    mysqlStart: string;
    mysqlStop: string;
    mysqldExe: string;
    mysqlIni: string;
    mysqlExe: string;
    mysqldumpExe: string;
    phpExe: string;
  };
}

function env(name: string): string | undefined {
  const value = process.env[name];
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  const startsWithDouble = trimmed.startsWith("\"") && trimmed.endsWith("\"");
  const startsWithSingle = trimmed.startsWith("'") && trimmed.endsWith("'");

  if ((startsWithDouble || startsWithSingle) && trimmed.length >= 2) {
    const unwrapped = trimmed.slice(1, -1).trim();
    return unwrapped.length > 0 ? unwrapped : undefined;
  }

  return trimmed;
}

function normalizePathValue(value: string): string {
  if (!value.toLowerCase().startsWith("file://")) {
    return value;
  }

  try {
    return fileURLToPath(value);
  } catch {
    return value;
  }
}

function resolveXamppPath(xamppDir: string, ...segments: string[]): string {
  return path.join(xamppDir, ...segments);
}

function parseMode(value: string | undefined): RunMode {
  if (value === "service") {
    return "service";
  }

  return "console";
}

function parsePort(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isFinite(parsed) && parsed > 0 && parsed <= 65535) {
    return parsed;
  }

  return fallback;
}

export interface PathAvailability {
  path: string;
  exists: boolean;
}

export function loadEnvironment(): AppEnvironment {
  const xamppDir = normalizePathValue(env("XAMPP_DIR") ?? "C:\\xampp");

  return {
    xamppDir,
    defaultMode: parseMode(env("XAMPP_DEFAULT_MODE")),
    apacheServiceName: env("XAMPP_APACHE_SERVICE") ?? "Apache2.4",
    mysqlServiceName: env("XAMPP_MYSQL_SERVICE") ?? "mysql",
    mysqlDefaultHost: env("MYSQL_HOST") ?? "127.0.0.1",
    mysqlDefaultPort: parsePort(env("MYSQL_PORT"), 3306),
    mysqlDefaultUser: env("MYSQL_USER") ?? "root",
    mysqlDefaultPassword: env("MYSQL_PASSWORD"),
    paths: {
      apacheStart: resolveXamppPath(xamppDir, "apache_start.bat"),
      apacheStop: resolveXamppPath(xamppDir, "apache_stop.bat"),
      apacheExe: resolveXamppPath(xamppDir, "apache", "bin", "httpd.exe"),
      mysqlStart: resolveXamppPath(xamppDir, "mysql_start.bat"),
      mysqlStop: resolveXamppPath(xamppDir, "mysql_stop.bat"),
      mysqldExe: resolveXamppPath(xamppDir, "mysql", "bin", "mysqld.exe"),
      mysqlIni: resolveXamppPath(xamppDir, "mysql", "bin", "my.ini"),
      mysqlExe: resolveXamppPath(xamppDir, "mysql", "bin", "mysql.exe"),
      mysqldumpExe: resolveXamppPath(xamppDir, "mysql", "bin", "mysqldump.exe"),
      phpExe: resolveXamppPath(xamppDir, "php", "php.exe"),
    },
  };
}

export function getPathAvailability(environment: AppEnvironment): Record<string, PathAvailability> {
  return {
    apacheStart: { path: environment.paths.apacheStart, exists: existsSync(environment.paths.apacheStart) },
    apacheStop: { path: environment.paths.apacheStop, exists: existsSync(environment.paths.apacheStop) },
    apacheExe: { path: environment.paths.apacheExe, exists: existsSync(environment.paths.apacheExe) },
    mysqlStart: { path: environment.paths.mysqlStart, exists: existsSync(environment.paths.mysqlStart) },
    mysqlStop: { path: environment.paths.mysqlStop, exists: existsSync(environment.paths.mysqlStop) },
    mysqldExe: { path: environment.paths.mysqldExe, exists: existsSync(environment.paths.mysqldExe) },
    mysqlIni: { path: environment.paths.mysqlIni, exists: existsSync(environment.paths.mysqlIni) },
    mysqlExe: { path: environment.paths.mysqlExe, exists: existsSync(environment.paths.mysqlExe) },
    mysqldumpExe: { path: environment.paths.mysqldumpExe, exists: existsSync(environment.paths.mysqldumpExe) },
    phpExe: { path: environment.paths.phpExe, exists: existsSync(environment.paths.phpExe) },
  };
}
