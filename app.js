// Initialize Supabase client
const supabase = window.supabase.createClient(
  "https://znuxahdqxencqtsvxvja.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpudXhhaGRxeGVuY3F0c3Z4dmphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc4MDQzNjUsImV4cCI6MjA1MzM4MDM2NX0.8evCXHMfkn1yhsVB8lQ62BL3b6-j4KZ_oszTuYLT6G0"
);

// Cache DOM elements
const elements = {
  searchInput: document.getElementById("searchInput"),
  addButton: document.getElementById("addButton"),
  cardsContainer: document.getElementById("cardsContainer"),
  modal: document.getElementById("modal"),
  modalTitle: document.getElementById("modalTitle"),
  infoForm: document.getElementById("infoForm"),
  nameInput: document.getElementById("nameInput"),
  genderInput: document.getElementById("genderInput"),
  phoneInput: document.getElementById("phoneInput"),
  ageInput: document.getElementById("ageInput"),
  levelInput: document.getElementById("levelInput"),
  attendance5th: document.getElementById("attendance2nd"),
  attendance12th: document.getElementById("attendance9th"),
  attendance19th: document.getElementById("attendance16th"),
  attendance26th: document.getElementById("attendance23rd"),
  cancelButton: document.getElementById("cancelButton"),
  closeButton: document.getElementById("closeButton"),
  successToast: document.getElementById("successToast"),
  errorToast: document.getElementById("errorToast"),
  categoryFilter: document.getElementById("categoryFilter"),
};

let editingId = null;
let searchCache = {
  data: new Map(),
  timestamps: new Map(),

  set: function (key, value) {
    this.data.set(key, value);
    this.timestamps.set(key, Date.now());
  },

  get: function (key) {
    const timestamp = this.timestamps.get(key);
    if (timestamp && Date.now() - timestamp < CACHE_DURATION) {
      return this.data.get(key);
    }
    this.data.delete(key);
    this.timestamps.delete(key);
    return null;
  },

  clear: function () {
    this.data.clear();
    this.timestamps.clear();
  },
};

let lastSearchTerm = "";
let searchTimeout;

// Add performance constants
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
const DEBOUNCE_DELAY = 100;
const BATCH_SIZE = 50;

// First, update the debounce function
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

// Then, update the search function
const filterItems = debounce(async function () {
  try {
    const searchTerm = elements.searchInput.value.toLowerCase().trim();

    if (!searchTerm) {
      await loadInitialData();
      return;
    }

    // Check cache
    const cachedResults = searchCache.get(searchTerm);
    if (cachedResults) {
      displayItems(cachedResults);
      return;
    }

    // If not in cache, fetch from database
    const { data, error } = await supabase
      .from("TMHCT_Feb")
      .select("*")
      .ilike("full_name", `%${searchTerm}%`)
      .order("full_name");

    if (error) throw error;

    // Cache the results
    searchCache.set(searchTerm, data || []);
    displayItems(data || []);
  } catch (error) {
    console.error("Error searching:", error);
    elements.cardsContainer.innerHTML =
      '<p class="error-message">Error searching records</p>';
  }
}, 300); // Increased debounce time slightly for better performance

// Update the event listener
elements.searchInput.removeEventListener("input", filterItems); // Remove old listener if exists
elements.searchInput.addEventListener("input", () => {
  const searchTerm = elements.searchInput.value.trim();
  if (searchTerm === lastSearchTerm) return; // Prevent unnecessary searches

  lastSearchTerm = searchTerm;
  filterItems();
});

// Optimized event listeners with delegation
elements.addButton.addEventListener("click", () => showModal());
elements.cancelButton.addEventListener("click", handleCloseClick);
elements.closeButton.addEventListener("click", handleCloseClick);
elements.infoForm.addEventListener("submit", handleSubmit);
elements.modal.addEventListener("click", (e) => {
  if (e.target === elements.modal) hideModal();
});

// Optimized close button handler
function handleCloseClick(e) {
  addButtonPressAnimation(e.target);
  requestAnimationFrame(hideModal);
}

// Optimized modal hide
function hideModal() {
  elements.modal.classList.add("closing");
  setTimeout(() => {
    elements.modal.style.display = "none";
    elements.modal.classList.remove("closing");
    elements.infoForm.reset();
    editingId = null;
  }, 150);
}

// Optimized button animation
function addButtonPressAnimation(button) {
  requestAnimationFrame(() => {
    button.classList.add("button-press");
    setTimeout(() => button.classList.remove("button-press"), 200);
  });
}

