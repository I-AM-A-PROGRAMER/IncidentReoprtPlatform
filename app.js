/***********************
 * FIREBASE SETUP
 ***********************/
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

/********* CONFIG *********/
const firebaseConfig = {
  apiKey: "AIzaSyAzWMhMAU09WjOboL5SnEcEMD7FSrJK2Mc",
  authDomain: "authentication-f62b4.firebaseapp.com",
  projectId: "authentication-f62b4",
  storageBucket: "authentication-f62b4.firebasestorage.app",
  messagingSenderId: "461551814952",
  appId: "1:461551814952:web:a2132a5f306c7452cca81d"
};

const ADMIN_EMAILS = ["admin@gmail.com"]; // ADD YOUR ADMIN MAILS

/********* INIT *********/
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

/***********************
 * UTILITIES
 ***********************/
function toast(msg, type = "success") {
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.innerText = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add("show"), 10);
  setTimeout(() => {
    t.classList.remove("show");
    setTimeout(() => t.remove(), 300);
  }, 3000);
}

/***********************
 * AUTH (LOGIN / SIGNUP)
 ***********************/
window.loginEmail = async () => {
  const email = emailInput.value;
  const pass = passwordInput.value;
  try {
    await signInWithEmailAndPassword(auth, email, pass);
    toast("Login successful");
  } catch (e) {
    toast(e.message, "error");
  }
};

window.signupEmail = async () => {
  const email = emailInput.value;
  const pass = passwordInput.value;
  try {
    await createUserWithEmailAndPassword(auth, email, pass);
    toast("Account created");
  } catch (e) {
    toast(e.message, "error");
  }
};

window.googleLogin = async () => {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
    toast("Logged in with Google");
  } catch (e) {
    toast(e.message, "error");
  }
};

window.logout = async () => {
  await signOut(auth);
  window.location.href = "index.html";
};

/***********************
 * AUTH STATE
 ***********************/
onAuthStateChanged(auth, user => {
  const page = document.body.dataset.page;

  if (page === "login" && user) {
    window.location.href = "dashboard.html";
    return;
  }

  if (page === "dashboard") {
    if (!user) {
      window.location.href = "index.html";
      return;
    }

    const isAdmin = ADMIN_EMAILS.includes(user.email);
    document.getElementById("userWelcome").innerText =
      "Hi, " + user.email.split("@")[0];

    if (isAdmin) {
      document.getElementById("adminPanel").classList.remove("hidden");
    }

    startHeroTyping();
    listenIncidents(isAdmin);
  }
});

/***********************
 * HERO TYPING
 ***********************/
const HERO_TEXT = "Saw an incident? Report now for fast-track solution";

async function startHeroTyping() {
  const el = document.getElementById("heroTypingText");
  if (!el) return;

  while (true) {
    el.innerText = "";
    for (let c of HERO_TEXT) {
      el.innerText += c;
      await sleep(50);
    }
    await sleep(5000);
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/***********************
 * REPORT INCIDENT
 ***********************/
window.submitIncident = async () => {
  const type = incidentType.value;
  const desc = incidentDesc.value.trim();
  const state = incidentState.value;
  const city = incidentCity.value.trim();
  const address = incidentAddress.value.trim();
  const file = incidentFile.files[0];

  if (!desc || !state || !city) {
    toast("Please fill required fields", "error");
    return;
  }

  let mediaURL = null;

  try {
    if (file) {
      const storageRef = ref(storage, `media/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      mediaURL = await getDownloadURL(storageRef);
    }

    await addDoc(collection(db, "incidents"), {
      type,
      desc,
      state,
      city,
      address,
      media: mediaURL,
      status: "Pending",
      verified: "Not Verified",
      time: Date.now()
    });

    toast("Incident reported successfully");
    closeModal();
  } catch (e) {
    toast(e.message, "error");
  }
};

/***********************
 * LISTEN INCIDENTS
 ***********************/
function listenIncidents(isAdmin) {
  const q = query(collection(db, "incidents"), orderBy("time", "desc"));
  onSnapshot(q, snap => {
    userTable.innerHTML = "";
    snap.forEach(docSnap => {
      const d = docSnap.data();
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${d.type}</td>
        <td>${d.desc}</td>
        <td>${d.city}</td>
        <td>
          ${d.media ? `<button onclick="viewMedia('${d.media}')">View</button>` : "—"}
        </td>
        <td>${new Date(d.time).toLocaleString()}</td>
        <td>${d.status}</td>
        <td>
          ${isAdmin ? `
            <select onchange="verifyIncident('${docSnap.id}', this.value)">
              <option ${d.verified==="Not Verified"?"selected":""}>Not Verified</option>
              <option ${d.verified==="Verified"?"selected":""}>Verified</option>
            </select>` : d.verified}
        </td>
      `;
      userTable.appendChild(tr);
    });
  });
}

/***********************
 * ADMIN VERIFY
 ***********************/
window.verifyIncident = async (id, value) => {
  await updateDoc(doc(db, "incidents", id), {
    verified: value
  });
  toast("Verification updated");
};

/***********************
 * MEDIA VIEW
 ***********************/
window.viewMedia = url => {
  const w = window.open();
  w.document.write(`<img src="${url}" style="max-width:100%">`);
};
