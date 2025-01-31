// Initialize Supabase client
const supabase = window.supabase.createClient(
    "https://znuxahdqxencqtsvxvja.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpudXhhaGRxeGVuY3F0c3Z4dmphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc4MDQzNjUsImV4cCI6MjA1MzM4MDM2NX0.8evCXHMfkn1yhsVB8lQ62BL3b6-j4KZ_oszTuYLT6G0"
);

// DOM Elements
const searchInput = document.getElementById('searchInput');
const addButton = document.getElementById('addButton');
const cardsContainer = document.getElementById('cardsContainer');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const infoForm = document.getElementById('infoForm');
const nameInput = document.getElementById('nameInput');
const genderInput = document.getElementById('genderInput');
const phoneInput = document.getElementById('phoneInput');
const ageInput = document.getElementById('ageInput');
const levelInput = document.getElementById('levelInput');
const attendance5th = document.getElementById('attendance5th');
const attendance12th = document.getElementById('attendance12th');
const attendance19th = document.getElementById('attendance19th');
const attendance26th = document.getElementById('attendance26th');
const cancelButton = document.getElementById('cancelButton');
const closeButton = document.getElementById('closeButton');
const successToast = document.getElementById('successToast');
const errorToast = document.getElementById('errorToast');

let editingId = null;

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Debounce function with shorter delay
const debouncedFilter = debounce(filterItems, 150); // Reduced from 300ms to 150ms

// Cache for search results
let searchCache = new Map();

// Event Listeners
searchInput.addEventListener('input', debouncedFilter);
addButton.addEventListener('click', () => showModal());
cancelButton.addEventListener('click', (e) => {
    addButtonPressAnimation(e.target);
    setTimeout(hideModal, 100);
});
closeButton.addEventListener('click', (e) => {
    addButtonPressAnimation(e.target);
    setTimeout(hideModal, 100);
});
infoForm.addEventListener('submit', handleSubmit);

// Close modal when clicking outside
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        hideModal();
    }
});

async function filterItems() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (!searchTerm) {
        cardsContainer.innerHTML = '';
        return;
    }

    // Check cache first
    const cacheKey = searchTerm;
    if (searchCache.has(cacheKey)) {
        displayItems(searchCache.get(cacheKey));
        return;
    }

    try {
        let query = supabase
            .from('csv_data_january')
            .select('*')
            .ilike('full_name', `%${searchTerm}%`);

        const { data, error } = await query;
        
        if (error) {
            console.error('Error fetching data:', error);
            cardsContainer.innerHTML = '<p class="text-white text-center">Error fetching data</p>';
            return;
        }

        if (data.length === 0) {
            cardsContainer.innerHTML = '<p class="text-white text-center">No results found</p>';
            return;
        }

        // Cache the results
        searchCache.set(cacheKey, data);
        // Limit cache size to prevent memory issues
        if (searchCache.size > 100) {
            const firstKey = searchCache.keys().next().value;
            searchCache.delete(firstKey);
        }

        displayItems(data);
    } catch (error) {
        console.error('Error:', error);
        cardsContainer.innerHTML = '<p class="text-white text-center">Error occurred</p>';
    }
}

function showModal(item = null) {
    editingId = item ? item.id : null;
    modalTitle.textContent = item ? 'Edit Information' : 'Add New Information';

    if (item) {
        nameInput.value = item.full_name || '';
        genderInput.value = item.gender || '';
        phoneInput.value = item.phone_number || '';
        ageInput.value = item.age || '';
        levelInput.value = item.current_level || '';
        attendance5th.value = item.attendance_5th || '';
        attendance12th.value = item.attendance_12th || '';
        attendance19th.value = item.attendance_19th || '';
        attendance26th.value = item.attendance_26th || '';
    } else {
        infoForm.reset();
    }

    modal.style.display = 'block';
    // Force reflow to trigger animation
    modal.offsetHeight;
    nameInput.focus();
}

