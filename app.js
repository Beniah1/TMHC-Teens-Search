// Initialize Supabase client
const supabase = window.supabase.createClient(
  "https://znuxahdqxencqtsvxvja.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpudXhhaGRxeGVuY3F0c3Z4dmphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc4MDQzNjUsImV4cCI6MjA1MzM4MDM2NX0.8evCXHMfkn1yhsVB8lQ62BL3b6-j4KZ_oszTuYLT6G0"
);

// Performance optimization constants
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes cache
const DEBOUNCE_DELAY = 250; // Increased debounce delay
const BATCH_SIZE = 20; // Reduced batch size for smoother rendering
const VIRTUAL_SCROLL_BUFFER = 10; // Number of items to render above/below viewport
const SCROLL_THROTTLE = 16; // ~60fps

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
      div.setAttribute("data-id", item.id);
      div.innerHTML = getItemHTML(item);
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

// Function to handle inline editing
async function makeFieldEditable(element, itemId, fieldName) {
  // Don't allow editing if already in edit mode
  if (element.classList.contains("editing")) return;

  // Add editing class for visual feedback
  element.classList.add("editable-field", "editing");

  // Get the current value differently for attendance fields
  let currentValue;
  if (fieldName.startsWith("attendance_")) {
    currentValue =
      element.querySelector(".attendance-value")?.textContent.trim() || "N/A";
  } else {
    currentValue =
      element.textContent.split(": ")[1]?.trim() || element.textContent.trim();
  }

  let input;

  // Create appropriate input based on field type
  switch (fieldName) {
    case "gender":
      input = createSelect(["Male", "Female"], currentValue);
      break;
    case "age":
      input = createInput("number", currentValue, { min: "0", max: "100" });
      break;
    case "phone_number":
      input = createInput("tel", currentValue);
      break;
    case "current_level":
      input = createSelect(
        [
          "SHS1",
          "SHS2",
          "SHS3",
          "JHS1",
          "JHS2",
          "JHS3",
          "COMPLETED",
          "UNIVERSITY",
        ],
        currentValue
      );
      break;
    case fieldName.match(/^attendance_/)?.input:
      input = createSelect(["Present", "Absent"], currentValue);
      break;
    default:
      input = createInput("text", currentValue);
  }

  // Store original content for restoration if needed
  const originalContent = element.innerHTML;
  const label = element.querySelector("strong")?.textContent || "";

  // Clear and populate with input
  element.innerHTML = "";
  if (label) {
    const labelText = label.endsWith(":") ? label : label + ":";
    element.appendChild(document.createElement("strong")).textContent =
      labelText + " ";
  }
  element.appendChild(input);

  // Focus the input with a slight delay for animation
  requestAnimationFrame(() => input.focus());

  // Handle save operation
  async function saveChanges() {
    const newValue = input.value.trim();
    if (newValue === currentValue) {
      element.innerHTML = originalContent;
      element.classList.remove("editing");
      return;
    }

    // Add loading state
    element.classList.add("loading");

    try {
      const updateData = { [fieldName]: newValue || null };
      if (fieldName === "age") {
        updateData[fieldName] = newValue ? parseInt(newValue) : null;
      }

      const { error } = await supabase
        .from("TMHCT_Feb")
        .update(updateData)
        .eq("id", itemId);

      if (error) throw error;

      // Remove editing and loading states
      element.classList.remove("editing", "loading");

      // Update display with success animation
      if (fieldName.startsWith("attendance_")) {
        // Special handling for attendance fields
        element.innerHTML = `
          <span>${fieldName.split("_")[1]}:</span>
          <span class="attendance-value ${
            newValue.toLowerCase() === "present" ? "present" : "absent"
          }">
            ${newValue || "N/A"}
          </span>
        `;
      } else {
        // Regular fields
        if (label) {
          const labelText = label.endsWith(":") ? label : label + ":";
          element.innerHTML = `<strong>${labelText}</strong> ${
            newValue || "N/A"
          }`;
        } else {
          element.textContent = newValue || "N/A";
        }
      }

      // Add success animation
      element.classList.add("save-success");
      setTimeout(() => element.classList.remove("save-success"), 400);

      // Show success notification
      showToast("success", "Updated successfully");

      // Update cache and stats
      searchCache.clear();
      fetchAndDisplayStats();
    } catch (error) {
      console.error("Error updating field:", error);
      element.innerHTML = originalContent;
      element.classList.remove("editing", "loading");
      showToast("error", "Failed to update");
    }
  }

  // Event listeners for input
  input.addEventListener("blur", saveChanges);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      input.blur();
    } else if (e.key === "Escape") {
      e.preventDefault();
      element.innerHTML = originalContent;
      element.classList.remove("editing");
    }
  });
}

