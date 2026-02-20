# xampp-mcp

MCP server para administrar XAMPP y MySQL en Windows desde clientes MCP por `stdio` (VS Code, Copilot agents, etc.).

## Requisitos

- Windows
- Node.js 20+
- XAMPP instalado (por defecto en `C:\xampp`)

## Instalación

Paquete npm:
- https://www.npmjs.com/package/xampp-mcp

Instalación global:

```powershell
npm install -g xampp-mcp
```

Instalación local en proyecto:

```powershell
npm i xampp-mcp
```

## Configuración en VS Code

Ejemplo recomendado en `.vscode/mcp.json`:

```jsonc
{
  "servers": {
    "xamppMcp": {
      "type": "stdio",
      "command": "xampp-mcp",
      "args": [],
      "env": {
        "XAMPP_DIR": "C:\\xampp",
        "XAMPP_DEFAULT_MODE": "console"
      }
    }
  }
}
```

Si instalaste el paquete localmente (`npm i xampp-mcp`), puedes usar:

```jsonc
{
  "servers": {
    "xamppMcp": {
      "type": "stdio",
      "command": "node",
      "args": ["${workspaceFolder}/node_modules/xampp-mcp/dist/server.js"],
      "env": {
        "XAMPP_DIR": "C:\\xampp",
        "XAMPP_DEFAULT_MODE": "console"
      }
    }
  }
}
```

Variables opcionales:

- `XAMPP_DIR` (default `C:\xampp`)
- `XAMPP_DEFAULT_MODE` (`console` | `service`, default `console`)
- `XAMPP_APACHE_SERVICE` (default `Apache2.4`)
- `XAMPP_MYSQL_SERVICE` (default `mysql`)
- `MYSQL_HOST` (default `127.0.0.1`)
- `MYSQL_PORT` (default `3306`)
- `MYSQL_USER` (default `root`)
- `MYSQL_PASSWORD` (sin default)

## Notas de uso importantes

- Si Apache/MySQL están apagados, primero debes iniciarlos manualmente desde XAMPP Control Panel.
- Para nombres de base/tabla usa `snake_case` (`_`) y evita `-`.
- El MCP usa UTF-8 (`utf8mb4`) para preservar tildes y caracteres especiales.

## Diagramas ER (flujo recomendado)

Cuando pidas un diagrama de base de datos en VS Code chat:

1. Ejecutar `mcp_xamppmcp_diagram_er` para obtener Mermaid desde el esquema real.
2. Previsualizar en chat con `renderMermaidDiagram` usando `structuredContent.previewRequest.args.markup`.
3. Si el usuario confirma SVG, ejecutar `mcp_xamppmcp_diagram_render` con `structuredContent.renderRequest.args`.

### Salida SVG por defecto

- Si no se envía `outputPath`, el SVG se guarda en `diagrams/<database>.svg` en la raíz del proyecto.
- Para compatibilidad con clientes estrictos, `diagram_er` entrega un `renderRequest` mínimo (`code`) y `diagram_render` infiere la base desde el hint Mermaid `%% database: <db>`.

Lista completa de tools:
- [docs/tools.md](docs/tools.md)

Historial de cambios:
- [CHANGELOG.md](CHANGELOG.md)

## Licencia

Este proyecto está bajo licencia MIT. Consulta [LICENSE](LICENSE).
