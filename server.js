const http = require('http');
const url = require('url');
const querystring = require('querystring');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Conectar a la base de datos SQLite
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error("Error al conectar a la base de datos:", err.message);
  } else {
    console.log("Conexión exitosa a la base de datos SQLite");
  }
});

// Función para enviar una respuesta HTML
function sendHTML(res, html) {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

// Crear el servidor HTTP
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Solicitud es para un archivo estático CSS (estilos)
  if (pathname === '/style.css') {
    const filePath = path.join(__dirname, 'style.css');
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end("Error al leer el archivo CSS");
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/css' });
      res.end(data);
    });
    return; // Asegurarse de que no siga procesando otras rutas
  }

  // Página de inicio
  if (pathname === '/') {
    sendHTML(res, `
      <html>
      <head>
        <meta charset="utf-8">
        <title>Operativa de Negocio</title>
        <link rel="stylesheet" type="text/css" href="/style.css">
      </head>
      <body>
        <h1>Operativa de Negocio</h1>
        <ul>
          <li><a href="/operativa">Ver/Agregar Registros</a></li>
        </ul>
        <footer>
        <div id="footer-container">
          <div id="footer-content">
            <p>
              <small
                >Made with ♥ by<br /><br />
                <a href="https://github.com/d-romero-dev">d-romero.dev</a></small
              >
            </p>
            <p>
              <small>2025 All rights reserved ©</small>
            </p>
          </div>
        </div>
      </footer>
      </body>
      </html>
    `);
  }
  // Listar registros y mostrar formulario para agregar uno nuevo
  else if (pathname === '/operativa' && req.method === 'GET') {
    db.all("SELECT * FROM operativa", (err, rows) => {
      if (err) {
        res.writeHead(500);
        res.end("Error en la base de datos");
        return;
      }
      let tableRows = rows.map(row => {
        return `<tr>
                  <td>${row.id}</td>
                  <td>${row.cliente}</td>
                  <td>${row.cantidad_producto}</td>
                  <td>${row.pago}</td>
                  <td>${row.fecha_pago}</td>
                  <td>${row.medio_pago || ''}</td>
                  <td>${row.cantidad_restante}</td>
                  <td>
                    <a href="/operativa/edit?id=${row.id}">Editar</a> | 
                    <a href="/operativa/delete?id=${row.id}" onclick="return confirm('¿Eliminar registro?');">Eliminar</a>
                  </td>
                </tr>`;
      }).join('');
      sendHTML(res, `
        <html>
        <head>
          <meta charset="utf-8">
          <title>Operativa - Registros</title>
          <link rel="stylesheet" type="text/css" href="/style.css">

        </head>
        <body>
          <h1>Registros de Operativa</h1>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th>Cantidad Producto</th>
                <th>Pago</th>
                <th>Fecha de Pago</th>
                <th>Medio de Pago</th>
                <th>Cantidad Restante</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          <h2>Agregar Nuevo Registro</h2>
          <form method="POST" action="/operativa">
            <label>Cliente: <input type="text" name="cliente" required></label><br>
            <label>Cantidad Producto: <input type="number" name="cantidad_producto" required></label><br>
            <label>Pago: <input type="number" step="0.01" name="pago" required></label><br>
            <label>Fecha de Pago: <input type="date" name="fecha_pago" required></label><br>
            <label>Medio de Pago: <input type="text" name="medio_pago"></label><br>
            <label>Cantidad Restante: <input type="number" name="cantidad_restante" required></label><br>
            <input type="submit" value="Agregar Registro">
          </form>
          <p><a href="/">Volver al inicio</a></p>
        </body>
        </html>
      `);
    });
  }
  // Procesar nuevo registro (POST /operativa)
  else if (pathname === '/operativa' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      const postData = querystring.parse(body);
      const { cliente, cantidad_producto, pago, fecha_pago, medio_pago, cantidad_restante } = postData;
      db.run("INSERT INTO operativa (cliente, cantidad_producto, pago, fecha_pago, medio_pago, cantidad_restante) VALUES (?, ?, ?, ?, ?, ?)",
      [cliente, cantidad_producto, pago, fecha_pago, medio_pago, cantidad_restante], function(err) {
        if (err) {
          res.writeHead(500);
          res.end("Error al insertar registro");
          return;
        }
        res.writeHead(302, { 'Location': '/operativa' });
        res.end();
      });
    });
  }
  // Mostrar formulario para editar un registro (GET /operativa/edit?id=)
  else if (pathname === '/operativa/edit' && req.method === 'GET') {
    const id = parsedUrl.query.id;
    db.get("SELECT * FROM operativa WHERE id = ?", [id], (err, row) => {
      if (err || !row) {
        res.writeHead(404);
        res.end("Registro no encontrado");
        return;
      }
      sendHTML(res, `
        <html>
        <head>
          <meta charset="utf-8">
          <title>Editar Registro</title>
          <link rel="stylesheet" type="text/css" href="/style.css">
        </head>
        <body>
          <h1>Editar Registro ID: ${row.id}</h1>
          <form method="POST" action="/operativa/edit?id=${row.id}">
            <label>Cliente: <input type="text" name="cliente" value="${row.cliente}" required></label><br>
            <label>Cantidad Producto: <input type="number" name="cantidad_producto" value="${row.cantidad_producto}" required></label><br>
            <label>Pago: <input type="number" step="0.01" name="pago" value="${row.pago}" required></label><br>
            <label>Fecha de Pago: <input type="date" name="fecha_pago" value="${row.fecha_pago}" required></label><br>
            <label>Medio de Pago: <input type="text" name="medio_pago" value="${row.medio_pago || ''}"></label><br>
            <label>Cantidad Restante: <input type="number" name="cantidad_restante" value="${row.cantidad_restante}" required></label><br>
            <input type="submit" value="Actualizar Registro">
          </form>
          <p><a href="/operativa">Volver a Registros</a></p>
        </body>
        </html>
      `);
    });
  }
  // Procesar actualización del registro (POST /operativa/edit?id=)
  else if (pathname === '/operativa/edit' && req.method === 'POST') {
    const id = parsedUrl.query.id;
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      const postData = querystring.parse(body);
      const { cliente, cantidad_producto, pago, fecha_pago, medio_pago, cantidad_restante } = postData;
      db.run("UPDATE operativa SET cliente = ?, cantidad_producto = ?, pago = ?, fecha_pago = ?, medio_pago = ?, cantidad_restante = ? WHERE id = ?",
      [cliente, cantidad_producto, pago, fecha_pago, medio_pago, cantidad_restante, id], function(err) {
        if (err) {
          res.writeHead(500);
          res.end("Error al actualizar registro");
          return;
        }
        res.writeHead(302, { 'Location': '/operativa' });
        res.end();
      });
    });
  }
  // Eliminar registro (GET /operativa/delete?id=)
  else if (pathname === '/operativa/delete' && req.method === 'GET') {
    const id = parsedUrl.query.id;
    db.run("DELETE FROM operativa WHERE id = ?", [id], function(err) {
      if (err) {
        res.writeHead(500);
        res.end("Error al eliminar registro");
        return;
      }
      res.writeHead(302, { 'Location': '/operativa' });
      res.end();
    });
  }
  // Ruta no encontrada
  else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end("404 Not Found");
  }
});

// Iniciar el servidor en el puerto 3000
server.listen(3000, () => {
  console.log("Servidor escuchando en el puerto 3000");
});