// Helper function to create select element
function createSelect(options, currentValue) {
  const select = document.createElement("select");
  options.forEach((option) => {
    const opt = document.createElement("option");
    opt.value = option;
    opt.textContent = option;
    if (option === currentValue) opt.selected = true;
    select.appendChild(opt);
  });
  return select;
}

// Helper function to create input element
function createInput(type, value, attributes = {}) {
  const input = document.createElement("input");
  input.type = type;
  input.value = value === "N/A" ? "" : value;
  Object.entries(attributes).forEach(([key, value]) => {
    input.setAttribute(key, value);
  });
  return input;
}

// Enhanced toast notification
function showToast(type, message) {
  const toast =
    type === "success" ? elements.successToast : elements.errorToast;

  // Update toast content with icon
  toast.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      ${
        type === "success"
          ? '<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path>'
          : '<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>'
      }
    </svg>
    <span>${message}</span>
  `;

  // Show toast with animation
  requestAnimationFrame(() => {
    toast.classList.add("show");
    setTimeout(() => {
      requestAnimationFrame(() => {
        toast.classList.remove("show");
      });
    }, 2000);
  });
}

// Update the getItemHTML function to make fields directly editable
function getItemHTML(item) {
  return `
    <h3 class="name-text editable-field" onclick="makeFieldEditable(this, ${
      item.id
    }, 'full_name')">${escapeHtml(item.full_name)}</h3>
    <div class="info-item">
        <span>Gender:</span>
        <select class="info-select ${
          item.gender?.toLowerCase() === "male"
            ? "male"
            : item.gender?.toLowerCase() === "female"
            ? "female"
            : ""
        }" 
                onchange="updateField(this, 'gender', this.value, ${item.id})">
            <option value="" disabled ${
              !item.gender ? "selected" : ""
            }>Select Gender</option>
            <option value="Male" ${
              item.gender === "Male" ? "selected" : ""
            }>Male</option>
            <option value="Female" ${
              item.gender === "Female" ? "selected" : ""
            }>Female</option>
        </select>
    </div>
    <div class="info-item">
        <span>Current Level:</span>
        <select class="info-select ${item.current_level ? "has-value" : ""}" 
                onchange="updateField(this, 'current_level', this.value, ${
                  item.id
                })">
            <option value="" disabled ${
              !item.current_level ? "selected" : ""
            }>Select Current Level</option>
            <option value="SHS1" ${
              item.current_level === "SHS1" ? "selected" : ""
            }>SHS1</option>
            <option value="SHS2" ${
              item.current_level === "SHS2" ? "selected" : ""
            }>SHS2</option>
            <option value="SHS3" ${
              item.current_level === "SHS3" ? "selected" : ""
            }>SHS3</option>
            <option value="JHS1" ${
              item.current_level === "JHS1" ? "selected" : ""
            }>JHS1</option>
            <option value="JHS2" ${
              item.current_level === "JHS2" ? "selected" : ""
            }>JHS2</option>
            <option value="JHS3" ${
              item.current_level === "JHS3" ? "selected" : ""
            }>JHS3</option>
            <option value="COMPLETED" ${
              item.current_level === "COMPLETED" ? "selected" : ""
            }>COMPLETED</option>
            <option value="UNIVERSITY" ${
              item.current_level === "UNIVERSITY" ? "selected" : ""
            }>UNIVERSITY</option>
        </select>
    </div>
    <div class="info-item">
        <span>Age:</span>
        <span class="editable-field" onclick="makeFieldEditable(this, ${
          item.id
        }, 'age')">
            ${item.age || "N/A"}
        </span>
    </div>
    <div class="info-item">
        <span>Phone Number:</span>
        <span class="editable-field" onclick="makeFieldEditable(this, ${
          item.id
        }, 'phone_number')">
            ${escapeHtml(item.phone_number || "N/A")}
        </span>
    </div>
    <div class="attendance-section">
        <strong>Attendance:</strong><br>
        <div class="attendance-grid">
            ${getAttendanceDisplay(item)}
        </div>
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

    // Show success message
    const toast = document.getElementById("successToast");
    if (toast) {
      toast.querySelector("span").textContent =
        "Information saved successfully";
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 3000);
    }

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

