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
  const text = "Saw an incident? Report now for fast-track solution!!";
  let index = 0;
  let typing = true;

  typingText.innerText = "";

  setInterval(() => {
    if (typing) {
      typingText.innerText = text.slice(0, index);
      index++;

      // Finished typing
      if (index > text.length) {
        typing = false;

        // Pause 5 seconds before restarting
        setTimeout(() => {
          index = 0;
          typingText.innerText = "";
          typing = true;
        }, 5000);
      }
    }
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
  modalMsg.innerText = "Submitting...";

  const type = incidentType.value;
  const desc = incidentDesc.value.trim();
  const state = incidentState.value;
  const city = incidentCity.value.trim();
  const address = incidentAddress.value.trim();
  const file = incidentFile.files[0];

  if (!type || !desc || !state || !city || !address) {
    modalMsg.innerText = "Please fill all fields";
    return;
  }

  const time = firebase.firestore.Timestamp.now();

  await finalizeIncident(type, desc, state, city, address, file, time);
}

async function finalizeIncident(type, desc, state, city, address, file, time) {
  try {
    //Duplicate check
    const fiveMinAgo = firebase.firestore.Timestamp.fromMillis(
      time.toMillis() - 5 * 60 * 1000
    );

    const dupes = await db.collection("incidents")
      .where("type", "==", type)
      .where("city", "==", city)
      .where("time", ">", fiveMinAgo)
      .get();

    if (!dupes.empty) {
      modalMsg.innerText =
        "A similar incident was reported here recently.";
      return;
    }

    // Media upload (OPTIONAL, SAFE)
    let mediaURL = null;

    //if (file) {
      //const ref = storage.ref(`media/${Date.now()}_${file.name}`);
      //await ref.put(file);
      //mediaURL = await ref.getDownloadURL();
    //}

    // Firestore write
    await db.collection("incidents").add({
      type,
      desc,
      state,
      city,
      address,
      media: mediaURL,
      time,
      status: "Pending",
      verified: "Not Verified",
      uid: auth.currentUser.uid
    });

    modalMsg.innerText = "Submitted successfully";
    showToast("Incident reported", "success");
    setTimeout(closeModal, 800);

  } catch (err) {
    console.error("SUBMIT ERROR:", err);
    modalMsg.innerText = "Submission failed. Check console.";
    showToast("Submission failed", "error");
  }
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






