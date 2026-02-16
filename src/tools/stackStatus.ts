import { getPathAvailability, type AppEnvironment } from "../config/env.js";
import { runCommand } from "../runtime/commandRunner.js";
import { toToolTextResult } from "../runtime/errors.js";
import type { RegisteredTool } from "./types.js";

async function isProcessRunning(imageName: string): Promise<boolean> {
  const result = await runCommand({
    command: "tasklist.exe",
    args: ["/FI", `IMAGENAME eq ${imageName}`],
    timeoutMs: 5_000,
  });

  return result.stdout.toLowerCase().includes(imageName.toLowerCase());
}

async function getServiceState(serviceName: string): Promise<string> {
  const result = await runCommand({
    command: "sc.exe",
    args: ["query", serviceName],
    timeoutMs: 5_000,
  });

  if (result.exitCode !== 0) {
    return "not-found-or-no-access";
  }

  const lines = result.stdout.split(/\r?\n/);
  const stateLine = lines.find((line) => line.includes("STATE"));
  if (!stateLine) {
    return "unknown";
  }

  return stateLine.split(":").at(-1)?.trim() ?? "unknown";
}

export function createStackStatusTool(environment: AppEnvironment): RegisteredTool {
  return {
    name: "stack_status",
    description: "Shows XAMPP path checks and Apache/MySQL process or service state",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    annotations: {
      title: "Stack Status",
      readOnlyHint: true,
      openWorldHint: false,
    },
    handler: async () => {
      const [apacheRunning, mysqlRunning, apacheServiceState, mysqlServiceState] = await Promise.all([
        isProcessRunning("httpd.exe"),
        isProcessRunning("mysqld.exe"),
        getServiceState(environment.apacheServiceName),
        getServiceState(environment.mysqlServiceName),
      ]);

      const availability = getPathAvailability(environment);

      const adviceLines: string[] = [];
      if (!apacheRunning) {
        adviceLines.push(
          "Apache is stopped. Ask the user to start Apache from XAMPP Control Panel and confirm when ready before continuing. Do not run apache_start.bat automatically.",
        );
      }
      if (!mysqlRunning) {
        adviceLines.push(
          "MySQL is stopped. Ask the user to start MySQL from XAMPP Control Panel and confirm when ready before continuing. Do not run mysql_start.bat automatically.",
        );
      }

      const adviceText = adviceLines.length > 0 ? `\n\nAdvice:\n${adviceLines.join("\n")}` : "";

      const summary = [
        `XAMPP dir: ${environment.xamppDir}`,
        `Apache process: ${apacheRunning ? "running" : "stopped"}`,
        `MySQL process: ${mysqlRunning ? "running" : "stopped"}`,
        `Apache service (${environment.apacheServiceName}): ${apacheServiceState}`,
        `MySQL service (${environment.mysqlServiceName}): ${mysqlServiceState}`,
      ].join("\n") + adviceText;

      return toToolTextResult(summary, {
        xamppDir: environment.xamppDir,
        paths: availability,
        processes: {
          apache: apacheRunning,
          mysql: mysqlRunning,
        },
        services: {
          apache: apacheServiceState,
          mysql: mysqlServiceState,
        },
        requiresUserAction: adviceLines.length > 0,
        nextStep:
          adviceLines.length > 0
            ? "Wait for user confirmation after modules are started in XAMPP Control Panel, then retry the requested tool."
            : "No action needed.",
        advice: adviceLines,
      });
    },
  };
}
