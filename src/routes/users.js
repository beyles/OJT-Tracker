const express = require('express')
const router = express.Router()
const pool = require('../db')

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
    await pool.query(
      'INSERT INTO "Users" ("Name", "Email", "EmployeeID", "Role", "PasswordHash", "Status") VALUES ($1, $2, $3, $4, $5, $6)',
      [Name, Email, EmployeeID, Role, Password, Status ?? true]
    )
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error creating user' })
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

module.exports = router