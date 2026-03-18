const supabaseUrl = "https://rdbcetsbodhuscmaldaw.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkYmNldHNib2RodXNjbWFsZGF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzODQ0MjMsImV4cCI6MjA4ODk2MDQyM30.SSzqCvj1ZnyhW74vP01UNvXM0nHxXOOvvPZcTDdHtYU"

const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey)

// =====================
// AUTH FUNCTIONS
// =====================

async function signup() {
  const email = document.getElementById("signupEmail").value
  const password = document.getElementById("signupPassword").value
  const role = document.getElementById("role").value
  const name = document.getElementById("signupName").value

  // Step 1: Sign up
  const { data, error } = await supabaseClient.auth.signUp({
    email: email,
    password: password
  })

  if (error) {
    alert(error.message)
    return
  }

  // Step 2: Immediately sign in to get active session
  const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: password
  })

  if (signInError) {
    alert("Signup ok but login failed: " + signInError.message)
    return
  }

  console.log("User ID:", signInData.user.id)
  console.log("Session:", signInData.session)

  // Step 3: Now insert profile with active session
  const { error: profileError } = await supabaseClient
    .from("profiles")
    .insert([{
      id: signInData.user.id,
      email: email,
      role: role,
      name: name
    }])

  if (profileError) {
    console.log("PROFILE ERROR:", profileError)
    alert(profileError.message)
    return
  }

  // Step 4: If teacher, insert into teachers table too
  if (role === "teacher") {
    const subject = document.getElementById("subject").value
    const experience = document.getElementById("experience").value

    const { error: teacherError } = await supabaseClient
      .from("teachers")
      .insert([{
        id: signInData.user.id,
        subject: subject,
        experience: experience
      }])

    if (teacherError) {
      console.log("TEACHER ERROR:", teacherError)
      alert(teacherError.message)
      return
    }
  }

  alert("Signup successful!")

  // Step 5: Redirect based on role
  if (role === "parent") {
    window.location.href = "parent-dashboard.html"
  } else {
    window.location.href = "teacher-dashboard.html"
  }
  console.log("Email:", email)
  console.log("Password:", password)
  console.log("Role:", role)
  console.log("Name:", name)
}

async function login() {
  const email = document.getElementById("loginEmail").value
  const password = document.getElementById("loginPassword").value

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: password
  })

  if (error) {
    alert("Login failed: " + error.message)
    console.log(error)
    return
  }

  const user = data.user

  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profileError) {
    console.log("Profile fetch error:", profileError)
    alert("Could not fetch user role")
    return
  }

  if (profile.role === "parent") {
    window.location.href = "parent-dashboard.html"
  } else if (profile.role === "teacher") {
    window.location.href = "teacher-dashboard.html"
  }
}

async function logout() {
  await supabaseClient.auth.signOut()
  window.location.href = "login.html"
}

// =====================
// CHILDREN FUNCTIONS
// =====================

async function addChild() {
  const name = document.getElementById("childName").value
  const grade = document.getElementById("grade").value
  const section = document.getElementById("section").value

  const { data: userData } = await supabaseClient.auth.getUser()
  const userId = userData.user.id

  const { error } = await supabaseClient
    .from("children")
    .insert([{
      parent_id: userId,
      name: name,
      grade: grade,
      section: section
    }])

  if (error) {
    console.log(error)
    alert("Failed to add child: " + error.message)
    return
  }

  alert("Child added successfully!")
  loadChildren()
  loadChildrenDropdown()
}

async function loadChildren() {
  const list = document.getElementById("childrenList")
  if (!list) return

  const { data, error } = await supabaseClient
    .from("children")
    .select("*")

  if (error) {
    console.log(error)
    return
  }

  list.innerHTML = ""

  data.forEach(child => {
    const li = document.createElement("li")
    li.textContent = child.name + " - Grade " + child.grade + " Section " + child.section
    list.appendChild(li)
  })
}

async function loadChildrenDropdown() {
  const dropdown = document.getElementById("childSelect")
  if (!dropdown) return

  const { data, error } = await supabaseClient
    .from("children")
    .select("*")

  if (error) {
    console.log(error)
    return
  }

  dropdown.innerHTML = ""

  data.forEach(child => {
    const option = document.createElement("option")
    option.value = child.id
    option.textContent = child.name
    dropdown.appendChild(option)
  })
}

