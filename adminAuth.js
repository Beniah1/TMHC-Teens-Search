const adminAuth = {
    password: "TMHT", // Updated password
    isAuthenticated: false,
    modal: null,
    form: null,
    lockIcon: null,
    
    init() {
        this.modal = document.getElementById('adminLoginModal');
        this.form = document.getElementById('adminLoginForm');
        this.lockIcon = document.querySelector('.lock-icon');
        
        if (!this.modal || !this.form || !this.lockIcon) {
            console.error('Required admin elements not found');
            return;
        }
        
        this.setupEventListeners();
        this.setupPasswordToggle();
        
        // Initialize the state
        if (localStorage.getItem('adminAuthenticated') === 'true') {
            this.isAuthenticated = true;
            document.querySelector('.admin-theme').classList.add('active');
        }

        // Add logout button handler
        const logoutButton = document.getElementById('adminLogout');
        if (logoutButton) {
            logoutButton.addEventListener('click', () => this.handleLogout());
        }
    },

    setupEventListeners() {
        // Handle form submission
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Close modal when clicking outside
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hideModal();
            }
        });
    },

    setupPasswordToggle() {
        const toggleBtn = document.querySelector('.password-toggle');
        const passwordInput = document.getElementById('adminPassword');

        toggleBtn.addEventListener('click', () => {
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            toggleBtn.textContent = type === 'password' ? '👁️' : '👁️‍🗨️';
        });
    },

    async handleLogin() {
        const password = document.getElementById('adminPassword').value;
        const submitBtn = this.form.querySelector('.admin-submit');
        const buttonText = submitBtn.querySelector('.button-text');
        
        // Show loading state
        submitBtn.classList.add('loading');
        buttonText.textContent = 'Verifying...';

        try {
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            if (password === this.password) {
                this.loginSuccess();
            } else {
                this.loginError();
            }
        } finally {
            submitBtn.classList.remove('loading');
            buttonText.textContent = 'Login';
        }
    },

    handleLogout() {
        this.isAuthenticated = false;
        localStorage.removeItem('adminAuthenticated');
        
        // Reset theme to default green
        document.body.className = 'theme-green';
        document.querySelector('.admin-theme').classList.remove('active');
        document.querySelector('.green-theme').classList.add('active');
        
        // Hide admin sections
        adminFeatures.hideAdminSections();
        
        // Show logout success toast
        const toast = document.getElementById('successToast');
        if (toast) {
            toast.querySelector('span').textContent = 'Logged out successfully';
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 3000);
        }
    },

    loginSuccess() {
        this.isAuthenticated = true;
        localStorage.setItem('adminAuthenticated', 'true');
        this.lockIcon.textContent = '🔓';
        this.lockIcon.classList.add('unlock-animation');
        
        // Show success animation
        const modalContent = document.querySelector('.admin-modal-content');
        modalContent.classList.add('success');

        // Show login success toast
        const toast = document.getElementById('successToast');
        if (toast) {
            toast.querySelector('span').textContent = 'Logged in successfully';
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 3000);
        }

        setTimeout(() => {
            this.hideModal();
            adminFeatures.showAdminSections();
            // Update the theme
            document.body.className = 'theme-admin';
            // Update the theme switcher button
            document.querySelector('.admin-theme').classList.add('active');
        }, 1500);
    },

    loginError() {
        this.form.classList.add('error');
        this.lockIcon.classList.add('shake-animation');
        
        setTimeout(() => {
            this.form.classList.remove('error');
            this.lockIcon.classList.remove('shake-animation');
        }, 500);
    },

    showModal() {
        if (!this.isAuthenticated) {
            this.modal.classList.add('show');
            document.getElementById('adminPassword').focus();
        }
    },

    hideModal() {
        this.modal.classList.remove('show');
        this.form.reset();
    }
};

// Initialize adminAuth when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    adminAuth.init();
}); 