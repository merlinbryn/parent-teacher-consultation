const express = require('express')
const router = express.Router()
const { createClient } = require('@supabase/supabase-js')
const authMiddleware = require('../middlewares/authMiddleware')
const requireRole = require('../middlewares/roleMiddleware')

require('dotenv').config()

// All teacher routes are protected
router.use(authMiddleware)
router.use(requireRole('teacher'))

// Helper to create supabase client with user token
function getUserSupabase(token) {
  const client = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  )
  return client
}

// Get teacher meetings
router.get('/meetings', async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1]
    const supabase = getUserSupabase(token)

    const { data, error } = await supabase
      .from('meetings')
      .select(`
        *,
        children(name, grade, section, parent:parent_id(name))
      `)
      .eq('teacher_id', req.user.id)

    if (error) return res.status(400).json({ error: error.message })
    res.status(200).json(data)

  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Approve meeting
router.patch('/meetings/:id/approve', async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1]
    const supabase = getUserSupabase(token)

    const { error } = await supabase
      .from('meetings')
      .update({ status: 'approved' })
      .eq('id', req.params.id)
      .eq('teacher_id', req.user.id)

    if (error) return res.status(400).json({ error: error.message })
    res.status(200).json({ message: 'Meeting approved' })

  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Reject meeting
router.patch('/meetings/:id/reject', async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1]
    const supabase = getUserSupabase(token)

    const { error } = await supabase
      .from('meetings')
      .update({ status: 'rejected' })
      .eq('id', req.params.id)
      .eq('teacher_id', req.user.id)

    if (error) return res.status(400).json({ error: error.message })
    res.status(200).json({ message: 'Meeting rejected' })

  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Add notes
router.patch('/meetings/:id/notes', async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1]
    const supabase = getUserSupabase(token)

    const { teacher_notes } = req.body

    const { error } = await supabase
      .from('meetings')
      .update({ teacher_notes })
      .eq('id', req.params.id)
      .eq('teacher_id', req.user.id)

    if (error) return res.status(400).json({ error: error.message })
    res.status(200).json({ message: 'Notes saved' })

  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router