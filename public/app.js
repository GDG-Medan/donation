// Escape HTML to prevent XSS (defense in depth)
function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Email validation function (matches backend validation)
function isValidEmail(email) {
  if (!email || typeof email !== "string") {
    return false;
  }

  // RFC 5322 compliant email regex (simplified but effective)
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  // Check length (max 254 characters per RFC 5321)
  if (email.length > 254) {
    return false;
  }

  return emailRegex.test(email);
}

// Phone validation function (matches backend validation)
function isValidPhone(phone) {
  if (!phone || typeof phone !== "string") {
    return false;
  }

  // Remove spaces, dashes, and plus signs for validation
  const cleaned = phone.replace(/[\s\-+]/g, "");

  // Indonesian phone number patterns
  const phoneRegex = /^(62|0)[0-9]{9,12}$/;

  if (!phoneRegex.test(cleaned)) {
    return false;
  }

  // Additional check: if starts with 62, should be followed by 8 (mobile)
  if (cleaned.startsWith("62") && cleaned.length >= 3) {
    if (cleaned[2] !== "8") {
      return false;
    }
  }

  // If starts with 0, should be followed by 8 (mobile)
  if (cleaned.startsWith("0") && cleaned.length >= 2) {
    if (cleaned[1] !== "8") {
      return false;
    }
  }

  return true;
}

// Show field error
function showFieldError(input, message) {
  const formGroup = input.closest(".form-group");
  if (!formGroup) return;

  // Remove existing error
  const existingError = formGroup.querySelector(".field-error");
  if (existingError) {
    existingError.remove();
  }

  // Remove error class
  input.classList.remove("error");

  // Add error class and message
  input.classList.add("error");
  const errorDiv = document.createElement("div");
  errorDiv.className = "field-error";
  errorDiv.textContent = message;
  formGroup.appendChild(errorDiv);
}

// Clear field error
function clearFieldError(input) {
  const formGroup = input.closest(".form-group");
  if (!formGroup) return;

  input.classList.remove("error");
  const existingError = formGroup.querySelector(".field-error");
  if (existingError) {
    existingError.remove();
  }
}

// Toast Notification System
function showToast(message, type = "info", description = "") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  const icons = {
    success: "✓",
    error: "✕",
    info: "ℹ",
  };

  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <div class="toast-content">
      <div class="toast-message">${escapeHtml(message)}</div>
      ${description ? `<div class="toast-description">${escapeHtml(description)}</div>` : ""}
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;

  container.appendChild(toast);

  // Auto remove after 5 seconds
  setTimeout(() => {
    toast.style.animation = "slideIn 0.3s ease-out reverse";
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

// Loading Skeleton Functions
function createDonationSkeleton() {
  return Array(5)
    .fill(0)
    .map(
      () => `
    <div class="skeleton-item">
      <div class="skeleton skeleton-line short" style="height: 20px; margin-bottom: 8px;"></div>
      <div class="skeleton skeleton-line medium" style="height: 16px; margin-bottom: 8px;"></div>
      <div class="skeleton skeleton-line short" style="height: 14px;"></div>
    </div>
  `
    )
    .join("");
}

function createDisbursementSkeleton() {
  return Array(3)
    .fill(0)
    .map(
      () => `
    <div class="skeleton-item">
      <div class="skeleton skeleton-line long" style="height: 18px; margin-bottom: 10px;"></div>
      <div class="skeleton skeleton-line short" style="height: 14px;"></div>
    </div>
  `
    )
    .join("");
}

// Back to Top Functionality
function initBackToTop() {
  const backToTopBtn = document.getElementById("back-to-top");
  if (!backToTopBtn) return;

  window.addEventListener("scroll", () => {
    if (window.pageYOffset > 300) {
      backToTopBtn.classList.add("visible");
    } else {
      backToTopBtn.classList.remove("visible");
    }
  });
}

function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

// Social Sharing Functions
function shareWhatsApp() {
  const text = encodeURIComponent(
    "Bantu korban bencana banjir dan tanah longsor di Aceh, Sumatera Utara, dan Sumatera Barat bersama Komunitas Google Developer Group Indonesia. Setiap donasi Anda akan sangat berarti bagi mereka yang membutuhkan."
  );
  const url = encodeURIComponent(window.location.href);
  window.open(`https://wa.me/?text=${text}%20${url}`, "_blank");
}

function shareFacebook() {
  const url = encodeURIComponent(window.location.href);
  const text = encodeURIComponent(
    "Bantu korban bencana banjir dan tanah longsor di Aceh, Sumatera Utara, dan Sumatera Barat bersama Komunitas Google Developer Group Indonesia. Setiap donasi Anda akan sangat berarti bagi mereka yang membutuhkan."
  );
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`, "_blank");
}

function shareTwitter() {
  const text = encodeURIComponent(
    "Bantu korban bencana banjir dan tanah longsor di Aceh, Sumatera Utara, dan Sumatera Barat bersama Komunitas Google Developer Group Indonesia. Setiap donasi Anda akan sangat berarti bagi mereka yang membutuhkan."
  );
  const url = encodeURIComponent(window.location.href);
  window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank");
}

function shareTelegram() {
  const text = encodeURIComponent(
    "Bantu korban bencana banjir dan tanah longsor di Aceh, Sumatera Utara, dan Sumatera Barat bersama Komunitas Google Developer Group Indonesia. Setiap donasi Anda akan sangat berarti bagi mereka yang membutuhkan."
  );
  const url = encodeURIComponent(window.location.href);
  window.open(`https://t.me/share/url?url=${url}&text=${text}`, "_blank");
}
function copyLink() {
  navigator.clipboard
    .writeText(window.location.href)
    .then(() => {
      showToast("Link berhasil disalin!", "success");
    })
    .catch(() => {
      showToast("Gagal menyalin link", "error");
    });
}

// Format currency
function formatCurrency(amount) {
 return new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
 }).format(amount);
}

