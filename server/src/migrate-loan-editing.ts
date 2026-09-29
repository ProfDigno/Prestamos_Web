import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import pg from 'pg';
import {config} from './config.js';

const root=path.resolve(config.clientDist,'../..');
const db=new pg.Client({...config.db,connectionTimeoutMillis:5000});
try {
  await db.connect();
  const state=(await db.query("SELECT to_regclass('prestamo_reemplazo') AS installed,current_database() AS database")).rows[0];
  if(state.installed)console.log('La migración de edición de préstamos ya está aplicada.');
  else {
    const backupDir=path.join(root,'database','backups');fs.mkdirSync(backupDir,{recursive:true});
    const backup=path.join(backupDir,`antes_edicion_prestamos_${Date.now()}.dump`);
    const executable=process.env.PG_DUMP_PATH || 'pg_dump';
    const result=spawnSync(executable,['--format=custom','--file',backup,'--no-password'],{windowsHide:true,encoding:'utf8',env:{...process.env,PGHOST:config.db.host,PGPORT:String(config.db.port),PGDATABASE:config.db.database,PGUSER:config.db.user,PGPASSWORD:config.db.password}});
    if(result.error || result.status!==0)throw new Error(`No se pudo crear el respaldo: ${result.error?.message || result.stderr}`);
    if(fs.statSync(backup).size===0)throw new Error('El respaldo está vacío');
    console.log('Respaldo creado:',backup);
    await db.query("SET lock_timeout='10s'");
    await db.query(fs.readFileSync(path.join(root,'database','019_edicion_prestamos.sql'),'utf8'));
    console.log('Migración 019 aplicada en',state.database);
  }
} catch(error) {
  await db.query('ROLLBACK').catch(()=>{});
  console.error(error instanceof Error?error.message:error);process.exitCode=1;
} finally {await db.end();}
