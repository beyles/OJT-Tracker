const express = require('express')
const router = express.Router()
const pool = require('../db')
const multer = require('multer')
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
})

// ── COMPETENCES ─────────────────────────────────────────────
router.get('/competences', async (req, res) => {
  try {
    const result = await pool.query('SELECT "ID" as id, "Name", "Order", "Status" FROM "Competences" ORDER BY "Order"')
    res.json({ data: result.rows, total: result.rows.length })
  } catch (err) { res.status(500).json({ error: 'Server error' }) }
})

router.post('/competences', async (req, res) => {
  const { Name, Order, Status } = req.body
  try {
    await pool.query('INSERT INTO "Competences" ("Name", "Order", "Status") VALUES ($1, $2, $3)', [Name, Order || 0, Status ?? true])
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: 'Error creating competence' }) }
})

router.put('/competences/:id', async (req, res) => {
  const { Name, Order, Status } = req.body
  try {
    await pool.query('UPDATE "Competences" SET "Name"=$1, "Order"=$2, "Status"=$3 WHERE "ID"=$4', [Name, Order, Status, req.params.id])
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: 'Error updating competence' }) }
})

// ── PRODUCTION LINES ─────────────────────────────────────────
router.get('/lines/all', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT pl."ID" as id, pl."ProductionLineName" as "Name", pl."Status", pl."Building",
             b."Name" as "BuildingName"
      FROM "ProductionLine" pl
      LEFT JOIN "Buildings" b ON b."ID" = pl."Building"
      ORDER BY pl."ProductionLineName"`)
    res.json({ data: result.rows, total: result.rows.length })
  } catch (err) { res.status(500).json({ error: 'Server error' }) }
})

router.get('/lines', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50
    const offset = parseInt(req.query.offset) || 0
    const search = `%${req.query.search || ''}%`
    const result = await pool.query(`
      SELECT pl."ID" as id, pl."ProductionLineName" as "Name", pl."Status", pl."Building",
             b."Name" as "BuildingName"
      FROM "ProductionLine" pl
      LEFT JOIN "Buildings" b ON b."ID" = pl."Building"
      WHERE pl."ProductionLineName" ILIKE $1 OR b."Name" ILIKE $1
      ORDER BY pl."ProductionLineName"
      LIMIT $2 OFFSET $3`, [search, limit, offset])
    const count = await pool.query(`
      SELECT COUNT(*) FROM "ProductionLine" pl
      LEFT JOIN "Buildings" b ON b."ID" = pl."Building"
      WHERE pl."ProductionLineName" ILIKE $1 OR b."Name" ILIKE $1`, [search])
    res.json({ data: result.rows, total: parseInt(count.rows[0].count) })
  } catch (err) { res.status(500).json({ error: 'Server error' }) }
})

router.post('/lines', async (req, res) => {
  const { Name, Building, Status } = req.body
  try {
    await pool.query('INSERT INTO "ProductionLine" ("ProductionLineName", "Building", "Status") VALUES ($1, $2, $3)', [Name, Building, Status ?? true])
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: 'Error creating line' }) }
})

router.put('/lines/:id', async (req, res) => {
  const { Name, Building, Status } = req.body
  try {
    await pool.query('UPDATE "ProductionLine" SET "ProductionLineName"=$1, "Building"=$2, "Status"=$3 WHERE "ID"=$4', [Name, Building, Status, req.params.id])
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: 'Error updating line' }) }
})

// ── WORKSTATIONS ─────────────────────────────────────────────
router.get('/workstations/all', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT w."ID" as id, w."Name", w."Status", w."TrainingHours", w."FlightHours",
             w."WCI_Level", w."Competence", w."MpiID",
             c."Name" as "CompetenceName", m."Code" as "MpiCode", m."Name" as "MpiName"
      FROM "Workstation" w
      LEFT JOIN "Competences" c ON c."ID" = w."Competence"
      LEFT JOIN "Mpi" m ON m."ID" = w."MpiID"
      ORDER BY w."Name"`)
    res.json({ data: result.rows, total: result.rows.length })
  } catch (err) { res.status(500).json({ error: 'Server error' }) }
})

