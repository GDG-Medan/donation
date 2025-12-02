export async function onRequest(context) {
 const { request, env } = context;
 const url = new URL(request.url);
 const path = url.pathname;
 const method = request.method;

 // CORS headers
 const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
 };

 // Handle OPTIONS requests
 if (method === "OPTIONS") {
  return new Response(null, { headers: corsHeaders });
 }

 // Route handling
 try {
  // Stats endpoint
  if (path === "/api/stats" && method === "GET") {
   return handleStats(env);
  }

  // Recent donations endpoint
  if (path === "/api/donations" && method === "GET") {
   return handleGetDonations(env);
  }

  // Create donation endpoint
  if (path === "/api/donations" && method === "POST") {
   return handleCreateDonation(request, env);
  }

  // Midtrans webhook endpoint
  if (path === "/api/midtrans/notification" && method === "POST") {
   return handleMidtransWebhook(request, env);
  }

  // Admin login endpoint
  if (path === "/api/admin/login" && method === "POST") {
   return handleAdminLogin(request, env);
  }

  // Get disbursements endpoint
  if (path === "/api/admin/disbursements" && method === "GET") {
   return handleGetDisbursements(request, env);
  }

  // Create disbursement endpoint
  if (path === "/api/admin/disbursements" && method === "POST") {
   return handleCreateDisbursement(request, env);
  }

  return new Response("Not Found", { status: 404, headers: corsHeaders });
 } catch (error) {
  console.error("API Error:", error);
  return new Response(
   JSON.stringify({ error: "Internal Server Error", message: error.message }),
   {
    status: 500,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
   }
  );
 }
}

// Get donation statistics
async function handleStats(env) {
 const db = env.DB;

 // Get total raised (only successful donations)
 const totalRaisedResult = await db
  .prepare(
   "SELECT COALESCE(SUM(amount), 0) as total FROM donations WHERE status = ?"
  )
  .bind("success")
  .first();

 // Get total disbursed
 const totalDisbursedResult = await db
  .prepare("SELECT COALESCE(SUM(amount), 0) as total FROM disbursements")
  .first();

 // Get donor count (only successful donations)
 const donorCountResult = await db
  .prepare("SELECT COUNT(*) as count FROM donations WHERE status = ?")
  .bind("success")
  .first();

 return new Response(
  JSON.stringify({
   totalRaised: totalRaisedResult?.total || 0,
   totalDisbursed: totalDisbursedResult?.total || 0,
   donorCount: donorCountResult?.count || 0,
  }),
  {
   headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
   },
  }
 );
}

// Get recent donations
async function handleGetDonations(env) {
 const db = env.DB;

 const donations = await db
  .prepare(
   `SELECT name, email, phone, amount, message, anonymous, created_at 
      FROM donations 
      WHERE status = ? 
      ORDER BY created_at DESC 
      LIMIT 20`
  )
  .bind("success")
  .all();

 // Hide sensitive user data
 const sanitizedDonations = (donations.results || []).map((donation) => {
  const sanitized = {
   amount: donation.amount,
   created_at: donation.created_at,
  };

  // Show name only if not anonymous
  if (donation.anonymous) {
   sanitized.name = "Donatur Anonim";
  } else {
   sanitized.name = donation.name;
  }

  // Always hide email and phone
  // Don't include email and phone in response

  // Include message if provided
  if (donation.message) {
   sanitized.message = donation.message;
  }

  return sanitized;
 });

 return new Response(JSON.stringify(sanitizedDonations), {
  headers: {
   "Content-Type": "application/json",
   "Access-Control-Allow-Origin": "*",
  },
 });
}

// Create donation and initiate Midtrans payment
async function handleCreateDonation(request, env) {
 const db = env.DB;
 const data = await request.json();

 // Validate required fields
 if (!data.name || !data.email || !data.amount || data.amount < 10000) {
  return new Response(
   JSON.stringify({
    error: "Invalid donation data",
    message: "Name, email, and amount (min Rp 10,000) are required",
   }),
   {
    status: 400,
    headers: {
     "Content-Type": "application/json",
     "Access-Control-Allow-Origin": "*",
    },
   }
  );
 }

 // Calculate fee (0.7%) and total amount
 const donationAmount = data.amount;
 const fee = Math.ceil(donationAmount * 0.007);
 const totalAmount = donationAmount + fee;

 // Insert donation record (store original donation amount, not including fee)
 const result = await db
  .prepare(
   `INSERT INTO donations (name, email, phone, amount, message, anonymous, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
  .bind(
   data.name,
   data.email,
   data.phone || null,
   donationAmount, // Store original donation amount
   data.message || null,
   data.anonymous ? 1 : 0,
   "pending"
  )
  .run();

 const donationId = result.meta.last_row_id;
 const orderId = `DONATION-${donationId}-${Date.now()}`;

 // Update with order ID
 await db
  .prepare("UPDATE donations SET midtrans_order_id = ? WHERE id = ?")
  .bind(orderId, donationId)
  .run();

 // Create Midtrans transaction with total amount (donation + fee)
 const origin = new URL(request.url).origin;
 const midtransResponse = await createMidtransTransaction(
  orderId,
  totalAmount, // Use total amount including fee for payment
  data.name,
  data.email,
  origin,
  env
 );

 if (!midtransResponse || !midtransResponse.token) {
  // Update donation status to failed
  await db
   .prepare("UPDATE donations SET status = ? WHERE id = ?")
   .bind("failed", donationId)
   .run();

  return new Response(
   JSON.stringify({ error: "Payment initialization failed" }),
   {
    status: 500,
    headers: {
     "Content-Type": "application/json",
     "Access-Control-Allow-Origin": "*",
    },
   }
  );
 }

 return new Response(
  JSON.stringify({
   donation_id: donationId,
   order_id: orderId,
   payment_url:
    midtransResponse.redirect_url ||
    `https://app.sandbox.midtrans.com/snap/v2/vtweb/${midtransResponse.token}`,
  }),
  {
   headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
   },
  }
 );
}

