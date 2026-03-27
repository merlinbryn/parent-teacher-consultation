const express = require('express')
const router = express.Router()
const supabase = require('../supabaseClient')

// Signup route
router.post('/signup', async (req, res) => {
  try {
    const { email, password, role, name, subject, experience } = req.body

    // Step 1: Create auth user
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    })

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    // Step 2: Sign in to get active session
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (signInError) {
      return res.status(400).json({ error: signInError.message })
    }

    // Step 3: Insert profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: signInData.user.id,
        email,
        role,
        name
      }])

    if (profileError) {
      return res.status(400).json({ error: profileError.message })
    }

    // Step 4: If teacher insert into teachers table
    if (role === 'teacher') {
      const { error: teacherError } = await supabase
        .from('teachers')
        .insert([{
          id: signInData.user.id,
          subject,
          experience
        }])

      if (teacherError) {
        return res.status(400).json({ error: teacherError.message })
      }
    }

    res.status(200).json({
      message: 'Signup successful',
      user: signInData.user,
      session: signInData.session,
      role
    })

  } catch (err) {
    console.log('Signup error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    // Get role from profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, name')
      .eq('id', data.user.id)
      .single()

    if (profileError) {
      return res.status(400).json({ error: profileError.message })
    }

    res.status(200).json({
      message: 'Login successful',
      user: data.user,
      session: data.session,
      role: profile.role,
      name: profile.name
    })

  } catch (err) {
    console.log('Login error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Logout route
router.post('/logout', async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    res.status(200).json({ message: 'Logout successful' })

  } catch (err) {
    console.log('Logout error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router