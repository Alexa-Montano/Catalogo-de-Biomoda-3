# Catalogo-de-Biomoda-3
Este es un catalogo de ropa para nenas :)
#Base de datos
# Server
Este código implementa un servidor web en Node.js con Express que maneja un sistema completo de usuarios y gestión de prendas. Sus funciones son:
Autenticación y sesiones, maneja registro, inicio de sesión y cerrar sesión. Usa bcrypt para encriptar contraseñas y express-session para mantener la sesión del usuario.

# Conexión con MySQL
El inicio del codigo hace la conexion del servidor a una base de datos MySQL usando variables de entorno, este ejecuta consultas para insertar, actualizar, eliminar y obtener datos de usuarios y prendas.
```
// -------------------- Conexión MySQL --------------------
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  timezone: 'local'
});
connection.connect(err => {
  if (err) {
    console.error('Error conectando a MySQL:', err);
    return;
  }
  console.log('Conexión exitosa a MySQL');
});
```

# CRUD de prendas
Incluye rutas para agregar prendas, listarlas, editarlas o eliminarlas y hacer la busqueda de prendas en tiempo real. Se utiliza seguridad basica para proteger las rutas usando middleware de login y asi valida roles permitidos para cada función.
```
// -------------------- Middleware de login --------------------
function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login.html');
  }
  next();
}

// -------------------- Rutas --------------------
// Middleware para validar roles
function requireRole(rolesPermitidos) {
  return function (req, res, next) {
    if (!req.session.user) {
      return res.redirect('/login.html');
    }

    if (!rolesPermitidos.includes(req.session.user.rol)) {
      return res.status(403).send(`
        <h1>Acceso denegado</h1>
        <p>No tienes permisos para acceder a esta sección.</p>
        <a href="/">Volver al inicio</a>
      `);
    }

    next();
  };
}

// Obtener tipo de usuario
app.get('/tipo-usuario', requireLogin, requireRole(['admin','asistente','cliente']), (req, res) => {
  res.json({ tipo_usuario: req.session.user.tipo_usuario });
});

// Evitar acceso directo a index.html
app.get('/', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/registrar', async (req, res) => {
  const { nombre, correo, contrasena, rol } = req.body;
  try {
    connection.query('SELECT * FROM usuarios WHERE correo = ?', [correo], async (err, results) => {
      if (err) {
        console.error('Error en SELECT usuarios:', err);
        return res.status(500).send('Error en el servidor');
      }
      if (results.length > 0) return res.status(400).send(``);

// Login
app.post('/login', (req, res) => {
  const { correo, contrasena } = req.body;
  connection.query('SELECT * FROM usuarios WHERE correo = ?', [correo], async (err, results) => {
    if (err) return res.status(500).send('Error en el servidor');
    if (results.length === 0) return res.status(400).send('Usuario no encontrado');

    const user = results[0];
    const match = await bcrypt.compare(contrasena, user.password_hash);
    if (!match) return res.status(400).send('Contraseña incorrecta');

    req.session.user = { id: user.id, nombre: user.nombre, correo: user.correo, rol: user.rol };
    res.redirect('/');
  });
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login.html');
});

app.use(express.static(path.join(__dirname, 'public'), { index: false }));

const fs = require('fs');

app.get('/', requireLogin, (req, res) => {
  let html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf-8');
  res.send(html);
});

// Agregar prenda
app.post('/agregar-prenda', requireLogin, requireRole(['admin', 'asistente']),(req, res) => {
  const { nombre, categoria, precio, color } = req.body;
  if (!nombre || !categoria) return res.status(400).send('Nombre y categoría son obligatorios');

  const precioFinal = precio ? Number(precio): null;
  connection.query(
    'INSERT INTO prenda (nombre, categoria, precio, color) VALUES (?, ?, ?, ?)',
    [nombre, categoria, precioFinal, color],
    (err) => {
      if (err) return res.status(500).send('Error al guardar prenda');
res.send(``);

    }
  );
});

// Actualizar prendas
app.put('/api/prenda/:id', requireLogin, requireRole(['admin', 'asistente']),(req, res) => {
  const { nombre, categoria, precio, color } = req.body;
  const prendaId = req.params.id;

  connection.query(
    'UPDATE prenda SET nombre = ?, categoria = ?, precio = ?, color = ? WHERE id = ?',
    [nombre, categoria, precio, color, prendaId],
    (err, result) => {
      if (err) return res.status(500).send('Error al actualizar la prenda');
      if (result.affectedRows === 0) return res.status(404).send('Prenda no encontrada');
      res.send('Prenda actualizada correctamente');
    }
  );
});

// Eliminar Prenda
app.delete('/api/prenda/:id', requireLogin, requireRole(['admin', 'asistente']),(req, res) => {
  const prendaId = req.params.id;

  connection.query(
    'DELETE FROM prenda WHERE id = ?',
    [prendaId],
    (err, result) => {
      if (err) {
        console.error('Error al eliminar la prenda:', err);
        return res.status(500).send('Error al eliminar la prenda');
      }

      if (result.affectedRows === 0) {
        return res.status(404).send('Prenda no encontrada');
      }

      res.send('Prenda eliminada correctamente');
    }
  );
});

// Buscar Prenda en tiempo real
app.get('/buscar-prenda', requireLogin, (req, res) => {
  const query = req.query.query || '';
  const sql = `
    SELECT id, nombre, categoria, precio, color
    FROM prenda
    WHERE nombre LIKE ? OR categoria LIKE ? OR precio LIKE ? OR color LIKE ?
    ORDER BY nombre ASC
  `;
  const likeQuery = `%${query}%`;
  connection.query(sql, [likeQuery, likeQuery, likeQuery, likeQuery], (err, results) => {
    if (err) {
      console.error('Error en la consulta:', err);
      return res.status(500).json({ error: 'Error en la consulta' });
    }
    res.json(results);
  });
});

// Ruta para subir Excel e insertar en tabla Prendas
app.post('/upload-prenda', upload.single('excelFile'), requireRole(['admin', 'asistente']),(req, res) => {
  const filePath = req.file.path;
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

  data.forEach(row => {
    const { nombre, categoria, precio, color } = row;
    const sql = `
      INSERT INTO prenda (nombre, categoria, precio, color)
      VALUES (?, ?, ?, ?)
    `;
    connection.query(sql, [nombre, categoria, precio, color], err => {
      if (err) throw err;
    });
  });

  res.send('<h1>Archivo cargado y datos guardados</h1><a href="/index.html">Volver</a>');
});

// Ruta para descargar Excel con todos los Prendas
app.get('/download-prenda', requireLogin, requireRole(['admin', 'asistente']), (req, res) => {
  const sql = `SELECT nombre, categoria, precio, color FROM prenda ORDER BY nombre ASC`;
  connection.query(sql, (err, results) => {
    if (err) throw err;

    const worksheet = xlsx.utils.json_to_sheet(results);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, '');

    const filePath = path.join(__dirname, 'uploads', 'prenda.xlsx');
    xlsx.writeFile(workbook, filePath);
    res.download(filePath, 'prenda.xlsx');
  });
});
```


