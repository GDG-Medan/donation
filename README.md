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
   - Add environment variables:
     - `MIDTRANS_SERVER_KEY`
     - `MIDTRANS_CLIENT_KEY`
     - `ADMIN_PASSWORD_HASH`

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
│   └── api/
│       └── [[path]].js     # API routes
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

## Security Notes

- The current admin password implementation is simple. For production, implement proper password hashing (bcrypt, etc.)
- Midtrans webhook should verify the signature in production
- Consider adding rate limiting for API endpoints
- Use HTTPS in production (automatic with Cloudflare Pages)

## License

MIT

