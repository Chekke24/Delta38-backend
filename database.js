const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // necesario para Railway
});

// 🗑️ Eliminar la tabla 'repuestos' si ya existe
pool.query("DROP TABLE IF EXISTS repuestos", (err) => {
  if (err) {
    console.error("❌ Error al eliminar tabla 'repuestos':", err.message);
  } else {
    console.log("🗑️ Tabla 'repuestos' eliminada correctamente.");

    // 🧱 Crear tabla de repuestos con columnas adaptadas al Excel
    pool.query(
      `CREATE TABLE IF NOT EXISTS repuestos (
        id SERIAL PRIMARY KEY,
        codigo TEXT,
        marca TEXT,
        entradas INTEGER,
        salidas INTEGER,
        stock INTEGER,
        precios NUMERIC,
        importe_inventario NUMERIC
      );`,
      (err) => {
        if (err) {
          console.error("❌ Error al crear tabla 'repuestos':", err.message);
        } else {
          console.log("✅ Tabla 'repuestos' recreada con éxito.");
        }
      }
    );
  }
});

// ✅ Crear tabla de imágenes ilustrativas (no se borra, solo se verifica)
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
