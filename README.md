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

Sin instalación global:

```powershell
npx -y xampp-mcp
```

## Configuración en VS Code

Ejemplo recomendado en `.vscode/mcp.json`:

```jsonc
{
  "servers": {
    "xamppMcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "xampp-mcp"],
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

Lista completa de tools:
- [docs/tools.md](docs/tools.md)

## Licencia

Este proyecto está bajo licencia MIT. Consulta [LICENSE](LICENSE).
