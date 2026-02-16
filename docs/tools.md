# Tools disponibles

## preflight_check
Valida rutas críticas de XAMPP y estado de puertos.

Input:
- `apachePort?: number` (default `80`)
- `mysqlPort?: number` (default `3306`)

## stack_status
Muestra estado de procesos (`httpd.exe`, `mysqld.exe`) y servicios Windows.

Si detecta módulos apagados, devuelve recomendaciones para que el usuario los active manualmente en XAMPP Control Panel y confirme cuando estén listos.
No debe iniciar módulos automáticamente por terminal.

Input: ninguno.

## Política cuando MySQL está apagado

Las tools de base de datos (`db_create`, `query_execute`, `db_import`, `db_export`, etc.) devuelven un error guiado cuando MySQL no es alcanzable.

Flujo esperado:
- Pedir al usuario que abra XAMPP Control Panel.
- Pedir que inicie MySQL manualmente.
- Esperar confirmación del usuario.
- Reintentar la operación.

No ejecutar `mysql_start.bat` automáticamente.

## Reglas de validación (nombres)

Política aplicada: usar `snake_case` (letras, números y `_`) y **no usar `-`**.

Hay dos validadores de identificadores (misma regla práctica):

- **Base de datos**
	- Debe empezar por letra o `_`
	- Permite letras, números y `_`
- **Tabla**
	- Debe empezar por letra o `_`
	- Permite letras, números y `_`

Campos de **base de datos** (no aceptan `-`):
- `db_create.database`
- `db_inspect.database`
- `db_export.database`
- `db_import.database`
- `grant_manage.database`
- `table_create.database`

Campos de **tabla** (no aceptan `-`):
- `table_create.table`

### Ejemplo válido para `db_create`

```json
{
	"database": "mcp_test_2026",
	"ifNotExists": true,
	"confirmed": true
}
```

### Ejemplo que falla en `db_create.database`

```json
{
	"database": "database-example-2026",
	"ifNotExists": true,
	"confirmed": true
}
```

Sugerencia esperada: `database_example_2026`.

## Política de codificación de texto (UTF-8)

- El MCP usa UTF-8 (`utf8mb4`) para conexión SQL y export/import.
- Antes de ejecutar SQL, el MCP fuerza `SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci` en la sesión.
- `db_create` crea la base con `CHARACTER SET utf8mb4` y `COLLATE utf8mb4_unicode_ci`.
- No se debe "detectar idioma" para cambiar encoding: español e inglés usan la misma política UTF-8.
- Si el contenido lleva tildes (`á`, `é`, `ñ`), se debe guardar tal cual; no remover ni normalizar caracteres.

Ejemplo recomendado de texto:
- Español: `José Núñez - información pública`
- Inglés: `John Smith - public information`

### Ejemplo que falla en `table_create.table`

```json
{
	"database": "mcp_test_2026",
	"table": "items-test",
	"createStatement": "CREATE TABLE `items-test` (id INT)",
	"confirmed": true
}
```

## query_readonly
Ejecuta solo consultas `SELECT`, `SHOW`, `DESCRIBE`, `EXPLAIN`.

Input:
- `sql: string`
- `database?: string`
- `host?: string`
- `port?: number`
- `user?: string`
- `password?: string`

## query_execute
Ejecuta SQL general con capacidad de escritura (`INSERT`, `UPDATE`, `DELETE`, DDL).

Input:
- `sql: string`
- `confirmed: boolean`
- `database?: string`
- `host?: string`
- `port?: number`
- `user?: string`
- `password?: string`

## db_inspect
Muestra estado de una base de datos con resumen y detalle de tablas.

Input:
- `database: string`
- `host?: string`
- `port?: number`
- `user?: string`
- `password?: string`

## db_create
Crea una base de datos.

Input:
- `database: string`
- `ifNotExists?: boolean` (default `true`)
- `confirmed: boolean`
- `host?: string`
- `port?: number`
- `user?: string`
- `password?: string`

## table_create
Crea una tabla con sentencia `CREATE TABLE`.

Validaciones adicionales:
- `createStatement` debe empezar con `CREATE TABLE`.
- `createStatement` debe apuntar a la misma tabla indicada en `table`.

Input:
- `database: string`
- `table: string`
- `createStatement: string`
- `confirmed: boolean`
- `host?: string`
- `port?: number`
- `user?: string`
- `password?: string`

## user_create
Crea usuario MySQL.

Input:
- `username: string`
- `userPassword: string`
- `hostScope?: string` (default `%`)
- `ifNotExists?: boolean` (default `true`)
- `confirmed: boolean`
- `host?: string`
- `port?: number`
- `user?: string`
- `password?: string` (contraseña admin para ejecutar la sentencia)

## grant_manage
Otorga privilegios a un usuario sobre una base.

Input:
- `database: string`
- `username: string`
- `hostScope?: string` (default `%`)
- `privileges: string` (lista separada por coma o `*`)
- `withGrantOption?: boolean`
- `confirmed: boolean`
- `host?: string`
- `port?: number`
- `user?: string`
- `password?: string`

## db_export
Exporta una base a archivo SQL.

Input:
- `database: string`
- `outputPath?: string`
- `includeCreateDatabase?: boolean` (default `true`)
- `addDropTable?: boolean` (default `true`)
- `confirmed: boolean`
- `host?: string`
- `port?: number`
- `user?: string`
- `password?: string`

## db_import
Importa SQL a una base.

Input:
- `database: string`
- `inputPath: string`
- `confirmed: boolean`
- `host?: string`
- `port?: number`
- `user?: string`
- `password?: string`

## php_cli_run
Ejecuta script PHP con `php.exe` de XAMPP.

Input:
- `scriptPath: string`
- `args?: string`
