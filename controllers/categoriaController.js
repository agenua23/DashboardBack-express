const db = require('../config/db');

const getAllCategorias = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM categorias');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getCategoriaById = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query('SELECT * FROM categorias WHERE idcategoria = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createCategoria = async (req, res) => {
  const { nombre, idestatus = 1 } = req.body;

  // 1. Validar nombre
  if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
    return res.status(400).json({ error: 'El campo nombre es requerido y debe ser una cadena válida' });
  }
  const nombreLimpio = nombre.trim();

  // 2. Validar idestatus
  if (![1, 2].includes(Number(idestatus))) {
    return res.status(400).json({ error: 'El campo idestatus debe ser 1 (Activo) o 2 (Inactivo)' });
  }

  try {
    // 3. Verificar duplicados (nombre case insensitive)
    const [existingRows] = await db.query(
      'SELECT idcategoria FROM categorias WHERE LOWER(TRIM(nombre)) = ?',
      [nombreLimpio.toLowerCase()]
    );
    if (existingRows.length > 0) {
      return res.status(400).json({ error: `Ya existe una categoría con el nombre "${nombreLimpio}"` });
    }

    // 4. Insertar
    const [result] = await db.query(
      'INSERT INTO categorias (nombre, idestatus) VALUES (?, ?)',
      [nombreLimpio, idestatus]
    );

    // 5. Respuesta
    res.status(201).json({
      id: result.insertId,
      nombre: nombreLimpio,
      idestatus
    });
  } catch (err) {
    console.error('Error al crear categoría:', err);
    res.status(500).json({ error: 'Ocurrió un error interno al crear la categoría' });
  }
};

const updateCategoria = async (req, res) => {
  const { id } = req.params;
  const { nombre, idestatus } = req.body;

  // Validar que al menos un campo venga
  if (nombre === undefined && idestatus === undefined) {
    return res.status(400).json({
      error: 'Debe proporcionar al menos uno de los siguientes campos: nombre, idestatus'
    });
  }

  try {
    // Verificar si existe la categoría
    const [existing] = await db.query('SELECT idcategoria, nombre FROM categorias WHERE idcategoria = ?', [id]);

    if (existing.length === 0) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }

    let queryParts = [];

    // Validar nombre y verificar duplicados
    if (nombre !== undefined && nombre.trim() !== '') {
      const nombreLimpio = nombre.trim();

      const [dupCheck] = await db.query(
        'SELECT idcategoria FROM categorias WHERE LOWER(TRIM(nombre)) = ? AND idcategoria != ?',
        [nombreLimpio.toLowerCase(), id]
      );
      if (dupCheck.length > 0) {
        return res.status(400).json({ error: `Ya existe una categoría con el nombre "${nombreLimpio}"` });
      }

      queryParts.push({ field: 'nombre = ?', value: nombreLimpio });
    }

    // Validar idestatus
    if (idestatus !== undefined) {
      if (typeof idestatus !== 'number' || ![1, 2].includes(idestatus)) {
        return res.status(400).json({ error: 'idestatus debe ser 1 (Activo) o 2 (Inactivo)' });
      }
      queryParts.push({ field: 'idestatus = ?', value: idestatus });
    }

    if (queryParts.length === 0) {
      return res.status(400).json({ error: 'No hay datos válidos para actualizar' });
    }

    const fields = queryParts.map(p => p.field);
    const values = queryParts.map(p => p.value);
    values.push(id);

    const sql = `UPDATE categorias SET ${fields.join(', ')} WHERE idcategoria = ?`;
    await db.query(sql, values);

    // Responder con los campos actualizados
    const updatedFields = {};
    if (nombre !== undefined) updatedFields.nombre = nombre.trim();
    if (idestatus !== undefined) updatedFields.idestatus = idestatus;

    res.json(updatedFields);

  } catch (err) {
    console.error('Error al actualizar categoría:', err);
    res.status(500).json({ error: 'Ocurrió un error interno al actualizar la categoría' });
  }
};

const deleteCategoria = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM categorias WHERE idcategoria = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllCategorias,
  getCategoriaById,
  createCategoria,
  updateCategoria,
  deleteCategoria,
};