// Format date in WIB (UTC+7)
function formatDate(dateString) {
 // SQLite DATETIME format: "2025-12-01 19:11:26" (stored as UTC)
 // Convert to ISO format and treat as UTC
 let date;

 // Handle SQLite datetime format (YYYY-MM-DD HH:MM:SS)
 if (dateString.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
  // Replace space with T and add Z to indicate UTC
  date = new Date(dateString.replace(" ", "T") + "Z");
 } else if (
  dateString.includes("T") &&
  !dateString.includes("Z") &&
  !dateString.includes("+")
 ) {
  // ISO format without timezone, treat as UTC
  date = new Date(dateString + "Z");
 } else {
  date = new Date(dateString);
 }

 // Convert to WIB (UTC+7) - Asia/Jakarta
 return new Intl.DateTimeFormat("id-ID", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
  timeZoneName: "short",
 }).format(date);
}

// Load and display stats
async function loadStats() {
 try {
  const response = await fetch("/api/stats");
  if (!response.ok) throw new Error("Failed to load stats");

  const data = await response.json();
  const totalRaised = data.total_raised || 0;
  const totalDisbursed = data.total_disbursed || 0;
  const donorCount = data.donor_count || 0;
  const goal = 100000000; // 100 million IDR

  // Update summary cards
  document.getElementById("total-raised").textContent = formatCurrency(totalRaised);
  document.getElementById("total-disbursed").textContent = formatCurrency(totalDisbursed);
  document.getElementById("donor-count").textContent = donorCount;

  // Update progress bar
  const progressPercentage = Math.min((totalRaised / goal) * 100, 100);
  const progressBar = document.getElementById("progress-bar");
  const progressRaised = document.getElementById("progress-raised");
  const progressRemaining = document.getElementById("progress-remaining");

  if (progressBar) {
    progressBar.style.width = `${progressPercentage}%`;
  }
  if (progressRaised) {
    progressRaised.textContent = formatCurrency(totalRaised);
  }
  if (progressRemaining) {
    const remaining = Math.max(goal - totalRaised, 0);
    progressRemaining.textContent = `${formatCurrency(remaining)} tersisa`;
  }
 } catch (error) {
  console.error("Error loading stats:", error);
  showToast("Gagal memuat statistik", "error");
 }
}

// Pagination state
let currentPage = 1;
let currentDisbursementsPage = 1;
const itemsPerPage = 10;

