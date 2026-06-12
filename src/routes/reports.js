const express = require('express')
const router  = express.Router()
const pool    = require('../db')
const jwt     = require('jsonwebtoken')

// Roles each user role can see (inclusive of lower tiers)
const ROLE_VISIBILITY = {
  trainer:       ['trainer'],
  trainingadmin: ['trainer', 'trainingadmin'],
  sysadmin:      ['trainer', 'trainingadmin', 'sysadmin'],
}

function userRoleFromReq(req) {
  try {
    const auth = req.headers.authorization || ''
    const token = auth.replace(/^Bearer\s+/i, '')
    if (!token) return 'trainer'
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    return decoded.role || 'trainer'
  } catch { return 'trainer' }
}

// ── GET /api/reports ──────────────────────────────────────────
router.get('/', async (req, res) => {
  const allowed      = ROLE_VISIBILITY[userRoleFromReq(req)] || ['trainer']
  const placeholders = allowed.map((_, i) => `$${i + 1}`).join(', ')
  try {
    const result = await pool.query(`
      SELECT r."ID", r."Name", r."Description", r."Parameters",
             r."RequiredRole", r."SortOrder",
             rc."ID"   AS "CategoryID",
             rc."Name" AS "CategoryName"
      FROM "Report" r
      JOIN "ReportCategory" rc ON rc."ID" = r."CategoryID"
      WHERE r."Active" = TRUE
        AND r."RequiredRole" IN (${placeholders})
      ORDER BY rc."Name", r."SortOrder", r."Name"
    `, allowed)
    res.json({ data: result.rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/reports/run ─────────────────────────────────────
router.post('/run', async (req, res) => {
  const { reportId, parameters = {} } = req.body
  if (!reportId) return res.status(400).json({ error: 'reportId required' })

  try {
    const rpt = await pool.query(
      `SELECT "SqlQuery", "Parameters" FROM "Report" WHERE "ID" = $1 AND "Active" = TRUE`,
      [reportId]
    )
    if (rpt.rowCount === 0) return res.status(404).json({ error: 'Report not found' })

    const { SqlQuery, Parameters: paramDefs } = rpt.rows[0]

    if (!/^\s*select\s/i.test(SqlQuery))
      return res.status(400).json({ error: 'Only SELECT queries are permitted' })

    // Replace named placeholders ($paramName) with positional $1, $2, …
    let sql    = SqlQuery
    const vals = []
    for (const def of (paramDefs || [])) {
      const raw = parameters[def.name]
      if (def.required && (raw === undefined || raw === null || raw === ''))
        return res.status(400).json({ error: `Parameter "${def.label}" is required` })
      vals.push(raw ?? null)
      sql = sql.replace(new RegExp(`\\$${def.name}`, 'g'), `$${vals.length}`)
    }

    const result = await pool.query(sql, vals)
    const columns = result.fields.map(f => f.name)
    res.json({ columns, rows: result.rows, rowCount: result.rowCount })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
