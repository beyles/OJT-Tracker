const express = require('express')
const router  = express.Router()
const pool    = require('../db')
const jwt     = require('jsonwebtoken')
const multer  = require('multer')

const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') cb(null, true)
    else cb(new Error('Only JPEG and PNG images are allowed'))
  }
})

function userFromReq(req) {
  try {
    const raw = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
    return jwt.verify(raw, process.env.JWT_SECRET)
  } catch { return null }
}

// GET all users
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT "ID" as id, "Name", "Email", "EmployeeID", "Role", "Status" FROM "Users" ORDER BY "Name"'
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST create user
router.post('/', async (req, res) => {
  const { Name, Email, EmployeeID, Role, Password, Status } = req.body
  try {
    const result = await pool.query(
      'INSERT INTO "Users" ("Name", "Email", "EmployeeID", "Role", "PasswordHash", "Status") VALUES ($1, $2, $3, $4, $5, $6) RETURNING "ID" as id',
      [Name, Email, EmployeeID, Role, Password, Status ?? true]
    )
    res.json({ success: true, id: result.rows[0].id })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error creating user' })
  }
})

// POST /api/users/change-password
router.post('/change-password', async (req, res) => {
  const { currentPassword, newPassword } = req.body
  if (!currentPassword || !newPassword)
    return res.status(400).json({ error: 'Missing required fields' })
  try {
    const decoded = userFromReq(req)
    if (!decoded) return res.status(401).json({ error: 'Not authenticated' })

    const r = await pool.query(`SELECT "PasswordHash" FROM "Users" WHERE "ID" = $1`, [decoded.id])
    if (r.rowCount === 0) return res.status(404).json({ error: 'User not found' })

    const stored = (r.rows[0].PasswordHash || '').trim()
    const given  = currentPassword.trim()
    console.log(`[change-password] userID=${decoded.id} given="${given}" stored="${stored}" match=${given === stored}`)

    if (given !== stored)
      return res.status(401).json({ error: 'Current password is incorrect' })

    await pool.query(`UPDATE "Users" SET "PasswordHash" = $1 WHERE "ID" = $2`, [newPassword, decoded.id])
    res.json({ success: true })
  } catch (err) {
    console.error('[change-password error]', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/users/photo — serve the logged-in user's photo
// Accepts Authorization header OR ?token= query param (for <img src> use)
// Checks UserPhoto first, then falls back to EmployeePhoto if employeeId is linked
router.get('/photo', async (req, res) => {
  let decoded = userFromReq(req)
  if (!decoded && req.query.token) {
    try { decoded = jwt.verify(req.query.token, process.env.JWT_SECRET) } catch {}
  }
  if (!decoded) return res.status(401).json({ error: 'Not authenticated' })

  try {
    // 1. Check UserPhoto table
    const up = await pool.query(
      `SELECT "PhotoData", "MimeType" FROM "UserPhoto" WHERE "UserID" = $1`,
      [decoded.id]
    )
    if (up.rowCount > 0) {
      res.setHeader('Content-Type', up.rows[0].MimeType)
      return res.send(Buffer.from(up.rows[0].PhotoData, 'base64'))
    }

    // 2. Fallback to EmployeePhoto via linked EmployeeID
    const empId = decoded.employeeId
    if (empId) {
      const ep = await pool.query(
        `SELECT "PhotoData", "MimeType" FROM "EmployeePhoto" WHERE "EmployeeID" = $1`,
        [empId]
      )
      if (ep.rowCount > 0) {
        res.setHeader('Content-Type', ep.rows[0].MimeType)
        return res.send(Buffer.from(ep.rows[0].PhotoData, 'base64'))
      }
    }

    res.status(404).json({ error: 'No photo found' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/users/photo — upload/replace the logged-in user's photo
router.post('/photo', photoUpload.single('photo'), async (req, res) => {
  const decoded = userFromReq(req)
  if (!decoded) return res.status(401).json({ error: 'Not authenticated' })
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' })

  const base64   = req.file.buffer.toString('base64')
  const mimeType = req.file.mimetype
  try {
    await pool.query(
      `INSERT INTO "UserPhoto" ("UserID", "PhotoData", "MimeType")
       VALUES ($1, $2, $3)
       ON CONFLICT ("UserID") DO UPDATE
         SET "PhotoData" = EXCLUDED."PhotoData",
             "MimeType"  = EXCLUDED."MimeType",
             "UploadedAt" = NOW()`,
      [decoded.id, base64, mimeType]
    )
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// PUT update user
router.put('/:id', async (req, res) => {
  const { Name, Email, EmployeeID, Role, Password, Status } = req.body
  const { id } = req.params
  try {
    if (Password && Password.trim() !== '') {
      await pool.query(
        'UPDATE "Users" SET "Name"=$1, "Email"=$2, "EmployeeID"=$3, "Role"=$4, "Status"=$5, "PasswordHash"=$6 WHERE "ID"=$7',
        [Name, Email, EmployeeID, Role, Status, Password, id]
      )
    } else {
      await pool.query(
        'UPDATE "Users" SET "Name"=$1, "Email"=$2, "EmployeeID"=$3, "Role"=$4, "Status"=$5 WHERE "ID"=$6',
        [Name, Email, EmployeeID, Role, Status, id]
      )
    }
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error updating user' })
  }
})

// GET /api/users/:id/sites
router.get('/:id/sites', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT us."SiteID", s."Name" FROM "UserSites" us JOIN "Sites" s ON s."ID" = us."SiteID" WHERE us."UserID" = $1 ORDER BY s."Name"`,
      [req.params.id]
    )
    res.json(r.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// PUT /api/users/:id/sites — replace all site assignments
router.put('/:id/sites', async (req, res) => {
  const { siteIds } = req.body
  const userId = req.params.id
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`DELETE FROM "UserSites" WHERE "UserID" = $1`, [userId])
    for (const siteId of (siteIds || [])) {
      await client.query(`INSERT INTO "UserSites" ("UserID","SiteID") VALUES ($1,$2) ON CONFLICT DO NOTHING`, [userId, siteId])
    }
    await client.query('COMMIT')
    res.json({ success: true })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ error: 'Error updating site assignments' })
  } finally { client.release() }
})

module.exports = router