// Load and display recent donations
async function loadRecentDonations(page = 1) {
 const listElement = document.getElementById("donations-list");
 currentPage = page;

 // Show loading skeleton
 listElement.innerHTML = createDonationSkeleton();

 try {
  const response = await fetch(
   `/api/donations?page=${page}&limit=${itemsPerPage}`
  );
  if (!response.ok) throw new Error("Failed to load donations");

  const data = await response.json();
  const donations = data.donations || [];
  const pagination = data.pagination || {};

  if (donations.length === 0) {
   listElement.innerHTML =
    '<p class="empty">Belum ada donasi. Jadilah yang pertama!</p>';
   updatePaginationControls(pagination);
   return;
  }

  listElement.innerHTML = donations
   .map(
    (donation) => `
      <div class="donation-item">
        <div class="donation-info">
          <div class="donation-name">
            ${donation.anonymous ? "Donatur Anonim" : escapeHtml(donation.name)}
          </div>
          ${
           donation.message
            ? `<div class="donation-message">"${escapeHtml(donation.message)}"</div>`
            : ""
          }
          <div class="donation-date">${formatDate(donation.created_at)}</div>
        </div>
        <div class="donation-amount">${formatCurrency(donation.amount)}</div>
      </div>
    `
   )
   .join("");

  updatePaginationControls(pagination);
 } catch (error) {
  console.error("Error loading donations:", error);
  listElement.innerHTML = '<p class="empty">Gagal memuat data donasi.</p>';
  updatePaginationControls({});
  showToast("Gagal memuat donasi", "error");
 }
}

// Load and display disbursements
async function loadDisbursements(page = 1) {
 const listElement = document.getElementById("disbursements-list");
 currentDisbursementsPage = page;

 // Show loading skeleton
 listElement.innerHTML = createDisbursementSkeleton();

 try {
  const response = await fetch(
   `/api/disbursements?page=${page}&limit=${itemsPerPage}`
  );
  if (!response.ok) throw new Error("Failed to load disbursements");

  const data = await response.json();
  const disbursements = data.disbursements || [];
  const pagination = data.pagination || {};

  if (disbursements.length === 0) {
   listElement.innerHTML = '<p class="empty">Belum ada penyaluran donasi.</p>';
   updateDisbursementsPaginationControls(pagination);
   return;
  }

  listElement.innerHTML = disbursements
   .map((disbursement) => {
    const activities = disbursement.activities || [];
    const hasActivities = activities.length > 0;
    const activityCount = activities.length;

    return `
      <div class="disbursement-item">
        <div class="disbursement-header">
          <div class="disbursement-info">
            <div class="disbursement-description">
              ${escapeHtml(disbursement.description)}
            </div>
            <div class="disbursement-date">${formatDate(
             disbursement.created_at
            )}</div>
          </div>
          <div class="disbursement-right">
            <div class="disbursement-amount">${formatCurrency(
             disbursement.amount
            )}</div>
            ${
             hasActivities
              ? `
              <button 
                class="activity-toggle-btn" 
                onclick="toggleActivityTimeline(${disbursement.id})"
                aria-expanded="false"
                id="toggle-btn-${disbursement.id}"
              >
                <span class="activity-toggle-text">Lihat Timeline</span>
                <span class="activity-count-badge">${activityCount}</span>
                <span class="activity-toggle-icon">▼</span>
              </button>
            `
              : ""
            }
          </div>
        </div>
        ${
         hasActivities
          ? `
          <div class="activity-timeline" id="timeline-${disbursement.id}" style="display: none;">
            <div class="activity-timeline-content">
              ${activities
               .map(
                (activity) => `
                <div class="activity-item">
                  <div class="activity-time">${formatDate(
                   activity.activity_time
                  )}</div>
                  <div class="activity-description">${escapeHtml(activity.description)}</div>
                  ${
                   (activity.files && activity.files.length > 0)
                    ? `
                    <div class="activity-gallery">
                      <div class="activity-gallery-grid">
                        ${activity.files.map((file) => {
                         const isImage = file.file_url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                         const isVideo = file.file_url.match(/\.(mp4|mov)$/i);
                         
                         return `
                          <div class="activity-gallery-item">
                            ${
                             isImage
                              ? `<div class="activity-gallery-link" onclick="openImageModal('${escapeHtml(file.file_url)}', '${escapeHtml(file.file_name || "Image")}')" style="cursor: pointer;">
                                   <img src="${escapeHtml(file.file_url)}" alt="${escapeHtml(file.file_name || "Image")}" loading="lazy" />
                                 </div>`
                              : isVideo
                              ? `<div class="activity-gallery-video">
                                   <video src="${escapeHtml(file.file_url)}" controls preload="metadata"></video>
                                 </div>`
                              : `<a href="${escapeHtml(file.file_url)}" target="_blank" rel="noopener noreferrer" class="activity-gallery-link activity-gallery-document">
                                   <div class="activity-gallery-document-icon">📄</div>
                                   <div class="activity-gallery-document-name">${escapeHtml(file.file_name || "File")}</div>
                                 </a>`
                            }
                          </div>
                         `;
                        }).join("")}
                      </div>
                    </div>
                  `
                    : ""
                  }
                </div>
              `
               )
               .join("")}
            </div>
          </div>
        `
          : ""
        }
      </div>
    `;
   })
   .join("");

  updateDisbursementsPaginationControls(pagination);
 } catch (error) {
  console.error("Error loading disbursements:", error);
  listElement.innerHTML =
   '<p class="empty">Gagal memuat data penyaluran donasi.</p>';
  updateDisbursementsPaginationControls({});
  showToast("Gagal memuat penyaluran donasi", "error");
 }
}

