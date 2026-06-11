const express = require('express')
const router = express.Router()
const pool = require('../db')

// ── Status helpers (shared by /validate and /records) ────────
function certStatus(certDate, expirationDays, refDate) {
  if (!certDate) return 'none'
  if (!expirationDays) return 'certified'
  const expiry = new Date(certDate)
  expiry.setDate(expiry.getDate() + Number(expirationDays))
  return expiry > new Date(refDate) ? 'certified' : 'expired'
}

function ojtStatus(progress) {
  if (progress == null) return 'none'
  const p = Number(progress)
  return p < 25 ? 'I' : p < 50 ? 'L' : p < 75 ? 'U' : 'O'
}

function mpiStatus(employeeVersion, currentRevision, workstationMpiId) {
  if (!workstationMpiId) return 'none'
  if (!employeeVersion) return 'none'
  return employeeVersion === currentRevision ? 'current' : 'outdated'
}

// ── GET /api/staffing/context?siteId=&buildingId= ─────────────
router.get('/context', async (req, res) => {
  try {
    const { siteId, buildingId } = req.query

    const sitesRes = await pool.query(`SELECT "ID" as id, "Name" FROM "Sites" ORDER BY "Name"`)

    let buildings = [], lines = [], shifts = []

    if (siteId) {
      const bRes = await pool.query(
        `SELECT "ID" as id, "Name", "ShiftScheduleID" FROM "Buildings" WHERE "Site"=$1 ORDER BY "Name"`,
        [siteId]
      )
      buildings = bRes.rows
    }

    if (buildingId) {
      const lRes = await pool.query(
        `SELECT "ID" as id, "ProductionLineName" as "Name"
         FROM "ProductionLine"
         WHERE "Building"=$1 AND "Status"=true
         ORDER BY "ProductionLineName"`,
        [buildingId]
      )
      lines = lRes.rows

      const bldgRes = await pool.query(`SELECT "ShiftScheduleID" FROM "Buildings" WHERE "ID"=$1`, [buildingId])
      const scheduleId = bldgRes.rows[0]?.ShiftScheduleID
      if (scheduleId) {
        const sRes = await pool.query(
          `SELECT "ID" as id, "ShiftName" as name, "StartTime", "EndTime"
           FROM "ShiftScheduleDetail" WHERE "ScheduleID"=$1 ORDER BY "StartTime"`,
          [scheduleId]
        )
        shifts = sRes.rows
      }
    }

    res.json({ sites: sitesRes.rows, buildings, lines, shifts })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/staffing/line-workstations?lineId= ───────────────
router.get('/line-workstations', async (req, res) => {
  const { lineId } = req.query
  if (!lineId) return res.status(400).json({ error: 'lineId required' })
  try {
    const result = await pool.query(`
      SELECT plw."Order", w."ID" as id, w."Name", w."WCI_Level", w."CertificationExpirationDays"
      FROM "ProductionLineWorkstation" plw
      JOIN "Workstation" w ON w."ID" = plw."Workstation"
      WHERE plw."ProductionLine"=$1
      ORDER BY plw."Order"
    `, [lineId])
    res.json({ data: result.rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/staffing/validate?employeeId=&workstationId=&date= ─
router.get('/validate', async (req, res) => {
  const { employeeId, workstationId, date } = req.query
  if (!employeeId || !workstationId || !date) return res.status(400).json({ error: 'Missing params' })
  try {
    // Latest passing certification for this employee + workstation
    const certRes = await pool.query(`
      SELECT c."Date" AS "CertDate", w."CertificationExpirationDays"
      FROM "Certifications" c
      JOIN "Workstation" w ON w."ID" = c."WorkstationID"
      WHERE c."EmployeeID" = $1 AND c."WorkstationID" = $2 AND c."Result" = 'Pass'
      ORDER BY c."Date" DESC LIMIT 1
    `, [employeeId, workstationId])

    const certRow = certRes.rows[0]
    const certification = certStatus(certRow?.CertDate, certRow?.CertificationExpirationDays, date)

    // Latest OJT progress — OJT table uses "Employee" and "Workstation" (not *ID suffixed)
    const ojtRes = await pool.query(`
      SELECT o."Progress"
      FROM "OJT" o
      WHERE o."Employee" = $1 AND o."Workstation" = $2
      ORDER BY o."EventDate" DESC LIMIT 1
    `, [employeeId, workstationId])

    const ojt = ojtStatus(ojtRes.rows[0]?.Progress)

    // Workstation's linked MPI and employee's latest MPI record
    const wsRes = await pool.query(`
      SELECT w."MpiID" AS "WsMpiID", m."Revision" AS "CurrentRevision"
      FROM "Workstation" w
      LEFT JOIN "Mpi" m ON m."ID" = w."MpiID"
      WHERE w."ID" = $1
    `, [workstationId])

    let mpi = 'none', mpiVersion = null
    const wsRow = wsRes.rows[0]
    if (wsRow?.WsMpiID) {
      const mpiRecRes = await pool.query(`
        SELECT mr."Version"
        FROM "MpiRecord" mr
        WHERE mr."EmployeeID" = $1 AND mr."MpiID" = $2
        ORDER BY mr."Date" DESC LIMIT 1
      `, [employeeId, wsRow.WsMpiID])
      mpiVersion = mpiRecRes.rows[0]?.Version ?? null
      mpi = mpiStatus(mpiVersion, wsRow.CurrentRevision, wsRow.WsMpiID)
    }

    res.json({ certificationStatus: certification, ojtStatus: ojt, mpiStatus: mpi, mpiVersion })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/staffing/records?buildingId=&lineId=&date=&shiftId= ─
// Returns assignments with LIVE-computed status (not stale stored values).
router.get('/records', async (req, res) => {
  const { buildingId, lineId, date, shiftId } = req.query
  if (!date) return res.status(400).json({ error: 'date required' })
  try {
    const params = [date]
    const conditions = [`sr."Date" = $1`]

    if (buildingId) { params.push(buildingId); conditions.push(`sr."BuildingID" = $${params.length}`) }
    if (shiftId)    { params.push(shiftId);    conditions.push(`sr."ShiftID" = $${params.length}`) }
    if (lineId) {
      params.push(lineId)
      conditions.push(`sr."WorkstationID" IN (
        SELECT "Workstation" FROM "ProductionLineWorkstation" WHERE "ProductionLine" = $${params.length}
      )`)
    }

    const result = await pool.query(`
      WITH
      -- Latest passing cert per employee+workstation
      latest_cert AS (
        SELECT DISTINCT ON (c."EmployeeID", c."WorkstationID")
          c."EmployeeID", c."WorkstationID", c."Date" AS "CertDate"
        FROM "Certifications" c
        WHERE c."Result" = 'Pass'
        ORDER BY c."EmployeeID", c."WorkstationID", c."Date" DESC
      ),
      -- Latest OJT progress per employee+workstation
      -- Note: OJT uses "Employee" and "Workstation" columns (not *ID suffixed)
      latest_ojt AS (
        SELECT DISTINCT ON (o."Employee", o."Workstation")
          o."Employee"    AS "EmployeeID",
          o."Workstation" AS "WorkstationID",
          o."Progress"
        FROM "OJT" o
        ORDER BY o."Employee", o."Workstation", o."EventDate" DESC
      ),
      -- Latest MPI record version per employee+mpi
      latest_mpi AS (
        SELECT DISTINCT ON (mr."EmployeeID", mr."MpiID")
          mr."EmployeeID", mr."MpiID", mr."Version"
        FROM "MpiRecord" mr
        ORDER BY mr."EmployeeID", mr."MpiID", mr."Date" DESC
      )
      SELECT
        sr."ID"                         AS id,
        sr."WorkstationID",
        sr."EmployeeID",
        sr."Date",
        sr."ShiftID",
        sr."BuildingID",
        e."Name"                        AS "EmployeeName",
        e."Number"                      AS "EmployeeNumber",
        w."Name"                        AS "WorkstationName",
        w."MpiID"                       AS "WsMpiID",
        w."CertificationExpirationDays",
        m."Revision"                    AS "CurrentRevision",
        lc."CertDate"                   AS "LastCertDate",
        lo."Progress"                   AS "OJTProgress",
        lm."Version"                    AS "EmpMpiVersion",
        EXISTS(
          SELECT 1 FROM "EmployeePhoto" ep WHERE ep."EmployeeID" = sr."EmployeeID"
        )                               AS "HasPhoto"
      FROM "StaffingRecord" sr
      JOIN  "Employees"   e   ON e."ID"  = sr."EmployeeID"
      JOIN  "Workstation" w   ON w."ID"  = sr."WorkstationID"
      LEFT JOIN "Mpi"     m   ON m."ID"  = w."MpiID"
      LEFT JOIN latest_cert lc
             ON lc."EmployeeID"    = sr."EmployeeID"
            AND lc."WorkstationID" = sr."WorkstationID"
      LEFT JOIN latest_ojt lo
             ON lo."EmployeeID"    = sr."EmployeeID"
            AND lo."WorkstationID" = sr."WorkstationID"
      LEFT JOIN latest_mpi lm
             ON lm."EmployeeID"    = sr."EmployeeID"
            AND lm."MpiID"         = w."MpiID"
      WHERE ${conditions.join(' AND ')}
      ORDER BY w."Name"
    `, params)

    const rows = result.rows.map(row => {
      const cs = certStatus(row.LastCertDate, row.CertificationExpirationDays, date)
      return {
        id:                  row.id,
        WorkstationID:       row.WorkstationID,
        EmployeeID:          row.EmployeeID,
        Date:                row.Date,
        ShiftID:             row.ShiftID,
        BuildingID:          row.BuildingID,
        EmployeeName:        row.EmployeeName,
        EmployeeNumber:      row.EmployeeNumber,
        WorkstationName:     row.WorkstationName,
        HasPhoto:            row.HasPhoto,
        CertificationStatus: cs,
        CertificationExpired: cs === 'expired',
        OJTStatus:           ojtStatus(row.OJTProgress),
        MpiStatus:           mpiStatus(row.EmpMpiVersion, row.CurrentRevision, row.WsMpiID),
        MpiVersion:          row.EmpMpiVersion ?? null,
      }
    })

    res.json({ data: rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/staffing/records ────────────────────────────────
router.post('/records', async (req, res) => {
  const { employeeId, workstationId, buildingId, shiftId, date,
          certificationStatus, certificationExpired, ojtStatus: ojt, mpiStatus: mpi, mpiVersion } = req.body
  if (!employeeId || !workstationId || !date)
    return res.status(400).json({ error: 'Missing required fields' })
  try {
    const result = await pool.query(`
      INSERT INTO "StaffingRecord"
        ("EmployeeID","WorkstationID","BuildingID","ShiftID","Date",
         "CertificationStatus","CertificationExpired","OJTStatus","MpiStatus","MpiVersion")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING "ID" as id
    `, [
      employeeId, workstationId, buildingId || null, shiftId || null, date,
      certificationStatus || 'none', certificationExpired || false,
      ojt || 'none', mpi || 'none', mpiVersion || null
    ])
    res.json({ success: true, id: result.rows[0].id })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// ── DELETE /api/staffing/records/:id ─────────────────────────
router.delete('/records/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM "StaffingRecord" WHERE "ID"=$1 RETURNING "ID"`,
      [req.params.id]
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'Record not found' })
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
