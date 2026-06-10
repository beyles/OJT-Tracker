const express = require('express')
const router = express.Router()
const pool = require('../db')

// GET all schedules with their shifts
router.get('/', async (req, res) => {
  try {
    const schedules = await pool.query(
      'SELECT "ID" as id, "Name", "Status" FROM "ShiftSchedule" ORDER BY "Name"'
    )
    const details = await pool.query(
      'SELECT "ID" as id, "ScheduleID" as scheduleid, "ShiftName" as shiftname, "StartTime" as starttime, "EndTime" as endtime FROM "ShiftScheduleDetail" ORDER BY "StartTime"'
    )
    const result = schedules.rows.map(s => ({
      ...s,
      shifts: details.rows.filter(d => d.scheduleid === s.id)
    }))
    res.json(result)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST create schedule
router.post('/', async (req, res) => {
  const { Name, Status } = req.body
  try {
    const result = await pool.query(
      'INSERT INTO "ShiftSchedule" ("Name", "Status") VALUES ($1, $2) RETURNING "ID" as id',
      [Name, Status ?? true]
    )
    res.json({ success: true, id: result.rows[0].id })
  } catch (err) {
    res.status(500).json({ error: 'Error creating schedule' })
  }
})

// PUT update schedule
router.put('/:id', async (req, res) => {
  const { Name, Status } = req.body
  try {
    await pool.query(
      'UPDATE "ShiftSchedule" SET "Name"=$1, "Status"=$2 WHERE "ID"=$3',
      [Name, Status, req.params.id]
    )
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Error updating schedule' })
  }
})

// POST add shift to schedule
router.post('/:id/shifts', async (req, res) => {
  const { ShiftName, StartTime, EndTime } = req.body
  try {
    await pool.query(
      'INSERT INTO "ShiftScheduleDetail" ("ScheduleID", "ShiftName", "StartTime", "EndTime") VALUES ($1, $2, $3, $4)',
      [req.params.id, ShiftName, StartTime, EndTime]
    )
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Error adding shift' })
  }
})

// DELETE shift from schedule
router.delete('/shifts/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM "ShiftScheduleDetail" WHERE "ID"=$1', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Error deleting shift' })
  }
})

module.exports = router