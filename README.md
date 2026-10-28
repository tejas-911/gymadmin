# IRONCORE - Gym Management System

A full-stack gym management platform built with Express.js, React, and MySQL.

## Quick Start

### Prerequisites
- Node.js (v16+)
- MySQL 8.0+
- npm or yarn

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd gym-backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create `.env` file** (copy from `.env.example` if it exists):
   ```env
   PORT=5000
   JWT_SECRET=your_secret_key_here
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password_here
   DB_NAME=gym_db
   NODE_ENV=development
   ```

4. **Initialize the database:**
   ```bash
   mysql -u root -p gym_db < sql/schema.sql
   mysql -u root -p gym_db < sql/seed.sql
   mysql -u root -p gym_db < sql/advanced_db_features.sql
   ```

5. **Start the server:**
   ```bash
   npm start
   # Or with nodemon for development:
   npm run dev
   ```

The server will run on `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd gym-frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create `.env` file** (copy from `.env.example`):
   ```env
   VITE_API_BASE_URL=http://localhost:5000/api
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

The frontend will run on `http://localhost:5173`

## Project Architecture

### Backend Structure
```
gym-backend/
├── controllers/       # Request handlers
├── routes/           # API route definitions
├── services/         # Business logic & database queries
├── middleware/       # Express middleware (auth, errors)
├── db.js             # Database connection pool
├── server.js         # Express app setup
└── sql/              # Database scripts
    ├── schema.sql
    ├── seed.sql
    └── advanced_db_features.sql
```

### Frontend Structure
```
gym-frontend/
├── src/
│   ├── pages/        # Full-page components
│   ├── components/   # Reusable UI components
│   ├── context/      # React Context (theme, auth)
│   ├── services/     # API communication layer
│   ├── App.jsx       # Main router
│   └── index.css     # Global styles & theme
└── .env.example      # Environment template
```

## Key Features

- **User Authentication** - JWT-based auth with roles (Admin, Trainer, Member)
- **Member Management** - Register, update, track members
- **Payment Tracking** - Record and monitor member payments
- **Class Scheduling** - Create and manage gym classes
- **Equipment Inventory** - Track equipment and maintenance
- **Reports & Analytics** - Dashboard with business metrics
- **Dark & Light Themes** - Switchable theme system
- **Advanced DB Features** - Views, stored procedures, functions, triggers

## Theme System

The app supports both dark and light modes:
- Dark mode (default): Cyberpunk aesthetic with lime accent
- Light mode: Clean professional design with blue accent

Toggle theme using the button in the top-right corner. Selection is persisted in localStorage.

## API Endpoints

All API endpoints are prefixed with `/api`:

- `/auth` - Authentication
- `/members` - Member management
- `/trainers` - Trainer management
- `/payments` - Payment records
- `/attendance` - Attendance tracking
- `/equipment` - Equipment inventory
- `/classes` - Class scheduling
- `/reports` - Analytics and reports
- `/db` - Advanced database features

See controllers for detailed endpoint documentation.

## Database Schema

The system includes 17 main tables:
- `Member`, `Trainer`, `Plan`, `Subscription`
- `Payment`, `Attendance`, `Equipment`, `Workout_Plan`
- `Diet_Plan`, `Class_Schedule`, `Supplement`, and more

Advanced features include:
- **Views** for aggregated data (member dashboard, revenue, attendance)
- **Stored Procedures** for complex operations (member registration, subscriptions)
- **Functions** for reusable calculations (age, revenue, status labels)
- **Triggers** for audit logging and data validation
- **Indexes** for performance optimization

See `sql/advanced_db_features.sql` for implementation details.

## Development

### Running Tests
```bash
# Backend
cd gym-backend
npm test

# Frontend
cd gym-frontend
npm run test
```

### Building for Production
```bash
# Frontend
cd gym-frontend
npm run build
```

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` (Frontend) | API server base URL |
| `DB_HOST` (Backend) | MySQL host |
| `DB_USER` (Backend) | MySQL username |
| `DB_PASSWORD` (Backend) | MySQL password |
| `DB_NAME` (Backend) | Database name |
| `JWT_SECRET` (Backend) | JWT signing secret |
| `PORT` (Backend) | Server port (default: 5000) |

## Troubleshooting

### "Access denied for user 'root'"
- Check your MySQL password in `.env`
- Ensure MySQL is running and accessible

### "Cannot find module 'dotenv'"
- Run `npm install` in the backend directory

### Frontend showing "Cannot reach API"
- Ensure backend is running on `http://localhost:5000`
- Check `VITE_API_BASE_URL` in frontend `.env`

### Database errors on startup
- Verify MySQL is running
- Run SQL scripts in order: `schema.sql` → `seed.sql` → `advanced_db_features.sql`

## License

MIT