// Update the getAttendanceDisplay function to include both Present and Absent options in the dropdown
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
      const selectClass =
        value?.toLowerCase() === "present"
          ? "present"
          : value?.toLowerCase() === "absent"
          ? "absent"
          : "";
      return `<div class="attendance-item">
            <span>${field.display}:</span>
            <select class="attendance-select ${selectClass}" 
                    onchange="updateAttendance(this, '${
                      field.field
                    }', this.value, ${item.id})">
                <option value="" disabled ${
                  !value ? "selected" : ""
                }>Select</option>
                <option value="Present" ${
                  value?.toLowerCase() === "present" ? "selected" : ""
                }>Present</option>
                <option value="Absent" ${
                  value?.toLowerCase() === "absent" ? "selected" : ""
                }>Absent</option>
            </select>
        </div>`;
    })
    .join("");
}

// Update the attendance update function
async function updateAttendance(select, field, value, itemId) {
  try {
    const updateData = { [field]: value };
    const { error } = await supabase
      .from("TMHCT_Feb")
      .update(updateData)
      .eq("id", itemId);

    if (error) throw error;

    // Update select element class based on the selected value
    select.className = `attendance-select ${
      value?.toLowerCase() === "present"
        ? "present"
        : value?.toLowerCase() === "absent"
        ? "absent"
        : ""
    }`;

    showToast("success", "Updated successfully");
    searchCache.clear();
    await fetchAndDisplayStats();
  } catch (error) {
    console.error("Error updating attendance:", error);
    showToast("error", "Failed to update");
  }
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

    // Define the order of levels with shortened names
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
      // Convert COMPLETED to COMP and UNIVERSITY to UNI in the data
      let level = item.current_level?.toUpperCase() || "UNKNOWN";
      if (level === "COMPLETED") level = "COMPLETED";
      if (level === "UNIVERSITY") level = "UNIVERSITY";
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

  // Load saved theme and dark mode preferences
  const savedColorTheme =
    localStorage.getItem("selectedTheme") || "theme-green";
  const isDarkMode = localStorage.getItem("theme") === "dark";

  // Apply both color theme and dark mode if needed
  document.body.className = savedColorTheme;
  if (isDarkMode) {
    document.body.classList.add("dark-mode");
  }

  // Activate the correct theme button
  const activeButton = document.querySelector(
    `.${savedColorTheme.replace("theme-", "")}-theme`
  );
  if (activeButton) activeButton.classList.add("active");

  function setTheme(themeName, button) {
    // Preserve dark mode state
    const isDarkMode = document.body.classList.contains("dark-mode");

    // Set new theme
    document.body.className = themeName;

    // Restore dark mode if it was active
    if (isDarkMode) {
      document.body.classList.add("dark-mode");
    }

    localStorage.setItem("selectedTheme", themeName);

    // Update button states
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

// Update dark mode toggle functionality
const darkModeToggle = document.getElementById("darkModeToggle");
const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");

// Check for saved dark mode preference or system preference
const currentTheme = localStorage.getItem("theme");
if (currentTheme === "dark" || (!currentTheme && prefersDarkScheme.matches)) {
  document.body.classList.add("dark-mode");
  darkModeToggle.textContent = "🌞"; // Changed to sun icon
}

// Toggle dark mode
darkModeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");

  // Update button icon
  if (document.body.classList.contains("dark-mode")) {
    darkModeToggle.textContent = "🌞"; // Sun icon for dark mode
    localStorage.setItem("theme", "dark");
  } else {
    darkModeToggle.textContent = "🌙"; // Moon icon for light mode
    localStorage.setItem("theme", "light");
  }
});

