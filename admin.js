// Admin functionality
const adminFeatures = {
    init() {
        this.adminSection = document.querySelector('.admin-sections');
        this.statsContainer = document.querySelector('.stats-container');
        this.categoryFilter = document.querySelector('.category-filter');
        
        // Initially hide admin sections
        this.hideAdminSections();
    },

    hideAdminSections() {
        if (this.adminSection) {
            this.adminSection.style.display = 'none';
        }
        if (this.statsContainer) {
            this.statsContainer.style.display = 'none';
        }
        if (this.categoryFilter) {
            this.categoryFilter.style.display = 'none';
        }
    },

    showAdminSections() {
        if (this.adminSection) {
            this.adminSection.style.display = 'block';
        }
        if (this.statsContainer) {
            this.statsContainer.style.display = 'block';
        }
        if (this.categoryFilter) {
            this.categoryFilter.style.display = 'block';
        }
    }
}; 