function hideModal() {
    const modalElement = document.getElementById('modal');
    modalElement.classList.add('closing');
    setTimeout(() => {
        modalElement.style.display = 'none';
        modalElement.classList.remove('closing');
        infoForm.reset();
        editingId = null;
    }, 200);
}

function addButtonPressAnimation(button) {
    button.classList.add('button-press');
    setTimeout(() => button.classList.remove('button-press'), 200);
}

async function handleSubmit(e) {
    e.preventDefault();

    // Disable form submission while processing
    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;

    const formData = {
        full_name: nameInput.value.trim(),
        gender: genderInput.value,
        phone_number: phoneInput.value.trim(),
        age: parseInt(ageInput.value) || null,
        current_level: levelInput.value,
        attendance_5th: attendance5th.value,
        attendance_12th: attendance12th.value,
        attendance_19th: attendance19th.value,
        attendance_26th: attendance26th.value
    };

    if (!formData.full_name) {
        showToast('error');
        nameInput.focus();
        submitButton.disabled = false;
        return;
    }

    try {
        let error;
        if (editingId) {
            const { error: updateError } = await supabase
                .from('csv_data_january')
                .update(formData)
                .eq('id', editingId);
            error = updateError;
        } else {
            const { error: insertError } = await supabase
                .from('csv_data_january')
                .insert([formData]);
            error = insertError;
        }

        if (error) {
            console.error('Error saving data:', error);
            showToast('error');
            submitButton.disabled = false;
            return;
        }

        // Clear the cache since data has changed
        searchCache.clear();
        
        showToast('success');
        hideModal();
        
        // Only refresh the display if there's a search term
        if (searchInput.value.trim()) {
            filterItems();
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('error');
    } finally {
        submitButton.disabled = false;
    }
}

function getAttendanceDisplay(record) {
    const attendanceDays = [
        { date: '5th', value: record.attendance_5th },
        { date: '12th', value: record.attendance_12th },
        { date: '19th', value: record.attendance_19th },
        { date: '26th', value: record.attendance_26th }
    ];

    return attendanceDays
        .filter(day => day.value)
        .map(day => `${day.date}: ${day.value}`)
        .join(' | ');
}

function displayItems(items) {
    cardsContainer.innerHTML = items.map(item => {
        const itemData = encodeURIComponent(JSON.stringify(item));
        return `
        <div class="result-item">
            <h3>${escapeHtml(item.full_name)}</h3>
            <p>
                <strong>Gender:</strong> ${escapeHtml(item.gender || 'N/A')}<br>
                <strong>Age:</strong> ${item.age || 'N/A'}<br>
                <strong>Phone:</strong> ${escapeHtml(item.phone_number || 'N/A')}<br>
                <strong>Level:</strong> ${escapeHtml(item.current_level || 'N/A')}<br>
                <strong>Attendance:</strong><br>
                ${getAttendanceDisplay(item) || 'No attendance recorded'}
            </p>
            <div class="flex gap-3">
                <button onclick="editItem('${itemData}')"
                    class="search-button py-2 px-4 text-sm">
                    Edit
                </button>
                <button onclick="deleteItem(${item.id})"
                    class="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded text-sm">
                    Delete
                </button>
            </div>
        </div>
    `}).join('');
}

async function deleteItem(id) {
    if (!confirm('Are you sure you want to delete this record?')) {
        return;
    }

    const { error } = await supabase
        .from('csv_data_january')
        .delete()
        .eq('id', id);

    if (error) {
        alert('Error deleting record: ' + error.message);
        return;
    }

    // Only refresh the display if there's a search term
    if (searchInput.value.trim()) {
        filterItems();
    }
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
    }
}

// Function to show toast notification
function showToast(type) {
    const toast = type === 'success' ? successToast : errorToast;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Initialize with empty container
cardsContainer.innerHTML = '';