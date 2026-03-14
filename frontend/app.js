// frontend/app.js
// AP Services Frontend - Production Version with Real Backend

// ==================== CONFIGURATION ====================
const CONFIG = {
    API_URL: 'https://ap-services-marketplace.onrender.com/api',
    FRONTEND_URL: 'https://ap-services-xi.vercel.app'
};

// ==================== STATE MANAGEMENT ====================
const AppState = {
    user: null,
    token: localStorage.getItem('token'),
    refreshToken: localStorage.getItem('refreshToken'),
    currentLocation: null,
    selectedCity: localStorage.getItem('selectedCity') || 'Mumbai',
    cart: [],
    notifications: []
};

// ==================== API SERVICE ====================
const API = {
    async request(endpoint, options = {}) {
        const url = `${CONFIG.API_URL}${endpoint}`;
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
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'API request failed');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },
    
    get(endpoint) { return this.request(endpoint, { method: 'GET' }); },
    post(endpoint, body) { return this.request(endpoint, { method: 'POST', body: JSON.stringify(body) }); },
    put(endpoint, body) { return this.request(endpoint, { method: 'PUT', body: JSON.stringify(body) }); },
    delete(endpoint) { return this.request(endpoint, { method: 'DELETE' }); }
};

// ==================== AUTH SERVICE ====================
const Auth = {
    async login(email, password) {
        try {
            const response = await API.post('/auth/login', { email, password });
            
            if (response.success) {
                AppState.token = response.data.token;
                AppState.user = response.data.user;
                
                localStorage.setItem('token', response.data.token);
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
                setTimeout(() => window.location.href = '/login.html', 2000);
            }
            return response;
        } catch (error) {
            Toast.show(error.message, 'error');
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
            AppState.token = token;
            AppState.user = JSON.parse(user);
            return true;
        }
        return false;
    },
    
    getUser() { return AppState.user; },
    getToken() { return AppState.token; }
};

// ==================== SERVICES API ====================
const ServicesAPI = {
    async getAll(category = '', search = '') {
        let url = '/services';
        const params = new URLSearchParams();
        if (category) params.append('category', category);
        if (search) params.append('search', search);
        if (params.toString()) url += '?' + params.toString();
        
        const response = await API.get(url);
        return response.data;
    },
    
    async getCategories() {
        const response = await API.get('/services/categories/all');
        return response.data;
    },
    
    async getById(serviceId) {
        const response = await API.get(`/services/${serviceId}`);
        return response.data;
    },
    
    async search(query) {
        const response = await API.get(`/services/search?q=${encodeURIComponent(query)}`);
        return response.data;
    },
    
    async getPopular(limit = 5) {
        const response = await API.get(`/services/popular?limit=${limit}`);
        return response.data;
    }
};

// ==================== WORKERS API ====================
const WorkersAPI = {
    async getNearby(latitude, longitude, serviceId = null, radius = 10) {
        let url = `/workers/nearby?latitude=${latitude}&longitude=${longitude}&radius=${radius}`;
        if (serviceId) url += `&serviceId=${serviceId}`;
        
        const response = await API.get(url);
        return response.data;
    },
    
    async getById(workerId) {
        const response = await API.get(`/workers/${workerId}`);
        return response.data;
    },
    
    async register(workerData) {
        const response = await API.post('/workers/register', workerData);
        return response.data;
    },
    
    async updateAvailability(isAvailable) {
        const response = await API.put('/workers/availability', { is_available: isAvailable });
        return response.data;
    },
    
    async getDashboard() {
        const response = await API.get('/workers/dashboard/stats');
        return response.data;
    }
};

// ==================== BOOKINGS API ====================
const BookingsAPI = {
    async create(bookingData) {
        const response = await API.post('/bookings', bookingData);
        return response.data;
    },
    
    async getCustomerBookings(status = null) {
        let url = '/bookings/customer';
        if (status) url += `?status=${status}`;
        const response = await API.get(url);
        return response.data;
    },
    
    async getWorkerBookings(status = null) {
        let url = '/bookings/worker';
        if (status) url += `?status=${status}`;
        const response = await API.get(url);
        return response.data;
    },
    
    async getById(bookingId) {
        const response = await API.get(`/bookings/${bookingId}`);
        return response.data;
    },
    
    async updateStatus(bookingId, status, reason = null) {
        const response = await API.put(`/bookings/${bookingId}/status`, { status, reason });
        return response.data;
    },
    
    async checkAvailability(workerId, date, time, duration) {
        const response = await API.post('/bookings/check-availability', {
            worker_id: workerId,
            booking_date: date,
            start_time: time,
            duration_hours: duration
        });
        return response.data;
    },
    
    async getCustomerUpcoming() {
        const response = await API.get('/bookings/customer/upcoming');
        return response.data;
    },
    
    async getWorkerUpcoming() {
        const response = await API.get('/bookings/worker/upcoming');
        return response.data;
    }
};

