/* ========================================
   AP SERVICES MARKETPLACE - CORE FRONTEND LOGIC
   Handles all global functionality
   ======================================== */

// -------------------- Global State Management --------------------
const AppState = {
    user: null,
    token: localStorage.getItem('token'),
    refreshToken: localStorage.getItem('refreshToken'),
    currentLocation: null,
    selectedCity: localStorage.getItem('selectedCity') || 'Mumbai',
    cart: [],
    notifications: [],
    isLoading: false,
    theme: localStorage.getItem('theme') || 'light'
};

// -------------------- API Service Layer --------------------
const API = {
    baseURL: 'http://localhost:5000/api',
    
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        if (AppState.token) {
            headers['Authorization'] = `Bearer ${AppState.token}`;
        }
        
        // Show loading state
        UI.showLoader();
        
        try {
            const response = await fetch(url, {
                ...options,
                headers,
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'API request failed');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            Toast.show(error.message, 'error');
            throw error;
        } finally {
            UI.hideLoader();
        }
    },
    
    get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },
    
    post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    },
    
    put(endpoint, body) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    },
    
    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    },
    
    upload(endpoint, formData) {
        return fetch(`${this.baseURL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AppState.token}`
            },
            body: formData,
            credentials: 'include'
        }).then(res => res.json());
    }
};

// -------------------- Authentication Module --------------------
const Auth = {
    async login(email, password) {
        try {
            const response = await API.post('/auth/login', { email, password });
            
            if (response.success) {
                AppState.token = response.data.token;
                AppState.refreshToken = response.data.refreshToken;
                AppState.user = response.data.user;
                
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('refreshToken', response.data.refreshToken);
                localStorage.setItem('user', JSON.stringify(response.data.user));
                
                Toast.show(`Welcome back, ${response.data.user.first_name}!`, 'success');
                
                // Redirect based on role
                setTimeout(() => {
                    if (response.data.user.role === 'admin') {
                        window.location.href = '/admin-dashboard.html';
                    } else if (response.data.user.role === 'worker') {
                        window.location.href = '/worker-dashboard.html';
                    } else {
                        window.location.href = '/customer-dashboard.html';
                    }
                }, 1500);
            }
            
            return response;
        } catch (error) {
            Toast.show(error.message, 'error');
            throw error;
        }
    },
    
    async register(userData) {
        try {
            const response = await API.post('/auth/register', userData);
            
            if (response.success) {
                Toast.show('Registration successful! Please login.', 'success');
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 2000);
            }
            
            return response;
        } catch (error) {
            Toast.show(error.message, 'error');
            throw error;
        }
    },
    
    logout() {
        AppState.token = null;
        AppState.refreshToken = null;
        AppState.user = null;
        
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        
        Toast.show('Logged out successfully', 'success');
        
        setTimeout(() => {
            window.location.href = '/';
        }, 1500);
    },
    
    async refreshToken() {
        try {
            const response = await API.post('/auth/refresh-token', {
                refreshToken: AppState.refreshToken
            });
            
            if (response.success) {
                AppState.token = response.data.token;
                localStorage.setItem('token', response.data.token);
            }
            
            return response;
        } catch (error) {
            this.logout();
            throw error;
        }
    },
    
    checkAuth() {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        
        if (token && user) {
            AppState.token = token;
            AppState.user = JSON.parse(user);
            return true;
        }
        
        return false;
    },
    
    isAuthenticated() {
        return !!AppState.token;
    },
    
    getUser() {
        return AppState.user;
    },
    
    getToken() {
        return AppState.token;
    }
};

// -------------------- Toast Notification System --------------------
const Toast = {
    container: null,
    
    init() {
        this.container = document.createElement('div');
        this.container.className = 'toast-container';
        document.body.appendChild(this.container);
    },
    
    show(message, type = 'info', duration = 3000) {
        if (!this.container) this.init();
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = this.getIcon(type);
        
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">${icon}</span>
                <span class="toast-message">${message}</span>
                <button class="toast-close">&times;</button>
            </div>
        `;
        
        this.container.appendChild(toast);
        
        // Trigger animation
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Auto remove
        const timeout = setTimeout(() => this.remove(toast), duration);
        
        // Close button
        toast.querySelector('.toast-close').addEventListener('click', () => {
            clearTimeout(timeout);
            this.remove(toast);
        });
    },
    
    remove(toast) {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    },
    
    getIcon(type) {
        switch(type) {
            case 'success': return '✓';
            case 'error': return '✗';
            case 'warning': return '⚠';
            default: return 'ℹ';
        }
    }
};

// -------------------- UI Utilities --------------------
const UI = {
    loader: null,
    
    init() {
        this.createLoader();
        this.updateNavbar();
        this.initMobileMenu();
        this.initTheme();
    },
    
    createLoader() {
        this.loader = document.createElement('div');
        this.loader.className = 'spinner-overlay';
        this.loader.innerHTML = '<div class="spinner"></div>';
        this.loader.style.display = 'none';
        document.body.appendChild(this.loader);
    },
    
    showLoader() {
        if (this.loader) {
            this.loader.style.display = 'flex';
        }
    },
    
    hideLoader() {
        if (this.loader) {
            this.loader.style.display = 'none';
        }
    },
    
    updateNavbar() {
        const navLinks = document.querySelector('.nav-links');
        if (!navLinks) return;
        
        const user = Auth.getUser();
        
        if (user) {
            // User is logged in
            const dashboardLink = `/${user.role}-dashboard.html`;
            
            navLinks.innerHTML = `
                <a href="/services.html">Services</a>
                <a href="${dashboardLink}">Dashboard</a>
                <div class="user-menu">
                    <span class="user-name">Hi, ${user.first_name}</span>
                    <div class
