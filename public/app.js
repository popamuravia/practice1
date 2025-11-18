console.log('StudentNotify System Loaded');

let currentUser = null;
let authToken = null;

async function login() {
    console.log('START LOGIN PROCESS');

    const loginValue = document.getElementById('login').value.trim();
    const passwordValue = document.getElementById('password').value.trim();
    
    console.log('Input values:', { login: loginValue, password: '***' });

    if (!loginValue || !passwordValue) {
        alert('Please fill in all fields');
        return;
    }
    
    try {
        console.log('Sending login request...');

        const response = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                login: loginValue,
                password: passwordValue
            })
        });
        
        console.log('Response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Server error:', errorText);
            throw new Error(`Login failed: ${response.status}`);
        }

        const result = await response.json();
        console.log('Login successful:', result);
        
        if (result.error) {
            throw new Error(result.error);
        }

        authToken = result.token;
        currentUser = result.user;
        
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        console.log('Data saved to localStorage');

        showMainInterface();
        
    } catch (error) {
        console.error('LOGIN ERROR:', error);
        alert('Login error: ' + error.message);
    }
}

// Проверка авторизации при загрузке
function checkAuth() {
    console.log('Checking authentication...');
    
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('currentUser');
    
    console.log('Saved data:', { 
        token: savedToken ? 'EXISTS' : 'MISSING', 
        user: savedUser ? 'EXISTS' : 'MISSING' 
    });
    
    if (savedToken && savedUser) {
        try {
            authToken = savedToken;
            currentUser = JSON.parse(savedUser);
            console.log('Auto-login for:', currentUser.name);
            showMainInterface();
        } catch (error) {
            console.error('Auth restore error:', error);
            showLoginForm();
        }
    } else {
        console.log('No saved session');
        showLoginForm();
    }
}

function logout() {
    console.log('Выход...');
    
    authToken = null;
    currentUser = null;
    
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    
    showLoginForm();
}

function showMainInterface() {
    console.log('Showing main interface for:', currentUser.name);

    document.getElementById('login-form').classList.add('hidden');

    document.getElementById('main-interface').classList.remove('hidden');

    const userInfo = document.getElementById('user-info');
    const roleIcon = currentUser.role === 'admin' ? '' : '';
    userInfo.textContent = `${roleIcon} ${currentUser.name} (${currentUser.role})`;

    if (currentUser.role === 'admin') {
        document.getElementById('admin-panel').classList.remove('hidden');
        console.log('Admin panel shown');
    } else {
        document.getElementById('admin-panel').classList.add('hidden');
        console.log('Admin panel hidden');
    }

    loadNotifications();
}

function showLoginForm() {
    console.log('Showing login form');
    
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('main-interface').classList.add('hidden');
}

async function apiRequest(url, options = {}) {
    const fullUrl = `http://localhost:3000${url}`;
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    try {
        const response = await fetch(fullUrl, {
            ...options,
            headers
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }
        
        return await response.json();
        
    } catch (error) {
        console.error('API Request failed:', error);
        throw error;
    }
}

async function loadNotifications() {
    try {
        console.log('Loading notifications...');
        
        const data = await apiRequest('/api/notifications');
        console.log('Notifications loaded:', data.length);
        
        displayNotifications(data);
        
    } catch (error) {
        console.error('Load notifications error:', error);
        document.getElementById('notifications-container').innerHTML = `
            <div style="color: red; text-align: center; padding: 20px;">
                <h3>Error loading notifications</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

function displayNotifications(notifications) {
    const container = document.getElementById('notifications-container');
    
    if (!notifications || notifications.length === 0) {
        container.innerHTML = `
            <div class="card empty-state">
                <div class="icon"></div>
                <h3>No notifications yet</h3>
                <p>New notifications will appear here</p>
            </div>
        `;
        return;
    }
    
    const isAdmin = currentUser && currentUser.role === 'admin';
    
    container.innerHTML = notifications.map(notification => `
        <div class="card notification-card ${notification.is_important ? 'important' : ''}">
            <div class="notification-header">
                <div>
                    <h3 class="notification-title">${notification.title}</h3>
                </div>
                ${notification.is_important ? 
                    '<span class="notification-badge">Важное</span>' : 
                    '<span class="notification-badge">Regular</span>'
                }
            </div>
            
            <div class="notification-content">
                ${notification.content}
            </div>
            
            <div class="notification-meta">
                <div class="meta-left">
                    <span class="meta-item">${notification.author}</span>
                    <span class="meta-item">${new Date(notification.created_at).toLocaleString()}</span>
                    ${notification.tags && notification.tags.length > 0 ? `
                        <div class="tags">
                            ${notification.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
                
                ${isAdmin ? `
                    <button class="btn btn-danger btn-sm" onclick="deleteNotification(${notification.id})">
                        Удалить
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

async function createNotification() {
    const title = document.getElementById('notification-title').value.trim();
    const content = document.getElementById('notification-content').value.trim();
    const is_important = document.getElementById('notification-important').checked;
    
    if (!title || !content) {
        alert('Please fill title and content');
        return;
    }
    
    try {
        await apiRequest('/api/notifications', {
            method: 'POST',
            body: JSON.stringify({
                title,
                content,
                is_important,
                tags: ['general']
            })
        });

        document.getElementById('notification-title').value = '';
        document.getElementById('notification-content').value = '';
        document.getElementById('notification-important').checked = false;

        loadNotifications();
        
        alert('Notification created!');
        
    } catch (error) {
        alert('Create error: ' + error.message);
    }
}

async function deleteNotification(id) {
    if (!confirm('Delete this notification?')) return;
    
    try {
        await apiRequest(`/api/notifications/${id}`, {
            method: 'DELETE'
        });
        
        loadNotifications();
        alert('Notification deleted!');
        
    } catch (error) {
        alert('Delete error: ' + error.message);
    }
}

function setupEnterHandlers() {
    const loginInput = document.getElementById('login');
    const passwordInput = document.getElementById('password');
    
    if (loginInput) {
        loginInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') login();
        });
    }
    
    if (passwordInput) {
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') login();
        });
    }
    
    console.log('Enter handlers setup');
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded, initializing...');
    setupEnterHandlers();
    checkAuth();
});

window.login = login;
window.logout = logout;
window.createNotification = createNotification;
window.deleteNotification = deleteNotification;
window.loadNotifications = loadNotifications;