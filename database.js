const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

//  tabla de repuestos si no existe
pool.query(
  `CREATE TABLE IF NOT EXISTS repuestos (
    id SERIAL PRIMARY KEY,
    "CODIGO" TEXT,
    "MARCA" TEXT,
    "ENTRADAS" INTEGER,
    "SALIDAS" INTEGER,
    "STOCK" INTEGER,
    "PRECIOS" NUMERIC,
    "IMPORTE_INVENTARIO" NUMERIC
  );`,
  (err) => {
    if (err) console.error(" Error creando tabla repuestos:", err.message);
    else console.log("Tabla repuestos verificada.");
  }
);

// tabla imágenes
pool.query(
  `CREATE TABLE IF NOT EXISTS imagenes_ilustrativas (
    id SERIAL PRIMARY KEY,
    categoria TEXT UNIQUE,
    url TEXT NOT NULL
  );`,
  (err) => {
    if (err) console.error("Error creando tabla imágenes:", err.message);
    else console.log("Tabla imágenes verificada.");
  }
);

module.exports = pool;
