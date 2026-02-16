import { ToolExecutionError } from "./errors.js";

export function getString(value: unknown, fieldName: string, options?: { optional?: boolean }): string {
  if (value === undefined || value === null) {
    if (options?.optional) {
      return "";
    }

    throw new ToolExecutionError(`${fieldName} is required`, "INVALID_INPUT");
  }

  if (typeof value !== "string") {
    throw new ToolExecutionError(`${fieldName} must be a string`, "INVALID_INPUT");
  }

  const trimmed = value.trim();
  if (!options?.optional && trimmed.length === 0) {
    throw new ToolExecutionError(`${fieldName} cannot be empty`, "INVALID_INPUT");
  }

  return trimmed;
}

export function getOptionalString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new ToolExecutionError(`${fieldName} must be a string`, "INVALID_INPUT");
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function getBoolean(value: unknown, fieldName: string, fallback = false): boolean {
  if (value === undefined || value === null) {
    return fallback;
  }

  if (typeof value !== "boolean") {
    throw new ToolExecutionError(`${fieldName} must be a boolean`, "INVALID_INPUT");
  }

  return value;
}

export function getOptionalNumber(value: unknown, fieldName: string): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ToolExecutionError(`${fieldName} must be a number`, "INVALID_INPUT");
  }

  return value;
}

export function getEnum<T extends string>(
  value: unknown,
  fieldName: string,
  accepted: readonly T[],
  fallback?: T,
): T {
  if (value === undefined || value === null) {
    if (fallback !== undefined) {
      return fallback;
    }

    throw new ToolExecutionError(`${fieldName} is required`, "INVALID_INPUT");
  }

  if (typeof value !== "string") {
    throw new ToolExecutionError(`${fieldName} must be a string`, "INVALID_INPUT");
  }

  if ((accepted as readonly string[]).includes(value)) {
    return value as T;
  }

  throw new ToolExecutionError(`${fieldName} must be one of: ${accepted.join(", ")}`, "INVALID_INPUT");
}
