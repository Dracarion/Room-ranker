let currentUser = null;
let rooms = [];
let users = [];
const database = firebase.database();
const auth = firebase.auth();

function loadData() {
    database.ref('rooms').on('value', (snapshot) => {
        rooms = snapshot.val() || [];
        updateTables();
    });
    database.ref('users').on('value', (snapshot) => {
        users = snapshot.val() || [];
        if (users.length === 0) {
            addInitialAdminUser();
        }
    });
}

function addInitialAdminUser() {
    const adminUser = {
        username: 'admin',
        password: 'frame01!',
        isAdmin: true,
        lastLogin: null,
        isOnline: false
    };
    users.push(adminUser);
    saveData();
}

function saveData() {
    database.ref('rooms').set(rooms);
    database.ref('users').set(users);
}

function showSection(sectionId) {
    document.getElementById('loginSignup').style.display = 'none';
    document.getElementById('mainApp').style.display = 'none';
    document.getElementById('adminSection').style.display = 'none';
    document.getElementById(sectionId).style.display = 'block';
}

function getRoomType(roomNumber) {
    const roomTypes = {
        'SMART': ['105', '305'],
        'SUPERIOR': ['101', '107', '201', '301', '304', '402', '403', '504', '503'],
        'DELUXE': ['106', '302', '401', '505'],
        'QUEEN DELUXE': ['102', '104', '501'],
        'GIOCONDA': ['303'],
        'SUITE': ['103', '108', '202', '404'],
        'TERRACE': ['502']
    };

    for (const [type, rooms] of Object.entries(roomTypes)) {
        if (rooms.includes(roomNumber)) {
            return type;
        }
    }
    return 'Unknown';
}

function toggleBreakfast() {
    const icon = document.getElementById('breakfastIcon');
    icon.classList.toggle('selected');
}


function login() {
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        currentUser = user;
        user.lastLogin = new Date().toISOString();
        user.isOnline = true;
        saveData();
        showSection('mainApp');
        if (user.isAdmin) {
            document.getElementById('adminSection').style.display = 'block';
            updateAdminPanel();
        }
        updateTables();
    } else {
        alert('Invalid credentials');
    }
}

function logout() {
    if (currentUser) {
        const userIndex = users.findIndex(u => u.username === currentUser.username);
        if (userIndex !== -1) {
            users[userIndex].isOnline = false;
            saveData();
        }
    }
    currentUser = null;
    showSection('loginSignup');
}

function showChangePasswordForm() {
    document.getElementById('changePasswordForm').style.display = 'block';
}

function changePassword() {
    const newPassword = document.getElementById('newPassword').value;
    const userIndex = users.findIndex(u => u.username === currentUser.username);
    if (userIndex !== -1) {
        users[userIndex].password = newPassword;
        saveData();
        alert('Password changed successfully');
        document.getElementById('changePasswordForm').style.display = 'none';
    }
}

function addUser() {
    const username = document.getElementById('newUsername').value;
    const password = document.getElementById('newUserPassword').value;
    if (users.some(user => user.username === username)) {
        alert('Username already exists');
        return;
    }
    users.push({
        username,
        password,
        isAdmin: false,
        lastLogin: null,
        isOnline: false
    });
    saveData();
    alert('User added successfully');
    updateAdminPanel();
}

function deleteUser(username) {
    users = users.filter(u => u.username !== username);
    rooms = rooms.filter(r => r.user !== username);
    saveData();
    updateAdminPanel();
}

function updateAdminPanel() {
    const tbody = document.getElementById('userTableBody');
    tbody.innerHTML = '';
    users.forEach(user => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${user.username}</td>
            <td>${user.isAdmin ? 'Yes' : 'No'}</td>
            <td>${user.lastLogin || 'Never'}</td>
            <td>${user.isOnline ? 'Online' : 'Offline'}</td>
            <td>
                ${user.isAdmin ? '' : `<button onclick="deleteUser('${user.username}')">Delete</button>`}
            </td>
        `;
    });
}


function addEntry() {
    const entry = {
        roomNumber: document.getElementById('roomNumber').value,
        roomType: getRoomType(document.getElementById('roomNumber').value),
        date: document.getElementById('date').value,
        score: parseFloat(document.getElementById('score').value),
        price: parseFloat(document.getElementById('price').value),
        nights: parseInt(document.getElementById('nights').value),
        breakfast: document.getElementById('breakfastIcon').classList.contains('selected'),
        id: Date.now(),
        user: currentUser.username
    };
    rooms.push(entry);
    saveData();
    updateTables();
    clearForm();
}

function clearForm() {
    ['roomNumber', 'date', 'score', 'price', 'nights'].forEach(id => {
        document.getElementById(id).value = '';
    });
    document.getElementById('breakfastIcon').classList.remove('selected');
}

function updateTables() {
    updateEntriesTable();
    updateSummaryTable();
}

function updateEntriesTable() {
    const tbody = document.getElementById('entriesBody');
    tbody.innerHTML = '';
    rooms.filter(entry => entry.user === currentUser.username).forEach(entry => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${entry.roomNumber}</td>
            <td>${entry.roomType}</td>
            <td>${entry.date}</td>
            <td>${entry.score}</td>
            <td>${entry.price}</td>
            <td>${entry.nights}</td>
            <td><i class="fas fa-utensils ${entry.breakfast ? 'selected' : ''}"></i></td>
            <td>
                <i class="fas fa-edit edit-icon" onclick="editEntry(${entry.id})"></i>
                <i class="fas fa-trash delete-icon" onclick="deleteEntry(${entry.id})"></i>
            </td>
        `;
    });
}

