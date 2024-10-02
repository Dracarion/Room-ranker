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

// Funzione di utilità per mostrare messaggi di errore
function mostraErrore(messaggio) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = messaggio;
  document.body.appendChild(errorDiv);
  setTimeout(() => errorDiv.remove(), 5000);
}

// Funzione di utilità per mostrare il caricamento
function mostraCaricamento() {
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'loading';
  loadingDiv.textContent = 'Caricamento...';
  document.body.appendChild(loadingDiv);
  return loadingDiv;
}

// Check authentication state
onAuthStateChanged(auth, (user) => {
  if (user) {
    mostraDashboard();
  } else {
    mostraPaginaLogin();
  }
});

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
      <h1>Dashboard Reception</h1>
      <div id="dashboard-stats"></div>
      <div id="calendar-content"></div>
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
      <button id="riepilogo-mensile-button">Mostra Riepilogo Mensile</button>
      <button id="logout-button">Esci</button>
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
}

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

async function popolaDashboard() {
  try {
    const [prenotazioni, vini, tour, recensioni] = await Promise.all([
      getUltimePrenotazioniRistoranti(),
      getRiepilogoInventarioVini(),
      getUltimiTourETrasferimenti(),
      getRiepilogoRecensioniCamere()
    ]);

    const ristorantiContent = document.querySelector('#ristoranti .dashboard-content');
    ristorantiContent.innerHTML = `
      <div class="top-section">
        <h3>Prenotazioni Confermate</h3>
        <ul>${prenotazioni.confermate.map(p => `<li>${p.nomeRistorante} - ${p.data.toDate().toLocaleDateString()} - ${p.numeropersone} persone</li>`).join('')}</ul>
      </div>
      <div class="bottom-section">
        <h3>Prenotazioni da Confermare</h3>
        <ul>${prenotazioni.inAttesa.map(p => `<li>${p.nomeRistorante} - ${p.data.toDate().toLocaleDateString()} - ${p.numeropersone} persone</li>`).join('')}</ul>
      </div>
    `;

    const viniContent = document.querySelector('#vini .dashboard-content');
    viniContent.innerHTML = `
      <h3>Inventario Vini</h3>
      <ul>${vini.map(v => `<li>${v.nome} - ${v.quantita} bottiglie</li>`).join('')}</ul>
    `;

    const tourContent = document.querySelector('#tour-trasferimenti .dashboard-content');
    tourContent.innerHTML = `
      <div class="top-section">
        <h3>Tour e Trasferimenti Confermati</h3>
        <ul>${tour.confermati.map(t => `<li>${t.tipo} - ${t.data.toDate().toLocaleDateString()} - ${t.numeropersone} persone</li>`).join('')}</ul>
      </div>
      <div class="bottom-section">
        <h3>Tour e Trasferimenti da Confermare</h3>
        <ul>${tour.inAttesa.map(t => `<li>${t.tipo} - ${t.data.toDate().toLocaleDateString()} - ${t.numeropersone} persone</li>`).join('')}</ul>
      </div>
    `;

    const recensioniContent = document.querySelector('#recensioni-camere .dashboard-content');
    recensioniContent.innerHTML = `
      <h3>Top 10 Camere per Recensioni</h3>
      <ul>${recensioni.map(r => `<li>Camera ${r.numero} - Punteggio: ${r.punteggioMedio.toFixed(1)}</li>`).join('')}</ul>
    `;

  } catch (error) {
    console.error('Errore nel recupero dei dati:', error);
    mostraErrore('Si è verificato un errore nel caricamento dei dati. Riprova più tardi.');
  }
}

// Funzioni per recuperare dati da Firestore
async function getUltimePrenotazioniRistoranti() {
  const now = new Date();
  const prenotazioniRef = collection(db, 'prenotazioni');
  
  const prenotazioniConfermate = await getDocs(query(prenotazioniRef, where('data', '>=', now), where('stato', '==', 'confermata'), orderBy('data'), limit(5)));
  const prenotazioniInAttesa = await getDocs(query(prenotazioniRef, where('data', '>=', now), where('stato', '==', 'in attesa'), orderBy('data'), limit(5)));

  return {
    confermate: prenotazioniConfermate.docs.map(doc => ({ id: doc.id, ...doc.data() })),
    inAttesa: prenotazioniInAttesa.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  };
}