// Toggle activity timeline dropdown
window.toggleActivityTimeline = function (disbursementId) {
 const timeline = document.getElementById(`timeline-${disbursementId}`);
 const toggleBtn = document.getElementById(`toggle-btn-${disbursementId}`);
 
 if (!timeline || !toggleBtn) return;
 
 const icon = toggleBtn.querySelector(".activity-toggle-icon");
 const text = toggleBtn.querySelector(".activity-toggle-text");

 if (timeline.style.display === "none" || !timeline.style.display) {
  timeline.style.display = "block";
  toggleBtn.setAttribute("aria-expanded", "true");
  if (icon) icon.textContent = "▲";
  if (text) text.textContent = "Sembunyikan Timeline";
  toggleBtn.classList.add("active");
 } else {
  timeline.style.display = "none";
  toggleBtn.setAttribute("aria-expanded", "false");
  if (icon) icon.textContent = "▼";
  if (text) text.textContent = "Lihat Timeline";
  toggleBtn.classList.remove("active");
 }
};

// Update disbursements pagination controls
function updateDisbursementsPaginationControls(pagination) {
 const paginationElement = document.getElementById(
  "disbursements-pagination-controls"
 );

 if (!paginationElement) return;

 const {
  page = 1,
  total_pages = 1,
  has_next = false,
  has_prev = false,
 } = pagination;

 if (total_pages <= 1) {
  paginationElement.innerHTML = "";
  return;
 }

 let paginationHTML = '<div class="pagination">';

 // Previous button
 paginationHTML += `
    <button 
      class="pagination-btn ${!has_prev ? "disabled" : ""}" 
      ${!has_prev ? "disabled" : `onclick="loadDisbursements(${page - 1})"`}
    >
      Sebelumnya
    </button>
  `;

 // Page numbers
 const maxVisiblePages = 5;
 let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
 let endPage = Math.min(total_pages, startPage + maxVisiblePages - 1);

 if (endPage - startPage < maxVisiblePages - 1) {
  startPage = Math.max(1, endPage - maxVisiblePages + 1);
 }

 if (startPage > 1) {
  paginationHTML += `
      <button class="pagination-btn" onclick="loadDisbursements(1)">1</button>
    `;
  if (startPage > 2) {
   paginationHTML += `<span class="pagination-ellipsis">...</span>`;
  }
 }

 for (let i = startPage; i <= endPage; i++) {
  paginationHTML += `
      <button 
        class="pagination-btn ${i === page ? "active" : ""}" 
        onclick="loadDisbursements(${i})"
      >
        ${i}
      </button>
    `;
 }

 if (endPage < total_pages) {
  if (endPage < total_pages - 1) {
   paginationHTML += `<span class="pagination-ellipsis">...</span>`;
  }
  paginationHTML += `
      <button class="pagination-btn" onclick="loadDisbursements(${total_pages})">
        ${total_pages}
      </button>
    `;
 }

 // Next button
 paginationHTML += `
    <button 
      class="pagination-btn ${!has_next ? "disabled" : ""}" 
      ${!has_next ? "disabled" : `onclick="loadDisbursements(${page + 1})"`}
    >
      Selanjutnya
    </button>
  `;

 paginationHTML += "</div>";

 paginationElement.innerHTML = paginationHTML;
}

