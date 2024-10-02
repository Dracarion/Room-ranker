import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-analytics.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC7Qfwb2A_4SJYCregOLNy2CklvmVwiCwE",
  authDomain: "hotel-concierge-helper.firebaseapp.com",
  projectId: "hotel-concierge-helper",
  storageBucket: "hotel-concierge-helper.appspot.com",
  messagingSenderId: "639033027138",
  appId: "1:639033027138:web:64375ae8a026e6d402dbdb",
  measurementId: "G-HGTD7BVC2Q"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// Utility functions
function mostraErrore(messaggio) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = messaggio;
  document.body.appendChild(errorDiv);
  setTimeout(() => errorDiv.remove(), 5000);
}

function mostraCaricamento() {
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'loading';
  loadingDiv.textContent = 'Caricamento...';
  document.body.appendChild(loadingDiv);
  return loadingDiv;
}

// Authentication and main page rendering
function mostraPaginaLogin() {
  const appDiv = document.getElementById('app');
  appDiv.innerHTML = `
    <div class="login-container">
      <h1>Accesso</h1>
      <form id="login-form">
        <input type="email" id="email" placeholder="Email" required>
        <input type="password" id="password" placeholder="Password" required>
        <button type="submit">Accedi</button>
      </form>
    </div>
  `;

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const loading = mostraCaricamento();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Errore di accesso:', error);
      mostraErrore('Errore di accesso. Controlla le tue credenziali.');
    } finally {
      loading.remove();
    }
  });
}

async function mostraDashboard() {
  const appDiv = document.getElementById('app');
  appDiv.innerHTML = `
    <div class="dashboard">
      <div class="dashboard-header">
        <div id="calendar-content" class="calendar-container"></div>
        <div class="welcome-sign">
          <h1>Benvenuto, <span id="user-name"></span></h1>
          <button id="logout-button">Esci</button>
        </div>
      </div>
      <div class="dashboard-grid">
        <div class="dashboard-item" id="ristoranti">
          <h2>Prenotazioni Ristorante</h2>
          <div class="dashboard-content"></div>
          <button class="view-more" data-section="ristoranti">Vedi Tutto</button>
        </div>
        <div class="dashboard-item" id="vini">
          <h2>Inventario Vini</h2>
          <div class="dashboard-content"></div>
          <button class="view-more" data-section="vini">Vedi Tutto</button>
        </div>
        <div class="dashboard-item" id="tour-trasferimenti">
          <h2>Tour e Trasferimenti</h2>
          <div class="dashboard-content"></div>
          <button class="view-more" data-section="tour-trasferimenti">Vedi Tutto</button>
        </div>
        <div class="dashboard-item" id="recensioni-camere">
          <h2>Recensioni Camere</h2>
          <div class="dashboard-content"></div>
          <button class="view-more" data-section="recensioni-camere">Vedi Tutto</button>
        </div>
      </div>
      <div id="dashboard-stats"></div>
      <button id="riepilogo-mensile-button">Mostra Riepilogo Mensile</button>
    </div>
  `;

  document.getElementById('logout-button').addEventListener('click', async () => {
    const loading = mostraCaricamento();
    try {
      await signOut(auth);
      console.log('Utente disconnesso');
    } catch (error) {
      console.error('Errore durante la disconnessione:', error);
      mostraErrore('Errore durante la disconnessione. Riprova più tardi.');
    } finally {
      loading.remove();
    }
  });

  document.querySelectorAll('.view-more').forEach(button => {
    button.addEventListener('click', (e) => {
      const section = e.target.getAttribute('data-section');
      mostraPaginaSezione(section);
    });
  });

  document.getElementById('riepilogo-mensile-button').addEventListener('click', mostraRiepilogoMensile);

  mostraCalendario();

  const loading = mostraCaricamento();
  try {
    const stats = await calcolaStatisticheDashboard();
    const statsDiv = mostraStatisticheDashboard(stats);
    document.getElementById('dashboard-stats').appendChild(statsDiv);
    await popolaDashboard();
  } catch (error) {
    console.error('Errore nel caricamento della dashboard:', error);
    mostraErrore('Errore nel caricamento della dashboard. Riprova più tardi.');
  } finally {
    loading.remove();
  }

  // Set user name in the welcome message
  const user = auth.currentUser;
  if (user) {
    document.getElementById('user-name').textContent = user.displayName || user.email;
  }
}

// ... (continued from Part 1)