async function getRiepilogoInventarioVini() {
  const viniRef = collection(db, 'vini');
  const vini = await getDocs(viniRef);
  
  return vini.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function getUltimiTourETrasferimenti() {
  const now = new Date();
  const tourRef = collection(db, 'tour');
  
  const tourConfermati = await getDocs(query(tourRef, where('data', '>=', now), where('stato', '==', 'confermato'), orderBy('data'), limit(5)));
  const tourInAttesa = await getDocs(query(tourRef, where('data', '>=', now), where('stato', '==', 'in attesa'), orderBy('data'), limit(5)));

  return {
    confermati: tourConfermati.docs.map(doc => ({ id: doc.id, ...doc.data() })),
    inAttesa: tourInAttesa.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  };
}

async function getRiepilogoRecensioniCamere() {
  const camereRef = collection(db, 'camere');
  const camere = await getDocs(query(camereRef, orderBy('punteggioMedio', 'desc'), limit(10)));
  
  return camere.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

function creaCalendario(anno, mese) {
  const primoGiorno = new Date(anno, mese, 1);
  const ultimoGiorno = new Date(anno, mese + 1, 0);
  const oggi = new Date();

  let html = `<table class="calendario">
    <tr>
      <th>Dom</th><th>Lun</th><th>Mar</th><th>Mer</th><th>Gio</th><th>Ven</th><th>Sab</th>
    </tr><tr>`;

  for (let i = 0; i < primoGiorno.getDay(); i++) {
    html += '<td class="altro-mese"></td>';
  }

  for (let i = 1; i <= ultimoGiorno.getDate(); i++) {
    if ((primoGiorno.getDay() + i - 1) % 7 === 0 && i !== 1) {
      html += '</tr><tr>';
    }
    const classeOggi = (i === oggi.getDate() && mese === oggi.getMonth() && anno === oggi.getFullYear()) ? ' oggi' : '';
    html += `<td class="${classeOggi}">${i}<div class="eventi" id="eventi-${i}"></div></td>`;
  }

  for (let i = ultimoGiorno.getDay(); i < 6; i++) {
    html += '<td class="altro-mese"></td>';
  }

  html += '</tr></table>';
  return html;
}

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

async function caricaEventiCalendario() {
  const annoCorrente = parseInt(document.getElementById('mese-corrente').textContent.split('/')[1]);
  const meseCorrente = parseInt(document.getElementById('mese-corrente').textContent.split('/')[0]) - 1;
  
  const dataInizio = new Date(annoCorrente, meseCorrente, 1);
  const dataFine = new Date(annoCorrente, meseCorrente + 1, 0);

  const eventi = await recuperaEventiDaFirebase(dataInizio, dataFine);

  eventi.forEach(evento => {
    const giorno = evento.data.toDate().getDate();
    const eventoDiv = document.getElementById(`eventi-${giorno}`);
    if (eventoDiv) {
      eventoDiv.innerHTML += `<div class="evento">${evento.tipo}: ${evento.descrizione}</div>`;
    }
  });
}

async function recuperaEventiDaFirebase(dataInizio, dataFine) {
  const eventiRef = collection(db, 'eventi');
  const q = query(eventiRef, where('data', '>=', dataInizio), where('data', '<=', dataFine));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Funzioni statistiche
async function calcolaStatisticheDashboard() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [prenotazioni, vini, tour, recensioni] = await Promise.all([
    getDocs(query(collection(db, 'prenotazioni'), where('data', '>=', startOfMonth))),
    getDocs(collection(db, 'vini')),
    getDocs(query(collection(db, 'tour'), where('data', '>=', startOfMonth))),
    getDocs(collection(db, 'recensioni'))
  ]);

  return {
    prenotazioniMese: prenotazioni.size,
    viniTotali: vini.docs.reduce((acc, doc) => acc + doc.data().quantita, 0),
    tourMese: tour.size,
    mediaRecensioni: recensioni.docs.reduce((acc, doc) => acc + doc.data().punteggio, 0) / recensioni.size || 0
  };
}

function mostraStatisticheDashboard(stats) {
  const statsDiv = document.createElement('div');
  statsDiv.className = 'dashboard-stats';
  statsDiv.innerHTML = `
    <h2>Statistiche del mese</h2>
    <ul>
      <li>Prenotazioni ristorante: ${stats.prenotazioniMese}</li>
      <li>Bottiglie di vino in inventario: ${stats.viniTotali}</li>
      <li>Tour e trasferimenti: ${stats.tourMese}</li>
      <li>Media recensioni camere: ${stats.mediaRecensioni.toFixed(1)}</li>
    </ul>
  `;
  return statsDiv;
}

// Funzioni riepilogo mensile
async function mostraRiepilogoMensile() {
  const appDiv = document.getElementById('app');
  appDiv.innerHTML = '<h1>Caricamento riepilogo mensile...</h1>';

  const loading = mostraCaricamento();
  try {
    const [riepilogoRistoranti, riepilogoVini, riepilogoTour, riepilogoRecensioni] = await Promise.all([
      riepilogoMensileRistoranti(),
      riepilogoMensileVini(),
      riepilogoMensileTour(),
      riepilogoMensileRecensioni()
    ]);

    appDiv.innerHTML = `
      <div class="riepilogo-mensile">
        <h1>Riepilogo Mensile</h1>
        
        <h2>Ristoranti</h2>
        <ul>
          <li>Totale prenotazioni: ${riepilogoRistoranti.totalePrenotazioni}</li>
          <li>Prenotazioni confermate: ${riepilogoRistoranti.prenotazioniConfermate}</li>
          <li>Prenotazioni in attesa: ${riepilogoRistoranti.prenotazioniInAttesa}</li>
          <li>Ristorante più prenotato: ${riepilogoRistoranti.ristorantePiuPrenotato}</li>
        </ul>

        <h2>Inventario Vini</h2>
        <ul>
          <li>Totale bottiglie: ${riepilogoVini.totaleBottiglie}</li>
          <li>Vino più presente: ${riepilogoVini.vinoPiuPresente}</li>
          <li>Vino meno presente: ${riepilogoVini.vinoMenoPresente}</li>
        </ul>

        <h2>Tour e Trasferimenti</h2>
        <ul>
          <li>Totale tour/trasferimenti: ${riepilogoTour.totaleTour}</li>
          <li>Tour/trasferimenti confermati: ${riepilogoTour.tourConfermati}</li>
          <li>Tour/trasferimenti in attesa: ${riepilogoTour.tourInAttesa}</li>
          <li>Tipo più richiesto: ${riepilogoTour.tipoPiuRichiesto}</li>
        </ul>

        <h2>Recensioni Camere</h2>
        <ul>
          <li>Totale recensioni: ${riepilogoRecensioni.totaleRecensioni}</li>
          <li>Media punteggio: ${riepilogoRecensioni.mediaPunteggio.toFixed(1)}</li>
          <li>Camera meglio recensita: ${riepilogoRecensioni.cameraMeglioRecensita}</li>
          <li>Camera peggio recensita: ${riepilogoRecensioni.cameraPeggioRecensita}</li>
        </ul>

        <button id="torna-dashboard">Torna alla Dashboard</button>
      </div>
    `;

    document.getElementById('torna-dashboard').addEventListener('click', mostraDashboard);
  } catch (error) {
    console.error('Errore nel caricamento del riepilogo mensile:', error);
    mostraErrore('Errore nel caricamento del riepilogo mensile. Riprova più tardi.');
  } finally {
    loading.remove();
  }
}

async function riepilogoMensileRistoranti() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const prenotazioniRef = collection(db, 'prenotazioni');
  
  const prenotazioni = await getDocs(query(prenotazioniRef, where('data', '>=', startOfMonth)));
  
  const totalePrenotazioni = prenotazioni.size;
  const prenotazioniConfermate = prenotazioni.docs.filter(doc => doc.data().stato === 'confermata').length;
  const prenotazioniInAttesa = totalePrenotazioni - prenotazioniConfermate;
  
  const ristoranti = prenotazioni.docs.reduce((acc, doc) => {
    const ristorante = doc.data().nomeRistorante;
    acc[ristorante] = (acc[ristorante] || 0) + 1;
    return acc;
  }, {});
  
  const ristorantePiuPrenotato = Object.entries(ristoranti).reduce((a, b) => a[1] > b[1] ? a : b)[0];

  return {
    totalePrenotazioni,
    prenotazioniConfermate,
    prenotazioniInAttesa,
    ristorantePiuPrenotato
  };
}

async function riepilogoMensileVini() {
  const viniRef = collection(db, 'vini');
  const vini = await getDocs(viniRef);
  
  const totaleBottiglie = vini.docs.reduce((acc, doc) => acc + doc.data().quantita, 0);
  
  const viniOrdinati = vini.docs.sort((a, b) => b.data().quantita - a.data().quantita);
  const vinoPiuPresente = viniOrdinati[0].data().nome;
  const vinoMenoPresente = viniOrdinati[viniOrdinati.length - 1].data().nome;

  return {
    totaleBottiglie,
    vinoPiuPresente,
    vinoMenoPresente
  };
}

async function riepilogoMensileTour() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const tourRef = collection(db, 'tour');
  
  const tours = await getDocs(query(tourRef, where('data', '>=', startOfMonth)));
  
  const totaleTour = tours.size;
  const tourConfermati = tours.docs.filter(doc => doc.data().stato === 'confermato').length;
  const tourInAttesa = totaleTour - tourConfermati;
  
  const tipi = tours.docs.reduce((acc, doc) => {
    const tipo = doc.data().tipo;
    acc[tipo] = (acc[tipo] || 0) + 1;
    return acc;
  }, {});
  
  const tipoPiuRichiesto = Object.entries(tipi).reduce((a, b) => a[1] > b[1] ? a : b)[0];

  return {
    totaleTour,
    tourConfermati,
    tourInAttesa,
    tipoPiuRichiesto
  };
}

