const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const { createProxyMiddleware } = require('http-proxy-middleware')

dotenv.config()

const app = express()

// =====================
// MIDDLEWARES
// =====================

// CORS — allows frontend to talk to backend
// CORS — allows both localhost and 127.0.0.1
app.use(cors({
  origin: ['http://localhost:5500', 'http://127.0.0.1:5500'],
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

// Parse JSON request bodies
app.use(express.json())

// Logger middleware — logs every request
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`)
  next()
})

// =====================
// PROXY MIDDLEWARE
// =====================

// Proxy — forwards /supabase requests to Supabase
app.use('/supabase', createProxyMiddleware({
  target: process.env.SUPABASE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/supabase': ''
  },
  on: {
    proxyReq: (proxyReq, req) => {
      proxyReq.setHeader('apikey', process.env.SUPABASE_ANON_KEY)
      console.log(`[PROXY] Forwarding request to Supabase: ${req.url}`)
    }
  }
}))

// =====================
// ROUTES
// =====================

const authRoutes = require('./routes/authRoutes')
const parentRoutes = require('./routes/parentRoutes')
const teacherRoutes = require('./routes/teacherRoutes')

app.use('/api/auth', authRoutes)
app.use('/api/parent', parentRoutes)
app.use('/api/teacher', teacherRoutes)

// Health check route
app.get('/', (req, res) => {
  res.json({ message: 'Parent Teacher Platform Server is running!' })
})

// =====================
// START SERVER
// =====================

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})