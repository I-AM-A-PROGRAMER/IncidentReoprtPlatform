/*************************************************
 * FIREBASE INIT (REPLACE WITH YOUR REAL KEYS)
 *************************************************/
const firebaseConfig = {
  apiKey: "AIzaSyAzWMhMAU09WjOboL5SnEcEMD7FSrJK2Mc",
  authDomain: "authentication-f62b4.firebaseapp.com",
  projectId: "authentication-f62b4"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

/*************************************************
 * CONSTANTS
 *************************************************/
const ADMIN_EMAILS = [
  "supriyo3606c@gmail.com",
  "pushkarrajabad@gmail.com"
];

const page = document.body.dataset.page;

/*************************************************
 * TOAST
 *************************************************/
function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.innerText = msg;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 3000);
}

/*************************************************
 * AUTH STATE HANDLER
 *************************************************/
auth.onAuthStateChanged(user => {
  if (page === "login" && user) {
    window.location.href = "dashboard.html";
    return;
  }

  if (page === "dashboard" && !user) {
    window.location.href = "index.html";
    return;
  }

  if (page === "dashboard" && user) {
    initDashboard(user);
  }
});

/*************************************************
 * LOGIN PAGE LOGIC
 *************************************************/
if (page === "login") {
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const loginBtn = document.getElementById("loginBtn");
  const signupBtn = document.getElementById("signupBtn");
  const googleBtn = document.getElementById("googleBtn");
  const authMsg = document.getElementById("authMsg");

  const loginTab = document.getElementById("loginTab");
  const signupTab = document.getElementById("signupTab");

  loginTab.onclick = () => {
    loginTab.classList.add("active");
    signupTab.classList.remove("active");
    loginBtn.classList.remove("hidden");
    signupBtn.classList.add("hidden");
  };

  signupTab.onclick = () => {
    signupTab.classList.add("active");
    loginTab.classList.remove("active");
    signupBtn.classList.remove("hidden");
    loginBtn.classList.add("hidden");
  };

  loginBtn.onclick = async () => {
    try {
      await auth.signInWithEmailAndPassword(
        emailInput.value,
        passwordInput.value
      );
    } catch (e) {
      authMsg.innerText = e.message;
    }
  };

  signupBtn.onclick = async () => {
    try {
      await auth.createUserWithEmailAndPassword(
        emailInput.value,
        passwordInput.value
      );
      authMsg.innerText = "Account created. Logging in...";
    } catch (e) {
      authMsg.innerText = e.message;
    }
  };

  googleBtn.onclick = async () => {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      await auth.signInWithPopup(provider);
    } catch (e) {
      authMsg.innerText = e.message;
    }
  };
}

/*************************************************
 * DASHBOARD INIT
 *************************************************/
function initDashboard(user) {
  document.getElementById("welcomeText").innerText =
    "Hi, " + user.email.split("@")[0];

  document.getElementById("logoutBtn").onclick = () => auth.signOut();

  const isAdmin = ADMIN_EMAILS.includes(user.email);
  if (isAdmin) {
    document.getElementById("adminPanel").classList.remove("hidden");
  }

  startHeroTyping();
  setupModal();
  loadIncidents(isAdmin);
}

/*************************************************
 * HERO TYPING
 *************************************************/
function startHeroTyping() {
  const el = document.getElementById("heroText");
  const text = "Saw an incident? Report now for fast-track solution";
  let i = 0;

  function type() {
    if (i <= text.length) {
      el.innerText = text.slice(0, i++);
      setTimeout(type, 60);
    } else {
      setTimeout(() => {
        i = 0;
        el.innerText = "";
        type();
      }, 5000);
    }
  }
  type();
}

/*************************************************
 * MODAL LOGIC
 *************************************************/
function setupModal() {
  const modal = document.getElementById("reportModal");
  const openBtn = document.getElementById("openReportBtn");
  const closeBtn = document.getElementById("closeModalBtn");
  const submitBtn = document.getElementById("submitIncidentBtn");
  const fileInput = document.getElementById("incidentFile");
  const filePreview = document.getElementById("fileNamePreview");

  openBtn.onclick = () => modal.classList.remove("hidden");
  closeBtn.onclick = () => modal.classList.add("hidden");

  fileInput.onchange = () => {
    filePreview.innerText = fileInput.files[0]
      ? "Selected: " + fileInput.files[0].name
      : "";
  };

  submitBtn.onclick = submitIncident;
}

/*************************************************
 * SUBMIT INCIDENT (WORKING)
 *************************************************/
async function submitIncident() {
  const type = incidentType.value;
  const desc = incidentDesc.value.trim();
  const state = incidentState.value;
  const city = incidentCity.value.trim();
  const location = incidentLocation.value.trim();
  const file = incidentFile.files[0];

  if (!desc || !state || !city || !location) {
    showToast("Please fill all fields");
    return;
  }

  try {
    await db.collection("incidents").add({
      type,
      desc,
      state,
      city,
      location,
      mediaName: file ? file.name : null,
      status: "Pending",
      verified: false,
      time: Date.now()
    });

    showToast("Incident submitted");
    reportModal.classList.add("hidden");
  } catch (e) {
    showToast("Submission failed");
  }
}

/*************************************************
 * LOAD INCIDENTS
 *************************************************/
async function loadIncidents(isAdmin) {
  const userTable = document.getElementById("incidentTable");
  const adminTable = document.getElementById("adminTable");

  const snap = await db
    .collection("incidents")
    .orderBy("time", "desc")
    .get();

  snap.forEach(doc => {
    const d = doc.data();

    // USER ROW
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${d.type}</td>
      <td>${d.desc}</td>
      <td>${d.city}</td>
      <td>${d.mediaName || "-"}</td>
      <td>${new Date(d.time).toLocaleString()}</td>
      <td>${d.status}</td>
      <td>${d.verified ? "Yes" : "No"}</td>
    `;
    userTable.appendChild(tr);

    // ADMIN ROW
    if (isAdmin) {
      const trA = document.createElement("tr");
      trA.innerHTML = `
        <td>${d.type}</td>
        <td>${d.desc}</td>
        <td>${d.city}</td>
        <td>${d.status}</td>
        <td>${d.verified ? "Yes" : "No"}</td>
        <td>
          <button onclick="verifyIncident('${doc.id}')">Verify</button>
          <button onclick="resolveIncident('${doc.id}')">Resolve</button>
          <button onclick="deleteIncident('${doc.id}')">Delete</button>
        </td>
      `;
      adminTable.appendChild(trA);
    }
  });
}

/*************************************************
 * ADMIN ACTIONS
 *************************************************/
window.verifyIncident = id =>
  db.collection("incidents").doc(id).update({ verified: true });

window.resolveIncident = id =>
  db.collection("incidents").doc(id).update({ status: "Resolved" });

window.deleteIncident = async id => {
  if (confirm("Delete this incident?")) {
    await db.collection("incidents").doc(id).delete();
    location.reload();
  }
};

