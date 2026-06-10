const express = require('express')
const router = express.Router()
const pool = require('../db')

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT "ID" as id, "Name", "Site", "Status", "MultiStaffing", "ShiftScheduleID" FROM "Buildings" ORDER BY "Name"')
    res.json(result.rows)
  } catch (err) { res.status(500).json({ error: 'Server error' }) }
})

router.post('/', async (req, res) => {
  const { Name, Site, Status, MultiStaffing, ShiftScheduleID } = req.body
  try {
    await pool.query('INSERT INTO "Buildings" ("Name", "Site", "Status", "MultiStaffing", "ShiftScheduleID") VALUES ($1, $2, $3, $4, $5)',
      [Name, Site, Status ?? true, MultiStaffing ?? false, ShiftScheduleID || null])
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: 'Error creating building' }) }
})

router.put('/:id', async (req, res) => {
  const { Name, Site, Status, MultiStaffing, ShiftScheduleID } = req.body
  try {
    await pool.query('UPDATE "Buildings" SET "Name"=$1, "Site"=$2, "Status"=$3, "MultiStaffing"=$4, "ShiftScheduleID"=$5 WHERE "ID"=$6',
      [Name, Site, Status, MultiStaffing, ShiftScheduleID || null, req.params.id])
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: 'Error updating building' }) }
})

module.exports = router