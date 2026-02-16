import { getPathAvailability, type AppEnvironment } from "../config/env.js";
import { runCommand } from "../runtime/commandRunner.js";
import { toToolTextResult } from "../runtime/errors.js";
import type { RegisteredTool } from "./types.js";

async function checkPort(port: number): Promise<boolean> {
  const result = await runCommand({
    command: "netstat.exe",
    args: ["-ano"],
    timeoutMs: 10_000,
  });

  const pattern = new RegExp(`[:.]${port}\\s+`, "m");
  return pattern.test(result.stdout);
}

export function createPreflightCheckTool(environment: AppEnvironment): RegisteredTool {
  return {
    name: "preflight_check",
    description: "Checks XAMPP binaries/scripts and common ports before operations",
    inputSchema: {
      type: "object",
      properties: {
        apachePort: { type: "number", default: 80 },
        mysqlPort: { type: "number", default: 3306 },
      },
      additionalProperties: false,
    },
    annotations: {
      title: "Preflight Check",
      readOnlyHint: true,
      openWorldHint: false,
    },
    handler: async (args) => {
      const apachePort = typeof args.apachePort === "number" ? args.apachePort : 80;
      const mysqlPort = typeof args.mysqlPort === "number" ? args.mysqlPort : 3306;

      const [apacheBusy, mysqlBusy] = await Promise.all([checkPort(apachePort), checkPort(mysqlPort)]);
      const paths = getPathAvailability(environment);

      const allPathsAvailable = Object.values(paths).every((item) => item.exists);

      const summary = [
        `Path checks: ${allPathsAvailable ? "ok" : "missing files"}`,
        `Apache port ${apachePort}: ${apacheBusy ? "in use" : "free"}`,
        `MySQL port ${mysqlPort}: ${mysqlBusy ? "in use" : "free"}`,
      ].join("\n");

      return toToolTextResult(summary, {
        allPathsAvailable,
        ports: {
          apache: { port: apachePort, inUse: apacheBusy },
          mysql: { port: mysqlPort, inUse: mysqlBusy },
        },
        paths,
      });
    },
  };
}
