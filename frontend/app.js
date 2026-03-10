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
                    <div class="user-dropdown">
                        <a href="/profile.html">Profile</a>
                        <a href="/settings.html">Settings</a>
                        <a href="#" onclick="Auth.logout()">Logout</a>
                    </div>
                </div>
            `;
        } else {
            // User is not logged in
            navLinks.innerHTML = `
                <a href="/services.html">Services</a>
                <a href="/worker-register.html">Become a Pro</a>
                <a href="/login.html" class="btn-outline">Login</a>
                <a href="/register.html" class="btn-primary">Sign Up</a>
            `;
        }
    },
    
    initMobileMenu() {
        const menuBtn = document.querySelector('.mobile-menu-btn');
        const navLinks = document.querySelector('.nav-links');
        
        if (menuBtn && navLinks) {
            menuBtn.addEventListener('click', () => {
                navLinks.classList.toggle('show');
            });
        }
    },
    
    initTheme() {
        const theme = localStorage.getItem('theme') || 'light';
        document.body.setAttribute('data-theme', theme);
    },
    
    toggleTheme() {
        const currentTheme = document.body.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    },
    
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(amount);
    },
    
    formatDate(date) {
        return new Intl.DateTimeFormat('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(date));
    },
    
    showModal(content) {
        const modal = document.createElement('div');
        modal.className = 'modal show';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${content.title || 'Message'}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    ${content.body}
                </div>
                ${content.footer ? `
                    <div class="modal-footer">
                        ${content.footer}
                    </div>
                ` : ''}
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        return modal;
    },
    
    showConfirm(message) {
        return new Promise((resolve) => {
            const modal = this.showModal({
                title: 'Confirm Action',
                body: `<p>${message}</p>`,
                footer: `
                    <button class="btn-outline" onclick="this.closest('.modal').remove(); resolve(false)">Cancel</button>
                    <button class="btn-primary" onclick="this.closest('.modal').remove(); resolve(true)">Confirm</button>
                `
            });
            
            // Override resolve
            const buttons = modal.querySelectorAll('button');
            buttons[0].addEventListener('click', () => resolve(false));
            buttons[1].addEventListener('click', () => resolve(true));
        });
    }
};

// -------------------- Location Service --------------------
const LocationService = {
    async getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const location = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    };
                    AppState.currentLocation = location;
                    resolve(location);
                },
                (error) => {
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0
                }
            );
        });
    },
    
    async getCityFromCoordinates(lat, lng) {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=en`
            );
            const data = await response.json();
            
            const city = data.address.city || 
                        data.address.town || 
                        data.address.village || 
                        data.address.county ||
                        'Unknown';
            
            return city;
        } catch (error) {
            console.error('Reverse geocoding error:', error);
            return null;
        }
    },
    
    async detectLocation() {
        try {
            Toast.show('Detecting your location...', 'info');
            
            const location = await this.getCurrentLocation();
            const city = await this.getCityFromCoordinates(location.latitude, location.longitude);
            
            if (city) {
                AppState.selectedCity = city;
                localStorage.setItem('selectedCity', city);
                
                // Update city select if exists
                const citySelect = document.getElementById('citySelect');
                if (citySelect) {
                    citySelect.value = city;
                }
                
                Toast.show(`Location detected: ${city}`, 'success');
            }
            
            return { location, city };
        } catch (error) {
            Toast.show('Failed to detect location. Using default.', 'warning');
            return null;
        }
    }
};

// -------------------- Search Service --------------------
const SearchService = {
    async searchServices(query, city, filters = {}) {
        const params = new URLSearchParams({
            q: query,
            city,
            ...filters
        });
        
        const response = await API.get(`/services/search?${params}`);
        return response.data;
    },
    
    async getNearbyWorkers(serviceId, lat, lng, radius = 10) {
        const params = new URLSearchParams({
            serviceId,
            latitude: lat,
            longitude: lng,
            radius
        });
        
        const response = await API.get(`/workers/nearby?${params}`);
        return response.data;
    }
};

// -------------------- Validation Utilities --------------------
const Validation = {
    email(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },
    
    phone(phone) {
        const re = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,4}[-\s.]?[0-9]{1,9}$/;
        return re.test(phone);
    },
    
    password(password) {
        // At least 8 chars, 1 uppercase, 1 lowercase, 1 number
        const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
        return re.test(password);
    },
    
    required(value) {
        return value !== null && value !== undefined && value.toString().trim() !== '';
    },
    
    minLength(value, min) {
        return value.length >= min;
    },
    
    maxLength(value, max) {
        return value.length <= max;
    },
    
    numeric(value) {
        return !isNaN(value) && !isNaN(parseFloat(value));
    },
    
    validateForm(formData, rules) {
        const errors = {};
        
        for (const [field, fieldRules] of Object.entries(rules)) {
            const value = formData[field];
            
            for (const rule of fieldRules) {
                if (rule === 'required' && !this.required(value)) {
                    errors[field] = `${field} is required`;
                    break;
                }
                
                if (rule.startsWith('min:') && value.length < parseInt(rule.split(':')[1])) {
                    errors[field] = `${field} must be at least ${rule.split(':')[1]} characters`;
                    break;
                }
                
                if (rule === 'email' && !this.email(value)) {
                    errors[field] = 'Invalid email address';
                    break;
                }
                
                if (rule === 'phone' && !this.phone(value)) {
                    errors[field] = 'Invalid phone number';
                    break;
                }
            }
        }
        
        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }
};

// -------------------- Event Handlers --------------------
document.addEventListener('DOMContentLoaded', () => {
    // Initialize UI
    UI.init();
    
    // Check authentication
    Auth.checkAuth();
    
    // Initialize location detection button
    const locationBtn = document.getElementById('detectLocation');
    if (locationBtn) {
        locationBtn.addEventListener('click', () => LocationService.detectLocation());
    }
    
    // Initialize search
    const searchInput = document.getElementById('globalSearch');
    if (searchInput) {
        let searchTimeout;
        
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                const query = e.target.value;
                if (query.length >= 3) {
                    // Trigger search
                    window.location.href = `/services.html?q=${encodeURIComponent(query)}`;
                }
            }, 500);
        });
    }
    
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Handle back to top button
    const backToTop = document.getElementById('backToTop');
    if (backToTop) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                backToTop.classList.add('visible');
            } else {
                backToTop.classList.remove('visible');
            }
        });
        
        backToTop.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
});

// -------------------- Export for Global Use --------------------
window.AppState = AppState;
window.Auth = Auth;
window.API = API;
window.Toast = Toast;
window.UI = UI;
window.LocationService = LocationService;
window.SearchService = SearchService;
window.Validation = Validation;
