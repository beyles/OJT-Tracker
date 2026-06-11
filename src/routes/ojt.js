const express = require('express')
const router = express.Router()
const pool = require('../db')

// GET /api/ojt/events/by-employee?employeeId=
// All OJT events for one employee across all dates and trainers.
router.get('/events/by-employee', async (req, res) => {
  const { employeeId } = req.query
  if (!employeeId) return res.status(400).json({ error: 'employeeId is required' })
  try {
    const result = await pool.query(`
      SELECT
        o."ID"        as id,
        o."EventDate",
        o."Progress",
        o."Hours",
        o."Comment",
        o."Trainer"   as "TrainerId",
        w."Name"      as "WorkstationName",
        u."Name"      as "TrainerName"
      FROM "OJT" o
      JOIN "Workstation" w ON w."ID" = o."Workstation"
      JOIN "Users"       u ON u."ID" = o."Trainer"
      WHERE o."Employee" = $1
      ORDER BY o."EventDate" DESC
    `, [employeeId])
    res.json({ data: result.rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/ojt/events?date=YYYY-MM-DD[&trainerEmployeeId=]
// Omit trainerEmployeeId to fetch all trainers' events for the date.
router.get('/events', async (req, res) => {
  const { date, trainerEmployeeId } = req.query
  if (!date) return res.status(400).json({ error: 'date is required' })
  try {
    const params = [date]
    const trainerFilter = trainerEmployeeId
      ? `AND o."Trainer" = $${params.push(trainerEmployeeId)}`
      : ''
    const result = await pool.query(`
      SELECT
        o."ID" as id,
        o."EventDate",
        o."Progress",
        o."Hours",
        o."Comment",
        o."Trainer" as "TrainerId",
        o."Employee" as "EmployeeId",
        o."Workstation" as "WorkstationId",
        e."Name" as "EmployeeName",
        w."Name" as "WorkstationName",
        u."Name" as "TrainerName"
      FROM "OJT" o
      JOIN "Employees" e ON e."ID" = o."Employee"
      JOIN "Workstation" w ON w."ID" = o."Workstation"
      JOIN "Users" u ON u."ID" = o."Trainer"
      WHERE DATE(o."EventDate") = $1 ${trainerFilter}
      ORDER BY o."EventDate" DESC
    `, params)
    res.json({ data: result.rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/ojt/events
router.post('/events', async (req, res) => {
  const { date, trainerId, employeeId, workstationId, progress, trainingHours, notes } = req.body
  if (!date || !trainerId || !employeeId || !workstationId || progress == null || !trainingHours)
    return res.status(400).json({ error: 'Missing required fields' })
  try {
    const result = await pool.query(`
      INSERT INTO "OJT" ("EventDate", "Trainer", "Employee", "Workstation", "Progress", "Hours", "Comment")
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING "ID"
    `, [date, trainerId, employeeId, workstationId, Math.round(progress), trainingHours, notes || null])
    res.json({ success: true, id: result.rows[0].ID })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/ojt/events/:id
// Only the trainer who logged the event may update it.
router.put('/events/:id', async (req, res) => {
  const { trainerId, employeeId, workstationId, progress, trainingHours, notes } = req.body
  if (!trainerId || !employeeId || !workstationId || progress == null || !trainingHours)
    return res.status(400).json({ error: 'Missing required fields' })
  try {
    const result = await pool.query(
      `UPDATE "OJT"
       SET "Employee"=$1, "Workstation"=$2, "Progress"=$3, "Hours"=$4, "Comment"=$5
       WHERE "ID"=$6 AND "Trainer"=$7
       RETURNING "ID"`,
      [employeeId, workstationId, Math.round(progress), trainingHours, notes || null, req.params.id, trainerId]
    )
    if (result.rowCount === 0)
      return res.status(404).json({ error: 'Event not found or not owned by this trainer' })
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/ojt/events/:id?trainerId=
// Only the trainer who logged the event may delete it.
router.delete('/events/:id', async (req, res) => {
  const { id } = req.params
  const { trainerId } = req.query
  if (!trainerId) return res.status(400).json({ error: 'trainerId is required' })
  try {
    const result = await pool.query(
      `DELETE FROM "OJT" WHERE "ID" = $1 AND "Trainer" = $2 RETURNING "ID"`,
      [id, trainerId]
    )
    if (result.rowCount === 0)
      return res.status(404).json({ error: 'Event not found or not owned by this trainer' })
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
