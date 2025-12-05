# Catalogo-de-Biomoda-3
Este es un catalogo de ropa para nenas :)
#Base de datos
# Server
Este código implementa un servidor web en Node.js con Express que maneja un sistema completo de usuarios y gestión de prendas. Sus funciones son:
Autenticación y sesiones, maneja registro, inicio de sesión y cerrar sesión. Usa bcrypt para encriptar contraseñas y express-session para mantener la sesión del usuario.

# Conexión con MySQL
El inicio del codigo hace la conexion del servidor a una base de datos MySQL usando variables de entorno, este ejecuta consultas para insertar, actualizar, eliminar y obtener datos de usuarios y prendas.

# CRUD de prendas
Incluye rutas para agregar prendas, listarlas, editarlas o eliminarlas y hacer la busqueda de prendas en tiempo real. Se utiliza seguridad basica para proteger las rutas usando middleware de login y asi valida roles permitidos para cada función.


