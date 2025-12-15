import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getDatabase, ref, push, onValue, remove } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

// --- 1. CONFIG ---
const firebaseConfig = {
    apiKey: "AIzaSyDFlLuKQIxbpXCrJP0OllGqhjtwiFZ3L6c",
    authDomain: "note-boi-ac10a.firebaseapp.com",
    databaseURL: "https://note-boi-ac10a-default-rtdb.firebaseio.com",
    projectId: "note-boi-ac10a",
    storageBucket: "note-boi-ac10a.firebasestorage.app",
    messagingSenderId: "630626577738",
    appId: "1:630626577738:web:6e2b1f79e20eeaf466a5b3",
    measurementId: "G-5VW3C6DDZ1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

let currentUser = null;
let vaultData = [];
let authMode = 'login';
let visiblePasswords = {};

// --- 2. AUTH ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('userEmailDisplay').textContent = user.email;
        switchScreen('vault');
        initVaultListener(user.uid);
    } else {
        currentUser = null;
        vaultData = [];
        switchScreen('auth');
    }
});

window.handleAuth = async (e) => {
    e.preventDefault();
    const email = document.getElementById('authEmail').value;
    const pass = document.getElementById('authPass').value;
    const btn = document.getElementById('authBtn');

    btn.disabled = true;
    btn.innerText = "Processing...";
    document.getElementById('authError').classList.add('hidden');

    try {
        if (authMode === 'login') {
            await signInWithEmailAndPassword(auth, email, pass);
        } else {
            await createUserWithEmailAndPassword(auth, email, pass);
        }
    } catch (error) {
        let msg = "Error: " + error.code;
        if (error.code === 'auth/wrong-password') msg = "Incorrect Password";
        if (error.code === 'auth/user-not-found') msg = "User not found";
        showAuthError(msg);
        btn.disabled = false;
        btn.innerText = (authMode === 'login') ? "Open Vault" : "Create Vault";
    }
};

window.handleForgotPassword = async () => {
    const email = document.getElementById('authEmail').value;
    if(!email) { showAuthError("Please enter your email address first."); return; }
    try {
        await sendPasswordResetEmail(auth, email);
        alert(`Password reset email sent to ${email}. Check your inbox!`);
    } catch (error) {
        showAuthError("Failed to send reset email: " + error.code);
    }
};

window.toggleAuthMode = () => {
    const title = document.querySelector('#viewAuth h1');
    const btn = document.getElementById('authBtn');
    const toggleText = document.getElementById('authToggleText');
    const toggleBtn = document.getElementById('authToggleBtn');
    const forgotLink = document.getElementById('forgotPassContainer');

    if (authMode === 'login') {
        authMode = 'signup';
        title.textContent = "Create Account";
        btn.textContent = "Create Vault";
        toggleText.textContent = "Already have a vault?";
        toggleBtn.textContent = "Log In";
        forgotLink.classList.add('hidden');
    } else {
        authMode = 'login';
        title.textContent = "SecureVault";
        btn.textContent = "Open Vault";
        toggleText.textContent = "First time here?";
        toggleBtn.textContent = "Create Vault";
        forgotLink.classList.remove('hidden');
    }
};

window.handleLogout = () => {
    signOut(auth);
};

function showAuthError(msg) {
    document.getElementById('authErrorText').textContent = msg;
    document.getElementById('authError').classList.remove('hidden');
}

// --- 3. VAULT LOGIC ---
function initVaultListener(uid) {
    const vaultRef = ref(db, 'users/' + uid + '/vault');
    onValue(vaultRef, (snapshot) => {
        const data = snapshot.val();
        vaultData = [];
        visiblePasswords = {}; 
        if (data) {
            Object.keys(data).forEach(key => {
                vaultData.push({ id: key, ...data[key] });
            });
        }
        renderVault();
    });
}

window.saveItem = () => {
    const site = document.getElementById('inputSite').value;
    const user = document.getElementById('inputUser').value;
    const pass = document.getElementById('inputPass').value;

    if (!site || !pass) { alert("Please fill in Website and Password"); return; }

    const vaultRef = ref(db, 'users/' + currentUser.uid + '/vault');
    push(vaultRef, {
        siteName: site,
        username: user,
        password: pass,
        timestamp: Date.now()
    });

    closeModal();
    showToast("Saved Successfully!");
    
    document.getElementById('inputSite').value = '';
    document.getElementById('inputUser').value = '';
    document.getElementById('inputPass').value = '';
};

window.deleteItem = (id) => {
    if(confirm("Are you sure? This cannot be undone.")) {
        const itemRef = ref(db, 'users/' + currentUser.uid + '/vault/' + id);
        remove(itemRef);
    }
};

window.copyPassword = (id) => {
    const item = vaultData.find(x => x.id === id);
    if (!item) return;
    navigator.clipboard.writeText(item.password).then(() => {
        showToast("Password Copied!");
    });
};

