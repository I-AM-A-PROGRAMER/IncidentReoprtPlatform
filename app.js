/*************************************************
 * FIREBASE CONFIG — REPLACE WITH YOUR OWN KEYS
 *************************************************/
const firebaseConfig = {
  apiKey: "AIzaSyAzWMhMAU09WjOboL5SnEcEMD7FSrJK2Mc",
  authDomain: "authentication-f62b4.firebaseapp.com",
  projectId: "authentication-f62b4",
  storageBucket: "authentication-f62b4.firebasestorage.app",
  messagingSenderId: "461551814952",
  appId: "1:461551814952:web:a2132a5f306c7452cca81d"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

/*************************************************
 * ADMIN EMAILS (CONFIRMED)
 *************************************************/
const ADMIN_EMAILS = [
  "supriyo3606c@gmail.com",
  "pushkarrajbad@gmail.com"
];

/*************************************************
 * PAGE DETECTION
 *************************************************/
const isLoginPage =
  window.location.pathname.endsWith("/") ||
  window.location.pathname.includes("index.html");

const isDashboardPage =
  window.location.pathname.includes("dashboard.html");

/*************************************************
 * AUTH STATE HANDLER
 *************************************************/
auth.onAuthStateChanged(user => {
  if (isLoginPage && user) {
    window.location.href = "dashboard.html";
    return;
  }

  if (isDashboardPage) {
    if (!user) {
      window.location.href = "index.html";
      return;
    }

    const isAdmin = ADMIN_EMAILS.includes(user.email);

    document.getElementById("userWelcome").innerText =
      `Hi, ${user.email.split("@")[0]}`;

    // Show admin panel only for admins
    const adminPanel = document.getElementById("adminPanel");
    if (isAdmin) {
      adminPanel.classList.remove("hidden");
      listenAdmin();
    } else {
      adminPanel.classList.add("hidden");
    }

    listenUser();
    startHeroTyping();
  }
});

/*************************************************
 * LOGIN / SIGNUP / GOOGLE AUTH
 *************************************************/
const loginEmailInput = document.getElementById("loginEmail");
const loginPasswordInput = document.getElementById("loginPassword");
const signupEmailInput = document.getElementById("signupEmail");
const signupPasswordInput = document.getElementById("signupPassword");
const authMessage = document.getElementById("authMessage");

if (document.getElementById("loginTab")) {
  // Tab switching
  const loginTab = document.getElementById("loginTab");
  const signupTab = document.getElementById("signupTab");
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");

  loginTab.onclick = () => {
    loginTab.classList.add("active");
    signupTab.classList.remove("active");
    loginForm.classList.add("active");
    signupForm.classList.remove("active");
    authMessage.innerText = "";
  };

  signupTab.onclick = () => {
    signupTab.classList.add("active");
    loginTab.classList.remove("active");
    signupForm.classList.add("active");
    loginForm.classList.remove("active");
    authMessage.innerText = "";
  };

  // Email login
  loginForm.onsubmit = e => {
    e.preventDefault();
    auth.signInWithEmailAndPassword(
      loginEmailInput.value,
      loginPasswordInput.value
    ).catch(err => authMessage.innerText = err.message);
  };

  // Signup
  signupForm.onsubmit = e => {
    e.preventDefault();
    auth.createUserWithEmailAndPassword(
      signupEmailInput.value,
      signupPasswordInput.value
    ).catch(err => authMessage.innerText = err.message);
  };

  // Google login
  document.getElementById("googleLoginBtn").onclick = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
      .catch(err => authMessage.innerText = err.message);
  };
}

/*************************************************
 * LOGOUT
 *************************************************/
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.onclick = () => {
    auth.signOut().then(() => {
      window.location.href = "index.html";
    });
  };
}

/*************************************************
 * HERO TYPING EFFECT
 *************************************************/
