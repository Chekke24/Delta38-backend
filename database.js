const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // necesario para Railway
});

// Crear tabla de repuestos
pool.query(
  `CREATE TABLE IF NOT EXISTS repuestos (
    id SERIAL PRIMARY KEY,
    categoria TEXT,
    marca TEXT,
    modelo TEXT,
    codigo TEXT,
    descripcion TEXT
  );`,
  (err) => {
    if (err) {
      console.error("❌ Error al crear tabla 'repuestos':", err.message);
    } else {
      console.log("✅ Tabla 'repuestos' verificada.");
    }
  }
);

// Crear tabla de imágenes ilustrativas
pool.query(
  `CREATE TABLE IF NOT EXISTS imagenes_ilustrativas (
    id SERIAL PRIMARY KEY,
    categoria TEXT UNIQUE,
    url TEXT NOT NULL
  );`,
  (err) => {
    if (err) {
      console.error("❌ Error al crear tabla 'imagenes_ilustrativas':", err.message);
    } else {
      console.log("✅ Tabla 'imagenes_ilustrativas' verificada.");
    }
  }
);

module.exports = pool;
