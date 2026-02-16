import { runCommand } from "../runtime/commandRunner.js";
import { toToolTextResult, ToolExecutionError } from "../runtime/errors.js";
import { getOptionalString, getString } from "../runtime/validators.js";
import type { AppEnvironment } from "../config/env.js";
import type { RegisteredTool } from "./types.js";

export function createPhpCliRunTool(environment: AppEnvironment): RegisteredTool {
  return {
    name: "php_cli_run",
    description: "Executes a PHP script using XAMPP PHP CLI",
    inputSchema: {
      type: "object",
      properties: {
        scriptPath: { type: "string" },
        args: { type: "string", description: "Arguments as a single string" },
      },
      required: ["scriptPath"],
      additionalProperties: false,
    },
    annotations: {
      title: "PHP CLI Run",
      openWorldHint: false,
      destructiveHint: false,
    },
    handler: async (args) => {
      const scriptPath = getString(args.scriptPath, "scriptPath");
      const rawArgs = getOptionalString(args.args, "args");
      const cliArgs = [scriptPath, ...(rawArgs ? rawArgs.split(" ").filter((item) => item.length > 0) : [])];

      const result = await runCommand({
        command: environment.paths.phpExe,
        args: cliArgs,
        timeoutMs: 60_000,
      });

      if (result.exitCode !== 0) {
        throw new ToolExecutionError(result.stderr || result.stdout || "PHP CLI failed", "PHP_CLI_FAILED");
      }

      const text = result.stdout.length > 0 ? result.stdout : "PHP script executed successfully";
      return toToolTextResult(text, {
        stdout: result.stdout,
        stderr: result.stderr,
      });
    },
  };
}