// Create Midtrans transaction
async function createMidtransTransaction(
 orderId,
 amount,
 customerName,
 customerEmail,
 origin,
 env
) {
 const serverKey = env.MIDTRANS_SERVER_KEY;
 const isProduction = serverKey && !serverKey.includes("SB-My");

 const midtransUrl = isProduction
  ? "https://app.midtrans.com/snap/v1/transactions"
  : "https://app.sandbox.midtrans.com/snap/v1/transactions";

 const transactionDetails = {
  transaction_details: {
   order_id: orderId,
   gross_amount: amount,
  },
  customer_details: {
   first_name: customerName,
   email: customerEmail,
  },
  callbacks: {
   finish: `${origin}/`,
   error: `${origin}/`,
  },
 };

 try {
  const response = await fetch(midtransUrl, {
   method: "POST",
   headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Basic ${btoa(serverKey + ":")}`,
   },
   body: JSON.stringify(transactionDetails),
  });

  if (!response.ok) {
   const errorText = await response.text();
   console.error("Midtrans API Error:", errorText);
   return null;
  }

  return await response.json();
 } catch (error) {
  console.error("Midtrans request error:", error);
  return null;
 }
}

// Handle Midtrans webhook
async function handleMidtransWebhook(request, env) {
 const db = env.DB;
 const notification = await request.json();

 const orderId = notification.order_id;
 const transactionStatus = notification.transaction_status;
 const fraudStatus = notification.fraud_status;

 // Verify the notification (in production, verify signature)
 if (fraudStatus === "accept") {
  if (transactionStatus === "capture" || transactionStatus === "settlement") {
   // Payment successful
   await db
    .prepare("UPDATE donations SET status = ? WHERE midtrans_order_id = ?")
    .bind("success", orderId)
    .run();
  } else if (
   transactionStatus === "cancel" ||
   transactionStatus === "deny" ||
   transactionStatus === "expire"
  ) {
   // Payment failed
   await db
    .prepare("UPDATE donations SET status = ? WHERE midtrans_order_id = ?")
    .bind("failed", orderId)
    .run();
  }
 }

 return new Response("OK", { status: 200 });
}

// Admin login
async function handleAdminLogin(request, env) {
 const db = env.DB;
 const { password } = await request.json();

 // Simple password check (in production, use proper password hashing like bcrypt)
 // For now, ADMIN_PASSWORD_HASH can be set to your plain password
 // In production, hash the password and compare hashes
 const adminPassword = env.ADMIN_PASSWORD_HASH;

 if (password !== adminPassword) {
  return new Response(JSON.stringify({ error: "Invalid password" }), {
   status: 401,
   headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
   },
  });
 }

 // Generate session token
 const token = crypto.randomUUID();
 const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

 await db
  .prepare("INSERT INTO admin_sessions (token, expires_at) VALUES (?, ?)")
  .bind(token, expiresAt)
  .run();

 return new Response(JSON.stringify({ token, expires_at: expiresAt }), {
  headers: {
   "Content-Type": "application/json",
   "Access-Control-Allow-Origin": "*",
  },
 });
}

// Get disbursements (admin only)
async function handleGetDisbursements(request, env) {
 const db = env.DB;
 const token = request.headers.get("Authorization")?.replace("Bearer ", "");

 if (!token || !(await verifyAdminToken(token, db))) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
   status: 401,
   headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
   },
  });
 }

 const disbursements = await db
  .prepare("SELECT * FROM disbursements ORDER BY created_at DESC")
  .all();

 return new Response(JSON.stringify(disbursements.results || []), {
  headers: {
   "Content-Type": "application/json",
   "Access-Control-Allow-Origin": "*",
  },
 });
}

// Create disbursement (admin only)
async function handleCreateDisbursement(request, env) {
 const db = env.DB;
 const token = request.headers.get("Authorization")?.replace("Bearer ", "");

 if (!token || !(await verifyAdminToken(token, db))) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
   status: 401,
   headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
   },
  });
 }

 const { amount, description } = await request.json();

 if (!amount || !description || amount <= 0) {
  return new Response(JSON.stringify({ error: "Invalid disbursement data" }), {
   status: 400,
   headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
   },
  });
 }

 await db
  .prepare("INSERT INTO disbursements (amount, description) VALUES (?, ?)")
  .bind(amount, description)
  .run();

 return new Response(JSON.stringify({ success: true }), {
  headers: {
   "Content-Type": "application/json",
   "Access-Control-Allow-Origin": "*",
  },
 });
}

// Verify admin token
async function verifyAdminToken(token, db) {
 const session = await db
  .prepare(
   'SELECT * FROM admin_sessions WHERE token = ? AND expires_at > datetime("now")'
  )
  .bind(token)
  .first();

 return !!session;
}
