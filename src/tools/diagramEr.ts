import { executeMysqlSql } from "../runtime/mysqlClient.js";
import { ToolExecutionError, toToolTextResult } from "../runtime/errors.js";
import { getBoolean, getOptionalString, getString } from "../runtime/validators.js";
import {
  assertDatabaseIdentifier,
  assertIdentifier,
  escapeSqlLiteral,
} from "../security/policy.js";
import { mysqlConnectionFromArgs } from "./shared.js";
import type { AppEnvironment } from "../config/env.js";
import type { RegisteredTool } from "./types.js";

interface TableRow {
  TABLE_NAME: string;
}

interface ColumnRow {
  TABLE_NAME: string;
  COLUMN_NAME: string;
  COLUMN_TYPE: string;
  IS_NULLABLE: string;
  COLUMN_KEY: string;
}

interface ForeignKeyRow {
  TABLE_NAME: string;
  COLUMN_NAME: string;
  REFERENCED_TABLE_NAME: string;
  REFERENCED_COLUMN_NAME: string;
}

function valueOrEmpty(row: Record<string, string>, key: string): string {
  return (row[key] ?? "").trim();
}

function parseTabularOutput(stdout: string): Array<Record<string, string>> {
  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    return [];
  }

  const header = lines[0];
  if (!header) {
    return [];
  }

  const headers = header.split("\t").map((item) => item.trim());
  if (headers.length === 0) {
    return [];
  }

  const rows: Array<Record<string, string>> = [];

  for (const line of lines.slice(1)) {
    const cells = line.split("\t");
    const row: Record<string, string> = {};

    for (let index = 0; index < headers.length; index += 1) {
      const key = headers[index];
      if (!key) {
        continue;
      }

      row[key] = (cells[index] ?? "").trim();
    }

    rows.push(row);
  }

  return rows;
}

function parseTableRows(stdout: string): TableRow[] {
  const rows = parseTabularOutput(stdout);

  return rows
    .map((row) => ({
      TABLE_NAME: valueOrEmpty(row, "TABLE_NAME"),
    }))
    .filter((row) => row.TABLE_NAME.length > 0);
}

function parseColumnRows(stdout: string): ColumnRow[] {
  const rows = parseTabularOutput(stdout);

  return rows
    .map((row) => ({
      TABLE_NAME: valueOrEmpty(row, "TABLE_NAME"),
      COLUMN_NAME: valueOrEmpty(row, "COLUMN_NAME"),
      COLUMN_TYPE: valueOrEmpty(row, "COLUMN_TYPE"),
      IS_NULLABLE: valueOrEmpty(row, "IS_NULLABLE"),
      COLUMN_KEY: valueOrEmpty(row, "COLUMN_KEY"),
    }))
    .filter((row) => row.TABLE_NAME.length > 0 && row.COLUMN_NAME.length > 0);
}

function parseForeignKeyRows(stdout: string): ForeignKeyRow[] {
  const rows = parseTabularOutput(stdout);

  return rows
    .map((row) => ({
      TABLE_NAME: valueOrEmpty(row, "TABLE_NAME"),
      COLUMN_NAME: valueOrEmpty(row, "COLUMN_NAME"),
      REFERENCED_TABLE_NAME: valueOrEmpty(row, "REFERENCED_TABLE_NAME"),
      REFERENCED_COLUMN_NAME: valueOrEmpty(row, "REFERENCED_COLUMN_NAME"),
    }))
    .filter(
      (row) =>
        row.TABLE_NAME.length > 0 &&
        row.COLUMN_NAME.length > 0 &&
        row.REFERENCED_TABLE_NAME.length > 0 &&
        row.REFERENCED_COLUMN_NAME.length > 0,
    );
}

function parseTableFilter(tablesCsv: string | undefined): string[] {
  if (!tablesCsv) {
    return [];
  }

  const parsed = tablesCsv
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  for (const table of parsed) {
    assertIdentifier(table, "tables");
  }

  return Array.from(new Set(parsed));
}

function buildInClause(column: string, values: string[]): string {
  if (values.length === 0) {
    return "";
  }

  const literals = values.map((value) => escapeSqlLiteral(value)).join(", ");
  return ` AND ${column} IN (${literals})`;
}

function normalizeType(columnType: string): string {
  const normalized = columnType.trim();
  if (normalized.length === 0) {
    return "string";
  }

  const firstToken = normalized.split(/\s+/)[0] ?? "";
  const safeToken = firstToken.replace(/[^A-Za-z0-9_]/g, "").toLowerCase();

  return safeToken.length > 0 ? safeToken : "string";
}

function relationCardinality(isNullable: string): string {
  return isNullable.toUpperCase() === "YES" ? "|o--o{" : "||--o{";
}

