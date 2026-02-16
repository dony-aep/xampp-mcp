import { ToolExecutionError } from "../runtime/errors.js";

const IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const USERNAME_PATTERN = /^[A-Za-z0-9._$-]+$/;
const HOST_PATTERN = /^[A-Za-z0-9.%_-]+$/;

function buildIdentifierErrorMessage(value: string, fieldName: string): string {
  const base = `Invalid ${fieldName}. Use snake_case with letters, numbers and underscore only; it must start with a letter or underscore.`;

  if (!value.includes("-")) {
    return base;
  }

  const suggested = value.replace(/-/g, "_");
  return `${base} Hyphen (-) is not allowed by policy. Suggested ${fieldName}: "${suggested}".`;
}

export function requireConfirmation(confirmed: boolean | undefined, action: string): void {
  if (confirmed) {
    return;
  }

  throw new ToolExecutionError(
    `${action} requires explicit confirmation. Set "confirmed": true to proceed.`,
    "CONFIRMATION_REQUIRED",
  );
}

export function assertIdentifier(value: string, fieldName: string): void {
  if (!IDENTIFIER_PATTERN.test(value)) {
    throw new ToolExecutionError(buildIdentifierErrorMessage(value, fieldName), "INVALID_IDENTIFIER");
  }
}

export function assertDatabaseIdentifier(value: string, fieldName: string): void {
  if (!IDENTIFIER_PATTERN.test(value)) {
    throw new ToolExecutionError(buildIdentifierErrorMessage(value, fieldName), "INVALID_IDENTIFIER");
  }
}

export function assertUsername(value: string): void {
  if (!USERNAME_PATTERN.test(value)) {
    throw new ToolExecutionError("Invalid username. Allowed chars: letters, numbers, . _ $ -", "INVALID_USERNAME");
  }
}

export function assertHost(value: string): void {
  if (!HOST_PATTERN.test(value)) {
    throw new ToolExecutionError("Invalid host. Allowed chars: letters, numbers, %, ., _, -", "INVALID_HOST");
  }
}

export function escapeSqlIdentifier(identifier: string): string {
  return `\`${identifier.replace(/`/g, "``")}\``;
}

export function escapeSqlLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}
