# LocalHub - ChatGPT App for Local Business Search

LocalHub is a complete ChatGPT App demonstrating OpenAI Apps SDK integration with Google Maps Platform APIs using the MCP (Model Context Protocol). It provides seamless local business search and directions within ChatGPT conversations, with an admin interface to manage business listings.

## Features

### ChatGPT Integration
- **Local Business Search**: Search for businesses, restaurants, coffee shops, and more
- **Interactive Map Widget**: View search results on an interactive Google Map
- **Business Details**: See ratings, addresses, and contact information
- **Google Maps Integration**: Opens Google Maps for turn-by-turn directions (handles user location automatically)
- **Call Businesses**: Direct phone integration (when phone numbers available)
- **Fullscreen Mode**: Expand the map widget for better viewing
- **Radius-Based Filtering**: Returns all saved businesses within 40km of search location

### Admin Interface
- **Business Management**: Add and manage business locations using Google Maps
- **Project Organization**: Group businesses into projects
- **Interactive Map**: Search and select businesses using Google Maps Business Picker
- **Real-time Updates**: Changes immediately reflect in ChatGPT searches

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Runtime**: Node.js
- **Language**: TypeScript
- **Frontend**: React 18+
- **Database**: SQLite with Prisma ORM
- **Authentication**: bcryptjs for admin users
- **Maps**: Google Maps Platform APIs
- **Protocol**: OpenAI MCP (Model Context Protocol)
- **UI**: shadcn/ui components with Tailwind CSS
- **Deployment**: Vercel

## Prerequisites

- Node.js 18+ and npm
- Google Cloud Platform account
- ChatGPT Plus subscription (for testing with ChatGPT)
- ngrok account (for local testing with ChatGPT)

## Google Maps Platform Setup

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable billing for the project (required for Maps Platform APIs)

### 2. Enable Required APIs

Enable the following APIs in your Google Cloud Project:

1. **Geocoding API** - For converting addresses to coordinates
2. **Places API (New)** - For nearby business search
3. **Maps JavaScript API** - For interactive map display

To enable APIs:
- Go to **APIs & Services** > **Library**
- Search for each API listed above
- Click **Enable** for each one

**Note**: Directions are handled by opening Google Maps URLs, so the Directions API is not required.

### 3. Create API Keys

You'll need two types of API keys:

#### Server-side API Key (for backend)
1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **API Key**
3. Name it "LocalHub Server Key"
4. Restrict it to:
   - Geocoding API
   - Places API (New)
5. Copy this key for `GOOGLE_PLACES_API_KEY`

#### Client-side API Key (for frontend)
1. Create another API key
2. Name it "LocalHub Browser Key"
3. Restrict it to:
   - Maps JavaScript API
4. Add HTTP referrer restrictions:
   - `http://localhost:3000/*` (for development)
   - `https://*.vercel.app/*` (for production)
   - Your production domain
5. Copy this key for `GOOGLE_MAPS_PUBLIC_KEY`
5. Copy this key for BOTH `GOOGLE_MAPS_PUBLIC_KEY` and `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (they should have the same value)

#### Understanding the API Key Variables

You'll notice there are two similar-looking variables for the client-side API key:
- **`GOOGLE_MAPS_PUBLIC_KEY`**: Legacy/compatibility variable
- **`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`**: Required by Next.js for client-side access

**Both should have the SAME value** (your browser API key). Next.js only exposes environment variables with the `NEXT_PUBLIC_` prefix to the browser, which is why both are needed.

**Important**: Never commit `.env.local` or `.env` to version control. They're already in `.gitignore`.

## Local Development Setup

### Quick Setup (Recommended) ⚡

We provide automated setup scripts that handle all the installation steps for you.

**Before running the setup script:**
1. Edit `.env.example` and add your Google Maps API keys (see Google Maps Platform Setup above)

#### For Windows:

**Note**: You may need to run as Administrator on some Windows systems.

```bash
git clone https://github.com/martincrumlish/localhubadmin.git
cd localhubadmin
setup.bat
```

#### For Linux/Mac:

```bash
git clone https://github.com/martincrumlish/localhubadmin.git
cd localhubadmin
chmod +x setup.sh
./setup.sh
```

The setup script will:
1. ✅ Create `.env.local` and `.env` from `.env.example`
2. ✅ Install all dependencies (including ts-node and typescript)
3. ✅ Generate Prisma Client
4. ✅ Run database migrations
5. ✅ Seed the database with initial admin user
6. ✅ Build the widget bundle

**After running the setup script:**
1. Verify `.env.local` and `.env` were created correctly
2. Run `npm run dev` to start the development server
3. Visit `http://localhost:3000/admin/login`
4. Login with: `admin@example.com` / `password123`

