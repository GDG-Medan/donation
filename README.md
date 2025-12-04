# GDG Indonesia Donation Website

Donation website for GDG Indonesia/Medan flood relief efforts in Aceh, North Sumatra, and West Sumatra.

## Features

- Single-page donation interface
- Real-time donation statistics
- Recent donations feed
- Anonymous donation option
- Admin interface for disbursement tracking
- Midtrans payment integration
- Lightweight and fast (vanilla JS, minimal CSS)
- Deployed on Cloudflare Pages with D1 database

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Backend**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Payment**: Midtrans Core API
- **Hosting**: Cloudflare Pages

## Setup Instructions

### Prerequisites

1. Node.js (v18 or higher)
2. Cloudflare account
3. Midtrans account

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create a D1 database:
```bash
npx wrangler d1 create gdg-donation-db
```

This will output a database ID. Copy it for the next step.

3. Copy the example configuration file:
   ```bash
   cp wrangler.toml.example wrangler.toml
   ```

4. Update `wrangler.toml`:
   - Replace `YOUR_D1_DATABASE_ID` with your actual D1 database ID
   - Add your Midtrans credentials:
     - `MIDTRANS_SERVER_KEY`: Your Midtrans server key
     - `MIDTRANS_CLIENT_KEY`: Your Midtrans client key (for frontend if needed)
   - Set `ADMIN_PASSWORD_HASH`: For now, you can use a simple password. In production, use a proper hash.

5. Run database migrations:
```bash
npm run db:migrate
```

### Development

Run the development server:
```bash
npm run dev
```

The site will be available at `http://localhost:8788`

### Deployment

1. Deploy to Cloudflare Pages:
```bash
npm run deploy
```

2. Configure environment variables in Cloudflare Dashboard:
   - Go to your Pages project settings
   - Add environment variables (see Environment Variables section below)

3. Configure Midtrans webhook:
   - In your Midtrans dashboard, set the webhook URL to:
     `https://your-domain.pages.dev/api/midtrans/notification`

## Project Structure

```
/
├── public/
│   ├── index.html          # Main donation page
│   ├── admin.html          # Admin interface
│   ├── styles.css          # Styles
│   └── app.js              # Frontend JavaScript
├── functions/
│   ├── api/
│   │   └── [[path]].js     # Main API router
│   ├── routes/
│   │   ├── donations.js    # Donation routes
│   │   ├── admin.js        # Admin routes
│   │   └── disbursements.js # Disbursement routes
│   ├── utils/
│   │   ├── logger.js       # Grafana.net logging utility
│   │   ├── errors.js       # Error handling utilities
│   │   ├── auth.js         # Authentication utilities
│   │   ├── validation.js   # Input validation & sanitization
│   │   └── env.js          # Environment variable management
│   └── types.d.ts          # TypeScript type definitions
├── wrangler.toml           # Cloudflare config
├── schema.sql              # Database schema
└── package.json            # Dependencies
```

## API Endpoints

- `GET /api/stats` - Get donation statistics
- `GET /api/donations` - Get recent donations
- `POST /api/donations` - Create donation
- `POST /api/midtrans/notification` - Midtrans webhook
- `POST /api/admin/login` - Admin login
- `GET /api/admin/disbursements` - Get disbursements (admin)
- `POST /api/admin/disbursements` - Create disbursement (admin)

## Admin Access

Access the admin interface at `/admin.html`. Use the password configured in `ADMIN_PASSWORD_HASH`.

## Environment Variables

### Required Variables

These variables must be set for the application to function:

| Variable | Description | Example |
|----------|-------------|---------|
| `MIDTRANS_SERVER_KEY` | Midtrans server key for payment processing | `Mid-server-xxxxx` |
| `ADMIN_PASSWORD_HASH` | Admin password hash for authentication | `your-secure-password` |
| `DB` | D1 database binding (automatically configured in `wrangler.toml`) | - |

### Optional Variables

These variables enhance functionality but are not required:

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `MIDTRANS_CLIENT_KEY` | Midtrans client key (for frontend if needed) | - | `Mid-client-xxxxx` |
| `GRAFANA_OTLP_ENDPOINT` | Grafana.net OTLP endpoint URL for logging | - | `https://otlp-gateway-prod-ap-southeast-2.grafana.net/otlp/v1/logs` |
| `GRAFANA_OTLP_AUTH` | Grafana.net OTLP authentication token (Base64 encoded) | - | `your-base64-encoded-auth-token` |
| `SERVICE_NAME` | Service name for logging and monitoring | `gdg-donation-api` | `gdg-donation-api` |
| `SERVICE_VERSION` | Service version for logging | `1.0.0` | `1.0.0` |
| `ENVIRONMENT` | Environment name (development, staging, production) | `production` | `production` |
| `R2_PUBLIC_DOMAIN` | Custom domain for R2 public files | `files-donasi.gdgmedan.com` | `files.yourdomain.com` |
| `SITE_URL` | Site URL for callbacks and redirects | - | `https://your-domain.pages.dev` |

### Setting Up Grafana.net Logging

1. Get your Grafana.net OTLP endpoint URL from your Grafana Cloud instance
2. Generate a Base64-encoded authentication token:
   ```bash
   echo -n "your-instance-id:your-api-token" | base64
   ```
3. Set both `GRAFANA_OTLP_ENDPOINT` and `GRAFANA_OTLP_AUTH` in your environment variables

### Environment Variable Validation

The application validates required environment variables at startup. Missing or invalid variables will be logged but won't prevent the application from running (to allow graceful degradation).

## Code Quality Features

- **Structured Logging**: Integrated with Grafana.net for centralized log management
- **Error Handling**: Consistent error response format with request tracking
- **Type Safety**: TypeScript type definitions for better IDE support
- **Input Validation**: Comprehensive validation and sanitization for all user inputs
- **Modular Architecture**: Code organized into logical modules (routes, utils)
- **JSDoc Comments**: All functions documented with JSDoc

## Security Notes

- The current admin password implementation is simple. For production, implement proper password hashing (bcrypt, etc.)
- Midtrans webhook should verify the signature in production
- Consider adding rate limiting for API endpoints
- Use HTTPS in production (automatic with Cloudflare Pages)
- All user inputs are validated and sanitized to prevent XSS and SQL injection
- SQL queries use parameterized statements to prevent injection attacks

## License

MIT