// Update pagination controls
function updatePaginationControls(pagination) {
 const paginationElement = document.getElementById("pagination-controls");

 if (!paginationElement) return;

 const {
  page = 1,
  total_pages = 1,
  has_next = false,
  has_prev = false,
 } = pagination;

 if (total_pages <= 1) {
  paginationElement.innerHTML = "";
  return;
 }

 let paginationHTML = '<div class="pagination">';

 // Previous button
 paginationHTML += `
    <button 
      class="pagination-btn ${!has_prev ? "disabled" : ""}" 
      ${!has_prev ? "disabled" : `onclick="loadRecentDonations(${page - 1})"`}
    >
      Sebelumnya
    </button>
  `;

 // Page numbers
 const maxVisiblePages = 5;
 let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
 let endPage = Math.min(total_pages, startPage + maxVisiblePages - 1);

 if (endPage - startPage < maxVisiblePages - 1) {
  startPage = Math.max(1, endPage - maxVisiblePages + 1);
 }

 if (startPage > 1) {
  paginationHTML += `
      <button class="pagination-btn" onclick="loadRecentDonations(1)">1</button>
    `;
  if (startPage > 2) {
   paginationHTML += `<span class="pagination-ellipsis">...</span>`;
  }
 }

 for (let i = startPage; i <= endPage; i++) {
  paginationHTML += `
      <button 
        class="pagination-btn ${i === page ? "active" : ""}" 
        onclick="loadRecentDonations(${i})"
      >
        ${i}
      </button>
    `;
 }

 if (endPage < total_pages) {
  if (endPage < total_pages - 1) {
   paginationHTML += `<span class="pagination-ellipsis">...</span>`;
  }
  paginationHTML += `
      <button class="pagination-btn" onclick="loadRecentDonations(${total_pages})">
        ${total_pages}
      </button>
    `;
 }

 // Next button
 paginationHTML += `
    <button 
      class="pagination-btn ${!has_next ? "disabled" : ""}" 
      ${!has_next ? "disabled" : `onclick="loadRecentDonations(${page + 1})"`}
    >
      Selanjutnya
    </button>
  `;

 paginationHTML += "</div>";

 paginationElement.innerHTML = paginationHTML;
}

// Calculate fee (0.7%)
function calculateFee(donationAmount) {
 return Math.ceil(donationAmount * 0.007);
}

// Update fee breakdown display
function updateFeeBreakdown(donationAmount) {
 const feeBreakdown = document.getElementById("fee-breakdown");
 const donationAmountDisplay = document.getElementById(
  "donation-amount-display"
 );
 const feeAmountDisplay = document.getElementById("fee-amount-display");
 const totalAmountDisplay = document.getElementById("total-amount-display");

 if (donationAmount >= 10000) {
  const fee = calculateFee(donationAmount);
  const total = donationAmount + fee;

  donationAmountDisplay.textContent = formatCurrency(donationAmount);
  feeAmountDisplay.textContent = formatCurrency(fee);
  totalAmountDisplay.textContent = formatCurrency(total);
  feeBreakdown.style.display = "block";
 } else {
  feeBreakdown.style.display = "none";
 }
}

// Handle donation form submission
async function handleDonationSubmit(e) {
 e.preventDefault();

 // Clear all previous errors
 const form = e.target;
 const allInputs = form.querySelectorAll("input, textarea");
 allInputs.forEach((input) => clearFieldError(input));

 // Validate email
 const emailInput = document.getElementById("email");
 const email = emailInput.value.trim();

 if (!email) {
  showFieldError(emailInput, "Email wajib diisi");
  emailInput.focus();
  return;
 }

 if (!isValidEmail(email)) {
  showFieldError(emailInput, "Format email tidak valid. Contoh: nama@email.com");
  emailInput.focus();
  return;
 }

 // Validate name
 const nameInput = document.getElementById("name");
 const name = nameInput.value.trim();

 if (!name) {
  showFieldError(nameInput, "Nama wajib diisi");
  nameInput.focus();
  return;
 }

 // Validate amount
 const amountInput = document.getElementById("amount");
 const donationAmount = parseInt(amountInput.value);

 if (!donationAmount || donationAmount < 10000) {
  showFieldError(amountInput, "Jumlah donasi minimum Rp 10.000");
  amountInput.focus();
  return;
 }

 if (donationAmount > 1000000000) {
  showFieldError(amountInput, "Jumlah donasi maksimum Rp 1.000.000.000");
  amountInput.focus();
  return;
 }

 const submitBtn = document.getElementById("submit-btn");
 const originalText = submitBtn.textContent;
 submitBtn.disabled = true;
 submitBtn.textContent = "Memproses...";

 try {
  const formData = new FormData(e.target);
  const fee = calculateFee(donationAmount);
  const totalAmount = donationAmount + fee;

  // Validate phone if provided
  const phone = formData.get("phone")?.trim() || null;
  if (phone && !isValidPhone(phone)) {
   showFieldError(
    phoneInput,
    "Format nomor telepon tidak valid. Contoh: 081234567890 atau +6281234567890"
   );
   phoneInput.focus();
   submitBtn.disabled = false;
   submitBtn.textContent = originalText;
   return;
  }

  const data = {
   name: name,
   email: email.toLowerCase(), // Normalize email
   phone: phone,
   amount: donationAmount,
   fee: fee,
   total_amount: totalAmount,
   message: formData.get("message")?.trim() || null,
   anonymous: formData.get("anonymous") === "on",
  };

  const response = await fetch("/api/donations", {
   method: "POST",
   headers: {
    "Content-Type": "application/json",
   },
   body: JSON.stringify(data),
  });

  if (!response.ok) {
   const error = await response.json();
   throw new Error(error.message || "Failed to create donation");
  }

  const result = await response.json();

  // Redirect to Midtrans payment page
  if (result.payment_url) {
   showToast("Mengalihkan ke halaman pembayaran...", "info");
   setTimeout(() => {
    window.location.href = result.payment_url;
   }, 1000);
  } else {
   throw new Error("Payment URL not received");
  }
 } catch (error) {
  showToast("Terjadi kesalahan", "error", error.message);
  submitBtn.disabled = false;
  submitBtn.textContent = originalText;
 }
}

