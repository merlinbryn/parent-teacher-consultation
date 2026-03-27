const supabaseUrl = "https://rdbcetsbodhuscmaldaw.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkYmNldHNib2RodXNjbWFsZGF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzODQ0MjMsImV4cCI6MjA4ODk2MDQyM30.SSzqCvj1ZnyhW74vP01UNvXM0nHxXOOvvPZcTDdHtYU"
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey)

// =====================
// BASE URL — all API calls go through our server
// =====================
const BASE_URL = 'http://localhost:3000/api'

// Helper to get token from localStorage
function getToken() {
  return localStorage.getItem('token')
}

// Helper function for API calls
async function apiCall(endpoint, method = 'GET', body = null) {
  const headers = {
    'Content-Type': 'application/json'
  }

  const token = getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const options = {
    method,
    headers
  }

  if (body) {
    options.body = JSON.stringify(body)
  }

  const response = await fetch(BASE_URL + endpoint, options)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong')
  }

  return data
}

// =====================
// AUTH FUNCTIONS
// =====================

async function signup() {
  const email = document.getElementById("signupEmail").value
  const password = document.getElementById("signupPassword").value
  const role = document.getElementById("role").value
  const name = document.getElementById("signupName").value
  const subject = role === 'teacher' ? document.getElementById("subject").value : null
  const experience = role === 'teacher' ? document.getElementById("experience").value : null

  try {
    const data = await apiCall('/auth/signup', 'POST', {
      email, password, role, name, subject, experience
    })

    // Save token to localStorage
    localStorage.setItem('token', data.session.access_token)
    localStorage.setItem('role', data.role)

    alert('Signup successful!')

    if (data.role === 'parent') {
      window.location.href = 'parent-dashboard.html'
    } else {
      window.location.href = 'teacher-dashboard.html'
    }

  } catch (err) {
    alert('Signup failed: ' + err.message)
    console.log(err)
  }
}

async function login() {
  const email = document.getElementById("loginEmail").value
  const password = document.getElementById("loginPassword").value

  try {
    // ✅ Clear any old tokens first
    localStorage.removeItem('token')
    localStorage.removeItem('role')

    const data = await apiCall('/auth/login', 'POST', { email, password })

    // Save new token
    localStorage.setItem('token', data.session.access_token)
    localStorage.setItem('role', data.role)

    if (data.role === 'parent') {
      window.location.href = 'parent-dashboard.html'
    } else {
      window.location.href = 'teacher-dashboard.html'
    }

  } catch (err) {
    alert('Login failed: ' + err.message)
    console.log(err)
  }
}

async function logout() {
  try {
    await apiCall('/auth/logout', 'POST')
  } catch (err) {
    console.log(err)
  }
  // ✅ Clear Supabase Google session too
  await supabaseClient.auth.signOut()
  localStorage.removeItem('token')
  localStorage.removeItem('role')
  window.location.href = 'login.html'
}

async function loginWithGoogle() {
  const { data, error } = await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'http://localhost:5500/parent-dashboard.html'
    }
  })

  if (error) {
    console.log(error)
    alert("Google login failed: " + error.message)
  }
}

// =====================
// CHILDREN FUNCTIONS
// =====================

async function addChild() {
  const name = document.getElementById("childName").value
  const grade = document.getElementById("grade").value
  const section = document.getElementById("section").value

  try {
    await apiCall('/parent/children', 'POST', { name, grade, section })
    alert('Child added successfully!')
    loadChildren()
    loadChildrenDropdown()
  } catch (err) {
    alert('Failed to add child: ' + err.message)
    console.log(err)
  }
}

async function loadChildren() {
  const list = document.getElementById("childrenList")
  if (!list) return

  try {
    const data = await apiCall('/parent/children')
    list.innerHTML = ""

    data.forEach(child => {
      const li = document.createElement("li")
      li.textContent = child.name + " - Grade " + child.grade + " Section " + child.section
      list.appendChild(li)
    })

  } catch (err) {
    console.log(err)
  }
}

async function loadChildrenDropdown() {
  const dropdown = document.getElementById("childSelect")
  if (!dropdown) return

  try {
    const data = await apiCall('/parent/children')
    dropdown.innerHTML = ""

    data.forEach(child => {
      const option = document.createElement("option")
      option.value = child.id
      option.textContent = child.name
      dropdown.appendChild(option)
    })

  } catch (err) {
    console.log(err)
  }
}

