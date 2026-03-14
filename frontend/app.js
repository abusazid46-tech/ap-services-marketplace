// frontend/app.js
// AP Services Frontend - Complete Working Version

// ==================== CONFIGURATION ====================
const CONFIG = {
    API_URL: 'https://ap-services-marketplace.onrender.com/api',
    FRONTEND_URL: 'https://ap-services-marketplace.vercel.app'
};

console.log('🚀 App.js loaded');
console.log('📡 API URL:', CONFIG.API_URL);

// ==================== STATE MANAGEMENT ====================
const AppState = {
    user: null,
    token: localStorage.getItem('token'),
    currentLocation: null,
    selectedCity: localStorage.getItem('selectedCity') || 'Mumbai'
};

// ==================== API SERVICE ====================
const API = {
    async request(endpoint, options = {}) {
        const url = `${CONFIG.API_URL}${endpoint}`;
        console.log(`📡 API Request: ${options.method || 'GET'} ${url}`);
        
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        if (AppState.token) {
            headers['Authorization'] = `Bearer ${AppState.token}`;
        }
        
        try {
            const response = await fetch(url, {
                ...options,
                headers,
                mode: 'cors',
                credentials: 'omit'
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ API Error Response:', errorText);
                throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('✅ API Success:', data);
            return data;
        } catch (error) {
            console.error('❌ API Request Failed:', error);
            throw error;
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
    }
};

// ==================== SERVICES API ====================
const ServicesAPI = {
    async getAll(category = null, search = null) {
        try {
            let url = '/services';
            const params = new URLSearchParams();
            
            if (category) params.append('category', category);
            if (search) params.append('search', search);
            
            if (params.toString()) {
                url += '?' + params.toString();
            }
            
            console.log('🔍 Fetching services:', url);
            const response = await API.get(url);
            return response;
        } catch (error) {
            console.error('❌ ServicesAPI.getAll error:', error);
            throw error;
        }
    },
    
    async getById(id) {
        try {
            const response = await API.get(`/services/${id}`);
            return response;
        } catch (error) {
            console.error('❌ ServicesAPI.getById error:', error);
            throw error;
        }
    },
    
    async getPopular(limit = 6) {
        try {
            const response = await API.get(`/services/popular?limit=${limit}`);
            return response;
        } catch (error) {
            console.error('❌ ServicesAPI.getPopular error:', error);
            throw error;
        }
    }
};

// ==================== AUTH SERVICE ====================
const Auth = {
    async login(email, password) {
        try {
            console.log('🔐 Login attempt:', email);
            const response = await API.post('/auth/login', { email, password });
            
            if (response.success) {
                AppState.token = response.data.token;
                AppState.user = response.data.user;
                
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.user));
                
                Toast.show(`Welcome back, ${response.data.user.first_name}!`, 'success');
                
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
            console.error('❌ Login error:', error);
            Toast.show(error.message || 'Login failed', 'error');
            throw error;
        }
    },
    
    async register(userData) {
        try {
            console.log('📝 Registration attempt:', userData.email);
            const response = await API.post('/auth/register', userData);
            
            if (response.success) {
                Toast.show('Registration successful! Please login.', 'success');
                setTimeout(() => window.location.href = '/login.html?registered=success', 2000);
            }
            return response;
        } catch (error) {
            console.error('❌ Registration error:', error);
            Toast.show(error.message || 'Registration failed', 'error');
            throw error;
        }
    },
    
    logout() {
        AppState.token = null;
        AppState.user = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        Toast.show('Logged out successfully', 'success');
        setTimeout(() => window.location.href = '/', 1500);
    },
    
    checkAuth() {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        
        if (token && user) {
            try {
                AppState.token = token;
                AppState.user = JSON.parse(user);
                return true;
            } catch (e) {
                console.error('Error parsing user data:', e);
                return false;
            }
        }
        return false;
    },
    
    getUser() { return AppState.user; },
    getToken() { return AppState.token; }
};

// ==================== TOAST NOTIFICATION ====================
const Toast = {
    show(message, type = 'info', duration = 3000) {
        const toast = document.getElementById('toast');
        if (!toast) {
            console.warn('Toast element not found');
            return;
        }
        
        toast.className = `toast ${type} show`;
        toast.innerHTML = `<i class="fas ${this.getIcon(type)}"></i> ${message}`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    },
    
    getIcon(type) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        return icons[type] || icons.info;
    }
};

// ==================== UI HELPERS ====================
const UI = {
    updateNavbar() {
        const navLinks = document.querySelector('.nav-links');
        if (!navLinks) return;
        
        const user = Auth.getUser();
        
        if (user) {
            navLinks.innerHTML = `
                <a href="/services.html">Services</a>
                <a href="/${user.role}-dashboard.html">Dashboard</a>
                <span class="user-name">Hi, ${user.first_name}</span>
                <button class="btn-outline" onclick="Auth.logout()">Logout</button>
            `;
        } else {
            navLinks.innerHTML = `
                <a href="/services.html">Services</a>
                <a href="/worker-register.html">Become a Pro</a>
                <a href="/login.html" class="btn-outline">Login</a>
                <a href="/register.html" class="btn-primary">Sign Up</a>
            `;
        }
    }
};

// ==================== INITIALIZE ====================
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ DOM loaded');
    Auth.checkAuth();
    UI.updateNavbar();
});

// Make functions globally available
window.AppState = AppState;
window.Auth = Auth;
window.API = API;
window.ServicesAPI = ServicesAPI;
window.Toast = Toast;
window.UI = UI;

console.log('✅ App.js initialized');
console.log('📦 Available APIs:', { ServicesAPI, Auth, API });