async function riepilogoMensileRecensioni() {
  const recensioniRef = collection(db, 'recensioni');
  const recensioni = await getDocs(recensioniRef);
  
  const totaleRecensioni = recensioni.size;
  const sommaRecensioni = recensioni.docs.reduce((acc, doc) => acc + doc.data().punteggio, 0);
  const mediaPunteggio = sommaRecensioni / totaleRecensioni;
  
  const camereOrdinatePerPunteggio = recensioni.docs.sort((a, b) => b.data().punteggio - a.data().punteggio);
  const cameraMeglioRecensita = camereOrdinatePerPunteggio[0].data().numeroCamera;
  const cameraPeggioRecensita = camereOrdinatePerPunteggio[camereOrdinatePerPunteggio.length - 1].data().numeroCamera;

  return {
    totaleRecensioni,
    mediaPunteggio,
    cameraMeglioRecensita,
    cameraPeggioRecensita
  };
}

// Funzioni per gestire i form
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

function mostraFormVino() {
  const formHTML = `
    <div class="form-container">
      <h2>Aggiungi Vino</h2>
      <form id="vino-form">
        <input type="text" id="nome-vino" placeholder="Nome Vino" required>
        <input type="number" id="quantita-vino" placeholder="Quantità" required>
        <input type="text" id="tipo-vino" placeholder="Tipo (es. Rosso, Bianco)" required>
        <input type="number" id="anno-vino" placeholder="Anno" required>
        <button type="submit">Salva Vino</button>
      </form>
    </div>
  `;
  
  document.querySelector('.section-page').innerHTML = formHTML;
  
  document.getElementById('vino-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const loading = mostraCaricamento();
    try {
      const vino = {
        nome: document.getElementById('nome-vino').value,
        quantita: parseInt(document.getElementById('quantita-vino').value),
        tipo: document.getElementById('tipo-vino').value,
        anno: parseInt(document.getElementById('anno-vino').value)
      };
      await addDoc(collection(db, 'vini'), vino);
      alert('Vino aggiunto con successo!');
      caricaInventarioVini();
    } catch (error) {
      console.error('Errore durante il salvataggio del vino:', error);
      mostraErrore('Errore durante il salvataggio del vino. Riprova più tardi.');
    } finally {
      loading.remove();
    }
  });
}

