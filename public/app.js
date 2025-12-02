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

  document.getElementById("total-raised").textContent = formatCurrency(
   data.totalRaised || 0
  );
  document.getElementById("total-disbursed").textContent = formatCurrency(
   data.totalDisbursed || 0
  );
  document.getElementById("donor-count").textContent = data.donorCount || 0;
 } catch (error) {
  console.error("Error loading stats:", error);
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
            ${donation.anonymous ? "Donatur Anonim" : donation.name}
          </div>
          ${
           donation.message
            ? `<div class="donation-message">"${donation.message}"</div>`
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
 }
}

// Load and display disbursements
async function loadDisbursements(page = 1) {
 const listElement = document.getElementById("disbursements-list");
 currentDisbursementsPage = page;

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

    return `
      <div class="disbursement-item">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: ${
         hasActivities ? "10px" : "0"
        };">
          <div class="disbursement-info">
            <div class="disbursement-description">
              ${disbursement.description}
            </div>
            <div class="disbursement-date">${formatDate(
             disbursement.created_at
            )}</div>
          </div>
          <div class="disbursement-amount">${formatCurrency(
           disbursement.amount
          )}</div>
        </div>
        ${
         hasActivities
          ? `
          <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(0,0,0,0.1);">
            <h4 style="margin-bottom: 10px; font-size: 0.95rem; color: var(--text-color);">Timeline Aktivitas:</h4>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${activities
               .map(
                (activity) => `
                <div style="padding: 10px; background: rgba(66, 133, 244, 0.05); border-radius: 6px; border-left: 3px solid var(--primary-color);">
                  <div style="font-weight: 600; color: var(--primary-color); margin-bottom: 5px; font-size: 0.9rem;">
                    ${formatDate(activity.activity_time)}
                  </div>
                  <div style="color: var(--text-color); font-size: 0.9rem; margin-bottom: ${
                   activity.file_url ? "8px" : "0"
                  };">
                    ${activity.description}
                  </div>
                  ${
                   activity.file_url
                    ? `
                    <div style="margin-top: 8px;">
                      <a 
                        href="${activity.file_url}" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style="display: inline-flex; align-items: center; gap: 5px; color: var(--primary-color); text-decoration: none; font-size: 0.85rem; margin-bottom: 8px;"
                      >
                        <span>📎</span>
                        <span>${activity.file_name || "Lihat File"}</span>
                      </a>
                      ${
                       activity.file_url.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                        ? `<div style="margin-top: 8px;"><img src="${
                           activity.file_url
                          }" alt="${
                           activity.file_name || "Activity image"
                          }" style="max-width: 100%; max-height: 300px; border-radius: 4px; border: 1px solid rgba(0,0,0,0.1);" loading="lazy" /></div>`
                        : activity.file_url.match(/\.(mp4|mov)$/i)
                        ? `<div style="margin-top: 8px;"><video src="${activity.file_url}" controls style="max-width: 100%; max-height: 300px; border-radius: 4px; border: 1px solid rgba(0,0,0,0.1);" /></div>`
                        : ""
                      }
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
 }
}

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

 const submitBtn = document.getElementById("submit-btn");
 const originalText = submitBtn.textContent;
 submitBtn.disabled = true;
 submitBtn.textContent = "Memproses...";

 try {
  const formData = new FormData(e.target);
  const donationAmount = parseInt(formData.get("amount"));
  const fee = calculateFee(donationAmount);
  const totalAmount = donationAmount + fee;

  const data = {
   name: formData.get("name"),
   email: formData.get("email"),
   phone: formData.get("phone") || null,
   amount: donationAmount,
   fee: fee,
   total_amount: totalAmount,
   message: formData.get("message") || null,
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
   window.location.href = result.payment_url;
  } else {
   throw new Error("Payment URL not received");
  }
 } catch (error) {
  alert("Terjadi kesalahan: " + error.message);
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

 // Initialize hero slideshow
 initHeroSlideshow();

 // Refresh stats, donations, and disbursements every 30 seconds
 setInterval(() => {
  loadStats();
  loadRecentDonations(currentPage);
  loadDisbursements(currentDisbursementsPage);
 }, 30000);

 // Handle form submission
 document
  .getElementById("donation-form")
  .addEventListener("submit", handleDonationSubmit);

 // Update fee breakdown when amount changes
 const amountInput = document.getElementById("amount");
 amountInput.addEventListener("input", (e) => {
  const amount = parseInt(e.target.value) || 0;
  updateFeeBreakdown(amount);
 });
});