// ==================== REVIEWS API ====================
const ReviewsAPI = {
    async create(reviewData) {
        const response = await API.post('/reviews', reviewData);
        return response.data;
    },
    
    async getWorkerReviews(workerId, page = 1, limit = 10) {
        const response = await API.get(`/reviews/worker/${workerId}?page=${page}&limit=${limit}`);
        return response.data;
    },
    
    async getCustomerReviews() {
        const response = await API.get('/reviews/customer');
        return response.data;
    },
    
    async getByBooking(bookingId) {
        const response = await API.get(`/reviews/booking/${bookingId}`);
        return response.data;
    },
    
    async canReview(bookingId) {
        const response = await API.get(`/reviews/can-review/${bookingId}`);
        return response.data;
    },
    
    async markHelpful(reviewId) {
        const response = await API.post(`/reviews/${reviewId}/helpful`, {});
        return response.data;
    },
    
    async getRecent(limit = 6) {
        const response = await API.get(`/reviews/recent?limit=${limit}`);
        return response.data;
    }
};

// ==================== ADMIN API ====================
const AdminAPI = {
    async getDashboardStats() {
        const response = await API.get('/admin/dashboard/stats');
        return response.data;
    },
    
    async getUsers(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const response = await API.get(`/admin/users?${queryString}`);
        return response.data;
    },
    
    async updateUserStatus(userId, isActive) {
        const response = await API.put(`/admin/users/${userId}/status`, { is_active: isActive });
        return response.data;
    },
    
    async getWorkers(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const response = await API.get(`/admin/workers?${queryString}`);
        return response.data;
    },
    
    async approveWorker(workerId, status) {
        const response = await API.put(`/admin/workers/${workerId}/approve`, { status });
        return response.data;
    },
    
    async getServices() {
        const response = await API.get('/admin/services');
        return response.data;
    },
    
    async createService(serviceData) {
        const response = await API.post('/admin/services', serviceData);
        return response.data;
    },
    
    async updateService(serviceId, serviceData) {
        const response = await API.put(`/admin/services/${serviceId}`, serviceData);
        return response.data;
    },
    
    async deleteService(serviceId) {
        const response = await API.delete(`/admin/services/${serviceId}`);
        return response.data;
    },
    
    async getAnalytics(period = 'month') {
        const response = await API.get(`/admin/analytics?period=${period}`);
        return response.data;
    }
};

// ==================== LOCATION SERVICE ====================
const LocationService = {
    async getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }
            navigator.geolocation.getCurrentPosition(resolve, reject);
        });
    },
    
    async detectLocation() {
        try {
            Toast.show('Detecting your location...', 'info');
            const position = await this.getCurrentLocation();
            const { latitude, longitude } = position.coords;
            
            // Get city name from coordinates using reverse geocoding
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            );
            const data = await response.json();
            const city = data.address.city || data.address.town || 'Mumbai';
            
            AppState.currentLocation = { latitude, longitude };
            AppState.selectedCity = city;
            localStorage.setItem('selectedCity', city);
            
            Toast.show(`Location detected: ${city}`, 'success');
            return { latitude, longitude, city };
        } catch (error) {
            Toast.show('Using default location: Mumbai', 'info');
            return { latitude: 19.0760, longitude: 72.8777, city: 'Mumbai' };
        }
    }
};

// ==================== TOAST NOTIFICATION ====================
const Toast = {
    show(message, type = 'info', duration = 3000) {
        const toast = document.getElementById('toast') || this.createToast();
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), duration);
    },
    
    createToast() {
        const toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
        return toast;
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
    },
    
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0
        }).format(amount);
    },
    
    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    },
    
    showLoader(container) {
        const loader = document.createElement('div');
        loader.className = 'loader';
        loader.innerHTML = '<div class="spinner"></div>';
        container.appendChild(loader);
    },
    
    hideLoader(container) {
        const loader = container.querySelector('.loader');
        if (loader) loader.remove();
    }
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    Auth.checkAuth();
    UI.updateNavbar();
    
    // Load featured services on homepage
    if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
        loadHomepageData();
    }
});

async function loadHomepageData() {
    try {
        // Load popular services
        const popularServices = await ServicesAPI.getPopular(6);
        
        // Load recent reviews
        const recentReviews = await ReviewsAPI.getRecent(3);
        
        // Update UI with real data
        updateHomepageWithData(popularServices, recentReviews);
    } catch (error) {
        console.error('Failed to load homepage data:', error);
    }
}

function updateHomepageWithData(services, reviews) {
    // Update your homepage sections here
    console.log('Homepage data loaded:', { services, reviews });
}

// ==================== EXPORT FOR GLOBAL USE ====================
window.AppState = AppState;
window.Auth = Auth;
window.API = API;
window.ServicesAPI = ServicesAPI;
window.WorkersAPI = WorkersAPI;
window.BookingsAPI = BookingsAPI;
window.ReviewsAPI = ReviewsAPI;
window.AdminAPI = AdminAPI;
window.LocationService = LocationService;
window.Toast = Toast;
window.UI = UI;
