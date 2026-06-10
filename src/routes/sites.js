const express = require('express')
const router = express.Router()
const pool = require('../db')

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT "ID" as id, "Name", "TimeZone", "Status" FROM "Sites" ORDER BY "Name"')
    res.json(result.rows)
  } catch (err) { res.status(500).json({ error: 'Server error' }) }
})

router.post('/', async (req, res) => {
  const { Name, TimeZone, Status } = req.body
  try {
    await pool.query('INSERT INTO "Sites" ("Name", "TimeZone", "Status") VALUES ($1, $2, $3)', [Name, TimeZone, Status ?? true])
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: 'Error creating site' }) }
})

router.put('/:id', async (req, res) => {
  const { Name, TimeZone, Status } = req.body
  try {
    await pool.query('UPDATE "Sites" SET "Name"=$1, "TimeZone"=$2, "Status"=$3 WHERE "ID"=$4', [Name, TimeZone, Status, req.params.id])
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: 'Error updating site' }) }
})

module.exports = router