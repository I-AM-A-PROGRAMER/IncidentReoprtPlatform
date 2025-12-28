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
const ADMIN_EMAILS = [
  "supriyo3606c@gmail.com",
  "pushkarrajbad@gmail.com"
];


/***********************
  PAGE DETECTION
************************/
const isLoginPage = document.body.dataset.page === "login";
const isDashboardPage = document.body.dataset.page === "dashboard";

/***********************
  TOAST
************************/
function showToast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.innerText = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

/***********************
  AUTH STATE
************************/
auth.onAuthStateChanged(user => {
  if (isLoginPage && user) {
    window.location.href = "dashboard.html";
  }

  if (isDashboardPage && !user) {
    window.location.href = "index.html";
  }

  if (isDashboardPage && user) {
    initDashboard(user);
  }
});

/***********************
  LOGIN / SIGNUP
************************/
if (isLoginPage) {
  window.login = () => {
    const email = emailInput.value;
    const pass = passwordInput.value;
    auth.signInWithEmailAndPassword(email, pass)
      .catch(e => showToast(e.message));
  };

  window.signup = () => {
    const email = emailInput.value;
    const pass = passwordInput.value;
    auth.createUserWithEmailAndPassword(email, pass)
      .then(() => showToast("Account created"))
      .catch(e => showToast(e.message));
  };

  window.googleLogin = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
      .catch(e => showToast(e.message));
  };
}

/***********************
  HERO TYPING
************************/
function startHeroTyping() {
  const hero = document.getElementById("heroText");
  if (!hero) return;

  const text = "Saw an incident? Report now for fast-track solution";
  let i = 0;

  function type() {
    if (i <= text.length) {
      hero.innerText = text.slice(0, i++);
      setTimeout(type, 60);
    } else {
      setTimeout(() => {
        i = 0;
        hero.innerText = "";
        type();
      }, 5000);
    }
  }
  type();
}

/***********************
  DASHBOARD INIT
************************/
function initDashboard(user) {
  document.getElementById("userName").innerText =
    "Hi, " + (user.email.split("@")[0]);

  const isAdmin = ADMIN_EMAILS.includes(user.email);
  if (isAdmin) {
    document.getElementById("adminPanel").classList.remove("hidden");
  }

  startHeroTyping();
  listenIncidents(isAdmin);
}

/***********************
  LOGOUT
************************/
window.logout = () => auth.signOut();

/***********************
  MODAL
************************/
window.openModal = () =>
  document.getElementById("incidentModal").classList.remove("hidden");

window.closeModal = () =>
  document.getElementById("incidentModal").classList.add("hidden");

/***********************
  SUBMIT INCIDENT
************************/
window.submitIncident = async () => {
  const type = incidentType.value;
  const desc = incidentDesc.value.trim();
  const state = incidentState.value;
  const city = incidentCity.value.trim();
  const area = incidentArea.value.trim();
  const file = incidentFile.files[0];

  if (!desc || !city || !area) {
    showToast("Fill all required fields");
    return;
  }

  const fakeMedia = file ? file.name : null;

  await db.collection("incidents").add({
    type,
    desc,
    state,
    city,
    area,
    media: fakeMedia,
    status: "Pending",
    verified: false,
    time: Date.now()
  });

  showToast("Incident submitted");
  closeModal();
};

/***********************
  LIST INCIDENTS
************************/
function listenIncidents(isAdmin) {
  db.collection("incidents")
    .orderBy("time", "desc")
    .onSnapshot(snap => {
      const table = document.getElementById("incidentTable");
      table.innerHTML = "";

      snap.forEach(doc => {
        const d = doc.data();
        const tr = document.createElement("tr");

        tr.innerHTML = `
          <td>${d.type}</td>
          <td>${d.desc}</td>
          <td>${d.city}</td>
          <td>${d.media || "-"}</td>
          <td>${new Date(d.time).toLocaleString()}</td>
          <td><span class="badge pending">${d.status}</span></td>
          <td>${d.verified ? "Yes" : "No"}</td>
        `;

        if (isAdmin) {
          const actions = document.createElement("td");
          actions.innerHTML = `
            <button onclick="verify('${doc.id}')">Verify</button>
            <button onclick="resolve('${doc.id}')">Resolve</button>
            <button onclick="remove('${doc.id}')">Delete</button>
          `;
          tr.appendChild(actions);
        }

        table.appendChild(tr);
      });
    });
}

/***********************
  ADMIN ACTIONS
************************/
window.verify = id =>
  db.collection("incidents").doc(id).update({ verified: true });

window.resolve = id =>
  db.collection("incidents").doc(id).update({ status: "Resolved" });

window.remove = id =>
  db.collection("incidents").doc(id).delete();

