import dotenv from 'dotenv';
import path from 'node:path';

const envPath = process.cwd().toLowerCase().endsWith(`${path.sep}server`)
  ? path.resolve(process.cwd(), '.env')
  : path.resolve(process.cwd(), 'server', '.env');
dotenv.config({ path: envPath });
const root = process.cwd().toLowerCase().endsWith(`${path.sep}server`)
  ? path.resolve(process.cwd(), '..')
  : process.cwd();

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  host: process.env.HOST ?? '0.0.0.0',
  port: Number(process.env.PORT ?? 3443),
  httpPort: Number(process.env.HTTP_PORT ?? 3000),
  origin: process.env.APP_ORIGIN ?? 'https://localhost:3443',
  timezone: process.env.APP_TIMEZONE ?? 'America/Argentina/Buenos_Aires',
  lanHost: process.env.LAN_HOST ?? 'localhost',
  sessionSecret: process.env.SESSION_SECRET ?? 'desarrollo-cambiar-prestamos-cde-2026',
  db: {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_NAME ?? 'bdprestamo_1',
    user: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASSWORD ?? '',
  },
  certPath: path.resolve(root, process.env.TLS_CERT ?? 'storage/certs/server.crt'),
  keyPath: path.resolve(root, process.env.TLS_KEY ?? 'storage/certs/server.key'),
  uploadDir: path.resolve(root, process.env.UPLOAD_DIR ?? 'storage/uploads'),
  clientDist: path.resolve(root, 'client/dist'),
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? '',
};
