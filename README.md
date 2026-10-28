# IRONCORE - Gym Management System

A full-stack gym management platform built with Express.js, React, and MySQL.

## Quick Start

### Prerequisites
- Node.js 20.19+ or 22.12+ (required by Vite 8)
- MySQL 8.0+, with the `mysql` command-line client on your `PATH`

Run every command below from the project root (the folder containing `gym-backend` and `gym-frontend`). They work as written in PowerShell and bash.

### 1. Install dependencies

```bash
npm install --prefix gym-backend
npm install --prefix gym-frontend
```

### 2. Configure the backend

Copy the example env file, then open `gym-backend/.env` and set `DB_PASSWORD` to your MySQL root password and `JWT_SECRET` to any long random string. Login fails without `JWT_SECRET`.

```bash
cp gym-backend/.env.example gym-backend/.env
```

The frontend needs no `.env`; it calls `http://localhost:5000/api` by default. To point it elsewhere, copy `gym-frontend/.env.example` to `gym-frontend/.env` and edit `VITE_API_BASE_URL`.

### 3. Create the database

`schema.sql` creates the `gym_db` database itself, so no database name is passed. The scripts must run in this order. You will be asked for your MySQL password.

```bash
mysql -u root -p -e "source gym-backend/sql/schema.sql; source gym-backend/sql/seed.sql; source gym-backend/sql/advanced_db_features.sql"
```

To start over with a clean database, drop it first (this permanently deletes all data in `gym_db`), then run the command above again:

```bash
mysql -u root -p -e "DROP DATABASE IF EXISTS gym_db"
```

### 4. Start the app

Use two terminals and keep both running.

```bash
npm start --prefix gym-backend
```

```bash
npm run dev --prefix gym-frontend
```

The API runs on `http://localhost:5000`. Open the URL Vite prints (usually `http://localhost:5173`) and sign in with the seeded admin account: `admin@gym.com` / `admin123`.

For auto-restart on backend changes, use `npm run dev --prefix gym-backend` instead (nodemon is installed with the backend's dev dependencies).

## Project Architecture

### Backend Structure
```
gym-backend/
├── controllers/      # Request handlers and database queries
├── routes/           # API route definitions
├── middleware/       # JWT auth middleware
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
│   ├── components/   # Shell (sidebar, top bar) and shared dialogs
│   ├── context/      # Theme context
│   ├── hooks/        # Dialog focus and menu-dismiss hooks
│   ├── api.js        # API base URL (reads VITE_API_BASE_URL)
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

### Linting
There is no automated test suite yet. The frontend has ESLint:
```bash
npm run lint --prefix gym-frontend
```

### Building for Production
```bash
npm run build --prefix gym-frontend
```
The static build goes to `gym-frontend/dist/`.

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` (Frontend) | API server base URL (default: `http://localhost:5000/api`; restart `npm run dev` after changing it) |
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
- Run `npm install --prefix gym-backend`

### "Login failed! Check server connection."
- Ensure the backend is running on `http://localhost:5000`
- Check `VITE_API_BASE_URL` in `gym-frontend/.env`, if you created one
- Make sure `JWT_SECRET` is set in `gym-backend/.env`

### "Port 5000 is already in use"
- Another copy of the backend is already running. Stop it, or use the one that is running.

### "Unknown database 'gym_db'" or missing tables
- Verify MySQL is running
- Re-run the step 3 command; the scripts must run in order: `schema.sql` → `seed.sql` → `advanced_db_features.sql`

### "'mysql' is not recognized" / "mysql: command not found"
- The MySQL installer on Windows does not add the client to `PATH`. Add `C:\Program Files\MySQL\MySQL Server 8.0\bin` to your `PATH` and open a new terminal, or call it by full path in PowerShell: `& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p -e "..."`
- Alternatively, open the three scripts in MySQL Workbench and run them in the same order.

### `<` redirection errors in PowerShell
- PowerShell does not support `mysql ... < file.sql`. Use the `source` form from step 3.

## License

MIT