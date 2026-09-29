const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const mysql = require('mysql2/promise');

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const dbConfig = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
  database: 'roamly'
};

let db;

async function connectDB() {
  try {
    db = await mysql.createConnection(dbConfig);
    console.log('Connected to MySQL');
  } catch (error) {
    console.error('MySQL connection failed:', error.message);
    process.exit(1);
  }
}

app.get('/api/vehicles', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM vehicles ORDER BY id DESC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
});

app.get('/api/vehicles/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM vehicles WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Vehicle not found' });
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch vehicle' });
  }
});

app.post('/api/vehicles', async (req, res) => {
  const { make, model, year, type, price, status, color, image } = req.body;

  if (!make || !model || !year || !price) {
    return res.status(400).json({ error: 'make, model, year, and price are required.' });
  }

  const id = `VH-${String(Math.floor(Math.random() * 9000) + 1000)}`;
  const vehicle = {
    id,
    make,
    model,
    year,
    type: type || 'Economy',
    price,
    status: status || 'available',
    color: color || 'black',
    image: image || 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80'
  };

  try {
    await db.query(
      'INSERT INTO vehicles (id, make, model, year, type, price, status, color, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [vehicle.id, vehicle.make, vehicle.model, vehicle.year, vehicle.type, vehicle.price, vehicle.status, vehicle.color, vehicle.image]
    );
    res.status(201).json(vehicle);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add vehicle' });
  }
});

app.put('/api/vehicles/:id', async (req, res) => {
  const { make, model, year, type, price, status, color, image } = req.body;
  try {
    const [result] = await db.query(
      'UPDATE vehicles SET make = ?, model = ?, year = ?, type = ?, price = ?, status = ?, color = ?, image = ? WHERE id = ?',
      [make, model, year, type, price, status, color, image, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Vehicle not found' });
    const [rows] = await db.query('SELECT * FROM vehicles WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update vehicle' });
  }
});

app.delete('/api/vehicles/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM vehicles WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Vehicle not found' });
    res.json({ message: 'Vehicle deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete vehicle' });
  }
});

connectDB().then(() => {
  app.listen(port, () => {
    console.log(`Roamly server running at http://localhost:${port}`);
  });
});