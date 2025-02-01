// Initialize Supabase client
const supabase = window.supabase.createClient(
    "https://znuxahdqxencqtsvxvja.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpudXhhaGRxeGVuY3F0c3Z4dmphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc4MDQzNjUsImV4cCI6MjA1MzM4MDM2NX0.8evCXHMfkn1yhsVB8lQ62BL3b6-j4KZ_oszTuYLT6G0"
);

// Cache DOM elements
const elements = {
    searchInput: document.getElementById('searchInput'),
    addButton: document.getElementById('addButton'),
    cardsContainer: document.getElementById('cardsContainer'),
    modal: document.getElementById('modal'),
    modalTitle: document.getElementById('modalTitle'),
    infoForm: document.getElementById('infoForm'),
    nameInput: document.getElementById('nameInput'),
    genderInput: document.getElementById('genderInput'),
    phoneInput: document.getElementById('phoneInput'),
    ageInput: document.getElementById('ageInput'),
    levelInput: document.getElementById('levelInput'),
    attendance5th: document.getElementById('attendance2nd'),
    attendance12th: document.getElementById('attendance9th'),
    attendance19th: document.getElementById('attendance16th'),
    attendance26th: document.getElementById('attendance23rd'),
    cancelButton: document.getElementById('cancelButton'),
    closeButton: document.getElementById('closeButton'),
    successToast: document.getElementById('successToast'),
    errorToast: document.getElementById('errorToast')
};

let editingId = null;
let searchCache = new Map();
let lastSearchTerm = '';
let searchTimeout;

// Optimized debounce function
function debounce(func, wait) {
    return function(...args) {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Optimized event listeners with delegation
elements.searchInput.addEventListener('input', debounce(filterItems, 100)); // Reduced to 100ms
elements.addButton.addEventListener('click', () => showModal());
elements.cancelButton.addEventListener('click', handleCloseClick);
elements.closeButton.addEventListener('click', handleCloseClick);
elements.infoForm.addEventListener('submit', handleSubmit);
elements.modal.addEventListener('click', (e) => {
    if (e.target === elements.modal) hideModal();
});

// Optimized close button handler
function handleCloseClick(e) {
    addButtonPressAnimation(e.target);
    requestAnimationFrame(hideModal);
}

// Optimized modal hide
function hideModal() {
    elements.modal.classList.add('closing');
    setTimeout(() => {
        elements.modal.style.display = 'none';
        elements.modal.classList.remove('closing');
        elements.infoForm.reset();
        editingId = null;
    }, 200);
}

// Optimized button animation
function addButtonPressAnimation(button) {
    requestAnimationFrame(() => {
        button.classList.add('button-press');
        setTimeout(() => button.classList.remove('button-press'), 200);
    });
}

// Optimized search function
async function filterItems() {
    const searchTerm = elements.searchInput.value.toLowerCase().trim();
    
    if (!searchTerm) {
        // If search is cleared, load all data
        await loadInitialData();
        return;
    }

    // Check cache first
    if (searchCache.has(searchTerm)) {
        requestAnimationFrame(() => displayItems(searchCache.get(searchTerm)));
        return;
    }

    try {
        const { data, error } = await supabase
            .from('TMHCT_Feb')
            .select('*')
            .ilike('full_name', `%${searchTerm}%`);

        if (error) throw error;

        // Cache the results
        searchCache.set(searchTerm, data || []);
        displayItems(data || []);
    } catch (error) {
        console.error('Error searching:', error);
        elements.cardsContainer.innerHTML = '<p class="error-message">Error searching records</p>';
    }
}

// Optimized display function
function displayItems(items) {
    const fragment = document.createDocumentFragment();
    
    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'result-item';
        const itemData = encodeURIComponent(JSON.stringify(item));
        
        div.innerHTML = `
            <h3>${escapeHtml(item.full_name)}</h3>
            <p>
                <strong>Gender:</strong> ${escapeHtml(item.gender || 'N/A')}<br>
                <strong>Age:</strong> ${item.age || 'N/A'}<br>
                <strong>Phone:</strong> ${escapeHtml(item.phone_number || 'N/A')}<br>
                <strong>Level:</strong> ${escapeHtml(item.current_level || 'N/A')}
            </p>
            <div class="attendance-section">
                <strong>Attendance:</strong><br>
                ${getAttendanceDisplay(item)}
            </div>
            <div class="flex gap-3 mt-3">
                <button onclick="editItem('${itemData}')"
                    class="search-button py-2 px-4 text-sm">
                    Edit
                </button>
                <button onclick="deleteItem(${item.id})"
                    class="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded text-sm">
                    Delete
                </button>
            </div>`;
        
        fragment.appendChild(div);
    });

    requestAnimationFrame(() => {
        elements.cardsContainer.innerHTML = '';
        elements.cardsContainer.appendChild(fragment);
    });
}