// Optimized display function with batching
function displayItems(items) {
  const fragment = document.createDocumentFragment();
  const totalItems = items.length;
  let processedItems = 0;

  function processBatch() {
    const batchEnd = Math.min(processedItems + BATCH_SIZE, totalItems);

    for (let i = processedItems; i < batchEnd; i++) {
      const item = items[i];
      const div = document.createElement("div");
      div.className = "result-item";

      // Use template literals only once
      const itemData = encodeURIComponent(JSON.stringify(item));
      const itemHTML = getItemHTML(item, itemData);

      div.innerHTML = itemHTML;
      fragment.appendChild(div);
    }

    processedItems = batchEnd;

    if (processedItems < totalItems) {
      requestAnimationFrame(processBatch);
    } else {
      elements.cardsContainer.innerHTML = "";
      elements.cardsContainer.appendChild(fragment);
    }
  }

  requestAnimationFrame(processBatch);
}

// Optimize item HTML generation
function getItemHTML(item, itemData) {
  return `
        <h3>${escapeHtml(item.full_name)}</h3>
        <p>
            <strong>Gender:</strong> ${escapeHtml(item.gender || "N/A")}<br>
            <strong>Age:</strong> ${item.age || "N/A"}<br>
            <strong>Phone:</strong> ${escapeHtml(
              item.phone_number || "N/A"
            )}<br>
            <strong>Level:</strong> ${escapeHtml(item.current_level || "N/A")}
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
}

// Function to show modal for adding/editing
function showModal(item = null) {
  editingId = item ? item.id : null;
  elements.modalTitle.textContent = item
    ? "Edit Information"
    : "Add New Information";

  // Reset form before setting new values
  elements.infoForm.reset();

  if (item) {
    elements.nameInput.value = item.full_name || "";
    elements.genderInput.value = item.gender || "";
    elements.phoneInput.value = item.phone_number || "";
    elements.ageInput.value = item.age || "";
    elements.levelInput.value = item.current_level || "";
    elements.attendance5th.value = item.attendance_2nd || "";
    elements.attendance12th.value = item.attendance_9th || "";
    elements.attendance19th.value = item.attendance_16th || "";
    elements.attendance26th.value = item.attendance_23rd || "";
  }

  elements.modal.style.display = "block";
  elements.nameInput.focus();
}

// Optimized form submission
async function handleSubmit(e) {
  e.preventDefault();
  const submitButton = e.target.querySelector('button[type="submit"]');
  submitButton.disabled = true;

  try {
    // Prepare form data efficiently
    const formData = {
      full_name: elements.nameInput.value.trim(),
      gender: elements.genderInput.value,
      phone_number: elements.phoneInput.value.trim(),
      age: elements.ageInput.value ? parseInt(elements.ageInput.value) : null,
      current_level: elements.levelInput.value,
      attendance_2nd: elements.attendance5th.value || null,
      attendance_9th: elements.attendance12th.value || null,
      attendance_16th: elements.attendance19th.value || null,
      attendance_23rd: elements.attendance26th.value || null,
    };

    if (!formData.full_name) {
      showToast("error");
      elements.nameInput.focus();
      submitButton.disabled = false;
      return;
    }

    // First hide the modal
    elements.modal.style.display = "none";
    elements.modal.classList.remove("closing");
    elements.infoForm.reset();

    // Then perform the database operation
    const { error } = editingId
      ? await supabase.from("TMHCT_Feb").update(formData).eq("id", editingId)
      : await supabase.from("TMHCT_Feb").insert([formData]);

    if (error) throw error;

    // Show success message after successful save
    showToast("success");

    // Clear cache and update display
    searchCache.clear();
    editingId = null;

    // Update display in background
    setTimeout(() => {
      const currentSearch = elements.searchInput.value.trim();
      if (currentSearch) {
        filterItems();
      } else {
        loadInitialData();
      }
      // Update stats in background
      fetchAndDisplayStats().catch(console.error);
    }, 0);
  } catch (error) {
    console.error("Error:", error);
    showToast("error");
    // Reopen modal if there's an error
    elements.modal.style.display = "block";
  } finally {
    submitButton.disabled = false;
  }
}

// Update the showToast function
function showToast(type) {
  const toast =
    type === "success" ? elements.successToast : elements.errorToast;
  requestAnimationFrame(() => {
    toast.classList.add("show");
    setTimeout(() => {
      requestAnimationFrame(() => {
        toast.classList.remove("show");
      });
    }, 3000); // Increased to 3 seconds for better readability
  });
}

// Helper function to escape HTML content
function escapeHtml(unsafe) {
  if (unsafe == null) return "";
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
    console.error("Error parsing item data:", error);
    showToast("error");
  }
}

// Function to handle delete button click
async function deleteItem(id) {
  if (!confirm("Are you sure you want to delete this record?")) return;

  try {
    const { error } = await supabase.from("TMHCT_Feb").delete().eq("id", id);

    if (error) throw error;

    // Clear the cache since data has changed
    searchCache.clear();
    showToast("success");

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
    console.error("Error deleting record:", error);
    showToast("error");
  }
}

// Function to get attendance display
function getAttendanceDisplay(item) {
  const attendanceFields = [
    { field: "attendance_2nd", display: "2nd" },
    { field: "attendance_9th", display: "9th" },
    { field: "attendance_16th", display: "16th" },
    { field: "attendance_23rd", display: "23rd" },
  ];
  return attendanceFields
    .map((field) => {
      const value = item[field.field];
      return `<div class="attendance-item">
            <span>${field.display}:</span>
            <span class="attendance-value ${
              value?.toLowerCase() === "present" ? "present" : "absent"
            }">
                ${escapeHtml(value || "N/A")}
            </span>
        </div>`;
    })
    .join("");
}

// Function to load initial data
async function loadInitialData() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get("category") || "all";

    // Set the select element to match the URL parameter
    elements.categoryFilter.value = category;

    // Filter by the category from URL
    await filterByCategory(category);
    await fetchAndDisplayStats();
  } catch (error) {
    console.error("Error loading data:", error);
    elements.cardsContainer.innerHTML =
      '<p class="error-message">Error loading records</p>';
  }
}

// Function to fetch and display statistics
async function fetchAndDisplayStats() {
  try {
    const { data, error } = await supabase.from("TMHCT_Feb").select("*");

    if (error) throw error;

    // Update total count
    document.getElementById("totalPeople").textContent = data.length;

    // Update gender counts
    const genderCounts = data.reduce(
      (acc, item) => {
        const gender = item.gender?.toLowerCase() || "";
        if (gender === "male") acc.boys++;
        if (gender === "female") acc.girls++;
        return acc;
      },
      { boys: 0, girls: 0 }
    );

    document.getElementById("totalBoys").textContent = genderCounts.boys;
    document.getElementById("totalGirls").textContent = genderCounts.girls;

    // Define the order of levels
    const levelOrder = [
      "SHS1",
      "SHS2",
      "SHS3",
      "JHS1",
      "JHS2",
      "JHS3",
      "COMPLETED",
      "UNIVERSITY",
    ];

    // Initialize counts for all levels
    const levelCounts = levelOrder.reduce((acc, level) => {
      acc[level] = 0;
      return acc;
    }, {});

    // Count students in each level
    data.forEach((item) => {
      const level = item.current_level?.toUpperCase() || "UNKNOWN";
      if (levelCounts.hasOwnProperty(level)) {
        levelCounts[level]++;
      }
    });

    // Generate HTML for level stats in the specified order
    const levelStatsHtml = levelOrder
      .map((level) => {
        const count = levelCounts[level];
        return `
                    <div class="level-stat">
                        <span class="level-name">${level}</span>
                        <span class="level-count">${count}</span>
                    </div>`;
      })
      .join("");

    document.getElementById("levelStats").innerHTML = levelStatsHtml;
  } catch (error) {
    console.error("Error fetching stats:", error);
  }
}

// Load initial data when page loads
document.addEventListener("DOMContentLoaded", () => {
  initializeThemeSwitcher();
  loadInitialData();
});

// Function to toggle stat content
function toggleStatContent(header) {
  const content = header.nextElementSibling;
  const arrow = header.querySelector(".toggle-arrow");

  if (content.style.maxHeight) {
    content.style.maxHeight = null;
    arrow.textContent = "▼";
  } else {
    content.style.maxHeight = content.scrollHeight + "px";
    arrow.textContent = "▲";
  }
}

// Add this function to handle category filtering
async function filterByCategory(category) {
  try {
    let query = supabase.from("TMHCT_Feb").select("*").order("full_name");

    if (category !== "all") {
      if (category === "SHS") {
        query = query.or(
          "current_level.eq.SHS1,current_level.eq.SHS2,current_level.eq.SHS3"
        );
      } else if (category === "JHS") {
        query = query.or(
          "current_level.eq.JHS1,current_level.eq.JHS2,current_level.eq.JHS3"
        );
      } else {
        query = query.eq("current_level", category);
      }
    }

    const { data, error } = await query;

    if (error) throw error;

    // Animate out old items
    const oldItems = elements.cardsContainer.children;
    Array.from(oldItems).forEach((item, index) => {
      item.style.transition = "all 0.2s ease";
      item.style.opacity = "0";
      item.style.transform = "scale(0.95)";
    });

    // Wait for animation
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Display new items with animation
    displayItems(data || []);

    // Update the URL to reflect the current filter
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set("category", category);
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}?${urlParams}`
    );
  } catch (error) {
    console.error("Error filtering by category:", error);
    showToast("error");
  }
}

