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
    attendance5th: document.getElementById('attendance5th'),
    attendance12th: document.getElementById('attendance12th'),
    attendance19th: document.getElementById('attendance19th'),
    attendance26th: document.getElementById('attendance26th'),
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
        elements.cardsContainer.innerHTML = '';
        return;
    }

    // Prevent duplicate searches
    if (searchTerm === lastSearchTerm) return;
    lastSearchTerm = searchTerm;

    // Check cache first
    if (searchCache.has(searchTerm)) {
        requestAnimationFrame(() => displayItems(searchCache.get(searchTerm)));
        return;
    }

    try {
        const { data, error } = await supabase
            .from('csv_data_january')
            .select('*')
            .ilike('full_name', `%${searchTerm}%`);
        
        if (error) throw error;

        if (!data || data.length === 0) {
            elements.cardsContainer.innerHTML = '<p class="text-white text-center">No results found</p>';
            return;
        }

        // Cache results
        searchCache.set(searchTerm, data);
        if (searchCache.size > 50) { // Reduced cache size for better memory management
            const firstKey = searchCache.keys().next().value;
            searchCache.delete(firstKey);
        }

        requestAnimationFrame(() => displayItems(data));
    } catch (error) {
        console.error('Error:', error);
        elements.cardsContainer.innerHTML = '<p class="text-white text-center">Error occurred</p>';
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
            </div>`;
        
        fragment.appendChild(div);
    });

    elements.cardsContainer.innerHTML = '';
    elements.cardsContainer.appendChild(fragment);
}

async function showModal(item = null) {
    editingId = item ? item.id : null;
    elements.modalTitle.textContent = item ? 'Edit Information' : 'Add New Information';

    if (item) {
        elements.nameInput.value = item.full_name || '';
        elements.genderInput.value = item.gender || '';
        elements.phoneInput.value = item.phone_number || '';
        elements.ageInput.value = item.age || '';
        elements.levelInput.value = item.current_level || '';
        elements.attendance5th.value = item.attendance_5th || '';
        elements.attendance12th.value = item.attendance_12th || '';
        elements.attendance19th.value = item.attendance_19th || '';
        elements.attendance26th.value = item.attendance_26th || '';
    } else {
        elements.infoForm.reset();
    }

    elements.modal.style.display = 'block';
    // Force reflow to trigger animation
    elements.modal.offsetHeight;
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
        age: parseInt(elements.ageInput.value) || null,
        current_level: elements.levelInput.value,
        attendance_5th: elements.attendance5th.value,
        attendance_12th: elements.attendance12th.value,
        attendance_19th: elements.attendance19th.value,
        attendance_26th: elements.attendance26th.value
    };

    if (!formData.full_name) {
        showToast('error');
        elements.nameInput.focus();
        submitButton.disabled = false;
        return;
    }

    try {
        const { error } = editingId
            ? await supabase
                .from('csv_data_january')
                .update(formData)
                .eq('id', editingId)
            : await supabase
                .from('csv_data_january')
                .insert([formData]);

        if (error) throw error;

        searchCache.clear();
        showToast('success');
        hideModal();
        
        if (elements.searchInput.value.trim()) {
            filterItems();
        }
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
    }
}

// Function to get attendance display
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

// Function to delete item
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
    if (elements.searchInput.value.trim()) {
        filterItems();
    }
}

// Initialize with empty container
elements.cardsContainer.innerHTML = '';