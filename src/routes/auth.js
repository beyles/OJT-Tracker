const express = require('express')
const router = express.Router()
const pool = require('../db')
const jwt = require('jsonwebtoken')

router.post('/login', async (req, res) => {
  const { username, password } = req.body

  if (!username || !password)
    return res.status(400).json({ error: 'Username and password are required' })

  try {
    const result = await pool.query(
      'SELECT * FROM "Users" WHERE "Email" = $1',
      [username]
    )

    if (result.rows.length === 0)
      return res.status(401).json({ error: 'Invalid credentials' })

    const user = result.rows[0]

    if (!user.Status && !user.status)
      return res.status(401).json({ error: 'Account is inactive' })

    const storedPassword = user.PasswordHash || user.passwordhash || ''

    if (password !== storedPassword)
      return res.status(401).json({ error: 'Invalid credentials' })

    const userId = user.ID || user.id
    const employeeId = user.EmployeeID || user.employeeid || null
    const sitesRes = await pool.query(
      `SELECT "SiteID" FROM "UserSites" WHERE "UserID" = $1 ORDER BY "SiteID"`,
      [userId]
    )
    const siteIds = sitesRes.rows.map(r => r.SiteID)

    const token = jwt.sign(
      { id: userId, role: user.Role || user.role, name: user.Name || user.name, siteIds, employeeId },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    )

    res.json({
      token,
      user: {
        id: userId,
        name: user.Name || user.name,
        email: user.Email || user.email,
        role: user.Role || user.role,
        siteIds,
        employeeId,
      }
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router