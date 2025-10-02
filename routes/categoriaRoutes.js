const express = require('express');
const router = express.Router();

const {
  getAllCategorias,
  getCategoriaById,
  createCategoria,
  updateCategoria,
  deleteCategoria
} = require('../controllers/categoriaController');

// Rutas RELATIVAS (sin /categorias)
router.get('/', getAllCategorias);          // → /api/categorias
router.get('/:id', getCategoriaById);       // → /api/categorias/:id
router.post('/', createCategoria);          // → /api/categorias
router.put('/:id', updateCategoria);        // → /api/categorias/:id
router.delete('/:id', deleteCategoria);     // → /api/categorias/:id

module.exports = router;