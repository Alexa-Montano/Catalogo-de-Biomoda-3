# Catálogo-de-Biomoda-3
Este es un catálogo de ropa para nenas :)
# Base de datos
# Server.js
Este código implementa un servidor web en node.js con Express que maneja un sistema de usuarios y gestión de prendas. Entre sus funciones principales están:
Autenticación y sesiones
Maneja registro, inicio de sesión y cerrar sesión.
Usa bcrypt para encriptar contraseñas y express-session para mantener la sesión del usuario.
Controla el acceso mediante roles como admin, asistente o cliente.
# Conexión de server con la base de datos
El inicio del código en el servidor conecta a una base de datos MySQL usando variables de entorno.
Ejecuta consultas para insertar, actualizar, eliminar y obtener datos de usuarios y prendas.
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
El código incluye rutas para agregar prendas, listarlas, editarlas y eliminarlas. Estas rutas llevan seguridad basica utilizando middleware de login. Además permite buscar prendas en tiempo real.
```
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
res.send(`
```
```

```
```

```

# index.html
# Página principal

#