// Section pages and forms
function mostraPaginaSezione(sezione) {
  const appDiv = document.getElementById('app');
  let content = '';

  switch(sezione) {
    case 'ristoranti':
      content = `
        <h1>Prenotazioni Ristorante</h1>
        <ul id="prenotazioni-list"></ul>
        <button id="aggiungi-prenotazione">Aggiungi Prenotazione</button>
      `;
      break;
    case 'vini':
      content = `
        <h1>Inventario Vini</h1>
        <ul id="vini-list"></ul>
        <button id="aggiungi-vino">Aggiungi Vino</button>
      `;
      break;
    case 'tour-trasferimenti':
      content = `
        <h1>Tour e Trasferimenti</h1>
        <ul id="tour-list"></ul>
        <button id="aggiungi-tour">Aggiungi Tour/Trasferimento</button>
      `;
      break;
    case 'recensioni-camere':
      content = `
        <h1>Recensioni Camere</h1>
        <ul id="recensioni-list"></ul>
        <button id="aggiungi-recensione">Aggiungi Recensione</button>
      `;
      break;
  }

  appDiv.innerHTML = `
    <div class="section-page">
      ${content}
      <button id="torna-dashboard">Torna alla Dashboard</button>
    </div>
  `;

  document.getElementById('torna-dashboard').addEventListener('click', mostraDashboard);

  if (sezione === 'ristoranti') {
    caricaPrenotazioniRistorante();
    document.getElementById('aggiungi-prenotazione').addEventListener('click', mostraFormPrenotazione);
  } else if (sezione === 'vini') {
    caricaInventarioVini();
    document.getElementById('aggiungi-vino').addEventListener('click', mostraFormVino);
  } else if (sezione === 'tour-trasferimenti') {
    caricaTourETrasferimenti();
    document.getElementById('aggiungi-tour').addEventListener('click', mostraFormTour);
  } else if (sezione === 'recensioni-camere') {
    caricaRecensioniCamere();
    document.getElementById('aggiungi-recensione').addEventListener('click', mostraFormRecensione);
  }
}

function mostraFormPrenotazione() {
  const formHTML = `
    <div class="form-container">
      <h2>Aggiungi Prenotazione</h2>
      <form id="prenotazione-form">
        <input type="text" id="nome-cliente" placeholder="Nome Cliente" required>
        <input type="text" id="nome-ristorante" placeholder="Nome Ristorante" required>
        <input type="date" id="data-prenotazione" required>
        <input type="time" id="ora-prenotazione" required>
        <input type="number" id="numero-persone" placeholder="Numero di persone" required>
        <select id="stato-prenotazione">
          <option value="confermata">Confermata</option>
          <option value="in attesa">In Attesa</option>
        </select>
        <button type="submit">Salva Prenotazione</button>
      </form>
    </div>
  `;
  
  document.querySelector('.section-page').innerHTML = formHTML;
  
  document.getElementById('prenotazione-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const loading = mostraCaricamento();
    try {
      const prenotazione = {
        nomeCliente: document.getElementById('nome-cliente').value,
        nomeRistorante: document.getElementById('nome-ristorante').value,
        data: new Date(`${document.getElementById('data-prenotazione').value}T${document.getElementById('ora-prenotazione').value}`),
        numeropersone: parseInt(document.getElementById('numero-persone').value),
        stato: document.getElementById('stato-prenotazione').value
      };
      await addDoc(collection(db, 'prenotazioni'), prenotazione);
      alert('Prenotazione aggiunta con successo!');
      caricaPrenotazioniRistorante();
    } catch (error) {
      console.error('Errore durante il salvataggio della prenotazione:', error);
      mostraErrore('Errore durante il salvataggio della prenotazione. Riprova più tardi.');
    } finally {
      loading.remove();
    }
  });
}

// ... (other form functions: mostraFormVino, mostraFormTour, mostraFormRecensione)

// ... (continued in Part 3)
// ... (continued from Part 2)

// Data loading functions
async function caricaPrenotazioniRistorante() {
  const loading = mostraCaricamento();
  try {
    const prenotazioniRef = collection(db, 'prenotazioni');
    const prenotazioniSnapshot = await getDocs(query(prenotazioniRef, orderBy('data')));
    const prenotazioniList = document.getElementById('prenotazioni-list');
    prenotazioniList.innerHTML = '';
    prenotazioniSnapshot.forEach(doc => {
      const prenotazione = doc.data();
      const li = document.createElement('li');
      li.textContent = `${prenotazione.nomeCliente} - ${prenotazione.nomeRistorante} - ${prenotazione.data.toDate().toLocaleString()} - ${prenotazione.numeropersone} persone - ${prenotazione.stato}`;
      
      if (prenotazione.stato === 'in attesa') {
        const confermaButton = document.createElement('button');
        confermaButton.textContent = 'Conferma';
        confermaButton.classList.add('conferma-prenotazione');
        confermaButton.addEventListener('click', () => confermaPrenotazione(doc.id));
        li.appendChild(confermaButton);
      }
      
      prenotazioniList.appendChild(li);
    });
  } catch (error) {
    console.error('Errore nel caricamento delle prenotazioni:', error);
    mostraErrore('Errore nel caricamento delle prenotazioni. Riprova più tardi.');
  } finally {
    loading.remove();
  }
}