function editEntry(id) {
    const entry = rooms.find(room => room.id === id);
    if (entry) {
        document.getElementById('roomNumber').value = entry.roomNumber;
        document.getElementById('date').value = entry.date;
        document.getElementById('score').value = entry.score;
        document.getElementById('price').value = entry.price;
        document.getElementById('nights').value = entry.nights;
        document.getElementById('breakfastIcon').classList.toggle('selected', entry.breakfast);
        
        // Change the "Add Entry" button to "Update Entry"
        const addButton = document.querySelector('button[onclick="addEntry()"]');
        addButton.textContent = 'Update Entry';
        addButton.onclick = () => updateEntry(id);
    }
}

function updateEntry(id) {
    const index = rooms.findIndex(room => room.id === id);
    if (index !== -1) {
        rooms[index] = {
            ...rooms[index],
            roomNumber: document.getElementById('roomNumber').value,
            roomType: getRoomType(document.getElementById('roomNumber').value),
            date: document.getElementById('date').value,
            score: parseFloat(document.getElementById('score').value),
            price: parseFloat(document.getElementById('price').value),
            nights: parseInt(document.getElementById('nights').value),
            breakfast: document.getElementById('breakfastIcon').classList.contains('selected')
        };
        saveData();
        updateTables();
        clearForm();
        
        // Change the button back to "Add Entry"
        const addButton = document.querySelector('button[onclick="updateEntry(' + id + ')"]');
        addButton.textContent = 'Add Entry';
        addButton.onclick = addEntry;
    }
}

function deleteEntry(id) {
    rooms = rooms.filter(room => room.id !== id);
    saveData();
    updateTables();
}

function filterRankings() {
    const dateFilter = document.getElementById('filterDate').value;
    const roomTypeFilter = document.getElementById('filterRoomType').value;
    
    const filteredRooms = rooms.filter(entry => {
        const dateMatch = !dateFilter || entry.date === dateFilter;
        const roomTypeMatch = !roomTypeFilter || entry.roomType === roomTypeFilter;
        return dateMatch && roomTypeMatch;
    });
    
    updateSummaryTable(filteredRooms);
}


function updateSummaryTable(filteredRooms = rooms) {
    const summary = calculateSummary(filteredRooms);
    const tbody = document.getElementById('summaryBody');
    tbody.innerHTML = '';
    summary.forEach(room => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${room.roomNumber}</td>
            <td>${room.roomType}</td>
            <td>${room.avgScore.toFixed(2)}</td>
            <td>${room.avgPricePerNight.toFixed(2)}</td>
            <td>${room.breakfastPercentage.toFixed(2)}%</td>
            <td>${room.avgNights.toFixed(2)}</td>
            <td>${room.generalRank}</td>
            <td>${room.breakfastRank || '-'}</td>
            <td>${room.noBreakfastRank || '-'}</td>
        `;
    });
}

function calculateSummary(filteredRooms) {
    const userRooms = filteredRooms.filter(entry => entry.user === currentUser.username);
    const roomGroups = userRooms.reduce((acc, entry) => {
        if (!acc[entry.roomNumber]) {
            acc[entry.roomNumber] = [];
        }
        acc[entry.roomNumber].push(entry);
        return acc;
    }, {});

    let summary = Object.entries(roomGroups).map(([roomNumber, entries]) => {
        const totalScore = entries.reduce((sum, entry) => sum + entry.score, 0);
        const totalNights = entries.reduce((sum, entry) => sum + entry.nights, 0);
        const totalPrice = entries.reduce((sum, entry) => sum + entry.price * entry.nights, 0);
        const breakfastNights = entries.reduce((sum, entry) => sum + (entry.breakfast ? entry.nights : 0), 0);

        return {
            roomNumber,
            roomType: entries[0].roomType,
            avgScore: totalScore / entries.length,
            avgPricePerNight: totalPrice / totalNights,
            breakfastPercentage: (breakfastNights / totalNights) * 100,
            avgNights: totalNights / entries.length
        };
    });

    summary.sort((a, b) => b.avgScore - a.avgScore);
    summary.forEach((room, index) => {
        room.generalRank = index + 1;
    });

    const breakfastRooms = summary.filter(room => room.breakfastPercentage > 0);
    breakfastRooms.sort((a, b) => b.avgScore - a.avgScore);
    breakfastRooms.forEach((room, index) => {
        room.breakfastRank = index + 1;
    });

    const noBreakfastRooms = summary.filter(room => room.breakfastPercentage < 100);
    noBreakfastRooms.sort((a, b) => b.avgScore - a.avgScore);
    noBreakfastRooms.forEach((room, index) => {
        room.noBreakfastRank = index + 1;
    });

    return summary;
}

// Initialize the app
loadData();
showSection('loginSignup');
