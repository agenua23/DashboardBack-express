// routes/productoRoutes.js
const express = require('express');
const multer = require('multer');
const {
    getAllProductos,
    getProductoById,
    createProducto,
    updateProducto,
    deleteProducto
} = require('../controllers/productoController');

const router = express.Router();

// Configuración de multer para productos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/productos/img/');
    },
    filename: (req, file, cb) => {
        const ext = file.originalname.split('.').pop();
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        cb(null, `producto_${uniqueSuffix}.${ext}`);
    }
});

const upload = multer({ storage });

// Rutas relativas para productos
router.get('/', getAllProductos);                  // → /api/productos
router.get('/:id', getProductoById);               // → /api/productos/:id
router.post('/', upload.single('imagen'), createProducto);    // → /api/productos
router.put('/:id', upload.single('imagen'), updateProducto);  // → /api/productos/:id
router.delete('/:id', deleteProducto);                         // → /api/productos/:id

module.exports = router;