// Update the theme switcher initialization
function initializeThemeSwitcher() {
  const themeSwitcher = document.querySelector(".theme-switcher");
  const greenTheme = document.querySelector(".green-theme");
  const purpleTheme = document.querySelector(".purple-theme");
  const blueTheme = document.querySelector(".blue-theme");
  const adminTheme = document.querySelector(".admin-theme");

  // Initialize admin features
  adminFeatures.init();

  // Load saved theme or default to green
  const savedTheme = localStorage.getItem("selectedTheme") || "theme-green";
  document.body.className = savedTheme;
  const activeButton = document.querySelector(
    `.${savedTheme.replace("theme-", "")}-theme`
  );
  if (activeButton) activeButton.classList.add("active");

  function setTheme(themeName, button) {
    document.body.className = themeName;
    localStorage.setItem("selectedTheme", themeName);
    [greenTheme, purpleTheme, blueTheme, adminTheme].forEach((btn) =>
      btn.classList.remove("active")
    );
    button.classList.add("active");

    // Handle admin sections visibility
    if (themeName === "theme-admin") {
      adminFeatures.showAdminSections();
    } else {
      adminFeatures.hideAdminSections();
    }
  }

  greenTheme.addEventListener("click", () =>
    setTheme("theme-green", greenTheme)
  );
  purpleTheme.addEventListener("click", () =>
    setTheme("theme-purple", purpleTheme)
  );
  blueTheme.addEventListener("click", () => setTheme("theme-blue", blueTheme));
  adminTheme.addEventListener("click", () => {
    if (!adminAuth || !adminAuth.isAuthenticated) {
      if (adminAuth && adminAuth.showModal) {
        adminAuth.showModal();
      } else {
        console.error("Admin authentication not initialized");
      }
    } else {
      setTheme("theme-admin", adminTheme);
    }
  });
}

