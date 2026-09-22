# Préstamos CDE

Sistema web para administrar clientes, préstamos, ventas financiadas, cuotas, cobros, caja y gastos. La interfaz está construida con React y la API con Node.js/Express sobre PostgreSQL 9.5.

## Acceso actual

- Aplicación local recomendada si el navegador aún no confía en el certificado: `http://localhost:3000`
- Aplicación local HTTPS (necesaria para GPS): `https://localhost:3443`
- Aplicación en la red: `https://192.168.0.2:3443`

Para el mapa interactivo configure `GOOGLE_MAPS_API_KEY` en `server/.env`. Sin clave se muestra igualmente el mapa incrustado y el enlace directo a Google Maps.
Cambie la contraseña del administrador y el secreto de sesión antes de utilizar información real.

Para generar formularios públicos de clientes, configure `APP_ORIGIN` con la URL HTTPS accesible desde los teléfonos (por ejemplo, `https://192.168.0.2:3443`), nunca con `localhost`. El enlace generado vence en 24 horas y se invalida después de guardar correctamente. Aplique también `database/010_enlaces_cliente.sql`.

## Puesta en marcha

1. Instale Node.js y asegúrese de que PostgreSQL esté iniciado.
2. Copie `server/.env.example` como `server/.env` y complete la conexión.
3. Ejecute `npm install`.
4. En una base vacía, aplique `database/001_esquema_inicial.sql`.
5. Ejecute `npm run cert:generate` para crear el certificado HTTPS local.
6. Ejecute `npm run db:seed` únicamente en una base nueva para crear la configuración inicial.
7. Ejecute `npm run build` y luego `npm start`.

Para desarrollo use `npm run dev`. El frontend se abre en el puerto 5173 y dirige `/api` al servidor HTTPS.

## HTTPS y ubicación GPS

El comando de certificados crea `storage/certs/local-ca.crt`. Para evitar advertencias y permitir GPS desde móviles:

1. Instale `local-ca.crt` como autoridad raíz confiable en la PC del servidor.
2. Copie únicamente `local-ca.crt` a cada teléfono y márquelo como certificado de confianza.
3. No copie ni comparta archivos `.key`.
4. Si cambia la IP de la PC, actualice `LAN_HOST` y `APP_ORIGIN` y vuelva a generar los certificados.

## Comandos

- `npm run dev`: API y frontend en modo desarrollo.
- `npm run build`: compila frontend y backend.
- `npm start`: inicia la aplicación compilada.
- `npm run db:seed`: crea la configuración inicial en una base nueva; no borra ni modifica una instalación existente.
- `npm run db:cleanup-demo`: muestra los datos demo identificados y, con confirmación explícita, los elimina sin tocar usuarios ni catálogos administrativos.
- `npm run db:cleanup-all`: muestra y, con confirmación explícita, elimina todos los datos de negocio manteniendo usuarios, roles, permisos y catálogos del sistema.
- `npm test`: ejecuta pruebas unitarias.
- `npm run cert:generate`: genera la CA y el certificado HTTPS local.

## Seguridad y datos

- Las contraseñas se guardan con bcrypt.
- La sesión utiliza una cookie HTTP-only de ocho horas.
- Los importes viajan como cadenas decimales y se calculan sin punto flotante.
- Los archivos se guardan fuera de PostgreSQL y requieren una sesión válida para descargarse.
- Clientes y catálogos usan baja lógica mediante `activo`.
- Préstamos, pagos y caja se registran dentro de transacciones.

Antes de cambios importantes, cree un respaldo con `pg_dump`. El respaldo previo a esta implementación se encuentra en `database/backups/`.
