const express = require('express')
const router = express.Router()
const pool = require('../db')
const multer = require('multer')
const XLSX = require('xlsx')
const upload = multer({ storage: multer.memoryStorage() })

// GET employees with pagination + search
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50
    const offset = parseInt(req.query.offset) || 0
    const search = req.query.search || ''
    const searchParam = `%${search}%`

    const result = await pool.query(
      `SELECT "ID" as id, "Number", "Name", "Department", "Shift", "StartDate", "Status"
       FROM "Employees"
       WHERE "Name" ILIKE $1 OR "Number" ILIKE $1 OR "Department" ILIKE $1
       ORDER BY "Name"
       LIMIT $2 OFFSET $3`,
      [searchParam, limit, offset]
    )

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM "Employees"
       WHERE "Name" ILIKE $1 OR "Number" ILIKE $1 OR "Department" ILIKE $1`,
      [searchParam]
    )

    res.json({
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      offset,
      limit
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET download Excel template
router.get('/template', (req, res) => {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([
    ['Number', 'Name', 'Department', 'Shift', 'StartDate', 'Status'],
    ['EMP-001', 'John Smith', 'Manufacturing', 'Morning', '2024-01-15', 'Active'],
    ['EMP-002', 'Jane Doe', 'Quality', 'Afternoon', '2024-03-01', 'Active'],
  ])
  ws['!cols'] = [
    { wch: 12 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 14 }, { wch: 10 }
  ]
  XLSX.utils.book_append_sheet(wb, ws, 'Employees')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  res.setHeader('Content-Disposition', 'attachment; filename="employees_template.xlsx"')
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.send(buf)
})

// POST create single employee
router.post('/', async (req, res) => {
  const { Number, Name, Department, Shift, StartDate, Status } = req.body
  try {
    await pool.query(
      'INSERT INTO "Employees" ("Number", "Name", "Department", "Shift", "StartDate", "Status") VALUES ($1, $2, $3, $4, $5, $6)',
      [Number, Name, Department || null, Shift || null, StartDate || null, Status ?? true]
    )
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error creating employee' })
  }
})

// PUT update single employee
router.put('/:id', async (req, res) => {
  const { Number, Name, Department, Shift, StartDate, Status } = req.body
  try {
    await pool.query(
      'UPDATE "Employees" SET "Number"=$1, "Name"=$2, "Department"=$3, "Shift"=$4, "StartDate"=$5, "Status"=$6 WHERE "ID"=$7',
      [Number, Name, Department || null, Shift || null, StartDate || null, Status, req.params.id]
    )
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error updating employee' })
  }
})

// POST upload Excel — bulk sync
router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' })

  try {
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(ws)

    if (rows.length === 0) return res.status(400).json({ error: 'File is empty' })

    let inserted = 0
    let updated = 0
    let deactivated = 0

    const uploadedNumbers = rows
      .map(r => String(r.Number || r.number || '').trim())
      .filter(Boolean)

    for (const row of rows) {
      const number = String(row.Number || row.number || '').trim()
      const name = String(row.Name || row.name || '').trim()
      const department = String(row.Department || row.department || '').trim() || null
      const shift = String(row.Shift || row.shift || '').trim() || null
      const startDate = row.StartDate || row.startdate || null
      const statusRaw = String(row.Status || row.status || 'Active').trim().toLowerCase()
      const status = statusRaw === 'active' || statusRaw === 'true' || statusRaw === '1'

      if (!number || !name) continue

      const existing = await pool.query(
        'SELECT "ID" FROM "Employees" WHERE "Number" = $1',
        [number]
      )

      if (existing.rows.length > 0) {
        await pool.query(
          'UPDATE "Employees" SET "Name"=$1, "Department"=$2, "Shift"=$3, "StartDate"=$4, "Status"=$5 WHERE "Number"=$6',
          [name, department, shift, startDate, status, number]
        )
        updated++
      } else {
        await pool.query(
          'INSERT INTO "Employees" ("Number", "Name", "Department", "Shift", "StartDate", "Status") VALUES ($1, $2, $3, $4, $5, $6)',
          [number, name, department, shift, startDate, status]
        )
        inserted++
      }
    }

    if (uploadedNumbers.length > 0) {
      const placeholders = uploadedNumbers.map((_, i) => `$${i + 1}`).join(', ')
      const deactivateResult = await pool.query(
        `UPDATE "Employees" SET "Status" = false WHERE "Number" NOT IN (${placeholders}) AND "Status" = true`,
        uploadedNumbers
      )
      deactivated = deactivateResult.rowCount
    }

    res.json({
      success: true,
      summary: { inserted, updated, deactivated, total: rows.length }
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error processing file' })
  }
})

module.exports = router
