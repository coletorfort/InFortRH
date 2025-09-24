import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema.js";

// Configuração do banco PostgreSQL externo (hostname: fmarechal.com)
// Temporariamente comentado devido a problemas de conectividade
/*
const pool = new Pool({
  host: 'fmarechal.com', // resolve para 216.172.172.73
  database: 'cledso35_infort',
  user: 'cledso35_rh_admin', 
  password: 'HrF#25_10',
  port: 5432,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 30000,
  max: 10
});
*/

// Configuração temporária para banco local (usar enquanto resolvemos conectividade)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

export const db = drizzle(pool, { schema });
