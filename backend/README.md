# Bitespeed Identity Reconciliation API

A scalable Node.js REST API for customer identity tracking and reconciliation across multiple purchases, built with PostgreSQL and modern best practices.

## Overview

This API helps Bitespeed identify and keep track of customer identity across multiple purchases on FluxKart.com. The system consolidates contact information (email and phone numbers) and maintains relationships between different contact records belonging to the same customer.

## Key Features

- **Identity Reconciliation** - Automatically links contact records that belong to the same customer
- **Contact Consolidation** - Merges separate contact networks when shared identifiers are found
- **Primary/Secondary Hierarchy** - Maintains oldest contact as primary with others as secondary
- **Real-time Linking** - Instantly processes new contact information and updates relationships

## Features

- **Express.js** - Fast, unopinionated web framework
- **PostgreSQL** - Reliable relational database with connection pooling
- **JWT Authentication** - Secure token-based authentication
- **Input Validation** - Request validation using Joi
- **Error Handling** - Centralized error handling with custom error classes
- **Logging** - Structured logging with Winston
- **Security** - Helmet, CORS, rate limiting
- **Database Migrations** - Automated database schema management
- **Data Seeding** - Sample data generation
- **Testing** - Jest testing framework with coverage
- **Code Quality** - ESLint and Prettier for consistent code style

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── config.js              # Application configuration
│   ├── controllers/
│   │   ├── BaseController.js      # Base controller with CRUD operations
│   │   └── AuthController.js      # Authentication controller
│   ├── database/
│   │   ├── connection.js          # Database connection and query methods
│   │   ├── migrate.js             # Migration runner
│   │   ├── seed.js                # Seeder runner
│   │   ├── migrations/            # Database migrations
│   │   └── seeders/               # Data seeders
│   ├── middleware/
│   │   ├── auth.js                # Authentication middleware
│   │   ├── errorHandler.js        # Global error handling
│   │   └── validation.js          # Request validation
│   ├── models/
│   │   ├── BaseModel.js           # Base model with common operations
│   │   └── User.js                # User model
│   ├── routes/
│   │   ├── index.js               # Main route definitions
│   │   ├── authRoutes.js          # Authentication routes
│   │   └── userRoutes.js          # User management routes
│   ├── services/
│   │   └── UserService.js         # Business logic layer
│   ├── utils/
│   │   └── logger.js              # Logging utility
│   └── server.js                  # Main application entry point
├── tests/                         # Test files
├── logs/                          # Application logs
├── docs/                          # Documentation
└── package.json
```

## Getting Started

### Prerequisites

- Node.js (>= 18.0.0)
- PostgreSQL (>= 12)
- npm or yarn

### Installation

1. **Clone and navigate to the project:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your database credentials and other configuration.

4. **Set up PostgreSQL database:**
   ```sql
   CREATE DATABASE backend_db;
   ```

5. **Run database migrations:**
   ```bash
   npm run migrate
   ```

6. **Seed sample data (optional):**
   ```bash
   npm run seed
   ```

7. **Start the development server:**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3000`

## API Endpoints

### Contact Identity
- `POST /api/v1/identify` - Main identity reconciliation endpoint
- `GET /api/v1/contacts/search` - Search contacts by email or phone

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/auth/profile` - Get user profile (protected)
- `PUT /api/v1/auth/profile` - Update user profile (protected)
- `PUT /api/v1/auth/change-password` - Change password (protected)

### Contacts (Admin only)
- `GET /api/v1/contacts` - Get all contacts with pagination
- `GET /api/v1/contacts/:id` - Get contact by ID
- `GET /api/v1/contacts/:id/linked` - Get all linked contacts
- `GET /api/v1/contacts/stats` - Get contact statistics

### Users (Admin only)
- `GET /api/v1/users` - Get all users with pagination
- `GET /api/v1/users/:id` - Get user by ID
- `POST /api/v1/users` - Create new user
- `PUT /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user
- `GET /api/v1/users/search?q=term` - Search users

### Health Check
- `GET /health` - Application health status

## Contact Identity System

### How It Works

The system tracks customer identity using a `contacts` table with the following structure:

```sql
contacts {
  id                   SERIAL PRIMARY KEY
  phone_number         VARCHAR(20)
  email                VARCHAR(255)
  linked_id            INTEGER REFERENCES contacts(id)
  link_precedence      VARCHAR(10) -- 'primary' or 'secondary'
  created_at           TIMESTAMP
  updated_at           TIMESTAMP
  deleted_at           TIMESTAMP
}
```

### Identity Resolution Logic

1. **New Contact**: If no existing contacts match the provided email/phone, creates a new primary contact
2. **Exact Match**: If a contact exists with the exact email and phone combination, returns the existing network
3. **Partial Match**: If contacts exist with either the email OR phone, creates a secondary contact linked to the existing network
4. **Network Consolidation**: If the email and phone belong to different networks, merges them into one network

### Usage Example

```bash
# First purchase - creates primary contact
curl -X POST http://localhost:3000/api/v1/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "john@example.com", "phoneNumber": "+1234567890"}'

# Response:
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["john@example.com"],
    "phoneNumbers": ["+1234567890"],
    "secondaryContactIds": []
  }
}

# Second purchase - same phone, different email
curl -X POST http://localhost:3000/api/v1/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "john.doe@gmail.com", "phoneNumber": "+1234567890"}'

# Response:
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["john@example.com", "john.doe@gmail.com"],
    "phoneNumbers": ["+1234567890"],
    "secondaryContactIds": [2]
  }
}
```

## Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run migrate` - Run database migrations
- `npm run seed` - Run database seeders
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier

## Database Operations

### Migrations
```bash
# Run pending migrations
npm run migrate

# Rollback last migration
node src/database/migrate.js down

# Rollback multiple migrations
node src/database/migrate.js down 3
```

### Seeders
```bash
# Run all seeders
node src/database/seed.js all

# Run specific seeder
node src/database/seed.js run 001_seed_users.js
```

## Testing

Run the test suite:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

Run tests in watch mode:
```bash
npm run test:watch
```

## Security Features

- **Helmet** - Sets security-related HTTP headers
- **CORS** - Configurable cross-origin resource sharing
- **Rate Limiting** - Prevents abuse with configurable limits
- **JWT Authentication** - Secure token-based authentication
- **Input Validation** - Validates all input using Joi schemas
- **SQL Injection Protection** - Parameterized queries
- **Password Hashing** - bcrypt for secure password storage

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production) | development |
| `PORT` | Server port | 3000 |
| `DB_HOST` | Database host | localhost |
| `DB_PORT` | Database port | 5432 |
| `DB_NAME` | Database name | backend_db |
| `DB_USER` | Database user | postgres |
| `DB_PASSWORD` | Database password | password |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_EXPIRES_IN` | JWT expiration time | 24h |

## Error Handling

The API uses a centralized error handling system:

- **Operational Errors** - Known errors with appropriate HTTP status codes
- **Programming Errors** - Unexpected errors logged and hidden from clients
- **Validation Errors** - Input validation failures with detailed messages
- **Database Errors** - Converted to user-friendly error messages

## Logging

Application uses structured logging with Winston:

- **Development** - Console output with colors
- **Production** - File-based logging with rotation
- **Levels** - error, warn, info, debug
- **Format** - JSON with timestamps

## Contributing

1. Follow the existing code style
2. Write tests for new features
3. Update documentation as needed
4. Use conventional commit messages

## License

ISC
