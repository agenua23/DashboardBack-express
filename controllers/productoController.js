const db = require('../config/db');

const getAllProductos = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        idproducto,
        idestatus,
        idcategoria,
        nombre,
        precio,
        stock,
        imagen,
        descripcion
      FROM productos
    `);
    res.json(rows);
  } catch (err) {
    console.error('Error al obtener productos:', err);
    res.status(500).json({ error: 'Ocurrió un error al obtener los productos' });
  }
};

const createProducto = async (req, res) => {
  const { nombre, idestatus = 1, idcategoria, precio, stock, descripcion } = req.body;
  const imagen = req.file ? req.file.filename : null; // Para usar si usas multer para subir imagen

  // 1. Validar nombre obligatorio y cadena no vacía
  if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
    return res.status(400).json({
      error: 'El campo nombre es requerido y debe ser una cadena válida'
    });
  }
  const nombreLimpio = nombre.trim();

  // 2. Validar idestatus (1 o 2)
  if (![1, 2].includes(Number(idestatus))) {
    return res.status(400).json({
      error: 'El campo idestatus debe ser 1 (Activo) o 2 (Inactivo)'
    });
  }

  // 3. Validar idcategoria (entero > 0)
  if (!idcategoria || !Number.isInteger(Number(idcategoria)) || Number(idcategoria) <= 0) {
    return res.status(400).json({
      error: 'El campo idcategoria es obligatorio y debe ser un número válido'
    });
  }

  // 4. Validar precio numérico (si está definido)
  if (precio !== undefined && isNaN(Number(precio))) {
    return res.status(400).json({
      error: 'El campo precio debe ser un número válido'
    });
  }

  // 5. Validar stock entero >=0 (si está definido)
  if (stock !== undefined && (!Number.isInteger(Number(stock)) || Number(stock) < 0)) {
    return res.status(400).json({
      error: 'El campo stock debe ser un entero mayor o igual a cero'
    });
  }

  try {
    // (Opcional) Validar duplicados aquí, si lo deseas

    // Insertar el producto
    const [result] = await db.query(
      `INSERT INTO productos 
         (nombre, idestatus, idcategoria, precio, stock, imagen, descripcion)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        nombreLimpio,
        Number(idestatus),
        Number(idcategoria),
        precio !== undefined ? Number(precio) : null,
        stock !== undefined ? Number(stock) : null,
        imagen || null,
        descripcion || null
      ]
    );

    // Respuesta 201 con los datos insertados
    res.status(201).json({
      idproducto: result.insertId,
      nombre: nombreLimpio,
      idestatus: Number(idestatus),
      idcategoria: Number(idcategoria),
      precio: precio !== undefined ? Number(precio) : null,
      stock: stock !== undefined ? Number(stock) : null,
      imagen: imagen || null,
      descripcion: descripcion || null
    });
  } catch (err) {
    console.error('Error al crear producto:', err);
    res.status(500).json({
      error: 'Ocurrió un error interno al crear el producto'
    });
  }
};

const updateProducto = async (req, res) => {
  const { id } = req.params;
  const { nombre, idestatus, idcategoria, precio, stock, descripcion } = req.body;
  const imagen = req.file ? req.file.filename : undefined; // Si usas multer

  // 1. Validar que haya al menos un campo para actualizar, incluyendo imagen
  const hasData = [nombre, idestatus, idcategoria, precio, stock, descripcion, imagen].some(field => field !== undefined);
  if (!hasData) {
    return res.status(400).json({
      error: 'Debe proporcionar al menos un campo para actualizar'
    });
  }

  try {
    // 2. Verificar existencia del producto
    const [existingRows] = await db.query('SELECT idproducto FROM productos WHERE idproducto = ?', [id]);
    if (existingRows.length === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    let queryParts = [];
    let values = [];

    // 3. Validaciones y agregados
    if (nombre !== undefined) {
      if (typeof nombre !== 'string' || nombre.trim() === '') {
        return res.status(400).json({ error: 'El nombre debe ser una cadena válida y no vacía' });
      }
      queryParts.push('nombre = ?');
      values.push(nombre.trim());
    }

    if (idestatus !== undefined) {
      if (![1, 2].includes(Number(idestatus))) {
        return res.status(400).json({ error: 'idestatus debe ser 1 (Activo) o 2 (Inactivo)' });
      }
      queryParts.push('idestatus = ?');
      values.push(Number(idestatus));
    }

    if (idcategoria !== undefined) {
      if (!Number.isInteger(Number(idcategoria)) || Number(idcategoria) <= 0) {
        return res.status(400).json({ error: 'idcategoria debe ser un número válido' });
      }
      queryParts.push('idcategoria = ?');
      values.push(Number(idcategoria));
    }

    if (precio !== undefined) {
      if (isNaN(Number(precio))) {
        return res.status(400).json({ error: 'precio debe ser un número válido' });
      }
      queryParts.push('precio = ?');
      values.push(Number(precio));
    }

    if (stock !== undefined) {
      if (!Number.isInteger(Number(stock)) || Number(stock) < 0) {
        return res.status(400).json({ error: 'stock debe ser un entero mayor o igual a cero' });
      }
      queryParts.push('stock = ?');
      values.push(Number(stock));
    }

    if (imagen !== undefined) {
      queryParts.push('imagen = ?');
      values.push(imagen || null);
    }

    if (descripcion !== undefined) {
      queryParts.push('descripcion = ?');
      values.push(descripcion || null);
    }

    if (queryParts.length === 0) {
      return res.status(400).json({ error: 'No hay datos válidos para actualizar' });
    }

    values.push(id); // cláusula WHERE

    const sql = `UPDATE productos SET ${queryParts.join(', ')} WHERE idproducto = ?`;
    const [result] = await db.query(sql, values);

    if (result.affectedRows === 0) {
      return res.status(500).json({ error: 'No se pudo actualizar el producto' });
    }

    // 4. Responder con los campos actualizados
    const updatedFields = {};
    if (nombre !== undefined) updatedFields.nombre = nombre.trim();
    if (idestatus !== undefined) updatedFields.idestatus = Number(idestatus);
    if (idcategoria !== undefined) updatedFields.idcategoria = Number(idcategoria);
    if (precio !== undefined) updatedFields.precio = Number(precio);
    if (stock !== undefined) updatedFields.stock = Number(stock);
    if (imagen !== undefined) updatedFields.imagen = imagen || null;
    if (descripcion !== undefined) updatedFields.descripcion = descripcion || null;

    res.json(updatedFields);
  } catch (err) {
    console.error('Error al actualizar producto:', err);
    res.status(500).json({ error: 'Ocurrió un error interno al actualizar el producto' });
  }
};

const deleteProducto = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM productos WHERE idproducto = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    res.status(204).send(); // No content
  } catch (err) {
    console.error('Error al eliminar producto:', err);
    res.status(500).json({ error: 'No se pudo eliminar el producto' });
  }
};

const getProductoById = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query('SELECT * FROM productos WHERE idproducto = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Error al obtener producto por ID:', err);
    res.status(500).json({ error: 'Error al obtener el producto' });
  }
};

module.exports = {
  getAllProductos,
  getProductoById,
  createProducto,
  updateProducto,
  deleteProducto
};