function startHeroTyping() {
  const el = document.getElementById("heroTyping");
  if (!el) return;

  const text = "Saw an incident? Report now for fast-track solution";
  let index = 0;

  async function loop() {
    el.innerText = "";
    index = 0;

    while (index < text.length) {
      el.innerText += text[index++];
      await sleep(50);
    }

    await sleep(5000);
    loop();
  }

  loop();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/*************************************************
 * MODAL CONTROLS
 *************************************************/
const reportModal = document.getElementById("reportModal");
const openReportBtn = document.getElementById("openReportModal");
const closeReportBtn = document.getElementById("closeReportModal");

if (openReportBtn) openReportBtn.onclick = () => reportModal.classList.remove("hidden");
if (closeReportBtn) closeReportBtn.onclick = () => reportModal.classList.add("hidden");

/*************************************************
 * TOAST
 *************************************************/
function showToast(msg, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerText = msg;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/*************************************************
 * SUBMIT INCIDENT (NO GPS, SAFE)
 *************************************************/
const submitBtn = document.getElementById("submitIncidentBtn");
const modalMsg = document.getElementById("modalMsg");

if (submitBtn) {
  submitBtn.onclick = async () => {
    modalMsg.innerText = "Submitting...";

    try {
      const type = document.getElementById("incidentType").value;
      const desc = document.getElementById("incidentDesc").value.trim();
      const state = document.getElementById("incidentState").value;
      const city = document.getElementById("incidentCity").value.trim();
      const address = document.getElementById("incidentAddress").value.trim();
      const file = document.getElementById("incidentFile").files[0];

      if (!desc || !state || !city || !address) {
        modalMsg.innerText = "Please fill all fields";
        return;
      }

      let mediaURL = null;
      if (file) {
        const ref = storage.ref(`media/${Date.now()}_${file.name}`);
        await ref.put(file);
        mediaURL = await ref.getDownloadURL();
      }

      await db.collection("incidents").add({
        type,
        desc,
        state,
        city,
        address,
        media: mediaURL,
        time: Date.now(),
        status: "Pending",
        verified: "Not Verified",
        reporter: auth.currentUser.email
      });

      modalMsg.innerText = "";
      reportModal.classList.add("hidden");
      showToast("Incident reported successfully");

    } catch (err) {
      console.error(err);
      modalMsg.innerText = "Submission failed";
      showToast("Submission failed", "error");
    }
  };
}

/*************************************************
 * USER INCIDENT LISTENER
 *************************************************/
function listenUser() {
  const table = document.getElementById("incidentTable");
  if (!table) return;

  db.collection("incidents")
    .orderBy("time", "desc")
    .onSnapshot(snapshot => {
      table.innerHTML = "";

      snapshot.forEach(doc => {
        const d = doc.data();
        const row = document.createElement("tr");

        row.innerHTML = `
          <td>${d.type}</td>
          <td>${d.desc}</td>
          <td>${d.city}</td>
          <td>${d.media ? `<button onclick="window.open('${d.media}')">View</button>` : "-"}</td>
          <td>${new Date(d.time).toLocaleString()}</td>
          <td>${d.status}</td>
          <td>${d.verified}</td>
          <td></td>
        `;
        table.appendChild(row);
      });
    });
}

/*************************************************
 * ADMIN INCIDENT LISTENER
 *************************************************/
function listenAdmin() {
  const container = document.getElementById("adminIncidentList");
  if (!container) return;

  db.collection("incidents")
    .orderBy("time", "desc")
    .onSnapshot(snapshot => {
      container.innerHTML = "";

      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        const div = document.createElement("div");

        div.className = "auth-card";
        div.style.marginTop = "12px";

        div.innerHTML = `
          <b>${d.type}</b> — ${d.city}<br/>
          <small>${d.desc}</small><br/>
          <select onchange="updateVerification('${docSnap.id}', this.value)">
            <option ${d.verified === "Not Verified" ? "selected" : ""}>Not Verified</option>
            <option ${d.verified === "Verified" ? "selected" : ""}>Verified</option>
          </select>
        `;
        container.appendChild(div);
      });
    });
}

window.updateVerification = (id, value) => {
  db.collection("incidents").doc(id).update({ verified: value });
  showToast("Verification updated");
};