// Update the showDropdownEdit function with the new button-based design
function showDropdownEdit(element, field) {
  // Get the item ID from the closest result-item parent
  const resultItem = element.closest(".result-item");
  if (!resultItem) {
    console.error("Could not find parent result item");
    return;
  }

  const itemId = resultItem.getAttribute("data-id");
  if (!itemId) {
    console.error("No item ID found");
    return;
  }

  const currentValue =
    element.textContent.split(": ")[1]?.trim() || element.textContent.trim();
  const container = document.createElement("div");
  container.className = "selection-container";

  let options;
  if (field === "gender") {
    options = ["Male", "Female"];
  } else if (field === "level") {
    options = [
      "SHS1",
      "SHS2",
      "SHS3",
      "JHS1",
      "JHS2",
      "JHS3",
      "COMPLETED",
      "UNIVERSITY",
    ];
  }

  // Create buttons for each option
  options.forEach((opt) => {
    const button = document.createElement("button");
    button.className = "selection-button";
    if (opt === currentValue) {
      button.classList.add("selected");
    }
    button.textContent = opt;

    button.addEventListener("click", async () => {
      try {
        // Show loading state
        button.disabled = true;
        const originalText = button.textContent;
        button.textContent = "Updating...";

        // Prepare update data
        const updateData = {};
        if (field === "gender") {
          updateData.gender = opt;
        } else if (field === "level") {
          updateData.current_level = opt;
        }

        console.log("Updating item:", itemId, "with data:", updateData);

        // Perform the update
        const { data, error } = await supabase
          .from("TMHCT_Feb")
          .update(updateData)
          .eq("id", itemId)
          .select();

        if (error) {
          throw error;
        }

        // Update the display
        const label = field.charAt(0).toUpperCase() + field.slice(1);
        element.innerHTML = `<strong>${label}:</strong> ${opt}`;

        // Show success message
        showToast("success", "Updated successfully");

        // Clear cache and update stats
        searchCache.clear();
        await fetchAndDisplayStats();
      } catch (error) {
        console.error("Error updating:", error);
        showToast("error", "Failed to update");

        // Restore original content
        const label = field.charAt(0).toUpperCase() + field.slice(1);
        element.innerHTML = `<strong>${label}:</strong> ${currentValue}`;
      } finally {
        // Reset button state
        button.disabled = false;
        button.textContent = originalText;
      }
    });

    container.appendChild(button);
  });

  // Add a cancel button
  const cancelButton = document.createElement("button");
  cancelButton.className = "selection-button cancel";
  cancelButton.textContent = "Cancel";
  cancelButton.addEventListener("click", () => {
    container.classList.add("closing");
    setTimeout(() => {
      const label = field.charAt(0).toUpperCase() + field.slice(1);
      element.innerHTML = `<strong>${label}:</strong> ${currentValue}`;
    }, 200);
  });
  container.appendChild(cancelButton);

  // Replace content with selection interface
  element.innerHTML = "";
  element.appendChild(container);
}

// Add new function to handle field updates
async function updateField(select, field, value, itemId) {
  try {
    const updateData = { [field]: value };
    const { error } = await supabase
      .from("TMHCT_Feb")
      .update(updateData)
      .eq("id", itemId);

    if (error) throw error;

    // Update select element class based on the field and value
    if (field === "gender") {
      select.className = `info-select ${
        value.toLowerCase() === "male"
          ? "male"
          : value.toLowerCase() === "female"
          ? "female"
          : ""
      }`;
    } else if (field === "current_level") {
      select.className = `info-select ${value ? "has-value" : ""}`;
    }

    showToast("success", "Updated successfully");
    searchCache.clear();
    await fetchAndDisplayStats();
  } catch (error) {
    console.error("Error updating field:", error);
    showToast("error", "Failed to update");
  }
}