---

### Manual Setup (Alternative)

If you prefer to run the setup steps manually:

#### 1. Clone the Repository

```bash
git clone https://github.com/martincrumlish/localhubadmin.git
cd localhubadmin
```

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Set Up Environment Variables

Edit `.env.example` and add your Google Maps API keys:

```env
GOOGLE_PLACES_API_KEY=your_server_key_here
GOOGLE_DIRECTIONS_API_KEY=your_server_key_here
GOOGLE_MAPS_PUBLIC_KEY=your_browser_key_here
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_browser_key_here
NEXT_PUBLIC_BASE_URL=http://localhost:3000
DATABASE_URL="file:./dev.db"
```

Then copy it to create both `.env.local` and `.env`:

```bash
cp .env.example .env.local
cp .env.example .env
```

#### 4. Set Up the Database

Initialize the database and create tables:

```bash
npx prisma generate
npx prisma migrate dev
```

Seed the database with initial admin user and sample projects:

```bash
npx prisma db seed
```

This creates:
- **Admin user**: `admin@example.com` / `password123`
- **Sample projects**: Miami Businesses, San Francisco Businesses

#### 5. Build the Widget Bundle

The widget is a separate React application that needs to be built:

```bash
npm run build:widget
```

Or manually:

```bash
cd apps/localhub/web
npm install
npm run build
cd ../../..
```

#### 6. Start the Development Server

```bash
npm run dev
```

The server will start at `http://localhost:3000`
## Using the Admin Interface

### Accessing the Admin Panel

1. Open your browser and navigate to `http://localhost:3000/admin/login`
2. Log in with the default credentials:
   - **Email**: `admin@example.com`
   - **Password**: `password123`

### Managing Businesses

1. **Create a Project**: Click "Projects" → "New Project"
2. **Add Businesses**:
   - Open a project
   - Use the Google Maps search to find businesses
   - Click on the map to select a business
   - Click "Add Business to Project" to save
3. **View on Map**: Click "Show on Map" next to any business to see its location

### How It Works

- The search API returns all businesses within 40km of the search location
- Only businesses you've added through the admin panel will appear in ChatGPT
- Changes are immediate - no rebuild required

### 7. Test the API Endpoints

#### Test Manifest Endpoint
```bash
curl http://localhost:3000/api/mcp
```

#### Test Search Places Tool
```bash
curl -X POST http://localhost:3000/api/localhub/tools/search_places \
  -H "Content-Type: application/json" \
  -d '{"query": "coffee", "where": "San Francisco"}'
```

#### Test Widget Resource
Open in browser: `http://localhost:3000/api/localhub/resources/localhub-map`

**Note**: The search will only return businesses you've added through the admin panel.

## Testing with ChatGPT

### 1. Set Up ngrok Tunnel

Install ngrok:
```bash
npm install -g ngrok
```

Authenticate with your ngrok token:
```bash
ngrok config add-authtoken YOUR_NGROK_TOKEN
```

Start the tunnel:
```bash
ngrok http 3000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

### 2. Register the App in ChatGPT

1. Go to ChatGPT settings
2. Enable Developer Mode (or access ChatGPT Apps configuration)
3. Add new app configuration
4. Set manifest URL: `https://YOUR-NGROK-URL.ngrok.io/api/mcp`
5. Save and wait for validation

### 3. Test in ChatGPT

Try these prompts:
- "Find coffee shops in Dublin"
- "Show me restaurants in San Francisco"
- "Search for pizza places near Times Square"
- Click a marker to see business details
- Click "Get Directions" to open Google Maps with directions (Google Maps will handle getting your location)
- Click "Call Business" to initiate a phone call (if available)

## Project Structure

