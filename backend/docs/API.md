# API Documentation

## Authentication

Most endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Base URL
```
http://localhost:3000/api/v1
```

## Contact Identity Endpoints

### Identify Contact (Main Endpoint)
```http
POST /identify
Content-Type: application/json

{
  "email": "user@example.com",
  "phoneNumber": "+1234567890"
}
```

**Note**: Either `email` or `phoneNumber` is required (or both).

**Response:**
```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["user@example.com", "user.alt@example.com"],
    "phoneNumbers": ["+1234567890", "+1987654321"],
    "secondaryContactIds": [2, 3]
  }
}
```

**Use Cases:**
- **New Contact**: Creates new primary contact if no matches found
- **Exact Match**: Returns existing contact network if exact match exists
- **Partial Match**: Creates secondary contact and links to existing network
- **Network Consolidation**: Merges separate networks when they share identifiers

### Search Contacts
```http
GET /contacts/search?email=user@example.com
GET /contacts/search?phoneNumber=+1234567890
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "email": "user@example.com",
      "phone_number": "+1234567890",
      "linked_id": null,
      "link_precedence": "primary",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "count": 1
}
```

## Admin Endpoints (Require Authentication)

### Get All Contacts
```http
GET /contacts?page=1&limit=20
Authorization: Bearer <admin_token>
```

### Get Contact by ID
```http
GET /contacts/:id
Authorization: Bearer <admin_token>
```

### Get Linked Contacts
```http
GET /contacts/:id/linked
Authorization: Bearer <admin_token>
```

### Contact Statistics
```http
GET /contacts/stats
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 150,
    "primary": 45,
    "secondary": 105,
    "withEmail": 120,
    "withPhone": 140
  }
}
```

## Authentication Endpoints

### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "user",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Get Profile
```http
GET /auth/profile
Authorization: Bearer <token>
```

### Update Profile
```http
PUT /auth/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Smith"
}
```

### Change Password
```http
PUT /auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

## User Management Endpoints (Admin Only)

### Get All Users
```http
GET /users?page=1&limit=20&sort=created_at&order=desc
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `sort` (optional): Sort field (default: created_at)
- `order` (optional): Sort order - asc/desc (default: desc)

### Get User by ID
```http
GET /users/:id
Authorization: Bearer <admin_token>
```

### Create User
```http
POST /users
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "password123",
  "firstName": "Jane",
  "lastName": "Doe",
  "role": "user"
}
```

### Update User
```http
PUT /users/:id
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "firstName": "Updated",
  "lastName": "Name",
  "role": "admin"
}
```

### Search Users
```http
GET /users/search?q=john&page=1&limit=10
Authorization: Bearer <token>
```

**Query Parameters:**
- `q` (required): Search term
- `page` (optional): Page number
- `limit` (optional): Items per page

### Deactivate User
```http
PATCH /users/:id/deactivate
Authorization: Bearer <admin_token>
```

### Activate User
```http
PATCH /users/:id/activate
Authorization: Bearer <admin_token>
```

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description"
}
```

### Common HTTP Status Codes

- `200` - OK
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

## Rate Limiting

The API implements rate limiting:
- **Window**: 15 minutes
- **Limit**: 100 requests per IP
- **Headers**: Rate limit info in response headers

## Pagination Response Format

Paginated responses include pagination metadata:

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## Validation Rules

### User Registration/Creation
- `email`: Valid email format, required
- `password`: Minimum 6 characters, required
- `firstName`: 2-50 characters, required
- `lastName`: 2-50 characters, required
- `role`: 'user' or 'admin' (optional, defaults to 'user')

### User Updates
- `firstName`: 2-50 characters (optional)
- `lastName`: 2-50 characters (optional)
- `role`: 'user' or 'admin' (optional, admin only)

### Password Change
- `currentPassword`: Required
- `newPassword`: Minimum 6 characters, required
