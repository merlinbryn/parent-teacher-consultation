const supabase = require('../supabaseClient')

const requireRole = (role) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (error || !profile) {
        return res.status(403).json({ error: 'Profile not found' })
      }

      if (profile.role !== role) {
        return res.status(403).json({ 
          error: `Access denied. Required role: ${role}` 
        })
      }

      req.userRole = profile.role
      next()

    } catch (err) {
      console.log('Role middleware error:', err)
      res.status(500).json({ error: 'Server error' })
    }
  }
}

module.exports = requireRole