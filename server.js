const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const multer = require('multer');
const xlsx = require('xlsx');
const upload = multer({ dest: 'uploads/' });
const app = express();
require('dotenv').config();

// -------------------- Middleware --------------------
app.use(session({
  secret: 'secretKey',
  resave: false,
  saveUninitialized: false,
}));
app.use(express.json()); // Para recibir JSON en PUT
app.use(bodyParser.urlencoded({ extended: true }));

// Servir archivos estáticos (CSS, JS, imágenes)
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

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
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Acceso Denegado</title>

  <style>
    body {
      background-color: #f7e6eb;
      font-family: "Playfair Display", serif;
      height: 100vh;
      margin: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      color: #4d1f38;
    }

    .card {
      background-color: #ffffff;
      padding: 35px;
      width: 420px;
      border-radius: 18px;
      text-align: center;
      box-shadow: 0 4px 15px rgba(0,0,0,0.15);
      border: 2px solid #e3b6c8;
      animation: fadeIn 0.5s ease-in-out;
    }

    h1 {
      font-size: 28px;
      margin-bottom: 10px;
      color: #7a3457;
    }

    p {
      font-size: 18px;
      margin-bottom: 25px;
      color: #4d1f38;
    }

    .btn {
      background-color: #7a3457;
      padding: 12px 20px;
      color: white;
      border: none;
      border-radius: 12px;
      text-decoration: none;
      font-size: 16px;
      cursor: pointer;
      transition: 0.3s;
    }

    .btn:hover {
      background-color: #4d1f38;
      transform: scale(1.05);
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  </style>
</head>

<body>
  <div class="card">
    <h1>Acceso denegado</h1>
    <p>No tienes permisos para acceder a esta sección.</p>
    <a href="/" class="btn">Volver al inicio</a>
  </div>
</body>

</html>
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

      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(contrasena, salt);

      connection.query(
        'INSERT INTO usuarios (nombre, correo, password_hash, rol) VALUES (?, ?, ?, ?)',
        [nombre, correo, password_hash, rol],
        (err2) => {
          if (err2) {
            console.error('Error al INSERT usuarios:', err2);
            return res.status(500).send('Error al registrar usuario');
          }

          // ================ HTML MINIMALISTA + REDIRECCIÓN ==================
          let html = `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Registro Exitoso</title>

<style>
  body {
    background: #fff;
    font-family: Arial, sans-serif;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    margin: 0;
  }

  .card {
    border: 2px solid #000;
    padding: 40px;
    border-radius: 12px;
    width: 360px;
    text-align: center;
  }

  h2 {
    font-size: 24px;
    margin-bottom: 10px;
  }

  p {
    font-size: 16px;
    color: #333;
  }
</style>

<script>
  setTimeout(() => {
    window.location.href = "/login";
  }, 5000);
</script>

</head>
<body>
  <div class="card">
    <h2>Registro exitoso</h2>
    <p>Serás redirigido al inicio de sesión en 5 segundos...</p>
  </div>
</body>
</html>
`;     

          res.send(html);
        }
      );
    });
  } catch (error) {
    console.error('Error catch registrar:', error);
    res.status(500).send(``);
  }
});
app.get('/login', (req, res) => {
  res.sendFile(__dirname + '/public/login.html');
});



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
app.post('/agregar-prenda', requireLogin, requireRole(['admin', 'asistente']), (req, res) => {
  const { nombre, categoria, precio, color } = req.body;

  if (!nombre || !categoria)
    return res.status(400).send('Nombre y categoría son obligatorios');

  const precioFinal = precio ? Number(precio) : null;

  connection.query(
    'INSERT INTO prenda (nombre, categoria, precio, color) VALUES (?, ?, ?, ?)',
    [nombre, categoria, precioFinal, color],
    (err) => {
      if (err) return res.status(500).send('Error al guardar prenda');

      res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Prenda Agregada</title>

        <style>
          body {
            background-color: #f4f4f4;
            font-family: "Playfair Display", serif;
            height: 100vh;
            margin: 0;
            display: flex;
            justify-content: center;
            align-items: center;
          }

          .card {
            background: white;
            padding: 40px;
            width: 420px;
            border-radius: 18px;
            text-align: center;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            border: 2px solid #000;
            animation: fadeIn 0.5s ease-in-out;
          }

          h1 {
            font-size: 28px;
            margin-bottom: 10px;
            color: #000;
            font-weight: bold;
          }

          p {
            font-size: 18px;
            margin-bottom: 25px;
            color: #333;
          }

          .btn {
            background-color: #000;
            padding: 12px 20px;
            color: white;
            border: none;
            border-radius: 10px;
            text-decoration: none;
            font-size: 16px;
            cursor: pointer;
            transition: 0.3s;
          }

          .btn:hover {
            opacity: 0.8;
            transform: scale(1.05);
          }

          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        </style>
      </head>

      <body>
        <div class="card">
          <h1>Prenda guardada</h1>
          <p>La prenda se registró exitosamente.</p>
          <a href="/" class="btn">Volver al inicio</a>
        </div>
      </body>
      </html>
      `);
    }
  );
});

// Listar Prendas (con botón eliminar)
app.get('/prenda', requireLogin, requireRole(['admin', 'asistente']), (req, res) => {
  connection.query('SELECT * FROM prenda ORDER BY nombre ASC', (err, results) => {
    if (err) return res.status(500).send('Error en el servidor');

    res.send(`
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Lista de Prendas</title>

  <style>
    body {
      background-color: #f4f4f4;
      font-family: 'Arial', sans-serif;
      margin: 0;
      padding: 40px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    h2 {
      font-size: 34px;
      font-weight: 700;
      color: #222;
      margin-bottom: 30px;
      letter-spacing: 1px;
    }

    .container {
      width: 90%;
      max-width: 900px;
      background: white;
      padding: 25px;
      border-radius: 14px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.15);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }

    thead {
      background-color: #000;
      color: white;
    }

    th, td {
      padding: 14px;
      font-size: 15px;
      border-bottom: 1px solid #ddd;
      text-align: left;
    }

    tr:nth-child(even) {
      background-color: #f7f7f7;
    }

    tr:hover {
      background-color: #e8e8e8;
      transition: 0.2s;
    }

    .btn-delete {
      background-color: #101010ff;
      color: white;
      padding: 8px 13px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      transition: 0.3s;
    }

    .btn-delete:hover {
      background-color: #050404ff;
      transform: scale(1.05);
    }

    .btn {
      margin-top: 25px;
      display: inline-block;
      padding: 12px 25px;
      background: black;
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-size: 17px;
      transition: 0.3s;
    }

    .btn:hover {
      opacity: 0.7;
      transform: scale(1.03);
    }

  </style>
</head>

<body>

  <h2>Lista de Prendas</h2>

  <div class="container">
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Nombre</th>
          <th>Categoría</th>
          <th>Precio</th>      <!-- CAMBIO -->
          <th>Color</th>
          <th>Acciones</th>
        </tr>
      </thead>

      <tbody>
        ${results.map(item => `
          <tr id="prenda-${item.id}">
            <td>${item.id}</td>
            <td>${item.nombre}</td>
            <td>${item.categoria}</td>
            <td>$${item.precio || '0.00'}</td> <!-- CAMBIO -->
            <td>${item.color || '—'}</td>
            <td>
              <button class="btn-delete" onclick="eliminarPrenda(${item.id})">
                Eliminar
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <a href="/" class="btn">Volver al inicio</a>

  <script>
    function eliminarPrenda(id) {
      if (!confirm("¿Seguro que deseas eliminar esta prenda?")) return;

      fetch('/api/prenda/' + id, {
        method: 'DELETE'
      })
      .then(res => res.text())
      .then(msg => {
        alert(msg);
        document.getElementById('prenda-' + id).remove();
      })
      .catch(err => alert("Error eliminando la prenda"));
    }
  </script>

</body>
</html>
    `);
  });
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

res.send(`
  <html>
  <head>
    <title>Operación Exitosa</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
        font-family: 'Inter', sans-serif;
        background: #f4f4f4;
      }
      .card {
        background: #fff;
        padding: 40px;
        border-radius: 14px;
        text-align: center;
        width: 420px;
        box-shadow: 0 4px 18px rgba(0,0,0,0.15);
        border: 1px solid #e1e1e1;
      }
      h1 {
        margin-bottom: 20px;
        font-size: 26px;
        color: #000;
        font-family: 'Playfair Display', serif;
      }
      .btn {
        display: inline-block;
        padding: 12px 22px;
        margin-top: 10px;
        background: #000;
        color: #fff;
        text-decoration: none;
        border-radius: 8px;
        font-size: 16px;
        transition: 0.3s;
      }
      .btn:hover {
        opacity: 0.8;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Archivo cargado y datos guardados</h1>
      <a href="/index.html" class="btn">Volver</a>
    </div>
  </body>
  </html>
`);

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));