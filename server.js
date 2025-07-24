const express = require("express");
const cors = require("cors");
const multer = require("multer");
require("dotenv").config();
const pool = require("./database");
const { v2: cloudinary } = require("cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const XLSX = require("xlsx");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// === CORS ===
const allowedOrigins = [
  'https://delta38-frontend.netlify.app',
  'http://localhost:3000'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS bloqueado: origen no permitido'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// === CLOUDINARY CONFIG ===
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// === MULTER: Cloudinary Storage ===
const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "delta38_ilustrativas",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 800, height: 800, crop: "limit" }],
  },
});
const uploadImages = multer({ storage: imageStorage });

// === MULTER: Excel Memory Storage ===
const uploadExcel = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (![".xlsx", ".xls", ".xlsm"].includes(ext)) {
      return cb(new Error("Solo se permiten archivos Excel (.xlsx, .xls, .xlsm)"));
    }
    cb(null, true);
  }
});

// === RUTA BASE ===
app.get("/", (req, res) => {
  res.json({ message: "✅ Servidor funcionando con PostgreSQL + Cloudinary + Excel" });
});

// === CARGA DE EXCEL ===
app.post("/stock/excel", uploadExcel.single("archivo"), async (req, res) => {
  try {
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.SheetNames.find(name =>
      name.toLowerCase().includes("inventario")
    ) || workbook.SheetNames[0];

    const datos = XLSX.utils.sheet_to_json(workbook.Sheets[sheet], {
      range: 3,        // Comienza desde la fila 4 (índice 3)
      defval: "",      // Evita undefined
      raw: false
    });

    let cargados = 0;

    for (const fila of datos) {
      const codigo = fila["CODIGO"]?.toString().trim();
      const marca = fila["MARCA"]?.toString().trim();
      const entradas = parseInt(fila["ENTRADAS"]) || 0;
      const salidas = parseInt(fila["SALIDAS"]) || 0;
      const stock = parseInt(fila["STOCK"]) || 0;

      const preciosStr = fila["PRECIOS"]?.toString().replace(/[$\s-]/g, '').replace(',', '.') || '';
      const preciosNum = preciosStr && !isNaN(preciosStr) ? parseFloat(preciosStr) : null;

      const inventarioStr = fila["IMPORTE_INVENTARIO"]?.toString().replace(/[$\s-]/g, '').replace(',', '.') || '';
      const inventarioNum = inventarioStr && !isNaN(inventarioStr) ? parseFloat(inventarioStr) : null;

      // Saltear fila vacía
      if (!codigo && !marca && !stock) continue;

      await pool.query(
        `INSERT INTO repuestos ("CODIGO", "MARCA", "ENTRADAS", "SALIDAS", "STOCK", "PRECIOS", "IMPORTE_INVENTARIO")
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [codigo, marca, entradas, salidas, stock, preciosNum, inventarioNum]
      );

      cargados++;
    }

    res.json({ message: `✅ Se cargaron ${cargados} repuestos desde Excel.` });
  } catch (error) {
    console.error("❌ Error al procesar Excel:", error);
    res.status(500).json({ error: "Error al procesar el archivo Excel" });
  }
});

// === ELIMINAR TODOS LOS REPUESTOS ===
app.delete("/stock/eliminar-todo", async (req, res) => {
  try {
    await pool.query("DELETE FROM repuestos");
    res.json({ message: "🗑️ Todos los repuestos fueron eliminados." });
  } catch (error) {
    console.error("Error al eliminar repuestos:", error);
    res.status(500).json({ error: "Error al eliminar repuestos" });
  }
});

// === SUBIDA DE IMÁGENES ===
app.post("/imagenes", uploadImages.array("imagenes", 10), async (req, res) => {
  try {
    for (let i = 0; i < req.files.length; i++) {
      const nombre = `Elemento ${i + 1}`;
      const url = req.files[i].path;

      await pool.query(
        `INSERT INTO imagenes_ilustrativas (categoria, url)
         VALUES ($1, $2)
         ON CONFLICT (categoria) DO UPDATE SET url = EXCLUDED.url`,
        [nombre.toLowerCase(), url]
      );
    }

    res.json({ message: "🖼️ Imágenes ilustrativas guardadas correctamente" });
  } catch (error) {
    console.error("Error al subir imágenes:", error);
    res.status(500).json({ error: "Error al subir imágenes ilustrativas" });
  }
});

// === BUSCADOR DE REPUESTOS ===
app.get("/repuestos", async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: "Falta el parámetro de búsqueda" });

  try {
    const productos = await pool.query(
      `SELECT * FROM repuestos
       WHERE LOWER("CODIGO") LIKE $1
       OR LOWER("MARCA") LIKE $1`,
      [`%${query.toLowerCase()}%`]
    );

    const imagen = await pool.query(
      `SELECT url FROM imagenes_ilustrativas
       WHERE LOWER(categoria) LIKE $1 LIMIT 1`,
      [`%${query.toLowerCase()}%`]
    );

    res.json({
      productos: productos.rows,
      imagenIlustrativa: imagen.rows[0]?.url || null
    });
  } catch (err) {
    console.error("Error al buscar repuestos:", err);
    res.status(500).json({ error: "Error al buscar repuestos" });
  }
});

// === INICIO DEL SERVIDOR ===
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});