function mostraFormTour() {
  const formHTML = `
    <div class="form-container">
      <h2>Aggiungi Tour/Trasferimento</h2>
      <form id="tour-form">
        <input type="text" id="nome-tour" placeholder="Nome Tour/Trasferimento" required>
        <input type="date" id="data-tour" required>
        <input type="time" id="ora-tour" required>
        <input type="number" id="numero-persone-tour" placeholder="Numero di persone" required>
        <select id="stato-tour">
          <option value="confermato">Confermato</option>
          <option value="in attesa">In Attesa</option>
        </select>
        <textarea id="descrizione-tour" placeholder="Descrizione" required></textarea>
        <button type="submit">Salva Tour/Trasferimento</button>
      </form>
    </div>
  `;
  
  document.querySelector('.section-page').innerHTML = formHTML;
  
  document.getElementById('tour-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const loading = mostraCaricamento();
    try {
      const tour = {
        nome: document.getElementById('nome-tour').value,
        data: new Date(`${document.getElementById('data-tour').value}T${document.getElementById('ora-tour').value}`),
        numeropersone: parseInt(document.getElementById('numero-persone-tour').value),
        stato: document.getElementById('stato-tour').value,
        descrizione: document.getElementById('descrizione-tour').value
      };
      await addDoc(collection(db, 'tour'), tour);
      alert('Tour/Trasferimento aggiunto con successo!');
      caricaTourETrasferimenti();
    } catch (error) {
      console.error('Errore durante il salvataggio del tour/trasferimento:', error);
      mostraErrore('Errore durante il salvataggio del tour/trasferimento. Riprova più tardi.');
    } finally {
      loading.remove();
    }
  });
}

