# LocalHub Admin System

Web-based admin interface for managing local business directory and curating businesses from Google Places API.

## Features

- **Project Management**: Create and manage city/town groupings for businesses
- **Business Curation**: Add businesses from Google Maps to projects
- **Admin User Management**: Add and remove administrator accounts
- **MCP Integration**: Filter ChatGPT search results to only show curated businesses
- **Secure Authentication**: Session-based authentication with HTTP-only cookies

## Setup

### 1. Database Configuration

Ensure the DATABASE_URL environment variable is set in `.env`:

```bash
DATABASE_URL="file:./dev.db"
SESSION_SECRET="[your-secure-random-string]"
GOOGLE_PLACES_API_KEY="[your-google-api-key]"
```

### 2. Run Database Migrations

```bash
npx prisma migrate dev
```

### 3. Create First Admin User

Run the seed script to create the default admin user:

```bash
npx prisma db seed
```

Default credentials:
- Email: `admin@example.com`
- Password: `password123`

**Important**: Change this password after first login or create a new admin and delete this one.

## Admin Routes

- `/admin/login` - Login page (public)
- `/admin` - Dashboard with quick stats
- `/admin/projects` - List all projects
- `/admin/projects/new` - Create new project
- `/admin/projects/[id]` - View project details and businesses
- `/admin/projects/[id]/edit` - Edit project
- `/admin/users` - Manage admin users

## API Endpoints

### Authentication
- `POST /api/admin/auth/login` - Login with email/password
- `POST /api/admin/auth/logout` - Logout and clear session
- `GET /api/admin/auth/me` - Get current authenticated admin

### Projects
- `GET /api/admin/projects` - List projects (filter by status)
- `POST /api/admin/projects` - Create new project
- `GET /api/admin/projects/[id]` - Get project details
- `PATCH /api/admin/projects/[id]` - Update project
- `DELETE /api/admin/projects/[id]` - Delete project (cascades to businesses)

### Businesses
- `GET /api/admin/projects/[id]/businesses` - List businesses in project
- `POST /api/admin/projects/[id]/businesses` - Add business to project
- `DELETE /api/admin/businesses/[id]` - Remove business from project

### Admin Users
- `GET /api/admin/users` - List all admin users
- `POST /api/admin/users` - Create new admin user
- `DELETE /api/admin/users/[id]` - Delete admin user (cannot delete self)

## MCP Integration

The system integrates with the existing MCP tool to filter Google Places API results:

1. ChatGPT makes a natural language query (e.g., "find restaurants in Miami")
2. MCP tool calls Google Places API
3. Results are filtered to only include businesses in the database
4. Filtered results are returned to ChatGPT

This ensures that only curated, admin-approved businesses appear in ChatGPT responses.

## Database Schema

### Admin
- `id`: Primary key
- `email`: Unique email address
- `passwordHash`: Bcrypt hashed password
- `createdAt`, `updatedAt`: Timestamps

### Session
- `id`: Primary key
- `adminId`: Foreign key to Admin
- `token`: Unique session token (indexed)
- `expiresAt`: Session expiration (7 days)
- `createdAt`: Timestamp

### Project
- `id`: Primary key
- `name`: Project name
- `description`: Optional description
- `status`: "active" or "inactive"
- `createdByAdminId`: Foreign key to Admin
- `createdAt`, `updatedAt`: Timestamps

### Business
- `id`: Primary key
- `projectId`: Foreign key to Project (cascade delete)
- `placeId`: Google Place ID (unique, indexed)
- `businessName`: Business display name
- `addedByAdminId`: Foreign key to Admin
- `createdAt`, `updatedAt`: Timestamps

## Development

### Running Tests

```bash
# Run all admin tests
npm test -- --testPathPatterns="prisma/tests|app/api/admin"

# Run specific test suite
npm test -- app/api/admin/auth/tests/auth.test.ts
npm test -- prisma/tests/models.test.ts
```

### Adding New Admins

Use the admin interface at `/admin/users` or create directly via Prisma:

```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const hash = await bcrypt.hash('your-password', 10);
await prisma.admin.create({
  data: {
    email: 'newadmin@example.com',
    passwordHash: hash
  }
});
```

## Security Considerations

- Passwords are hashed with bcrypt (cost factor 10)
- Session tokens are stored in HTTP-only cookies
- All admin routes are protected by authentication middleware
- Admins cannot delete their own accounts
- Session cleanup runs automatically on validation
- Input validation on all forms

## Technology Stack

- **Database**: SQLite with Prisma ORM
- **Authentication**: Custom email/password with bcrypt
- **Frontend**: Next.js 14 (App Router)
- **UI Components**: Tailwind CSS + shadcn/ui
- **State Management**: React hooks (no external state library)
- **Testing**: Jest with Prisma test database

## Troubleshooting

### Cannot log in
- Verify admin user exists in database
- Check that PASSWORD is correct (default: `password123`)
- Ensure SESSION_SECRET is set in .env

### MCP not filtering results
- Verify database contains businesses with valid place_ids
- Check console logs for "MCP Filter" messages
- Ensure Prisma is running in nodejs runtime (not edge)

### Businesses not appearing
- Confirm business was added to an active project
- Verify place_id matches exactly (case-sensitive)
- Check that Google Places API query returns the place

## Future Enhancements

Phase 2 considerations (out of scope for MVP):
- Google Maps picker component for admin UI
- Bulk import/export of businesses
- Advanced role-based permissions
- Audit logging for all admin actions
- Analytics dashboard
- Email notifications
