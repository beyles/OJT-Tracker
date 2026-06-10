const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'OJT Tracker API running' });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/sites', require('./routes/sites'));
app.use('/api/buildings', require('./routes/buildings'));
app.use('/api/shifts', require('./routes/shifts'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/training', require('./routes/trainingadmin'));

module.exports = app;