// =====================
// TEACHER FUNCTIONS
// =====================

async function loadTeachers() {
  const dropdown = document.getElementById("teacherSelect")
  if (!dropdown) return

  try {
    const data = await apiCall('/parent/teachers')
    dropdown.innerHTML = ""

    data.forEach(teacher => {
      const option = document.createElement("option")
      option.value = teacher.id
      option.textContent = (teacher.profiles?.name || teacher.profiles?.email) + " - " + teacher.subject
      dropdown.appendChild(option)
    })

  } catch (err) {
    console.log(err)
  }
}

async function loadTeacherMeetings() {
  const container = document.getElementById("meetingsList")
  if (!container) return

  try {
    const data = await apiCall('/teacher/meetings')
    container.innerHTML = ""

    data.forEach(meeting => {
      const div = document.createElement("div")
      div.innerHTML = `
        <p><b>Child:</b> ${meeting.children?.name} (Grade ${meeting.children?.grade} - ${meeting.children?.section})</p>
        <p><b>Parent:</b> ${meeting.children?.parent?.name || "N/A"}</p>
        <p><b>Topic:</b> ${meeting.topic}</p>
        <p><b>Time:</b> ${meeting.meeting_time}</p>
        <p><b>Status:</b> ${meeting.status}</p>
        <p><b>Notes:</b> ${meeting.teacher_notes || "No notes yet"}</p>
        <button onclick="approveMeeting('${meeting.id}')">Approve</button>
        <button onclick="rejectMeeting('${meeting.id}')">Reject</button>
        <br><br>
        <textarea id="notes_${meeting.id}" placeholder="Add notes...">${meeting.teacher_notes || ""}</textarea>
        <button onclick="addNotes('${meeting.id}')">Save Notes</button>
        <hr>
      `
      container.appendChild(div)
    })

  } catch (err) {
    console.log(err)
  }
}

async function approveMeeting(meetingId) {
  try {
    await apiCall(`/teacher/meetings/${meetingId}/approve`, 'PATCH')
    alert('Meeting Approved')
    loadTeacherMeetings()
  } catch (err) {
    alert('Failed: ' + err.message)
  }
}

async function rejectMeeting(meetingId) {
  try {
    await apiCall(`/teacher/meetings/${meetingId}/reject`, 'PATCH')
    alert('Meeting Rejected')
    loadTeacherMeetings()
  } catch (err) {
    alert('Failed: ' + err.message)
  }
}

async function addNotes(meetingId) {
  const notes = document.getElementById("notes_" + meetingId).value

  try {
    await apiCall(`/teacher/meetings/${meetingId}/notes`, 'PATCH', { teacher_notes: notes })
    alert('Notes saved!')
    loadTeacherMeetings()
  } catch (err) {
    alert('Failed: ' + err.message)
  }
}

// =====================
// MEETING FUNCTIONS
// =====================

async function bookMeeting() {
  const childId = document.getElementById("childSelect").value
  const teacherId = document.getElementById("teacherSelect").value
  const meetingTime = document.getElementById("meetingTime").value
  const topic = document.getElementById("topic").value

  if (!childId || !teacherId || !meetingTime || !topic) {
    alert("Please fill in all fields")
    return
  }

  try {
    await apiCall('/parent/meetings', 'POST', {
      child_id: childId,
      teacher_id: teacherId,
      meeting_time: meetingTime,
      topic
    })
    alert('Meeting booked successfully!')
  } catch (err) {
    alert('Failed to book meeting: ' + err.message)
  }
}

async function loadParentMeetings() {
  const container = document.getElementById("meetingList")
  if (!container) return

  try {
    const data = await apiCall('/parent/meetings')
    container.innerHTML = ""

    data.forEach(meeting => {
      const div = document.createElement("div")
      div.innerHTML = `
        <p><b>Child:</b> ${meeting.children?.name}</p>
        <p><b>Teacher:</b> ${meeting.teachers?.profiles?.name || "N/A"} (${meeting.teachers?.subject || ""})</p>
        <p><b>Topic:</b> ${meeting.topic}</p>
        <p><b>Time:</b> ${meeting.meeting_time}</p>
        <p><b>Status:</b> ${meeting.status}</p>
        <p><b>Teacher Notes:</b> ${meeting.teacher_notes || "No notes yet"}</p>
        <hr>
      `
      container.appendChild(div)
    })

  } catch (err) {
    console.log(err)
  }
}