// =====================
// TEACHER FUNCTIONS
// =====================

async function loadTeachers() {
  const dropdown = document.getElementById("teacherSelect")
  if (!dropdown) return

  // ✅ FIX: join profiles with teachers table to get name + subject
  const { data, error } = await supabaseClient
    .from("teachers")
    .select("id, subject, profiles(id, name, email)")

  if (error) {
    console.log("Teachers fetch error:", error)
    return
  }

  console.log("Teachers:", data)

  dropdown.innerHTML = ""

  data.forEach(teacher => {
    const option = document.createElement("option")
    option.value = teacher.id
    // ✅ FIX: show teacher name and subject instead of just email
    option.textContent = (teacher.profiles?.name || teacher.profiles?.email) + " - " + teacher.subject
    dropdown.appendChild(option)
  })
}

async function loadTeacherMeetings() {
  const container = document.getElementById("meetingsList")
  if (!container) return

  const user = await supabaseClient.auth.getUser()
  const teacherId = user.data.user.id

  // ✅ FIX: join with children and profiles to get child name and parent name
  const { data, error } = await supabaseClient
  .from("meetings")
  .select(`
    *,
    children!meetings_child_id_fkey(name, grade, section, parent:parent_id(name))
  `)
  .eq("teacher_id", teacherId)
  console.log("Meetings data:", JSON.stringify(data, null, 2))

  if (error) {
    console.log(error)
    return
  }

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
}

async function approveMeeting(meetingId) {
  const { error } = await supabaseClient
    .from("meetings")
    .update({ status: "approved" })
    .eq("id", meetingId)

  if (error) {
    console.log(error)
    return
  }

  alert("Meeting Approved")
  loadTeacherMeetings()
}

async function rejectMeeting(meetingId) {
  const { error } = await supabaseClient
    .from("meetings")
    .update({ status: "rejected" })
    .eq("id", meetingId)

  if (error) {
    console.log(error)
    return
  }

  alert("Meeting Rejected")
  loadTeacherMeetings()
}

// ✅ NEW: teacher can add notes
async function addNotes(meetingId) {
  const notes = document.getElementById("notes_" + meetingId).value

  const { error } = await supabaseClient
    .from("meetings")
    .update({ teacher_notes: notes })
    .eq("id", meetingId)

  if (error) {
    console.log(error)
    alert("Failed to save notes")
    return
  }

  alert("Notes saved!")
  loadTeacherMeetings()
}

// =====================
// MEETING FUNCTIONS
// =====================

async function bookMeeting() {
  const childId = document.getElementById("childSelect").value
  const teacherId = document.getElementById("teacherSelect").value  // ✅ FIX: was reading wrong element
  const meetingTime = document.getElementById("meetingTime").value
  const topic = document.getElementById("topic").value

  if (!childId || !teacherId || !meetingTime || !topic) {
    alert("Please fill in all fields")
    return
  }

  console.log("Booking meeting - Teacher:", teacherId, "Child:", childId)

  // ✅ FIX: use supabaseClient not supabase
  const { error } = await supabaseClient
    .from("meetings")
    .insert([{
      child_id: childId,
      teacher_id: teacherId,
      meeting_time: meetingTime,
      topic: topic,
      status: "pending"
    }])

  if (error) {
    console.log("Booking error:", error)
    alert("Failed to book meeting: " + error.message)
    return
  }

  alert("Meeting booked successfully!")
}

async function loadParentMeetings() {
  const container = document.getElementById("meetingList")
  if (!container) return

  const user = await supabaseClient.auth.getUser()
  const parentId = user.data.user.id

  const { data: children, error: childError } = await supabaseClient
    .from("children")
    .select("id")
    .eq("parent_id", parentId)

  if (childError || !children.length) {
    container.innerHTML = "<p>No children found.</p>"
    return
  }

  const childIds = children.map(child => child.id)

  // ✅ FIX: join with profiles to get teacher name
  const { data, error } = await supabaseClient
    .from("meetings")
    .select(`
      *,
      children(name),
      teachers:teacher_id(subject, profiles(name))
    `)
    .in("child_id", childIds)

  if (error) {
    console.log(error)
    return
  }

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
}