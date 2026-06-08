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

// Routes (we'll add these next)
// app.use('/api/auth', require('./routes/auth'));
// app.use('/api/users', require('./routes/users'));

module.exports = app;