const express = require('express')
const router = express.Router()
const pool = require('../db')
const jwt = require('jsonwebtoken')

function userFromReq(req) {
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
    return jwt.verify(token, process.env.JWT_SECRET)
  } catch { return null }
}

// GET /api/mpi-records/available — all active MPIs with hasFile indicator
router.get('/available', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m."ID", m."Code", m."Name", m."Revision", m."Status", m."VersioningType",
             EXISTS (SELECT 1 FROM "MpiFile" f WHERE f."MpiID" = m."ID") AS "hasFile"
      FROM "Mpi" m
      WHERE m."Status" = true
      ORDER BY m."Code"
    `)
    res.json({ data: result.rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/mpi-records/acknowledge — self-service acknowledgement with password check
router.post('/acknowledge', async (req, res) => {
  const { mpiId, password } = req.body
  if (!mpiId || !password) return res.status(400).json({ error: 'Missing mpiId or password' })

  const jwtUser = userFromReq(req)
  if (!jwtUser) return res.status(401).json({ error: 'Not authenticated' })

  try {
    // Get user record including linked employee and password
    const userRes = await pool.query(
      `SELECT u."ID", u."Name", u."PasswordHash", u."EmployeeID",
              e."Name" AS "EmployeeName"
       FROM "Users" u
       LEFT JOIN "Employees" e ON e."ID" = u."EmployeeID"
       WHERE u."ID" = $1`,
      [jwtUser.id]
    )
    if (userRes.rowCount === 0) return res.status(401).json({ error: 'User not found' })

    const user = userRes.rows[0]

    // Plain-text password comparison (same as login)
    if (password !== user.PasswordHash)
      return res.status(401).json({ error: 'Invalid password' })

    if (!user.EmployeeID)
      return res.status(400).json({ error: 'No employee record linked to this user' })

    // Get current MPI revision
    const mpiRes = await pool.query(
      `SELECT "ID", "Code", "Name", "Revision" FROM "Mpi" WHERE "ID" = $1 AND "Status" = true`,
      [mpiId]
    )
    if (mpiRes.rowCount === 0) return res.status(404).json({ error: 'MPI not found' })
    const mpi = mpiRes.rows[0]

    // Check for existing acknowledgement at this version
    const existing = await pool.query(
      `SELECT "ID" FROM "MpiRecord"
       WHERE "EmployeeID" = $1 AND "MpiID" = $2 AND "Version" = $3`,
      [user.EmployeeID, mpiId, mpi.Revision]
    )
    if (existing.rowCount > 0)
      return res.json({ alreadyAcknowledged: true })

    // Insert acknowledgement
    const today = new Date().toISOString().split('T')[0]
    await pool.query(
      `INSERT INTO "MpiRecord" ("EmployeeID", "MpiID", "Version", "Date", "CreatedBy")
       VALUES ($1, $2, $3, $4, $5)`,
      [user.EmployeeID, mpiId, mpi.Revision, today, user.ID]
    )

    res.json({
      success: true,
      employeeName: user.EmployeeName,
      mpiCode: mpi.Code,
      mpiName: mpi.Name,
      version: mpi.Revision,
      date: today,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/mpi-records/mpis — active MPIs for the dropdown
// Must be defined before /:id patterns to avoid route shadowing
router.get('/mpis', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT "ID" as id, "Code", "Name", "Revision" as "CurrentRevision"
      FROM "Mpi"
      WHERE "Status" = true
      ORDER BY "Code"
    `)
    res.json({ data: result.rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/mpi-records?employeeId=&mpiId=&page=1&limit=50
router.get('/', async (req, res) => {
  try {
    const limit  = parseInt(req.query.limit) || 50
    const page   = Math.max(1, parseInt(req.query.page) || 1)
    const offset = (page - 1) * limit
    const { employeeId, mpiId, search } = req.query

    const params = []
    const conditions = []

    if (employeeId) {
      params.push(employeeId)
      conditions.push(`r."EmployeeID" = $${params.length}`)
    }
    if (mpiId) {
      params.push(mpiId)
      conditions.push(`r."MpiID" = $${params.length}`)
    }
    if (search) {
      params.push(`%${search}%`)
      conditions.push(`(e."Name" ILIKE $${params.length} OR m."Code" ILIKE $${params.length} OR m."Name" ILIKE $${params.length})`)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const dataResult = await pool.query(
      `SELECT
         r."ID"       as id,
         r."Version",
         r."Date",
         r."CreatedAt",
         e."Name"     as "EmployeeName",
         e."ID"       as "EmployeeID",
         m."Code"     as "MpiCode",
         m."Name"     as "MpiName",
         m."ID"       as "MpiID",
         u."Name"     as "CreatedByName"
       FROM "MpiRecord" r
       JOIN "Employees" e ON e."ID" = r."EmployeeID"
       JOIN "Mpi"       m ON m."ID" = r."MpiID"
       LEFT JOIN "Users" u ON u."ID" = r."CreatedBy"
       ${where}
       ORDER BY r."Date" DESC, r."CreatedAt" DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    )

    const countResult = await pool.query(
      `SELECT COUNT(*)
       FROM "MpiRecord" r
       JOIN "Employees" e ON e."ID" = r."EmployeeID"
       JOIN "Mpi"       m ON m."ID" = r."MpiID"
       ${where}`,
      params
    )

    res.json({
      data: dataResult.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/mpi-records
router.post('/', async (req, res) => {
  const { employeeId, mpiId, version, date, createdBy } = req.body
  if (!employeeId || !mpiId || !version || !date)
    return res.status(400).json({ error: 'Missing required fields' })
  try {
    const r = await pool.query(
      `INSERT INTO "MpiRecord" ("EmployeeID", "MpiID", "Version", "Date", "CreatedBy")
       VALUES ($1, $2, $3, $4, $5)
       RETURNING "ID" as id`,
      [employeeId, mpiId, version, date, createdBy || null]
    )
    res.json({ success: true, id: r.rows[0].id })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/mpi-records/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM "MpiRecord" WHERE "ID" = $1 RETURNING "ID"`,
      [req.params.id]
    )
    if (result.rowCount === 0)
      return res.status(404).json({ error: 'Record not found' })
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
