# Permisos de PostgreSQL en producción

Después de aplicar una migración como `root` o como `postgres`, ejecutar desde la raíz del proyecto:

```bash
bash scripts/verify-postgres-permissions.sh
```

El script lee `DB_NAME` y `DB_USER` desde `server/.env`, otorga los permisos de las tablas de reemplazo de préstamos y verifica que el usuario de la aplicación pueda insertar. No contiene contraseñas ni reemplaza las credenciales del entorno.

Debe ejecutarse después de cada migración que cree tablas nuevas y antes de reiniciar el servicio.
