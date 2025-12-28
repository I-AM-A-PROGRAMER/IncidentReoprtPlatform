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

const ADMIN_EMAILS = [
  "supriyo3606c@gmail.com",
  "pushkarrajbad@gmail.com",
  "tonypotts545@gmail.com"

];
/*************************************************
 * PAGE DETECTION
 *************************************************/
const page = document.body.dataset.page;

/*************************************************
 * TOAST
 *************************************************/
function showToast(msg) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.innerText = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

/*************************************************
 * AUTH STATE
 *************************************************/
auth.onAuthStateChanged(user => {
  if (!user && page !== "login") {
    window.location.href = "index.html";
    return;
  }

  if (user && page === "login") {
    window.location.href = "dashboard.html";
    return;
  }

  if (user && page === "dashboard") {
    initDashboard(user);
  }
});

/*************************************************
 * LOGIN / SIGNUP
 *************************************************/
if (page === "login") {
  const loginBtn = document.getElementById("loginBtn");
  const signupBtn = document.getElementById("signupBtn");
  const googleBtn = document.getElementById("googleBtn");

  loginBtn.onclick = async () => {
    const email = emailInput.value;
    const pass = passwordInput.value;
    try {
      await auth.signInWithEmailAndPassword(email, pass);
    } catch (e) {
      showToast(e.message);
    }
  };

  signupBtn.onclick = async () => {
    const email = emailInput.value;
    const pass = passwordInput.value;
    try {
      await auth.createUserWithEmailAndPassword(email, pass);
    } catch (e) {
      showToast(e.message);
    }
  };

  googleBtn.onclick = async () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    await auth.signInWithPopup(provider);
  };
}

/*************************************************
 * DASHBOARD INIT
 *************************************************/
function initDashboard(user) {
  document.getElementById("userName").innerText =
    user.email.split("@")[0];

  document.getElementById("logoutBtn").onclick = () => auth.signOut();

  const isAdmin = ADMIN_EMAILS.includes(user.email);

  if (isAdmin) {
    document.getElementById("adminSection").classList.remove("hidden");
    loadAdminData();
  } else {
    document.getElementById("adminSection").classList.add("hidden");
  }

  loadUserIncidents(user.uid);
  initHeroTyping();
}

/*************************************************
 * HERO TYPING
 *************************************************/
function initHeroTyping() {
  const el = document.getElementById("heroText");
  if (!el) return;

  const text = "Saw an incident? Report now for fast response.";
  let i = 0;

  function type() {
    if (i < text.length) {
      el.innerText += text.charAt(i++);
      setTimeout(type, 60);
    } else {
      setTimeout(() => {
        el.innerText = "";
        i = 0;
        type();
      }, 5000);
    }
  }
  type();
}

/*************************************************
 * INCIDENT SUBMISSION (NO FILE UPLOAD)
 *************************************************/
const openBtn = document.getElementById("openModalBtn");
const modal = document.getElementById("modal");
const submitBtn = document.getElementById("submitIncident");

if (openBtn) openBtn.onclick = () => modal.classList.remove("hidden");
if (document.getElementById("closeModal"))
  document.getElementById("closeModal").onclick = () => modal.classList.add("hidden");

if (submitBtn)
  submitBtn.onclick = async () => {
    const type = incidentType.value;
    const desc = incidentDesc.value;
    const state = incidentState.value;
    const city = incidentCity.value;
    const address = incidentAddress.value;
    const file = incidentFile.files[0];

    if (!desc || !city) {
      showToast("Please fill required fields");
      return;
    }

    const user = auth.currentUser;

    await db.collection("incidents").add({
      uid: user.uid,
      user: user.email,
      type,
      desc,
      state,
      city,
      address,
      media: file ? file.name : "No file",
      time: Date.now(),
      status: "Open",
      verified: false,
    });

    modal.classList.add("hidden");
    showToast("Incident reported");
  };

/*************************************************
 * LOAD USER INCIDENTS
 *************************************************/
function loadUserIncidents(uid) {
  db.collection("incidents")
    .where("uid", "==", uid)
    .orderBy("time", "desc")
    .onSnapshot(snap => {
      const tbody = document.getElementById("userTable");
      tbody.innerHTML = "";

      snap.forEach(doc => {
        const d = doc.data();
        tbody.innerHTML += `
          <tr>
            <td>${d.type}</td>
            <td>${d.desc}</td>
            <td>${d.city}</td>
            <td>${d.media}</td>
            <td>${new Date(d.time).toLocaleString()}</td>
            <td>${d.status}</td>
            <td>${d.verified ? "Yes" : "No"}</td>
          </tr>`;
      });
    });
}

/*************************************************
 * ADMIN FUNCTIONS
 *************************************************/
function loadAdminData() {
  db.collection("incidents")
    .orderBy("time", "desc")
    .onSnapshot(snap => {
      const tbody = document.getElementById("adminTable");
      tbody.innerHTML = "";

      let total = 0, open = 0, resolved = 0;

      snap.forEach(doc => {
        total++;
        const d = doc.data();
        if (d.status === "Open") open++;
        if (d.status === "Resolved") resolved++;

        tbody.innerHTML += `
          <tr>
            <td>${d.user}</td>
            <td>${d.type}</td>
            <td>${d.city}</td>
            <td>${d.desc}</td>
            <td>${d.status}</td>
            <td>
              <button onclick="verify('${doc.id}')">Verify</button>
              <button onclick="resolve('${doc.id}')">Resolve</button>
              <button onclick="removeIncident('${doc.id}')">Delete</button>
            </td>
          </tr>`;
      });

      document.getElementById("totalCount").innerText = total;
      document.getElementById("openCount").innerText = open;
      document.getElementById("resolvedCount").innerText = resolved;
    });
}

window.verify = id =>
  db.collection("incidents").doc(id).update({ verified: true });

window.resolve = id =>
  db.collection("incidents").doc(id).update({ status: "Resolved" });

window.removeIncident = id =>
  db.collection("incidents").doc(id).delete();
