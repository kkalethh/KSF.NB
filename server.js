const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./db');
const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

function auditLog(user_id, action, detail) {
  db.prepare('INSERT INTO audit (user_id, action, detail) VALUES (?,?,?)')
    .run(user_id || null, action, detail || null);
}

// LOGIN
app.post('/api/login', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });
  const get = db.prepare('SELECT * FROM users WHERE name = ?');
  let user = get.get(name);
  if (!user) {
    const ins = db.prepare('INSERT INTO users (name) VALUES (?)');
    const info = ins.run(name);
    user = { id: info.lastInsertRowid, name };
  }
  auditLog(user.id, 'login', `Usuario ${name} inició sesión`);
  res.json({ user });
});

// CLIENTES
app.get('/api/clients', (req, res) =>
  res.json(db.prepare('SELECT * FROM clients ORDER BY id DESC').all())
);

app.post('/api/clients', (req, res) => {
  const { name, phone, email, address, userId } = req.body;
  const ins = db.prepare('INSERT INTO clients (name, phone, email, address) VALUES (?,?,?,?)');
  const info = ins.run(name, phone, email, address);
  auditLog(userId, 'create_client', `Cliente ${name}`);
  res.json({ id: info.lastInsertRowid });
});

// PAGOS
app.get('/api/payments', (req, res) =>
  res.json(
    db.prepare(`
      SELECT p.*, c.name AS client_name 
      FROM payments p 
      LEFT JOIN clients c ON c.id = p.client_id 
      ORDER BY p.id DESC
    `).all()
  )
);

app.post('/api/payments', (req, res) => {
  const { client_id, amount, date, note, userId } = req.body;
  const ins = db.prepare('INSERT INTO payments (client_id, amount, date, note) VALUES (?,?,?,?)');
  const info = ins.run(client_id, amount, date, note);
  auditLog(userId, 'create_payment', `Pago ${info.lastInsertRowid}`);
  res.json({ id: info.lastInsertRowid });
});

// AUDITORÍA
app.get('/api/audit', (req, res) =>
  res.json(
    db.prepare(`
      SELECT a.*, u.name AS user_name 
      FROM audit a 
      LEFT JOIN users u ON u.id = a.user_id 
      ORDER BY a.id DESC 
      LIMIT 200
    `).all()
  )
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on ' + PORT));
