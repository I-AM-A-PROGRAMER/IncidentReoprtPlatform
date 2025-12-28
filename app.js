/*********************************************************
 * FIREBASE INIT — REPLACE WITH YOUR OWN KEYS
 *********************************************************/
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

/**************************************************
 * ADMIN CONFIG
 **************************************************/
const ADMIN_EMAILS = [
  "admin@gmail.com"
];

/**************************************************
 * PAGE DETECTION
 **************************************************/
const isLoginPage = window.location.pathname.includes("index.html") ||
                    window.location.pathname.endsWith("/");
const isDashboardPage = window.location.pathname.includes("dashboard.html");

/**************************************************
 * AUTH STATE HANDLER
 **************************************************/
auth.onAuthStateChanged(user => {
  if (isLoginPage && user) {
    window.location.href = "dashboard.html";
  }

  if (isDashboardPage) {
    if (!user) {
      window.location.href = "index.html";
      return;
    }

    const isAdmin = ADMIN_EMAILS.includes(user.email);
    document.getElementById("userWelcome").innerText =
      `Hi, ${user.email.split("@")[0]}`;

    if (isAdmin) {
      document.getElementById("adminDashboard").classList.remove("hidden");
      document.getElementById("userDashboard").classList.add("hidden");
      listenAdmin();
    } else {
      document.getElementById("userDashboard").classList.remove("hidden");
      document.getElementById("adminDashboard").classList.add("hidden");
      listenUser();
      startHeroTyping();
    }
  }
});

/**************************************************
 * LOGIN / SIGNUP
 **************************************************/
function loginEmail() {
  const email = document.getElementById("email").value;
  const pass = document.getElementById("password").value;

  auth.signInWithEmailAndPassword(email, pass)
    .catch(err => showToast(err.message, "error"));
}

function signupEmail() {
  const email = document.getElementById("email").value;
  const pass = document.getElementById("password").value;

  auth.createUserWithEmailAndPassword(email, pass)
    .then(() => showToast("Account created", "success"))
    .catch(err => showToast(err.message, "error"));
}

function loginGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .catch(err => showToast(err.message, "error"));
}

function logout() {
  auth.signOut();
}

/**************************************************
 * INPUT REFERENCES (CRITICAL)
 **************************************************/
const incidentType = document.getElementById("incidentType");
const incidentDesc = document.getElementById("incidentDesc");
const incidentState = document.getElementById("incidentState");
const incidentCity = document.getElementById("incidentCity");
const incidentAddress = document.getElementById("incidentAddress");
const incidentFile = document.getElementById("incidentFile");
const modalMsg = document.getElementById("modalMsg");

/**************************************************
 * SUBMIT INCIDENT (NO GPS, NO FREEZE)
 **************************************************/
async function submitIncident() {
  modalMsg.innerText = "Submitting...";

  const type = incidentType.value;
  const desc = incidentDesc.value.trim();
  const state = incidentState.value;
  const city = incidentCity.value.trim();
  const address = incidentAddress.value.trim();

  if (!desc || !state || !city) {
    modalMsg.innerText = "Fill all required fields";
    return;
  }

  const time = firebase.firestore.Timestamp.now();

  try {
    // DUPLICATE CHECK (5 minutes, same state + city + type)
    const dupes = await db.collection("incidents")
      .where("type", "==", type)
      .where("state", "==", state)
      .where("city", "==", city)
      .where("time", ">", new firebase.firestore.Timestamp(
        time.seconds - 300,
        time.nanoseconds
      ))
      .get();

    if (!dupes.empty) {
      modalMsg.innerText = "Similar incident already reported recently";
      showToast("Duplicate detected", "warning");
      return;
    }

    await db.collection("incidents").add({
      type,
      desc,
      state,
      city,
      address,
      media: null, // media disabled until storage rules added
      time,
      status: "Pending",
      verified: "Not Verified",
      uid: auth.currentUser.uid
    });

    modalMsg.innerText = "Submitted";
    showToast("Incident reported", "success");

    setTimeout(closeModal, 600);

  } catch (err) {
    console.error(err);
    modalMsg.innerText = "Submission failed";
    showToast("Submission failed", "error");
  }
}

/**************************************************
 * USER LISTENER
 **************************************************/
function listenUser() {
  db.collection("incidents")
    .orderBy("time", "desc")
    .onSnapshot(snapshot => {
      const tbody = document.getElementById("userTable");
      tbody.innerHTML = "";

      snapshot.forEach(doc => {
        const d = doc.data();
        tbody.innerHTML += `
          <tr>
            <td>${d.type}</td>
            <td>${d.desc}</td>
            <td>
              ${d.city}
              <span class="dots" onclick="showLocation('${d.address}, ${d.city}, ${d.state}')">⋮</span>
            </td>
            <td>${new Date(d.time.seconds * 1000).toLocaleString()}</td>
            <td><span class="badge pending">${d.status}</span></td>
            <td><span class="badge red">${d.verified}</span></td>
          </tr>
        `;
      });
    });
}

/**************************************************
 * ADMIN LISTENER
 **************************************************/
function listenAdmin() {
  db.collection("incidents")
    .orderBy("time", "desc")
    .onSnapshot(snapshot => {
      const tbody = document.getElementById("adminTable");
      tbody.innerHTML = "";

      snapshot.forEach(doc => {
        const d = doc.data();
        tbody.innerHTML += `
          <tr>
            <td>${d.type}</td>
            <td>${d.city}</td>
            <td>
              <select onchange="verifyIncident('${doc.id}', this.value)">
                <option ${d.verified==="Not Verified"?"selected":""}>Not Verified</option>
                <option ${d.verified==="Verified"?"selected":""}>Verified</option>
              </select>
            </td>
          </tr>
        `;
      });
    });
}

function verifyIncident(id, value) {
  db.collection("incidents").doc(id).update({ verified: value });
  showToast("Verification updated", "success");
}

/**************************************************
 * UI HELPERS
 **************************************************/
function showLocation(text) {
  showToast(text, "info", 4000);
}

function openModal() {
  document.getElementById("modal").classList.add("show");
}

function closeModal() {
  document.getElementById("modal").classList.remove("show");
  modalMsg.innerText = "";
}

/**************************************************
 * HERO TYPING (5s HOLD)
 **************************************************/
function startHeroTyping() {
  const el = document.getElementById("heroText");
  const text = "Saw an incident? Report now for fast-track solution";
  let i = 0;

  function type() {
    if (i < text.length) {
      el.innerText += text.charAt(i++);
      setTimeout(type, 70);
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

/**************************************************
 * TOAST SYSTEM
 **************************************************/
function showToast(msg, type="info", time=2500) {
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.innerText = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), time);
}