export function createDiagramErTool(environment: AppEnvironment): RegisteredTool {
  return {
    name: "diagram_er",
    description: "Generates a Mermaid ER diagram from the real MySQL schema",
    inputSchema: {
      type: "object",
      properties: {
        database: { type: "string" },
        tables: { type: "string", description: "Optional comma-separated table filter" },
        show_columns: { type: "boolean" },
        show_types: { type: "boolean" },
        host: { type: "string" },
        port: { type: "number" },
        user: { type: "string" },
        password: { type: "string" },
      },
      required: ["database"],
      additionalProperties: false,
    },
    annotations: {
      title: "Generate ER Diagram",
      readOnlyHint: true,
      openWorldHint: true,
    },
    handler: async (args) => {
      const database = getString(args.database, "database");
      const tablesCsv = getOptionalString(args.tables, "tables");
      const showColumns = getBoolean(args.show_columns, "show_columns", true);
      const showTypes = getBoolean(args.show_types, "show_types", true);

      assertDatabaseIdentifier(database, "database");

      const selectedTables = parseTableFilter(tablesCsv);
      const schemaLiteral = escapeSqlLiteral(database);
      const tableFilterForTables = buildInClause("TABLE_NAME", selectedTables);

      const tablesResult = await executeMysqlSql(environment, {
        ...mysqlConnectionFromArgs(args),
        sql: `
SELECT TABLE_NAME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = ${schemaLiteral}
  AND TABLE_TYPE = 'BASE TABLE'${tableFilterForTables}
ORDER BY TABLE_NAME
        `,
      });

      const tableRows = parseTableRows(tablesResult.stdout);
      const tableNames = tableRows
        .map((row) => row.TABLE_NAME)
        .filter((value): value is string => typeof value === "string" && value.length > 0);

      if (tableNames.length === 0) {
        throw new ToolExecutionError(`No tables found in database ${database}`, "NOT_FOUND");
      }

      const tableFilterForColumns = buildInClause("TABLE_NAME", tableNames);

      const columnsResult = await executeMysqlSql(environment, {
        ...mysqlConnectionFromArgs(args),
        sql: `
SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = ${schemaLiteral}${tableFilterForColumns}
ORDER BY TABLE_NAME, ORDINAL_POSITION
        `,
      });

      const fkFilter = buildInClause("kcu.TABLE_NAME", tableNames);
      const foreignKeysResult = await executeMysqlSql(environment, {
        ...mysqlConnectionFromArgs(args),
        sql: `
SELECT
  kcu.TABLE_NAME,
  kcu.COLUMN_NAME,
  kcu.REFERENCED_TABLE_NAME,
  kcu.REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE kcu
WHERE kcu.TABLE_SCHEMA = ${schemaLiteral}
  AND kcu.REFERENCED_TABLE_NAME IS NOT NULL${fkFilter}
ORDER BY kcu.TABLE_NAME, kcu.COLUMN_NAME
        `,
      });

      const columnRows = parseColumnRows(columnsResult.stdout);
      const foreignKeyRows = parseForeignKeyRows(foreignKeysResult.stdout);

      const columnsByTable = new Map<string, ColumnRow[]>();
      const fkColumns = new Set<string>();
      const nullableByColumn = new Map<string, string>();

      for (const column of columnRows) {
        const tableName = column.TABLE_NAME;
        const columnName = column.COLUMN_NAME;

        if (!tableName || !columnName) {
          continue;
        }

        const current = columnsByTable.get(tableName) ?? [];
        current.push(column);
        columnsByTable.set(tableName, current);
        nullableByColumn.set(`${tableName}.${columnName}`, column.IS_NULLABLE || "NO");
      }

      for (const fk of foreignKeyRows) {
        if (!fk.TABLE_NAME || !fk.COLUMN_NAME) {
          continue;
        }

        fkColumns.add(`${fk.TABLE_NAME}.${fk.COLUMN_NAME}`);
      }

      const diagramLines: string[] = ["erDiagram"];

      if (showColumns) {
        for (const tableName of tableNames) {
          diagramLines.push(`    ${tableName} {`);

          const columns = columnsByTable.get(tableName) ?? [];
          for (const column of columns) {
            const columnName = column.COLUMN_NAME;
            if (!columnName) {
              continue;
            }

            const flags: string[] = [];
            if ((column.COLUMN_KEY ?? "").toUpperCase() === "PRI") {
              flags.push("PK");
            }
            if (fkColumns.has(`${tableName}.${columnName}`)) {
              flags.push("FK");
            }

            const typeToken = showTypes ? normalizeType(column.COLUMN_TYPE ?? "") : "string";
            const suffix = flags.length > 0 ? ` ${flags.join(" ")}` : "";
            diagramLines.push(`        ${typeToken} ${columnName}${suffix}`);
          }

          diagramLines.push("    }");
        }
      }

      for (const fk of foreignKeyRows) {
        const childTable = fk.TABLE_NAME;
        const childColumn = fk.COLUMN_NAME;
        const parentTable = fk.REFERENCED_TABLE_NAME;

        if (!childTable || !childColumn || !parentTable) {
          continue;
        }

        const nullable = nullableByColumn.get(`${childTable}.${childColumn}`) ?? "NO";
        const cardinality = relationCardinality(nullable);
        diagramLines.push(`    ${parentTable} ${cardinality} ${childTable} : \"${childColumn}\"`);
      }

      const mermaid = [`%% database: ${database}`, ...diagramLines].join("\n");
      const text = [
        `ER diagram generated for database: ${database}`,
        "Suggested flow: first preview with renderMermaidDiagram using structuredContent.previewRequest.args.markup.",
        "After preview, ask the user in the current conversation language whether SVG output is needed.",
        "",
        "```mermaid",
        mermaid,
        "```",
      ].join("\n");

      const structured = {
        database,
        tables: tableNames,
        tableCount: tableNames.length,
        relationshipCount: foreignKeyRows.length,
        mermaid,
        previewRequest: {
          tool: "renderMermaidDiagram",
          args: {
            title: `ER Preview - ${database}`,
            markup: mermaid,
          },
        },
        renderRequest: {
          tool: "diagram_render",
          args: {
            code: mermaid,
          },
        },
      };

      return toToolTextResult(text, {
        ...structured,
      });
    },
  };
}
