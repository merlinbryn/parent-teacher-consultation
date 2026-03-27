const supabase = require('../supabaseClient')

const authMiddleware = async (req, res, next) => {
  try {
    // Get token from request header
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const token = authHeader.split(' ')[1]

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    // Attach user to request object
    req.user = user
    next()

  } catch (err) {
    console.log('Auth middleware error:', err)
    res.status(500).json({ error: 'Server error' })
  }
}

module.exports = authMiddleware