async function confermaPrenotazione(prenotazioneId) {
  const loading = mostraCaricamento();
  try {
    const prenotazioneRef = doc(db, 'prenotazioni', prenotazioneId);
    await updateDoc(prenotazioneRef, {
      stato: 'confermata'
    });
    alert('Prenotazione confermata con successo!');
    caricaPrenotazioniRistorante();
  } catch (error) {
    console.error('Errore durante la conferma della prenotazione:', error);
    mostraErrore('Errore durante la conferma della prenotazione. Riprova più tardi.');
  } finally {
    loading.remove();
  }
}

async function caricaInventarioVini() {
  const loading = mostraCaricamento();
  try {
    const viniRef = collection(db, 'vini');
    const viniSnapshot = await getDocs(query(viniRef, orderBy('nome')));
    const viniList = document.getElementById('vini-list');
    viniList.innerHTML = '';
    viniSnapshot.forEach(doc => {
      const vino = doc.data();
      const li = document.createElement('li');
      li.textContent = `${vino.nome} - ${vino.quantita} bottiglie - ${vino.tipo} - ${vino.anno}`;
      viniList.appendChild(li);
    });
  } catch (error) {
    console.error('Errore nel caricamento dell\'inventario vini:', error);
    mostraErrore('Errore nel caricamento dell\'inventario vini. Riprova più tardi.');
  } finally {
    loading.remove();
  }
}

async function caricaTourETrasferimenti() {
  const loading = mostraCaricamento();
  try {
    const tourRef = collection(db, 'tour');
    const tourSnapshot = await getDocs(query(tourRef, orderBy('data')));
    const tourList = document.getElementById('tour-list');
    tourList.innerHTML = '';
    tourSnapshot.forEach(doc => {
      const tour = doc.data();
      const li = document.createElement('li');
      li.textContent = `${tour.nome} - ${tour.data.toDate().toLocaleString()} - ${tour.numeropersone} persone - ${tour.stato}`;
      tourList.appendChild(li);
    });
  } catch (error) {
    console.error('Errore nel caricamento dei tour e trasferimenti:', error);
    mostraErrore('Errore nel caricamento dei tour e trasferimenti. Riprova più tardi.');
  } finally {
    loading.remove();
  }
}

async function caricaRecensioniCamere() {
  const loading = mostraCaricamento();
  try {
    const recensioniRef = collection(db, 'recensioni');
    const recensioniSnapshot = await getDocs(query(recensioniRef, orderBy('data', 'desc')));
    const recensioniList = document.getElementById('recensioni-list');
    recensioniList.innerHTML = '';
    recensioniSnapshot.forEach(doc => {
      const recensione = doc.data();
      const li = document.createElement('li');
      li.textContent = `Camera ${recensione.numeroCamera} - Punteggio: ${recensione.punteggio} - ${recensione.data.toDate().toLocaleDateString()} - ${recensione.commento}`;
      recensioniList.appendChild(li);
    });
  } catch (error) {
    console.error('Errore nel caricamento delle recensioni:', error);
    mostraErrore('Errore nel caricamento delle recensioni. Riprova più tardi.');
  } finally {
    loading.remove();
  }
}

// Calendar functions
function mostraCalendario() {
  const oggi = new Date();
  let annoCorrente = oggi.getFullYear();
  let meseCorrente = oggi.getMonth();

  const calendarContent = document.getElementById('calendar-content');
  calendarContent.innerHTML = `
    <div class="controlli-mese">
      <button id="mese-precedente">&lt; Precedente</button>
      <span id="mese-corrente"></span>
      <button id="mese-successivo">Successivo &gt;</button>
    </div>
    <div id="calendario-container"></div>
  `;

  function aggiornaCalendario() {
    document.getElementById('mese-corrente').textContent = `${meseCorrente + 1}/${annoCorrente}`;
    document.getElementById('calendario-container').innerHTML = creaCalendario(annoCorrente, meseCorrente);
    caricaEventiCalendario();
  }

  document.getElementById('mese-precedente').addEventListener('click', () => {
    meseCorrente--;
    if (meseCorrente < 0) {
      meseCorrente = 11;
      annoCorrente--;
    }
    aggiornaCalendario();
  });

  document.getElementById('mese-successivo').addEventListener('click', () => {
    meseCorrente++;
    if (meseCorrente > 11) {
      meseCorrente = 0;
      annoCorrente++;
    }
    aggiornaCalendario();
  });

  aggiornaCalendario();
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      mostraDashboard();
    } else {
      mostraPaginaLogin();
    }
  });
});
// ... (continued in Part 2)