// Add this function to handle CSV download
async function downloadCSV() {
  try {
    // Show loading state
    const downloadButton = document.getElementById("downloadButton");
    const originalText = downloadButton.textContent;
    downloadButton.textContent = "Downloading...";
    downloadButton.disabled = true;

    // Fetch all data from Supabase
    const { data, error } = await supabase
      .from("TMHCT_Feb")
      .select("*")
      .order("full_name");

    if (error) throw error;

    if (!data || data.length === 0) {
      showToast("error");
      return;
    }

    // Format data for CSV
    const csvData = data.map((item) => ({
      "Full Name": item.full_name || "",
      Gender: item.gender || "",
      "Phone Number": item.phone_number || "",
      Age: item.age || "",
      "Current Level": item.current_level || "",
      "Attendance 2nd": item.attendance_2nd || "",
      "Attendance 9th": item.attendance_9th || "",
      "Attendance 16th": item.attendance_16th || "",
      "Attendance 23rd": item.attendance_23rd || "",
    }));

    // Create CSV content
    const headers = Object.keys(csvData[0]);
    let csvContent = headers.join(",") + "\n";

    csvContent += csvData
      .map((row) => {
        return headers
          .map((header) => {
            let cellData = row[header] || "";
            // Handle commas and quotes in the data
            if (
              cellData.toString().includes(",") ||
              cellData.toString().includes('"')
            ) {
              cellData = `"${cellData.toString().replace(/"/g, '""')}"`;
            }
            return cellData;
          })
          .join(",");
      })
      .join("\n");

    // Create and download the file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `TMHT_Data_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Show success message
    showToast("success");
  } catch (error) {
    console.error("Error downloading CSV:", error);
    showToast("error");
  } finally {
    // Reset button state
    const downloadButton = document.getElementById("downloadButton");
    downloadButton.textContent = "Download CSV";
    downloadButton.disabled = false;
  }
}