// Function to show modal for adding/editing
function showModal(item = null) {
    editingId = item ? item.id : null;
    elements.modalTitle.textContent = item ? 'Edit Information' : 'Add New Information';

    // Reset form before setting new values
    elements.infoForm.reset();

    if (item) {
        elements.nameInput.value = item.full_name || '';
        elements.genderInput.value = item.gender || '';
        elements.phoneInput.value = item.phone_number || '';
        elements.ageInput.value = item.age || '';
        elements.levelInput.value = item.current_level || '';
        elements.attendance5th.value = item.attendance_2nd || '';
        elements.attendance12th.value = item.attendance_9th || '';
        elements.attendance19th.value = item.attendance_16th || '';
        elements.attendance26th.value = item.attendance_23rd || '';
    }

    elements.modal.style.display = 'block';
    elements.nameInput.focus();
}

// Optimized form submission
async function handleSubmit(e) {
    e.preventDefault();
    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;

    const formData = {
        full_name: elements.nameInput.value.trim(),
        gender: elements.genderInput.value,
        phone_number: elements.phoneInput.value.trim(),
        age: elements.ageInput.value ? parseInt(elements.ageInput.value) : null,
        current_level: elements.levelInput.value,
        attendance_2nd: elements.attendance5th.value || null,
        attendance_9th: elements.attendance12th.value || null,
        attendance_16th: elements.attendance19th.value || null,
        attendance_23rd: elements.attendance26th.value || null
    };

    if (!formData.full_name) {
        showToast('error');
        elements.nameInput.focus();
        submitButton.disabled = false;
        return;
    }

    try {
        let response;
        if (editingId) {
            response = await supabase
                .from('TMHCT_Feb')
                .update(formData)
                .eq('id', editingId);
        } else {
            response = await supabase
                .from('TMHCT_Feb')
                .insert([formData]);
        }

        if (response.error) {
            throw response.error;
        }

        // Clear the cache since data has changed
        searchCache.clear();
        showToast('success');
        hideModal();
        
        // Force refresh the display regardless of search state
        const currentSearch = elements.searchInput.value.trim();
        if (currentSearch) {
            // If there's a search term, refresh the search results
            await filterItems();
        } else {
            // If no search term, clear the display
            elements.cardsContainer.innerHTML = '';
            // Fetch and display the edited record
            if (editingId) {
                const { data, error } = await supabase
                    .from('TMHCT_Feb')
                    .select('*')
                    .eq('id', editingId)
                    .single();
                
                if (!error && data) {
                    displayItems([data]);
                }
            }
        }

        // Refresh the statistics after saving
        await fetchAndDisplayStats();
    } catch (error) {
        console.error('Error:', error);
        showToast('error');
    } finally {
        submitButton.disabled = false;
    }
}

// Optimized toast display
function showToast(type) {
    const toast = type === 'success' ? elements.successToast : elements.errorToast;
    requestAnimationFrame(() => {
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    });
}

