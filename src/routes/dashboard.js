const express = require('express')
const router  = express.Router()
const pool    = require('../db')
const jwt     = require('jsonwebtoken')

function userFromReq(req) {
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
    return jwt.verify(token, process.env.JWT_SECRET)
  } catch { return null }
}

// ── GET /api/dashboard?siteId= ────────────────────────────────
router.get('/', async (req, res) => {
  const user    = userFromReq(req)
  const isSysadmin = user?.role === 'sysadmin'
  const userSiteIds = user?.siteIds || []

  let siteId = req.query.siteId ? parseInt(req.query.siteId) : null

  if (!isSysadmin && siteId && !userSiteIds.includes(siteId)) {
    return res.status(403).json({ error: 'Access denied to this site' })
  }
  const allowedSiteIds = isSysadmin ? null : userSiteIds

  const today = new Date().toISOString().split('T')[0]

  try {
    const siteClause = (ids, alias = 'b') => {
      if (siteId) return `AND ${alias}."Site" = ${siteId}`
      if (ids && ids.length > 0) return `AND ${alias}."Site" IN (${ids.join(',')})`
      return ''
    }

    // 1. Total active employees
    const empRes = await pool.query(`SELECT COUNT(*)::int AS n FROM "Employees" WHERE "Status" = true`)
    const totalActiveEmployees = empRes.rows[0].n

    // 2. Today's staffing records
    const assignedRes = await pool.query(`
      SELECT COUNT(sr.*)::int AS n
      FROM "StaffingRecord" sr
      JOIN "Buildings" b ON b."ID" = sr."BuildingID"
      WHERE sr."Date" = $1 ${siteClause(allowedSiteIds)}`, [today])
    const todayAssigned = assignedRes.rows[0].n

    // 3. Certified count today
    const certRes = await pool.query(`
      SELECT COUNT(sr.*)::int AS n
      FROM "StaffingRecord" sr
      JOIN "Buildings" b ON b."ID" = sr."BuildingID"
      WHERE sr."Date" = $1 AND sr."CertificationStatus" = 'certified'
        ${siteClause(allowedSiteIds)}`, [today])
    const certifiedToday = certRes.rows[0].n
    const percentCertified = todayAssigned > 0 ? Math.round(certifiedToday / todayAssigned * 100) : 0

    // 4. Expiring soon
    const q4 = `
      WITH latest_cert AS (
        SELECT DISTINCT ON (c."EmployeeID", c."WorkstationID")
          c."EmployeeID", c."WorkstationID", c."Date" AS "CertDate"
        FROM "Certifications" c WHERE c."Result" = 'Pass'
        ORDER BY c."EmployeeID", c."WorkstationID", c."Date" DESC
      )
      SELECT
        e."Name"  AS "Employee",
        e."Number",
        w."Name"  AS "Workstation",
        lc."CertDate",
        (lc."CertDate" + (w."CertificationExpirationDays" || ' days')::interval)::date AS "ExpiryDate",
        EXTRACT(DAY FROM
          (lc."CertDate" + (w."CertificationExpirationDays" || ' days')::interval) - CURRENT_DATE
        )::int AS "DaysLeft"
      FROM latest_cert lc
      JOIN "Workstation" w ON w."ID" = lc."WorkstationID"
      JOIN "Employees"   e ON e."ID"  = lc."EmployeeID"
      WHERE w."CertificationExpirationDays" IS NOT NULL
        AND e."Status" = true
        AND (lc."CertDate" + (w."CertificationExpirationDays" || ' days')::interval)
            BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
      ORDER BY "ExpiryDate" LIMIT 25`
    const expiryRes = await pool.query(q4)
    const expiringSoon = expiryRes.rows

    // 5. Active lines
    const q5 = `
      SELECT
        pl."ID",
        pl."ProductionLineName"          AS "Name",
        b."Name"                         AS "Building",
        b."Site"                         AS "SiteID",
        s."Name"                         AS "SiteName",
        COUNT(DISTINCT plw."Workstation")::int AS "WorkstationCount",
        COUNT(DISTINCT sr."ID")::int           AS "AssignedToday"
      FROM "ProductionLine" pl
      JOIN  "Buildings" b ON b."ID" = pl."Building"
      JOIN  "Sites"     s ON s."ID" = b."Site"
      LEFT JOIN "ProductionLineWorkstation" plw ON plw."ProductionLine" = pl."ID"
      LEFT JOIN "StaffingRecord" sr
             ON sr."WorkstationID" = plw."Workstation" AND sr."Date" = $1
      WHERE pl."Status" = true ${siteClause(allowedSiteIds)}
      GROUP BY pl."ID", pl."ProductionLineName", b."Name", b."Site", s."Name"
      ORDER BY b."Name", pl."ProductionLineName"`
    const linesRes = await pool.query(q5, [today])
    const activeLines = linesRes.rows

    res.json({
      totalActiveEmployees,
      todayAssigned,
      certifiedToday,
      percentCertified,
      expiringSoon,
      activeLines,
    })
  } catch (err) {
    console.error('[dashboard ERROR]', err)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
