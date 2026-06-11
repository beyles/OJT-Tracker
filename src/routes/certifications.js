const express = require('express')
const router = express.Router()
const pool = require('../db')

// GET /api/certifications?employeeId=&workstationId=&search=&page=1&limit=50
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const offset = (page - 1) * limit
    const { employeeId, workstationId, search } = req.query

    const params = []
    const conditions = []

    if (employeeId) {
      params.push(employeeId)
      conditions.push(`c."EmployeeID" = $${params.length}`)
    }
    if (workstationId) {
      params.push(workstationId)
      conditions.push(`c."WorkstationID" = $${params.length}`)
    }
    if (search) {
      params.push(`%${search}%`)
      // same $N can be referenced twice in PostgreSQL
      conditions.push(`(e."Name" ILIKE $${params.length} OR w."Name" ILIKE $${params.length})`)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const dataResult = await pool.query(
      `SELECT
         c."ID"           as id,
         c."Result",
         c."Date",
         c."CreatedAt",
         e."Name"         as "EmployeeName",
         e."ID"           as "EmployeeID",
         w."Name"         as "WorkstationName",
         w."ID"           as "WorkstationID",
         u."Name"         as "CreatedByName"
       FROM "Certifications" c
       JOIN "Employees"   e ON e."ID" = c."EmployeeID"
       JOIN "Workstation" w ON w."ID" = c."WorkstationID"
       LEFT JOIN "Users"  u ON u."ID" = c."CreatedBy"
       ${where}
       ORDER BY c."Date" DESC, c."CreatedAt" DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    )

    const countResult = await pool.query(
      `SELECT COUNT(*)
       FROM "Certifications" c
       JOIN "Employees"   e ON e."ID" = c."EmployeeID"
       JOIN "Workstation" w ON w."ID" = c."WorkstationID"
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

// POST /api/certifications
router.post('/', async (req, res) => {
  const { employeeId, workstationId, result, date, createdBy } = req.body
  if (!employeeId || !workstationId || !result || !date)
    return res.status(400).json({ error: 'Missing required fields' })
  if (!['Pass', 'Fail'].includes(result))
    return res.status(400).json({ error: 'Result must be Pass or Fail' })
  try {
    const r = await pool.query(
      `INSERT INTO "Certifications" ("EmployeeID", "WorkstationID", "Result", "Date", "CreatedBy")
       VALUES ($1, $2, $3, $4, $5)
       RETURNING "ID" as id`,
      [employeeId, workstationId, result, date, createdBy || null]
    )
    res.json({ success: true, id: r.rows[0].id })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/certifications/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM "Certifications" WHERE "ID" = $1 RETURNING "ID"`,
      [req.params.id]
    )
    if (result.rowCount === 0)
      return res.status(404).json({ error: 'Certification not found' })
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
