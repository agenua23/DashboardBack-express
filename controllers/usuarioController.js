const db = require('../config/db');
const bcrypt = require('bcryptjs'); // Asegúrate de tener bcrypt instalado: npm install bcrypt

// Obtener todos los usuarios (solo datos públicos, sin contraseñas)
const getAllUsuarios = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT idusuario, nombre, email, rol, fechacreacion, activo FROM usuarios ORDER BY fechacreacion DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error('Error al obtener usuarios:', err);
    res.status(500).json({ error: 'Ocurrió un error interno al obtener los usuarios' });
  }
};

// Obtener un usuario por ID
const getUsuarioById = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query(
      'SELECT idusuario, nombre, email, rol, fechacreacion, activo FROM usuarios WHERE idusuario = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Error al obtener usuario por ID:', err);
    res.status(500).json({ error: 'Ocurrió un error interno al obtener el usuario' });
  }
};

// Crear un nuevo usuario
const createUsuario = async (req, res) => {
  const { nombre, email, password, rol = 'Operador', activo = 1 } = req.body;

  // Validaciones
  if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
    return res.status(400).json({ error: 'El campo nombre es requerido y no puede estar vacío' });
  }

  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({ error: 'Debe proporcionar un correo electrónico válido' });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'La contraseña es requerida y debe tener al menos 6 caracteres' });
  }

  if (!['operador', 'admin', 'vendedor', 'cliente'].includes(rol)) {
    return res.status(400).json({ error: 'El rol debe ser "operador" , "vendedor" , "admin" y "cliente"' });
  }

  if (typeof activo !== 'number' || ![0, 1].includes(activo)) {
    return res.status(400).json({ error: 'El campo activo debe ser 0 (inactivo) o 1 (activo)' });
  }

  const nombreLimpio = nombre.trim();
  const emailLimpio = email.trim().toLowerCase();

  try {
    // Verificar si el email ya existe
    const [existingRows] = await db.query('SELECT idusuario FROM usuarios WHERE email = ?', [emailLimpio]);
    if (existingRows.length > 0) {
      return res.status(400).json({ error: `Ya existe un usuario con el correo ${emailLimpio}` });
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertar nuevo usuario
    const [result] = await db.query(
      'INSERT INTO usuarios (nombre, email, password, rol, activo) VALUES (?, ?, ?, ?, ?)',
      [nombreLimpio, emailLimpio, hashedPassword, rol, activo]
    );

    // Respuesta sin contraseña
    res.status(201).json({
      idusuario: result.insertId,
      nombre: nombreLimpio,
      email: emailLimpio,
      rol,
      activo,
      fechacreacion: new Date().toISOString().slice(0, 19).replace('T', ' ')
    });
  } catch (err) {
    console.error('Error al crear usuario:', err);
    res.status(500).json({ error: 'Ocurrió un error interno al crear el usuario' });
  }
};

// Actualizar un usuario
const updateUsuario = async (req, res) => {
  const { id } = req.params;
  const { nombre, email, password, rol, activo } = req.body;

  // Validar que al menos un campo esté presente
  if (!nombre && !email && password === undefined && rol === undefined && activo === undefined) {
    return res.status(400).json({
      error: 'Debe proporcionar al menos uno de los siguientes campos: nombre, email, password, rol, activo'
    });
  }

  try {
    // Verificar si el usuario existe
    const [existingRows] = await db.query(
      'SELECT email FROM usuarios WHERE idusuario = ?',
      [id]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const currentEmail = existingRows[0].email;
    let queryParts = [];
    let params = [];

    // Validar y agregar nombre
    if (nombre !== undefined) {
      if (typeof nombre !== 'string' || nombre.trim() === '') {
        return res.status(400).json({ error: 'El nombre debe ser una cadena válida' });
      }
      queryParts.push('nombre = ?');
      params.push(nombre.trim());
    }

    // Validar y agregar email
    if (email !== undefined) {
      const emailLimpio = email.trim().toLowerCase();
      if (!/\S+@\S+\.\S+/.test(emailLimpio)) {
        return res.status(400).json({ error: 'Debe proporcionar un correo electrónico válido' });
      }

      // Verificar si el nuevo email ya está en uso por otro usuario
      const [duplicate] = await db.query(
        'SELECT idusuario FROM usuarios WHERE email = ? AND idusuario != ?',
        [emailLimpio, id]
      );
      if (duplicate.length > 0) {
        return res.status(400).json({ error: `El correo ${emailLimpio} ya está en uso` });
      }

      queryParts.push('email = ?');
      params.push(emailLimpio);
    }

    // Validar y agregar password (encriptar)
    if (password !== undefined) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      queryParts.push('password = ?');
      params.push(hashedPassword);
    }

    // Validar y agregar rol
    if (rol !== undefined) {
      if (!['cliente', 'admin'].includes(rol)) {
        return res.status(400).json({ error: 'El rol debe ser "cliente" o "admin"' });
      }
      queryParts.push('rol = ?');
      params.push(rol);
    }

    // Validar y agregar activo
    if (activo !== undefined) {
      if (![0, 1].includes(Number(activo))) {
        return res.status(400).json({ error: 'El campo activo debe ser 0 o 1' });
      }
      queryParts.push('activo = ?');
      params.push(Number(activo));
    }

    // Si no hay campos para actualizar
    if (queryParts.length === 0) {
      return res.status(400).json({ error: 'No hay datos válidos para actualizar' });
    }

    // Ejecutar la actualización
    params.push(id); // Para WHERE
    const sql = `UPDATE usuarios SET ${queryParts.join(', ')} WHERE idusuario = ?`;
    await db.query(sql, params);

    // Respuesta sin contraseña
    const [updatedRows] = await db.query(
      'SELECT idusuario, nombre, email, rol, activo, fechacreacion FROM usuarios WHERE idusuario = ?',
      [id]
    );

    res.json(updatedRows[0]);
  } catch (err) {
    console.error('Error al actualizar usuario:', err);
    res.status(500).json({ error: 'Ocurrió un error interno al actualizar el usuario' });
  }
};

// Eliminar un usuario (lógicamente o físicamente, según necesidad)
// En este caso: eliminación física (DELETE)
const deleteUsuario = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.query('DELETE FROM usuarios WHERE idusuario = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.status(204).send(); // No content
  } catch (err) {
    console.error('Error al eliminar usuario:', err);
    res.status(500).json({ error: 'No se puede eliminar el usuario. Puede estar relacionado con otros registros.' });
  }
};

module.exports = {
  getAllUsuarios,
  getUsuarioById,
  createUsuario,
  updateUsuario,
  deleteUsuario
};