```
localhub/
├── app/
│   ├── admin/                     # Admin interface
│   │   ├── login/                 # Admin login page
│   │   ├── projects/              # Project management
│   │   │   ├── [id]/              # Project details page
│   │   │   └── components/        # Admin UI components
│   │   │       └── MapsBusinessPicker.tsx  # Google Maps business picker
│   │   ├── users/                 # User management (future)
│   │   └── layout.tsx             # Admin layout with navigation
│   ├── api/
│   │   ├── admin/                 # Admin API routes
│   │   │   ├── auth/              # Authentication endpoints
│   │   │   └── projects/          # Project CRUD endpoints
│   │   ├── mcp/                   # MCP JSON-RPC 2.0 endpoint (main)
│   │   │   └── route.ts           # Implements initialize, tools/list, tools/call, resources/read
│   │   ├── localhub/
│   │   │   ├── tools/
│   │   │   │   └── search_places/ # Search tool implementation (radius-based filtering)
│   │   │   └── resources/
│   │   │       └── localhub-map/  # Widget HTML resource
│   │   ├── assets/                # Static asset server for widget JS bundle
│   │   └── .well-known/
│   │       └── oauth-protected-resource/ # OAuth discovery (no-auth mode)
│   ├── layout.tsx                 # Root layout
│   └── middleware.ts              # CORS handling
├── apps/
│   └── localhub/
│       ├── server/                # Server-side utilities
│       │   ├── db.ts              # Prisma client singleton
│       │   ├── place-filter.ts    # Database filtering utilities
│       │   ├── types.ts           # TypeScript types
│       │   └── utils.ts           # API response helpers
│       └── web/                   # Widget bundle
│           ├── src/
│           │   ├── component.tsx  # React widget component
│           │   ├── hooks.ts       # Official React hooks (useToolOutput, etc.)
│           │   └── types.ts       # TypeScript interfaces
│           ├── dist/              # Built widget bundle (generated)
│           ├── package.json       # Widget dependencies
│           ├── tsconfig.json      # Widget TypeScript config
│           └── esbuild.config.mjs # Widget build config
├── prisma/
│   ├── schema.prisma              # Database schema
│   ├── migrations/                # Database migrations
│   ├── seed.ts                    # Database seeding script
│   └── dev.db                     # SQLite database (not committed)
├── components/                    # Shared UI components
│   └── ui/                        # shadcn/ui components
├── public/
│   └── logo.png                   # Application logo
├── .env.example                   # Example environment variables
├── .env.local                     # Environment variables (not committed)
├── .gitignore                     # Git ignore rules
├── package.json                   # Root dependencies
├── tsconfig.json                  # TypeScript configuration
└── next.config.mjs                # Next.js configuration
```

## Building for Production

The build process includes both the Next.js app and the widget bundle:

```bash
npm run build
```

This runs:
1. Widget build: `cd apps/localhub/web && npm install && npm run build`
2. Next.js build: `next build`

## Deployment to Vercel

### 1. Configure Environment Variables in Vercel

Add the following environment variables in your Vercel project settings:
- `GOOGLE_PLACES_API_KEY`
- `GOOGLE_MAPS_PUBLIC_KEY`
- `NEXT_PUBLIC_BASE_URL` (set to your Vercel production URL, e.g., `https://your-project.vercel.app`)

### 2. Update Google Maps API Key Restrictions

Add your Vercel domain to the browser key restrictions:
- `https://YOUR-PROJECT.vercel.app/*`
- `https://*.vercel.app/*` (for preview deployments)

### 3. Deploy

```bash
vercel deploy --prod
```

### 4. Update ChatGPT Configuration

Update the manifest URL in ChatGPT to your production URL:
- `https://YOUR-PROJECT.vercel.app/api/mcp`

## Troubleshooting

### Setup Issues

- **Windows: Permission Errors**
  - Solution: Run `setup.bat` as Administrator (right-click → "Run as administrator")

- **Prisma can't find DATABASE_URL**
  - Solution: The setup scripts create both `.env` and `.env.local`. Prisma reads from `.env`
  - If running manually, ensure you copy `.env.example` to both `.env` and `.env.local`

- **Prisma seed fails with module errors**
  - Solution: Already fixed in package.json with CommonJS compiler options
  - If you encounter issues, ensure ts-node and typescript are installed: `npm install -D ts-node typescript`

### API Key Issues
- **Error**: "This API key is not authorized to use this service or API"
  - Solution: Ensure the API is enabled in Google Cloud Console
  - Check API key restrictions match your domain/referrer

### Build Errors
- **Error**: Widget bundle not found
  - Solution: Run `cd apps/localhub/web && npm run build`
  - Verify `apps/localhub/web/dist/localhub-map.js` exists

### Widget Not Rendering
- **Error**: Blank widget or JavaScript errors
  - Solution: Check browser console for errors
  - Verify `GOOGLE_MAPS_PUBLIC_KEY` is set correctly
  - Check API key has Maps JavaScript API enabled

### CORS Errors
- **Error**: CORS policy blocking requests
  - Solution: Next.js API routes handle CORS automatically
  - Ensure requests use the correct origin

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