router.get('/workstations', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50
    const offset = parseInt(req.query.offset) || 0
    const search = `%${req.query.search || ''}%`
    const result = await pool.query(`
      SELECT w."ID" as id, w."Name", w."Status", w."TrainingHours", w."FlightHours",
             w."WCI_Level", w."Competence", w."MpiID",
             c."Name" as "CompetenceName", m."Code" as "MpiCode", m."Name" as "MpiName"
      FROM "Workstation" w
      LEFT JOIN "Competences" c ON c."ID" = w."Competence"
      LEFT JOIN "Mpi" m ON m."ID" = w."MpiID"
      WHERE w."Name" ILIKE $1
      ORDER BY w."Name"
      LIMIT $2 OFFSET $3`, [search, limit, offset])
    const count = await pool.query(`SELECT COUNT(*) FROM "Workstation" WHERE "Name" ILIKE $1`, [search])
    res.json({ data: result.rows, total: parseInt(count.rows[0].count) })
  } catch (err) { res.status(500).json({ error: 'Server error' }) }
})

router.post('/workstations', async (req, res) => {
  const { Name, Status, TrainingHours, FlightHours, WCI_Level, Competence, MpiID } = req.body
  try {
    await pool.query(
      'INSERT INTO "Workstation" ("Name", "Status", "TrainingHours", "FlightHours", "WCI_Level", "Competence", "MpiID") VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [Name, Status ?? true, TrainingHours || 0, FlightHours || 0, WCI_Level || 1, Competence || null, MpiID || null]
    )
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: 'Error creating workstation' }) }
})

router.put('/workstations/:id', async (req, res) => {
  const { Name, Status, TrainingHours, FlightHours, WCI_Level, Competence, MpiID } = req.body
  try {
    await pool.query(
      'UPDATE "Workstation" SET "Name"=$1, "Status"=$2, "TrainingHours"=$3, "FlightHours"=$4, "WCI_Level"=$5, "Competence"=$6, "MpiID"=$7 WHERE "ID"=$8',
      [Name, Status, TrainingHours || 0, FlightHours || 0, WCI_Level || 1, Competence || null, MpiID || null, req.params.id]
    )
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: 'Error updating workstation' }) }
})

