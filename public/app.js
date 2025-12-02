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
 // Ensure the date is treated as UTC if it doesn't have timezone info
 let date;
 if (
  dateString.includes("T") &&
  !dateString.includes("Z") &&
  !dateString.includes("+")
 ) {
  // If it's ISO format without timezone, treat as UTC
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

// Load and display recent donations
async function loadRecentDonations() {
 const listElement = document.getElementById("donations-list");

 try {
  const response = await fetch("/api/donations");
  if (!response.ok) throw new Error("Failed to load donations");

  const donations = await response.json();

  if (donations.length === 0) {
   listElement.innerHTML =
    '<p class="empty">Belum ada donasi. Jadilah yang pertama!</p>';
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
 } catch (error) {
  console.error("Error loading donations:", error);
  listElement.innerHTML = '<p class="empty">Gagal memuat data donasi.</p>';
 }
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

 // Initialize hero slideshow
 initHeroSlideshow();

 // Refresh stats and donations every 30 seconds
 setInterval(() => {
  loadStats();
  loadRecentDonations();
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
