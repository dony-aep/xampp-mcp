import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export interface CommandExecutionOptions {
  command: string;
  args?: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  stdin?: string;
}

export interface DetachedCommandOptions {
  command: string;
  args?: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

export interface DetachedCommandResult {
  command: string;
  args: string[];
  pid: number | undefined;
}

export interface CommandExecutionResult {
  command: string;
  args: string[];
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  durationMs: number;
}

function unwrapQuoted(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length < 2) {
    return trimmed;
  }

  const startsWithDouble = trimmed.startsWith("\"") && trimmed.endsWith("\"");
  const startsWithSingle = trimmed.startsWith("'") && trimmed.endsWith("'");

  if (startsWithDouble || startsWithSingle) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

function normalizeFileUri(value: string): string {
  if (!value.toLowerCase().startsWith("file://")) {
    return value;
  }

  try {
    return fileURLToPath(value);
  } catch {
    return value;
  }
}

function normalizeCommandValue(value: string): string {
  return normalizeFileUri(unwrapQuoted(value));
}

function quoteForCmd(value: string): string {
  if (value.length === 0) {
    return "\"\"";
  }

  const escaped = value.replace(/([\^&|<>()%!\"])|\r|\n/g, "^$1");
  return `"${escaped}"`;
}

function isBatchScript(filePath: string): boolean {
  const extension = path.extname(normalizeCommandValue(filePath)).toLowerCase();
  return extension === ".bat" || extension === ".cmd";
}

function toSpawnSpec(command: string, args: string[]): { file: string; args: string[] } {
  const normalizedCommand = normalizeCommandValue(command);

  if (!isBatchScript(normalizedCommand)) {
    return { file: normalizedCommand, args };
  }

  return {
    file: "cmd.exe",
    args: ["/d", "/c", "call", normalizedCommand, ...args],
  };
}

export async function runCommand(options: CommandExecutionOptions): Promise<CommandExecutionResult> {
  const {
    command,
    args = [],
    cwd,
    env,
    timeoutMs = 30_000,
    stdin,
  } = options;

  const start = Date.now();
  const normalizedCommand = normalizeCommandValue(command);
  const spawnSpec = toSpawnSpec(normalizedCommand, args);

  return await new Promise<CommandExecutionResult>((resolve, reject) => {
    const child = spawn(spawnSpec.file, spawnSpec.args, {
      cwd,
      env,
      windowsHide: true,
      stdio: "pipe",
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.on("close", (exitCode) => {
      clearTimeout(timer);
      resolve({
        command: normalizedCommand,
        args,
        exitCode,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        timedOut,
        durationMs: Date.now() - start,
      });
    });

    if (stdin !== undefined) {
      child.stdin.write(stdin);
    }

    child.stdin.end();
  });
}

export function runDetachedCommand(options: DetachedCommandOptions): DetachedCommandResult {
  const {
    command,
    args = [],
    cwd,
    env,
  } = options;

  const normalizedCommand = normalizeCommandValue(command);
  const spawnSpec = toSpawnSpec(normalizedCommand, args);

  const child = spawn(spawnSpec.file, spawnSpec.args, {
    cwd,
    env,
    windowsHide: true,
    detached: true,
    stdio: "ignore",
  });

  child.unref();

  return {
    command: normalizedCommand,
    args,
    pid: child.pid,
  };
}
