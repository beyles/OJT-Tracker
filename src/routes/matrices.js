const express = require('express')
const router = express.Router()
const pool = require('../db')

// SQL migration — run once on Railway PostgreSQL:
//
// CREATE TABLE "EmployeeGroup" (
//   "ID" SERIAL PRIMARY KEY,
//   "Name" VARCHAR(255) UNIQUE NOT NULL
// );
// CREATE TABLE "EmployeeGroupMember" (
//   "ID" SERIAL PRIMARY KEY,
//   "GroupID"    INTEGER REFERENCES "EmployeeGroup"("ID") ON DELETE CASCADE,
//   "EmployeeID" INTEGER REFERENCES "Employees"("ID")     ON DELETE CASCADE,
//   UNIQUE("GroupID", "EmployeeID")
// );

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTANT: static-path routes (/report, /groups, /groups/:id) MUST be
// defined before the dynamic /:id routes, otherwise Express matches /groups
// as /:id with id = 'groups'.
// ─────────────────────────────────────────────────────────────────────────────

// ── MATRIX REPORT ────────────────────────────────────────────────────────────

// GET /api/matrices/report?matrixId=&groupId=
router.get('/report', async (req, res) => {
  const { matrixId, groupId } = req.query
  if (!matrixId || !groupId) return res.status(400).json({ error: 'matrixId and groupId required' })

  try {
    const [matrixRes, groupRes] = await Promise.all([
      pool.query(`SELECT "ID" as id, "Name" as name FROM "Matrix" WHERE "ID" = $1`, [matrixId]),
      pool.query(`SELECT "ID" as id, "Name" as name FROM "EmployeeGroup" WHERE "ID" = $1`, [groupId]),
    ])
    if (!matrixRes.rows[0]) return res.status(404).json({ error: 'Matrix not found' })
    if (!groupRes.rows[0]) return res.status(404).json({ error: 'Employee group not found' })

    const [docsRes, empsRes] = await Promise.all([
      pool.query(`
        SELECT md."MpiID" as id, p."Name" as name, p."Revision" as revision
        FROM "MatrixDocument" md
        JOIN "Mpi" p ON p."ID" = md."MpiID"
        WHERE md."MatrixID" = $1
        ORDER BY md."Order" ASC
      `, [matrixId]),
      pool.query(`
        SELECT e."ID" as id, e."Name" as name, e."Number" as number
        FROM "EmployeeGroupMember" egm
        JOIN "Employees" e ON e."ID" = egm."EmployeeID"
        WHERE egm."GroupID" = $1
        ORDER BY e."Number" ASC
      `, [groupId]),
    ])

    const documents = docsRes.rows.map(d => ({ ...d, revision: `Rev. ${d.revision}` }))
    const employees = empsRes.rows

    if (documents.length === 0 || employees.length === 0) {
      return res.json({
        matrixName: matrixRes.rows[0].name,
        groupName: groupRes.rows[0].name,
        documents,
        employees: employees.map(e => ({ ...e, compliance: {} })),
        overallCompliance: 0,
      })
    }

    const complianceRes = await pool.query(`
      SELECT
        egm."EmployeeID" as "employeeId",
        md."MpiID"       as "mpiId",
        EXISTS(
          SELECT 1 FROM "MpiRecord" mr
          WHERE mr."EmployeeID" = egm."EmployeeID"
            AND mr."MpiID"     = md."MpiID"
            AND mr."Version"   = p."Revision"
        ) AS compliant
      FROM "EmployeeGroupMember" egm
      CROSS JOIN "MatrixDocument" md
      JOIN "Mpi" p ON p."ID" = md."MpiID"
      WHERE egm."GroupID"   = $1
        AND md."MatrixID"   = $2
    `, [groupId, matrixId])

    const compMap = {}
    let compliantCells = 0
    for (const row of complianceRes.rows) {
      if (!compMap[row.employeeId]) compMap[row.employeeId] = {}
      compMap[row.employeeId][row.mpiId] = row.compliant
      if (row.compliant) compliantCells++
    }

    const totalCells = employees.length * documents.length
    const overallCompliance = totalCells > 0
      ? Math.round((compliantCells / totalCells) * 1000) / 10
      : 0

    res.json({
      matrixName: matrixRes.rows[0].name,
      groupName: groupRes.rows[0].name,
      documents,
      employees: employees.map(e => ({ ...e, compliance: compMap[e.id] || {} })),
      overallCompliance,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// ── EMPLOYEE GROUPS ───────────────────────────────────────────────────────────

// GET /api/matrices/groups — list all groups with member count
router.get('/groups', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT g."ID" as id, g."Name" as name, COUNT(m."ID")::int as "memberCount"
      FROM "EmployeeGroup" g
      LEFT JOIN "EmployeeGroupMember" m ON m."GroupID" = g."ID"
      GROUP BY g."ID", g."Name"
      ORDER BY g."Name"
    `)
    res.json({ data: result.rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/matrices/groups/:id — group detail with members ordered by Number
router.get('/groups/:id', async (req, res) => {
  try {
    const groupRes = await pool.query(
      `SELECT "ID" as id, "Name" as name FROM "EmployeeGroup" WHERE "ID" = $1`,
      [req.params.id]
    )
    if (!groupRes.rows[0]) return res.status(404).json({ error: 'Group not found' })

    const membersRes = await pool.query(`
      SELECT e."ID" as id, e."Name" as name, e."Number" as number
      FROM "EmployeeGroupMember" egm
      JOIN "Employees" e ON e."ID" = egm."EmployeeID"
      WHERE egm."GroupID" = $1
      ORDER BY e."Number" ASC
    `, [req.params.id])

    res.json({ ...groupRes.rows[0], members: membersRes.rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/matrices/groups — create group
router.post('/groups', async (req, res) => {
  const { name } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' })
  try {
    const result = await pool.query(
      `INSERT INTO "EmployeeGroup" ("Name") VALUES ($1) RETURNING "ID" as id`,
      [name.trim()]
    )
    res.json({ success: true, id: result.rows[0].id })
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A group with this name already exists' })
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/matrices/groups/:id — update group name
router.put('/groups/:id', async (req, res) => {
  const { name } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' })
  try {
    const result = await pool.query(
      `UPDATE "EmployeeGroup" SET "Name" = $1 WHERE "ID" = $2 RETURNING "ID"`,
      [name.trim(), req.params.id]
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'Group not found' })
    res.json({ success: true })
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A group with this name already exists' })
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/matrices/groups/:id — delete group (cascade removes members)
router.delete('/groups/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM "EmployeeGroup" WHERE "ID" = $1 RETURNING "ID"`,
      [req.params.id]
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'Group not found' })
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/matrices/groups/:id/members — add employee to group
router.post('/groups/:id/members', async (req, res) => {
  const { employeeId } = req.body
  if (!employeeId) return res.status(400).json({ error: 'employeeId is required' })
  try {
    await pool.query(
      `INSERT INTO "EmployeeGroupMember" ("GroupID", "EmployeeID") VALUES ($1, $2)`,
      [req.params.id, employeeId]
    )
    res.json({ success: true })
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Employee already in this group' })
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/matrices/groups/:id/members/:employeeId — remove employee from group
router.delete('/groups/:id/members/:employeeId', async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM "EmployeeGroupMember" WHERE "GroupID" = $1 AND "EmployeeID" = $2 RETURNING "ID"`,
      [req.params.id, req.params.employeeId]
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'Member not found in group' })
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// ── MATRICES ──────────────────────────────────────────────────────────────────

// GET /api/matrices — list all matrices with document count
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m."ID" as id, m."Name" as name, COUNT(md."ID")::int as "documentCount"
      FROM "Matrix" m
      LEFT JOIN "MatrixDocument" md ON md."MatrixID" = m."ID"
      GROUP BY m."ID", m."Name"
      ORDER BY m."Name"
    `)
    res.json({ data: result.rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/matrices/:id — matrix detail with ordered documents
router.get('/:id', async (req, res) => {
  try {
    const matrixRes = await pool.query(
      `SELECT "ID" as id, "Name" as name FROM "Matrix" WHERE "ID" = $1`,
      [req.params.id]
    )
    if (!matrixRes.rows[0]) return res.status(404).json({ error: 'Matrix not found' })

    const docsRes = await pool.query(`
      SELECT md."MpiID" as "mpiId", md."Order" as "order", p."Name" as name, p."Revision" as revision
      FROM "MatrixDocument" md
      JOIN "Mpi" p ON p."ID" = md."MpiID"
      WHERE md."MatrixID" = $1
      ORDER BY md."Order" ASC
    `, [req.params.id])

    res.json({ ...matrixRes.rows[0], documents: docsRes.rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/matrices — create new matrix
router.post('/', async (req, res) => {
  const { name } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' })
  try {
    const result = await pool.query(
      `INSERT INTO "Matrix" ("Name") VALUES ($1) RETURNING "ID" as id`,
      [name.trim()]
    )
    res.json({ success: true, id: result.rows[0].id })
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A Matrix with this name already exists' })
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/matrices/:id — update matrix name
router.put('/:id', async (req, res) => {
  const { name } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' })
  try {
    const result = await pool.query(
      `UPDATE "Matrix" SET "Name" = $1 WHERE "ID" = $2 RETURNING "ID"`,
      [name.trim(), req.params.id]
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'Matrix not found' })
    res.json({ success: true })
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A Matrix with this name already exists' })
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/matrices/:id — delete matrix
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM "Matrix" WHERE "ID" = $1 RETURNING "ID"`,
      [req.params.id]
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'Matrix not found' })
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/matrices/:id/documents — add document (appended at end)
router.post('/:id/documents', async (req, res) => {
  const { mpiId } = req.body
  if (!mpiId) return res.status(400).json({ error: 'mpiId is required' })
  try {
    await pool.query(`
      INSERT INTO "MatrixDocument" ("MatrixID", "MpiID", "Order")
      SELECT $1, $2, COALESCE(MAX("Order"), 0) + 1
      FROM "MatrixDocument"
      WHERE "MatrixID" = $1
    `, [req.params.id, mpiId])
    res.json({ success: true })
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Document already in this matrix' })
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/matrices/:id/documents/reorder — update order of all documents
router.put('/:id/documents/reorder', async (req, res) => {
  const { documents } = req.body
  if (!Array.isArray(documents)) return res.status(400).json({ error: 'documents array required' })
  try {
    await Promise.all(documents.map(doc =>
      pool.query(
        `UPDATE "MatrixDocument" SET "Order" = $1 WHERE "MatrixID" = $2 AND "MpiID" = $3`,
        [doc.order, req.params.id, doc.mpiId]
      )
    ))
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/matrices/:id/documents/:mpiId — remove document from matrix
router.delete('/:id/documents/:mpiId', async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM "MatrixDocument" WHERE "MatrixID" = $1 AND "MpiID" = $2 RETURNING "ID"`,
      [req.params.id, req.params.mpiId]
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'Document not found in matrix' })
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
