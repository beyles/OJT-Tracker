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
    console.log('DB user:', JSON.stringify(user))
    console.log('Password received:', password)

    if (!user.Status && !user.status)
      return res.status(401).json({ error: 'Account is inactive' })

    const storedPassword = user.PasswordHash || user.passwordhash || ''
    console.log('Stored password:', storedPassword)

    if (password !== storedPassword)
      return res.status(401).json({ error: 'Invalid credentials' })

    const token = jwt.sign(
      { id: user.ID || user.id, role: user.Role || user.role, name: user.Name || user.name },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    )

    res.json({
      token,
      user: {
        id: user.ID || user.id,
        name: user.Name || user.name,
        email: user.Email || user.email,
        role: user.Role || user.role
      }
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router