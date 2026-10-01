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
let vehicles = [
  {
    id: 'VH-1001',
    make: 'Toyota',
    model: 'Corolla Hybrid',
    year: 2024,
    type: 'Economy',
    price: 64,
    status: 'available',
    color: 'Silver',
    image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'VH-1002',
    make: 'Volkswagen',
    model: 'T-Roc',
    year: 2023,
    type: 'Compact SUV',
    price: 82,
    status: 'rented',
    color: 'Black',
    image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'VH-1003',
    make: 'Volvo',
    model: 'XC40',
    year: 2022,
    type: 'SUV',
    price: 95,
    status: 'service',
    color: 'Blue',
    image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80'
  }
];

async function connectDB() {
  try {
    db = await mysql.createConnection(dbConfig);
    console.log('Connected to MySQL');
  } catch (error) {
    console.warn('MySQL connection failed, using in-memory data store instead:', error.message);
    db = null;
  }
}

async function getVehicleList() {
  if (!db) return [...vehicles];

  const [rows] = await db.query('SELECT * FROM vehicles ORDER BY id DESC');
  return rows;
}

async function getVehicleById(id) {
  if (!db) {
    return vehicles.find(vehicle => vehicle.id === id) || null;
  }

  const [rows] = await db.query('SELECT * FROM vehicles WHERE id = ?', [id]);
  return rows[0] || null;
}

async function createVehicle(vehicle) {
  if (!db) {
    vehicles.unshift(vehicle);
    return vehicle;
  }

  await db.query(
    'INSERT INTO vehicles (id, make, model, year, type, price, status, color, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [vehicle.id, vehicle.make, vehicle.model, vehicle.year, vehicle.type, vehicle.price, vehicle.status, vehicle.color, vehicle.image]
  );
  return vehicle;
}

async function updateVehicle(id, values) {
  if (!db) {
    const index = vehicles.findIndex(vehicle => vehicle.id === id);
    if (index === -1) return null;

    vehicles[index] = { ...vehicles[index], ...values };
    return vehicles[index];
  }

  const [result] = await db.query(
    'UPDATE vehicles SET make = ?, model = ?, year = ?, type = ?, price = ?, status = ?, color = ?, image = ? WHERE id = ?',
    [values.make, values.model, values.year, values.type, values.price, values.status, values.color, values.image, id]
  );

  if (result.affectedRows === 0) return null;
  return getVehicleById(id);
}

async function removeVehicle(id) {
  if (!db) {
    const index = vehicles.findIndex(vehicle => vehicle.id === id);
    if (index === -1) return false;
    vehicles.splice(index, 1);
    return true;
  }

  const [result] = await db.query('DELETE FROM vehicles WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

app.get('/api/vehicles', async (req, res) => {
  try {
    const rows = await getVehicleList();
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
});

app.get('/api/vehicles/:id', async (req, res) => {
  try {
    const vehicle = await getVehicleById(req.params.id);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    res.json(vehicle);
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

  const vehicle = {
    id: `VH-${String(Math.floor(Math.random() * 9000) + 1000)}`,
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
    const created = await createVehicle(vehicle);
    res.status(201).json(created);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add vehicle' });
  }
});

app.put('/api/vehicles/:id', async (req, res) => {
  const { make, model, year, type, price, status, color, image } = req.body;

  try {
    const updated = await updateVehicle(req.params.id, { make, model, year, type, price, status, color, image });
    if (!updated) return res.status(404).json({ error: 'Vehicle not found' });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update vehicle' });
  }
});

app.delete('/api/vehicles/:id', async (req, res) => {
  try {
    const removed = await removeVehicle(req.params.id);
    if (!removed) return res.status(404).json({ error: 'Vehicle not found' });
    res.json({ message: 'Vehicle deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete vehicle' });
  }
});

connectDB().finally(() => {
  app.listen(port, () => {
    console.log(`Roamly server running at http://localhost:${port}`);
  });
});