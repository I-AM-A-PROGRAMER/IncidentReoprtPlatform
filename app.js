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
const storage = firebase.storage();

/*********************************************************
 * ADMIN CONFIG
 *********************************************************/
const ADMIN_EMAILS = [
  "supriyo3606c@gmail.com"
];

/*********************************************************
 * PAGE DETECTION
 *********************************************************/
const isLoginPage = document.getElementById("loginForm") !== null;
const isDashboardPage = document.getElementById("userDashboard") !== null;

/*********************************************************
 * AUTH STATE — THIS IS THE LOGIN → DASHBOARD LINK
 *********************************************************/
auth.onAuthStateChanged(user => {

  if (isLoginPage) {
    // On login page
    if (user) {
      window.location.href = "dashboard.html";
    }
  }

  if (isDashboardPage) {
    // On dashboard page
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
      startTyping();
      listenUser();
    }
  }

});

/*********************************************************
 * LOGIN PAGE LOGIC
 *********************************************************/
function switchTab(tab) {
  loginForm.classList.remove("active");
  signupForm.classList.remove("active");
  loginTab.classList.remove("active");
  signupTab.classList.remove("active");

  if (tab === "login") {
    loginForm.classList.add("active");
    loginTab.classList.add("active");
  } else {
    signupForm.classList.add("active");
    signupTab.classList.add("active");
  }

  msg.innerText = "";
}

function signup() {
  const email = signupEmail.value.trim();
  const password = signupPassword.value.trim();

  if (!email || !password) {
    msg.innerText = "Please fill all fields";
    return;
  }

  auth.createUserWithEmailAndPassword(email, password)
    .then(res => {
      res.user.sendEmailVerification();
      msg.innerText = "Verification email sent. Verify before login.";
      switchTab("login");
    })
    .catch(err => msg.innerText = err.message);
}

function login() {
  const email = loginEmail.value.trim();
  const password = loginPassword.value.trim();

  if (!email || !password) {
    msg.innerText = "Enter email and password";
    return;
  }

  auth.signInWithEmailAndPassword(email, password)
    .catch(err => msg.innerText = err.message);
}

function googleLogin() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .catch(err => msg.innerText = err.message);
}

/*********************************************************
 * DASHBOARD — HERO TYPING
 *********************************************************/
function startTyping() {
  const text = "Saw an incident? Report now for fast-track solution";
  let i = 0;

  setInterval(() => {
    typingText.innerText = text.slice(0, i++);
    if (i > text.length) i = 0;
  }, 120);
}

/*********************************************************
 * MODAL CONTROLS
 *********************************************************/
function openModal() {
  modal.style.display = "flex";
  modalMsg.innerText = "";
}

function closeModal() {
  modal.style.display = "none";
  modalMsg.innerText = "";
}

/*********************************************************
 * SUBMIT INCIDENT (WITH DUPLICATE CHECK)
 *********************************************************/
async function submitIncident() {
  modalMsg.innerText = "Submitting…";

  navigator.geolocation.getCurrentPosition(async pos => {
    const lat = pos.coords.latitude.toFixed(3);
    const lng = pos.coords.longitude.toFixed(3);
    const now = Date.now();

    // Duplicate check: same approx location + last 5 minutes
    const dupes = await db.collection("incidents")
      .where("lat", "==", lat)
      .where("lng", "==", lng)
      .where("time", ">", now - 5 * 60 * 1000)
      .get();

    if (!dupes.empty) {
      modalMsg.innerText =
        "A report was already submitted nearby in the last 5 minutes.";
      return;
    }

    let mediaURL = null;
    const file = incidentFile.files[0];

    if (file) {
      const ref = storage.ref(`media/${Date.now()}_${file.name}`);
      await ref.put(file);
      mediaURL = await ref.getDownloadURL();
    }

    await db.collection("incidents").add({
      type: incidentType.value,
      desc: incidentDesc.value,
      lat,
      lng,
      location: "Auto-detected",
      media: mediaURL,
      time: now,
      status: "Pending",
      verified: "Not Verified"
    });

    modalMsg.innerText = "Submitted successfully";
    setTimeout(closeModal, 700);
  });
}

/*********************************************************
 * REALTIME LISTENERS — USER
 *********************************************************/
function listenUser() {
  db.collection("incidents")
    .orderBy("time", "desc")
    .onSnapshot(snapshot => {
      let total = 0;
      let resolved = 0;

      userTable.innerHTML = "";

      snapshot.forEach(doc => {
        const i = doc.data();
        total++;
        if (i.status === "Resolved") resolved++;

        userTable.innerHTML += `
          <tr>
            <td>${i.type}</td>
            <td>${i.desc}</td>
            <td>${i.location}</td>
            <td>${i.media ? `<button onclick="viewMedia('${i.media}')">View</button>` : "-"}</td>
            <td>${new Date(i.time).toLocaleString()}</td>
            <td><span class="badge pending">${i.status}</span></td>
            <td><span class="badge notverified">${i.verified}</span></td>
          </tr>
        `;
      });

      totalCases.innerText = total;
      resolvedCases.innerText = resolved;
    });
}

/*********************************************************
 * REALTIME LISTENERS — ADMIN
 *********************************************************/
function listenAdmin() {
  db.collection("incidents")
    .orderBy("time", "desc")
    .onSnapshot(snapshot => {
      adminTable.innerHTML = "";

      snapshot.forEach(doc => {
        const i = doc.data();

        adminTable.innerHTML += `
          <tr>
            <td>${i.type}</td>
            <td>${i.desc}</td>
            <td>${i.location}</td>
            <td>${i.media ? `<button onclick="viewMedia('${i.media}')">View</button>` : "-"}</td>
            <td>${new Date(i.time).toLocaleString()}</td>
            <td>
              <select onchange="updateStatus('${doc.id}', this.value)">
                <option ${i.status === "Pending" ? "selected" : ""}>Pending</option>
                <option ${i.status === "Resolved" ? "selected" : ""}>Resolved</option>
              </select>
            </td>
            <td>
              <select onchange="updateVerified('${doc.id}', this.value)">
                <option ${i.verified === "Not Verified" ? "selected" : ""}>Not Verified</option>
                <option ${i.verified === "Verified" ? "selected" : ""}>Verified</option>
              </select>
            </td>
          </tr>
        `;
      });
    });
}

/*********************************************************
 * ADMIN ACTIONS
 *********************************************************/
function updateStatus(id, value) {
  db.collection("incidents").doc(id).update({ status: value });
}

function updateVerified(id, value) {
  db.collection("incidents").doc(id).update({ verified: value });
}

/*********************************************************
 * MEDIA VIEWER
 *********************************************************/
function viewMedia(url) {
  viewer.style.display = "flex";
  viewerBody.innerHTML = url.endsWith(".mp4")
    ? `<video src="${url}" controls></video>`
    : `<img src="${url}" style="max-width:100%">`;
}

function closeViewer() {
  viewer.style.display = "none";
}

/*********************************************************
 * LOGOUT
 *********************************************************/
function logout() {
  auth.signOut().then(() => {
    window.location.href = "index.html";
  });
}