// ── MPIs ─────────────────────────────────────────────────────
router.get('/mpis/all', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT "ID" as id, "Code", "Name", "Revision", "URL", "Status",
             "VersioningType", "FirstVersion", "RequiresRecertification"
      FROM "Mpi" ORDER BY "Code"`)
    res.json({ data: result.rows, total: result.rows.length })
  } catch (err) { res.status(500).json({ error: 'Server error' }) }
})

router.get('/mpis', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50
    const offset = parseInt(req.query.offset) || 0
    const search = `%${req.query.search || ''}%`
    const result = await pool.query(`
      SELECT "ID" as id, "Code", "Name", "Revision", "URL", "Status",
             "VersioningType", "FirstVersion", "RequiresRecertification"
      FROM "Mpi"
      WHERE "Code" ILIKE $1 OR "Name" ILIKE $1
      ORDER BY "Code"
      LIMIT $2 OFFSET $3`, [search, limit, offset])
    const count = await pool.query(`SELECT COUNT(*) FROM "Mpi" WHERE "Code" ILIKE $1 OR "Name" ILIKE $1`, [search])
    res.json({ data: result.rows, total: parseInt(count.rows[0].count) })
  } catch (err) { res.status(500).json({ error: 'Server error' }) }
})

router.post('/mpis', async (req, res) => {
  const { Code, Name, URL, Status, VersioningType, FirstVersion } = req.body
  try {
    await pool.query(
      'INSERT INTO "Mpi" ("Code", "Name", "Revision", "URL", "Status", "VersioningType", "FirstVersion") VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [Code, Name, FirstVersion || '1', URL || null, Status ?? true, VersioningType || 'Numeric', FirstVersion || '1']
    )
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: 'Error creating MPI' }) }
})

router.put('/mpis/:id', async (req, res) => {
  const { Code, Name, URL, Status, VersioningType, FirstVersion } = req.body
  try {
    await pool.query(
      'UPDATE "Mpi" SET "Code"=$1, "Name"=$2, "URL"=$3, "Status"=$4, "VersioningType"=$5, "FirstVersion"=$6 WHERE "ID"=$7',
      [Code, Name, URL || null, Status, VersioningType, FirstVersion, req.params.id]
    )
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: 'Error updating MPI' }) }
})

// Add new revision
router.post('/mpis/:id/revision', async (req, res) => {
  const { requiresRecertification } = req.body
  try {
    const mpi = await pool.query('SELECT * FROM "Mpi" WHERE "ID"=$1', [req.params.id])
    if (mpi.rows.length === 0) return res.status(404).json({ error: 'MPI not found' })
    const current = mpi.rows[0]
    const nextRevision = getNextRevision(current.Revision, current.VersioningType)
    await pool.query(
      'UPDATE "Mpi" SET "Revision"=$1, "RequiresRecertification"=$2 WHERE "ID"=$3',
      [nextRevision, requiresRecertification ?? false, req.params.id]
    )
    res.json({ success: true, revision: nextRevision })
  } catch (err) { res.status(500).json({ error: 'Error adding revision' }) }
})

function getNextRevision(current, type) {
  if (type === 'Numeric') {
    const num = parseInt(current) || 0
    return String(num + 1)
  } else {
    return nextAlpha(current)
  }
}

function nextAlpha(str) {
  str = str.toUpperCase()
  let carry = true
  let result = str.split('')
  for (let i = result.length - 1; i >= 0 && carry; i--) {
    if (result[i] === 'Z') {
      result[i] = 'A'
    } else {
      result[i] = String.fromCharCode(result[i].charCodeAt(0) + 1)
      carry = false
    }
  }
  if (carry) result.unshift('A')
  return result.join('')
}

// POST /upload or PUT — one file stored per MPI (overwrite on re-upload)
router.post('/mpis/:id/file', upload.single('file'), handleMpiFileUpload)
router.put('/mpis/:id/file',  upload.single('file'), handleMpiFileUpload)

async function handleMpiFileUpload(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
  if (req.file.mimetype !== 'application/pdf')
    return res.status(400).json({ error: 'Only PDF files allowed' })
  try {
    const mpi = await pool.query('SELECT "ID" FROM "Mpi" WHERE "ID"=$1', [req.params.id])
    if (mpi.rows.length === 0) return res.status(404).json({ error: 'MPI not found' })

    const base64 = req.file.buffer.toString('base64')
    const existing = await pool.query('SELECT "ID" FROM "MpiFile" WHERE "MpiID"=$1', [req.params.id])

    if (existing.rows.length > 0) {
      await pool.query(
        'UPDATE "MpiFile" SET "FileName"=$1, "FileData"=$2, "UploadedAt"=NOW() WHERE "MpiID"=$3',
        [req.file.originalname, base64, req.params.id]
      )
    } else {
      await pool.query(
        'INSERT INTO "MpiFile" ("MpiID", "FileName", "FileData") VALUES ($1, $2, $3)',
        [req.params.id, req.file.originalname, base64]
      )
    }
    res.json({ success: true, fileName: req.file.originalname })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
}

// GET file for MPI
router.get('/mpis/:id/file', async (req, res) => {
  try {
    const file = await pool.query(
      'SELECT "FileName", "FileData" FROM "MpiFile" WHERE "MpiID"=$1',
      [req.params.id]
    )
    if (file.rows.length === 0) return res.status(404).json({ error: 'No file found' })
    const buf = Buffer.from(file.rows[0].FileData, 'base64')
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="${file.rows[0].FileName}"`)
    res.send(buf)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// ── LINE BUILDER ─────────────────────────────────────────────
router.get('/linebuilder/:lineId', async (req, res) => {
  try {
    const assigned = await pool.query(`
      SELECT plw."ID" as id, plw."Workstation" as workstationid, plw."Order",
             w."Name" as "WorkstationName", w."WCI_Level"
      FROM "ProductionLineWorkstation" plw
      JOIN "Workstation" w ON w."ID" = plw."Workstation"
      WHERE plw."ProductionLine" = $1
      ORDER BY plw."Order"`, [req.params.lineId])
    const all = await pool.query(`
      SELECT "ID" as id, "Name", "WCI_Level"
      FROM "Workstation" WHERE "Status" = true ORDER BY "Name"`)
    res.json({ assigned: assigned.rows, all: all.rows })
  } catch (err) { res.status(500).json({ error: 'Server error' }) }
})

router.post('/linebuilder/:lineId', async (req, res) => {
  const { workstations } = req.body
  try {
    await pool.query('DELETE FROM "ProductionLineWorkstation" WHERE "ProductionLine"=$1', [req.params.lineId])
    for (const ws of workstations) {
      await pool.query(
        'INSERT INTO "ProductionLineWorkstation" ("ProductionLine", "Workstation", "Order") VALUES ($1, $2, $3)',
        [req.params.lineId, ws.workstationId, ws.order]
      )
    }
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: 'Error saving line' }) }
})

module.exports = router