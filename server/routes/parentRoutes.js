const express = require('express')
const router = express.Router()
const { createClient } = require('@supabase/supabase-js')
const authMiddleware = require('../middlewares/authMiddleware')
const requireRole = require('../middlewares/roleMiddleware')

require('dotenv').config()

// All parent routes are protected
router.use(authMiddleware)
router.use(requireRole('parent'))

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

// Get children
router.get('/children', async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1]
    const supabase = getUserSupabase(token)

    const { data, error } = await supabase
      .from('children')
      .select('*')
      .eq('parent_id', req.user.id)

    if (error) return res.status(400).json({ error: error.message })
    res.status(200).json(data)

  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Add child
router.post('/children', async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1]
    const supabase = getUserSupabase(token)

    const { name, grade, section } = req.body

    const { data, error } = await supabase
      .from('children')
      .insert([{
        parent_id: req.user.id,
        name,
        grade,
        section
      }])
      .select()

    if (error) return res.status(400).json({ error: error.message })
    res.status(200).json({ message: 'Child added successfully', data })

  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Get all teachers
router.get('/teachers', async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1]
    const supabase = getUserSupabase(token)

    const { data, error } = await supabase
      .from('teachers')
      .select('id, subject, experience, profiles(name, email)')

    if (error) return res.status(400).json({ error: error.message })
    res.status(200).json(data)

  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Book meeting
router.post('/meetings', async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1]
    const supabase = getUserSupabase(token)

    const { child_id, teacher_id, meeting_time, topic } = req.body

    const { data, error } = await supabase
      .from('meetings')
      .insert([{
        child_id,
        teacher_id,
        meeting_time,
        topic,
        status: 'pending'
      }])
      .select()

    if (error) return res.status(400).json({ error: error.message })
    res.status(200).json({ message: 'Meeting booked successfully', data })

  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Get parent meetings
router.get('/meetings', async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1]
    const supabase = getUserSupabase(token)

    const { data: children } = await supabase
      .from('children')
      .select('id')
      .eq('parent_id', req.user.id)

    const childIds = children.map(c => c.id)

    const { data, error } = await supabase
      .from('meetings')
      .select(`
        *,
        children(name, grade, section),
        teachers:teacher_id(subject, profiles(name))
      `)
      .in('child_id', childIds)

    if (error) return res.status(400).json({ error: error.message })
    res.status(200).json(data)

  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router