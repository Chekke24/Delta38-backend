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

// ✅ CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  methods: ["GET", "POST", "DELETE"],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🌩️ Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 📸 Multer - Cloudinary
const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "delta38_ilustrativas",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 800, height: 800, crop: "limit" }],
  },
});
const uploadImages = multer({ storage: imageStorage });

// 📁 Multer - Excel en memoria
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

// 🏠 Ruta base
app.get("/", (req, res) => {
  res.json({ message: "✅ Servidor del taller funcionando con PostgreSQL + Cloudinary + Excel" });
});
// 
// 📦 Subida de archivo Excel
app.post("/stock/excel", uploadExcel.single("archivo"), async (req, res) => {
  try {
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.SheetNames[0];
    const datos = XLSX.utils.sheet_to_json(workbook.Sheets[sheet]);

    for (const fila of datos) {
      const {
        CODIGO: codigo,
        MARCA: marca,
        ENTRADAS: entradas,
        SALIDAS: salidas,
        STOCK: stock,
        PRECIOS: precios,
        "IMPORTE INVENTARIO": importe_inventario
      } = fila;

      await pool.query(
        `INSERT INTO repuestos (codigo, marca, entradas, salidas, stock, precios, importe_inventario)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [codigo || "", marca || "", parseInt(entradas) || 0, parseInt(salidas) || 0, parseInt(stock) || 0, precios || "", importe_inventario || ""]
      );
    }

    res.json({ message: "✅ Repuestos cargados desde Excel" });
  } catch (error) {
    console.error("❌ Error al procesar Excel:", error);
    res.status(500).json({ error: "Error al procesar el archivo Excel" });
  }
});

// 🖼️ Subida de imágenes ilustrativas
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

    res.json({ message: "✅ Imágenes ilustrativas guardadas" });
  } catch (error) {
    console.error("❌ Error al subir imágenes:", error);
    res.status(500).json({ error: "Error al subir imágenes ilustrativas" });
  }
});

// 🔍 Buscador inteligente
app.get("/repuestos", async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: "Falta el parámetro de búsqueda" });

  try {
    const productos = await pool.query(
      `SELECT * FROM repuestos
       WHERE LOWER(codigo) LIKE $1
       OR LOWER(marca) LIKE $1`,
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
    console.error("❌ Error al buscar repuestos:", err);
    res.status(500).json({ error: "Error al buscar repuestos" });
  }
});

// 🟢 Arranque del servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});
