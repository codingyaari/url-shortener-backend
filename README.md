# URL Shortener Backend API

Backend API for the URL Shortener application built with Node.js, Express, and MongoDB.

## Features

- User authentication with JWT
- Link creation, management, and deletion
- Custom slug support
- Link expiration
- Click tracking and analytics
- Device, browser, and OS detection
- Rate limiting
- Security best practices

## Tech Stack

- **Node.js** - Runtime environment
- **Express** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **express-validator** - Input validation
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Update the following variables:
- `PORT` - Server port (default: 3001)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `CORS_ORIGIN` - Frontend URL (default: http://localhost:3000)
- `BASE_URL` - Base URL for short links (default: http://localhost:3000)

### 3. Start MongoDB

Make sure MongoDB is running on your system:

```bash
# macOS (using Homebrew)
brew services start mongodb-community

# Or run MongoDB directly
mongod
```

### 4. Run the Server

```bash
# Development mode (with nodemon)
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3001`

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (Protected)

### Links

- `POST /api/links` - Create a new link (Protected)
- `GET /api/links` - Get all user's links (Protected)
- `GET /api/links/:id` - Get a single link (Protected)
- `PUT /api/links/:id` - Update a link (Protected)
- `DELETE /api/links/:id` - Delete a link (Protected)
- `GET /api/links/slug/:slug` - Get link by slug (Public)

### Analytics

- `POST /api/clicks` - Track a click (Public)
- `GET /api/clicks/links/:id/analytics` - Get link analytics (Protected)

### Health Check

- `GET /api/health` - Server health check

## Authentication

The API uses JWT tokens for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-token>
```

## Database Models

### User
- `name` - User's name
- `email` - User's email (unique)
- `password` - Hashed password
- `provider` - Authentication provider (local/google)
- `googleId` - Google OAuth ID (if applicable)
- `avatar` - User avatar URL

### Link
- `user` - Reference to User
- `title` - Link title
- `destinationUrl` - Original URL
- `slug` - Short URL slug (unique)
- `shortUrl` - Complete short URL
- `clicks` - Click count
- `expiry` - Expiration date (optional)
- `isActive` - Active status

### Click
- `link` - Reference to Link
- `user` - Reference to User
- `ip` - IP address
- `country` - Country
- `city` - City
- `device` - Device type (Desktop/Mobile/Tablet)
- `browser` - Browser name
- `os` - Operating system
- `referrer` - Referrer URL
- `userAgent` - Full user agent string

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "message": "Error message"
}
```

## Rate Limiting

- General API: 100 requests per 15 minutes per IP
- Auth routes: 5 requests per 15 minutes per IP

## Security Features

- Helmet.js for security headers
- CORS protection
- Rate limiting
- Password hashing with bcrypt
- JWT token authentication
- Input validation

## Future Enhancements

- IP geolocation for accurate country/city detection
- Google OAuth integration
- WebSocket support for real-time analytics
- Bulk link operations
- Link QR code generation
- Advanced analytics and reporting