// Hero slideshow functionality
function initHeroSlideshow() {
 const slides = document.querySelectorAll(".hero-slide");
 let currentSlide = 0;

 function showNextSlide() {
  // Remove active class from current slide
  slides[currentSlide].classList.remove("active");

  // Move to next slide
  currentSlide = (currentSlide + 1) % slides.length;

  // Add active class to new slide
  slides[currentSlide].classList.add("active");
 }

 // Change slide every 5 seconds
 setInterval(showNextSlide, 5000);
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
 loadStats();
 loadRecentDonations();
 loadDisbursements();
 initBackToTop();

 // Initialize hero slideshow
 initHeroSlideshow();

 // Refresh stats and donations every 30 seconds
 setInterval(() => {
  loadStats();
  loadRecentDonations(currentPage);
 }, 30000);

 // Handle form submission
 document
  .getElementById("donation-form")
  .addEventListener("submit", handleDonationSubmit);

 // Real-time email validation
 const emailInput = document.getElementById("email");
 if (emailInput) {
  emailInput.addEventListener("blur", function () {
   const email = this.value.trim();
   if (email && !isValidEmail(email)) {
    showFieldError(this, "Format email tidak valid. Contoh: nama@email.com");
   } else if (email) {
    clearFieldError(this);
   }
  });

  emailInput.addEventListener("input", function () {
   const email = this.value.trim();
   if (email && isValidEmail(email)) {
    clearFieldError(this);
   }
  });
 }

 // Real-time phone validation (if provided)
 const phoneInput = document.getElementById("phone");
 if (phoneInput) {
  phoneInput.addEventListener("blur", function () {
   const phone = this.value.trim();
   if (phone && !isValidPhone(phone)) {
    showFieldError(
     this,
     "Format nomor telepon tidak valid. Contoh: 081234567890 atau +6281234567890"
    );
   } else if (phone) {
    clearFieldError(this);
   }
  });

  phoneInput.addEventListener("input", function () {
   const phone = this.value.trim();
   if (phone && isValidPhone(phone)) {
    clearFieldError(this);
   }
  });
 }

 // Update fee breakdown when amount changes
 const amountInput = document.getElementById("amount");
 amountInput.addEventListener("input", (e) => {
  const amount = parseInt(e.target.value) || 0;
  updateFeeBreakdown(amount);
 });

 // Image Modal functionality
 const imageModal = document.getElementById("image-modal");
 const modalImg = document.getElementById("image-modal-img");
 const modalCaption = document.getElementById("image-modal-caption");
 const modalClose = document.querySelector(".image-modal-close");

 // Open image modal
 window.openImageModal = function (imageUrl, caption) {
  imageModal.style.display = "block";
  modalImg.src = imageUrl;
  modalCaption.textContent = caption || "";
 };

 // Close modal when clicking the X
 if (modalClose) {
  modalClose.onclick = function () {
   imageModal.style.display = "none";
  };
 }

 // Close modal when clicking outside the image
 imageModal.onclick = function (event) {
  if (event.target === imageModal) {
   imageModal.style.display = "none";
  }
 };

 // Close modal with Escape key
 document.addEventListener("keydown", function (event) {
  if (event.key === "Escape" && imageModal.style.display === "block") {
   imageModal.style.display = "none";
  }
 });
});