function mostraFormRecensione() {
  const formHTML = `
    <div class="form-container">
      <h2>Aggiungi Recensione</h2>
      <form id="recensione-form">
        <input type="number" id="numero-camera" placeholder="Numero Camera" required>
        <input type="number" id="punteggio" placeholder="Punteggio (1-5)" min="1" max="5" required>
        <textarea id="commento" placeholder="Commento" required></textarea>
        <input type="date" id="data-recensione" required>
        <button type="submit">Salva Recensione</button>
      </form>
    </div>
  `;
  
  document.querySelector('.section-page').innerHTML = formHTML;
  
  document.getElementById('recensione-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const loading = mostraCaricamento();
    try {
      const recensione = {
        numeroCamera: parseInt(document.getElementById('numero-camera').value),
        punteggio: parseInt(document.getElementById('punteggio').value),
        commento: document.getElementById('commento').value,
        data: new Date(document.getElementById('data-recensione').value)
      };
      await addDoc(collection(db, 'recensioni'), recensione);
      alert('Recensione aggiunta con successo!');
      caricaRecensioniCamere();
    } catch (error) {
      console.error('Errore durante il salvataggio della recensione:', error);
      mostraErrore('Errore durante il salvataggio della recensione. Riprova più tardi.');
    } finally {
      loading.remove();
    }
  });
}

// Funzioni per caricare i dati nelle sezioni
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
      prenotazioniList.appendChild(li);
    });
  } catch (error) {
    console.error('Errore nel caricamento delle prenotazioni:', error);
    mostraErrore('Errore nel caricamento delle prenotazioni. Riprova più tardi.');
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

// Inizializzazione dell'app
document.addEventListener('DOMContentLoaded', () => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      mostraDashboard();
    } else {
      mostraPaginaLogin();
    }
  });
});