// Helper function to escape HTML content
function escapeHtml(unsafe) {
    if (unsafe == null) return '';
    return unsafe
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Function to handle edit button click
function editItem(itemData) {
    try {
        const item = JSON.parse(decodeURIComponent(itemData));
        showModal(item);
    } catch (error) {
        console.error('Error parsing item data:', error);
        showToast('error');
    }
}

// Function to handle delete button click
async function deleteItem(id) {
    if (!confirm('Are you sure you want to delete this record?')) return;

    try {
        const { error } = await supabase
            .from('TMHCT_Feb')
            .delete()
            .eq('id', id);

        if (error) throw error;

        // Clear the cache since data has changed
        searchCache.clear();
        showToast('success');

        // Refresh the display
        const currentSearch = elements.searchInput.value.trim();
        if (currentSearch) {
            await filterItems();
        } else {
            await loadInitialData();
        }

        // Refresh the statistics
        await fetchAndDisplayStats();
    } catch (error) {
        console.error('Error deleting record:', error);
        showToast('error');
    }
}

// Function to get attendance display
function getAttendanceDisplay(item) {
    const attendanceFields = [
        { field: 'attendance_2nd', display: '2nd' },
        { field: 'attendance_9th', display: '9th' },
        { field: 'attendance_16th', display: '16th' },
        { field: 'attendance_23rd', display: '23rd' }
    ];
    return attendanceFields.map(field => {
        const value = item[field.field];
        return `<div class="attendance-item">
            <span>${field.display}:</span>
            <span class="attendance-value ${value?.toLowerCase() === 'present' ? 'present' : 'absent'}">
                ${escapeHtml(value || 'N/A')}
            </span>
        </div>`;
    }).join('');
}

// Function to load initial data
async function loadInitialData() {
    try {
        const { data, error } = await supabase
            .from('TMHCT_Feb')
            .select('*')
            .order('full_name');

        if (error) throw error;
        displayItems(data || []);
        await fetchAndDisplayStats();
    } catch (error) {
        console.error('Error loading data:', error);
        elements.cardsContainer.innerHTML = '<p class="error-message">Error loading records</p>';
    }
}

// Function to fetch and display statistics
async function fetchAndDisplayStats() {
    try {
        const { data, error } = await supabase
            .from('TMHCT_Feb')
            .select('*');

        if (error) throw error;

        // Update total count
        document.getElementById('totalPeople').textContent = data.length;

        // Update gender counts
        const genderCounts = data.reduce((acc, item) => {
            const gender = item.gender?.toLowerCase() || '';
            if (gender === 'male') acc.boys++;
            if (gender === 'female') acc.girls++;
            return acc;
        }, { boys: 0, girls: 0 });

        document.getElementById('totalBoys').textContent = genderCounts.boys;
        document.getElementById('totalGirls').textContent = genderCounts.girls;

        // Define the order of levels
        const levelOrder = [
            'SHS1', 'SHS2', 'SHS3',
            'JHS1', 'JHS2', 'JHS3',
            'COMPLETED', 'UNIVERSITY'
        ];

        // Initialize counts for all levels
        const levelCounts = levelOrder.reduce((acc, level) => {
            acc[level] = 0;
            return acc;
        }, {});

        // Count students in each level
        data.forEach(item => {
            const level = item.current_level?.toUpperCase() || 'UNKNOWN';
            if (levelCounts.hasOwnProperty(level)) {
                levelCounts[level]++;
            }
        });

        // Generate HTML for level stats in the specified order
        const levelStatsHtml = levelOrder
            .map(level => {
                const count = levelCounts[level];
                return `
                    <div class="level-stat">
                        <span class="level-name">${level}</span>
                        <span class="level-count">${count}</span>
                    </div>`;
            })
            .join('');

        document.getElementById('levelStats').innerHTML = levelStatsHtml;
    } catch (error) {
        console.error('Error fetching stats:', error);
    }
}

// Load initial data when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadInitialData();
});

// Function to toggle stat content
function toggleStatContent(header) {
    const content = header.nextElementSibling;
    const arrow = header.querySelector('.toggle-arrow');
    
    if (content.style.maxHeight) {
        content.style.maxHeight = null;
        arrow.textContent = '▼';
    } else {
        content.style.maxHeight = content.scrollHeight + "px";
        arrow.textContent = '▲';
    }
}