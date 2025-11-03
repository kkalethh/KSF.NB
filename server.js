const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // Servir archivos estáticos desde /public

// 🧾 Función de auditoría
function auditLog(user_id, action, detail) {
  db.prepare('INSERT INTO audit (user_id, action, detail) VALUES (?,?,?)')
    .run(user_id || null, action, detail || null);
}

// 🧍 Login de usuario
app.post('/api/login', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });

  const get = db.prepare('SELECT * FROM users WHERE name=?');
  let user = get.get(name);

  if (!user) {
    const ins = db.prepare('INSERT INTO users (name) VALUES (?)');
    const info = ins.run(name);
    user = { id: info.lastInsertRowid, name };
  }

  auditLog(user.id, 'login', `Usuario ${name} inició sesión`);
  res.json({ user });
});

// 👥 Clientes
app.get('/api/clients', (req, res) => {
  const data = db.prepare('SELECT * FROM clients ORDER BY id DESC').all();
  res.json(data);
});

app.post('/api/clients', (req, res) => {
  const { name, phone, email, address, userId } = req.body;
  const ins = db.prepare('INSERT INTO clients (name, phone, email, address) VALUES (?,?,?,?)');
  const info = ins.run(name, phone, email, address);
  auditLog(userId, 'create_client', `Cliente ${name}`);
  res.json({ id: info.lastInsertRowid });
});

// 💰 Pagos
app.get('/api/payments', (req, res) => {
  const data = db.prepare(`
    SELECT p.*, c.name as client_name
    FROM payments p
    LEFT JOIN clients c ON p.client_id = c.id
    ORDER BY p.id DESC
  `).all();
  res.json(data);
});

app.post('/api/payments', (req, res) => {
  const { client_id, amount, date, note, userId } = req.body;
  const ins = db.prepare('INSERT INTO payments (client_id, amount, date, note) VALUES (?,?,?,?)');
  const info = ins.run(client_id, amount, date, note);
  auditLog(userId, 'create_payment', `Pago ${info.lastInsertRowid}`);
  res.json({ id: info.lastInsertRowid });
});

// 📜 Auditoría
app.get('/api/audit', (req, res) => {
  const data = db.prepare(`
    SELECT a.*, u.name as user_name
    FROM audit a
    LEFT JOIN users u ON a.user_id = u.id
    ORDER BY a.id DESC
    LIMIT 200
  `).all();
  res.json(data);
});

// 🌐 Servir el archivo index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 🚀 Puerto dinámico (Render asigna uno automáticamente)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on ' + PORT));