// --- 4. EXPORT ---
window.exportData = (format) => {
    if(!vaultData.length) { alert("Vault is empty."); return; }
    if(!confirm("Download your passwords? Keep this file safe!")) return;

    let exportRows = [];
    vaultData.forEach(item => {
        exportRows.push({ site: item.siteName, username: item.username, password: item.password });
    });

    if (format === 'pdf') {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text("My Vault Backup", 14, 22);
        doc.setFontSize(11);
        doc.text(`Exported: ${new Date().toLocaleDateString()}`, 14, 30);

        const tableColumn = ["Website", "Username", "Password"];
        const tableRows = [];

        exportRows.forEach(row => {
            tableRows.push([row.site, row.username, row.password]);
        });

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 40,
        });
        doc.save('vault_backup.pdf');

    } else if (format === 'json') {
        const content = JSON.stringify(exportRows, null, 2);
        const blob = new Blob([content], { type: "application/json" });
        downloadBlob(blob, "vault_backup.json");
    } else {
        // CSV
        let content = "Website,Username,Password\n";
        exportRows.forEach(row => {
            content += `"${row.site}","${row.username}","${row.password}"\n`;
        });
        const blob = new Blob([content], { type: "text/csv" });
        downloadBlob(blob, "vault_backup.csv");
    }
};

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// --- 5. GENERATOR ---
window.updateGenDisplay = () => {
    const len = document.getElementById('genLength').value;
    document.getElementById('charLengthDisplay').textContent = len + " Chars";
    runGenerator();
};

window.runGenerator = () => {
    const length = parseInt(document.getElementById('genLength').value);
    const useUpper = document.getElementById('useUpper').checked;
    const useLower = document.getElementById('useLower').checked;
    const useNums = document.getElementById('useNums').checked;
    const useSyms = document.getElementById('useSyms').checked;
    
    const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lower = "abcdefghijklmnopqrstuvwxyz";
    const nums = "0123456789";
    const syms = "!@#$%^&*()_+-=[]{}|;:,.<>?";
    
    let chars = "";
    if(useUpper) chars += upper;
    if(useLower) chars += lower;
    if(useNums) chars += nums;
    if(useSyms) chars += syms;

    if(chars === "") { document.getElementById('inputPass').value = ""; return; }
    
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    document.getElementById('inputPass').value = result;
};

// --- 6. UI RENDERER ---
window.toggleCardVisibility = (id) => {
    visiblePasswords[id] = !visiblePasswords[id];
    renderVault(document.getElementById('searchInput').value);
};

function renderVault(filter = "") {
    const grid = document.getElementById('vaultGrid');
    const empty = document.getElementById('emptyState');
    grid.innerHTML = '';

    const filtered = vaultData.filter(item => 
        item.siteName.toLowerCase().includes(filter.toLowerCase())
    );

    if (filtered.length === 0) {
        empty.classList.remove('hidden');
        return;
    }
    empty.classList.add('hidden');

    filtered.forEach(item => {
        const letter = item.siteName.charAt(0).toUpperCase();
        const displayUser = item.username || "No Username";
        
        const isVisible = visiblePasswords[item.id];
        const displayPass = isVisible ? item.password : "••••••••••••";
        const eyeIconPath = isVisible 
            ? "M10 12a2 2 0 100-4 2 2 0 000 4z M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" 
            : "M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.064 7 9.542 7 .847 0 1.669-.105 2.454-.303z"; 

        const card = document.createElement('div');
        card.className = "bg-white p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-slate-100 flex flex-col justify-between h-48 group";
        card.innerHTML = `
            <div class="flex justify-between items-start">
                <div class="flex items-center gap-3 w-full">
                    <div class="w-10 h-10 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-lg flex-shrink-0">
                        ${letter}
                    </div>
                    <div class="overflow-hidden w-full pr-2">
                        <h3 class="font-bold text-slate-800 truncate text-lg">${item.siteName}</h3>
                        <p class="text-xs text-slate-500 truncate font-mono mt-0.5">${displayUser}</p>
                    </div>
                </div>
                <button onclick="deleteItem('${item.id}')" class="text-slate-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 -mt-2 -mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
                </button>
            </div>

            <div class="bg-slate-50 rounded-lg p-2.5 flex items-center justify-between border border-slate-100 mt-2">
                 <span class="font-mono text-sm text-slate-600 truncate mr-2 select-all">${displayPass}</span>
                 <button onclick="toggleCardVisibility('${item.id}')" class="text-slate-400 hover:text-indigo-600">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="${eyeIconPath}" clip-rule="evenodd" />
                    </svg>
                 </button>
            </div>
            
            <button onclick="copyPassword('${item.id}')" class="w-full bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white py-2 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 mt-auto active:scale-95">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                Copy
            </button>
        `;
        grid.appendChild(card);
    });
}

function filterVault() {
    const term = document.getElementById('searchInput').value;
    renderVault(term);
}

function switchScreen(screenName) {
    const authDiv = document.getElementById('viewAuth');
    const vaultDiv = document.getElementById('viewVault');
    if (screenName === 'auth') {
        authDiv.classList.remove('hidden');
        vaultDiv.classList.add('hidden');
    } else {
        authDiv.classList.add('hidden');
        vaultDiv.classList.remove('hidden');
    }
}

const modalOverlay = document.getElementById('modalOverlay');
const modalCard = document.getElementById('modalCard');

window.openModal = () => {
    modalOverlay.classList.remove('hidden');
    setTimeout(() => {
        modalCard.classList.remove('scale-95', 'opacity-0');
        modalCard.classList.add('scale-100', 'opacity-100');
    }, 10);
    updateGenDisplay();
};

window.closeModal = () => {
    modalCard.classList.remove('scale-100', 'opacity-100');
    modalCard.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modalOverlay.classList.add('hidden');
    }, 300);
};

function showToast(message) {
    const toast = document.getElementById('toast');
    document.getElementById('toastMsg').textContent = message;
    toast.classList.remove('opacity-0', 'translate-y-[-20px]');
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-[-20px]');
    }, 3000);
}