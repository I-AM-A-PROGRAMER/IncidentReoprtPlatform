// ================= FIREBASE INIT =================
const firebaseConfig = {
  apiKey: "AIzaSyAzWMhMAU09WjOboL5SnEcEMD7FSrJK2Mc",
  authDomain: "authentication-f62b4.firebaseapp.com",
  projectId: "authentication-f62b4",
  messagingSenderId: "461551814952",
  appId: "1:461551814952:web:a2132a5f306c7452cca81d"
};
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

// ================= ADMIN =================
const ADMIN_EMAILS = [
  "supriyo3606c@gmail.com",
  "pushkarrajbad@gmail.com"
];

// ================= PAGE DETECT =================
const page = document.body.dataset.page;

// ================= AUTH STATE =================
auth.onAuthStateChanged(user => {
  if (!user) {
    if (page === "dashboard") location.href = "index.html";
    return;
  }

  if (page === "login") {
    location.href = "dashboard.html";
    return;
  }

  if (page === "dashboard") {
    initDashboard(user);
  }
});

// ================= LOGIN =================
async function login() {
  const email = loginEmail.value;
  const password = loginPassword.value;
  await auth.signInWithEmailAndPassword(email, password);
}

async function signup() {
  const email = signupEmail.value;
  const password = signupPassword.value;
  await auth.createUserWithEmailAndPassword(email, password);
}

async function googleLogin() {
  const provider = new firebase.auth.GoogleAuthProvider();
  await auth.signInWithPopup(provider);
}

function logout() {
  auth.signOut();
}

// ================= DASHBOARD =================
function initDashboard(user) {
  document.getElementById("userName").innerText =
    "Hi, " + user.email.split("@")[0];

  const isAdmin = ADMIN_EMAILS.includes(user.email);

  if (isAdmin) {
    document.getElementById("adminBadge").style.display = "block";
  }

  listenIncidents(isAdmin);
}

// ================= INCIDENT SUBMIT =================
async function submitIncident() {
  const type = incidentType.value;
  const desc = incidentDesc.value.trim();
  const state = incidentState.value;
  const city = incidentCity.value.trim();
  const address = incidentAddress.value.trim();
  const file = incidentFile.files[0];

  if (!desc || !city || !state) {
    toast("Fill all required fields", "error");
    return;
  }

  const fileName = file ? file.name : null;

  const now = Date.now();

  // Duplicate check (same city + type in 5 min)
  const dupes = await db.collection("incidents")
    .where("type", "==", type)
    .where("city", "==", city)
    .where("time", ">", now - 5 * 60 * 1000)
    .get();

  if (!dupes.empty) {
    toast("Similar incident already reported", "warning");
    return;
  }

  await db.collection("incidents").add({
    type,
    desc,
    state,
    city,
    address,
    fileName,
    time: now,
    status: "Pending",
    verified: false,
    duplicate: false,
    createdBy: auth.currentUser.email
  });

  toast("Incident reported successfully", "success");
  closeModal();
}

// ================= LISTEN INCIDENTS =================
function listenIncidents(isAdmin) {
  db.collection("incidents")
    .orderBy("time", "desc")
    .onSnapshot(snap => {
      userTable.innerHTML = "";

      snap.forEach(doc => {
        const d = doc.data();
        const tr = document.createElement("tr");

        tr.innerHTML = `
          <td>${d.type}</td>
          <td>${d.desc}</td>
          <td>${d.city}</td>
          <td>${d.fileName || "—"}</td>
          <td>${new Date(d.time).toLocaleString()}</td>
          <td>${d.status}</td>
          <td>${d.verified ? "Verified" : "Not Verified"}</td>
        `;

        if (isAdmin) {
          const adminTd = document.createElement("td");
          adminTd.innerHTML = `
            <button onclick="verify('${doc.id}', true)">✔</button>
            <button onclick="resolve('${doc.id}')">Resolve</button>
            <button onclick="markDuplicate('${doc.id}')">Duplicate</button>
            <button onclick="removeIncident('${doc.id}')">Delete</button>
          `;
          tr.appendChild(adminTd);
        }

        userTable.appendChild(tr);
      });
    });
}

// ================= ADMIN ACTIONS =================
function verify(id, val) {
  db.collection("incidents").doc(id).update({ verified: val });
}

function resolve(id) {
  db.collection("incidents").doc(id).update({ status: "Resolved" });
}

function markDuplicate(id) {
  db.collection("incidents").doc(id).update({ duplicate: true });
}

function removeIncident(id) {
  if (confirm("Delete this report?")) {
    db.collection("incidents").doc(id).delete();
  }
}

// ================= TOAST =================
function toast(msg, type = "info") {
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.innerText = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}
