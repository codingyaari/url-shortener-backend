# 🔗 URL Shortener Backend API

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.18-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-5.0-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-Auth-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)

**A powerful, secure, and feature-rich backend API for URL shortening with advanced analytics and authentication**

[Features](#-features) • [Quick Start](#-quick-start) • [API Documentation](#-api-documentation) • [Tech Stack](#-tech-stack)

</div>

---

## ✨ Features

### 🔐 Authentication & Security
- **JWT-based authentication** - Secure token-based auth system
- **Google OAuth integration** - One-click social login
- **Password hashing** - Bcrypt encryption for admin passwords
- **Rate limiting** - Protection against abuse
- **Helmet.js** - Security headers and best practices
- **CORS protection** - Configurable cross-origin resource sharing

### 🔗 Link Management
- **Create short URLs** - Transform long URLs into short, shareable links
- **Custom slugs** - Create memorable custom short URLs
- **Link expiration** - Set automatic expiration dates
- **Link activation/deactivation** - Control link visibility
- **Bulk operations** - Manage multiple links efficiently

### 📊 Analytics & Tracking
- **Click tracking** - Track every click on your shortened links
- **Device detection** - Identify Desktop, Mobile, or Tablet
- **Browser & OS detection** - Know your audience's technology
- **IP geolocation** - Country and city-level analytics
- **Referrer tracking** - See where your traffic comes from
- **Real-time analytics** - Get insights on link performance

### 🚀 Performance & Reliability
- **Express.js framework** - Fast and scalable web server
- **MongoDB with Mongoose** - Flexible NoSQL database
- **Request validation** - Input sanitization and validation
- **Error handling** - Comprehensive error management
- **Logging** - Morgan HTTP request logger

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| **Runtime** | Node.js 18+ |
| **Framework** | Express.js 4.18 |
| **Database** | MongoDB 5.0+ |
| **ODM** | Mongoose 8.0 |
| **Authentication** | JWT, Google OAuth |
| **Security** | Helmet.js, bcryptjs |
| **Validation** | express-validator |
| **Rate Limiting** | express-rate-limit |
| **Logging** | Morgan |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **MongoDB** 5.0+ (local or cloud instance)
- **Google OAuth** credentials (optional, for social login)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd url-shortener-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**

   Create a `.env` file in the root directory:
   ```env
   # Server Configuration
   PORT=3001
   NODE_ENV=development

   # Database
   MONGODB_URI=mongodb://localhost:27017/url-shortener
   # Or use MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/dbname

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-change-in-production

   # CORS Configuration
   CORS_ORIGIN=http://localhost:3000

   # Application URLs
   BASE_URL=http://localhost:3000

   # Google OAuth (Optional)
   GOOGLE_CLIENT_ID=your-google-client-id
   ```

4. **Start MongoDB**

   **macOS (Homebrew):**
   ```bash
   brew services start mongodb-community
   ```

   **Linux:**
   ```bash
   sudo systemctl start mongod
   ```

   **Windows:**
   ```bash
   net start MongoDB
   ```

   **Or use MongoDB Atlas** (cloud) - no local installation needed!

5. **Run the server**

   **Development mode:**
   ```bash
   npm run dev
   # Or with nodemon: npx nodemon server.js
   ```

   **Production mode:**
   ```bash
   npm start
   ```

   The server will start on `http://localhost:3001` 🎉

6. **Verify installation**

   Visit `http://localhost:3001/api/test` - you should see:
   ```json
   {
     "success": true,
     "message": "Test endpoint is working!",
     "timestamp": "2024-01-01T00:00:00.000Z",
     "server": "URL Shortener Backend",
     "version": "1.0.0"
   }
   ```

---

## 📚 API Documentation

### Base URL
```
http://localhost:3001/api
```

### Authentication

All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

### 🔐 Authentication Endpoints

#### Google Social Login
```http
POST /api/auth/google
Content-Type: application/json

{
  "idToken": "google-id-token-from-client"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt-token-here",
  "user": {
    "id": "user-id",
    "name": "John Doe",
    "email": "john@example.com",
    "avatar": "https://...",
    "provider": "google"
  }
}
```

#### Admin Login
```http
POST /api/auth/admin
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "your-password"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

---

### 🔗 Link Management Endpoints

#### Create Short Link
```http
POST /api/links
Authorization: Bearer <token>
Content-Type: application/json

{
  "destinationUrl": "https://example.com/very/long/url",
  "title": "My Awesome Link",
  "slug": "awesome-link",  // Optional: custom slug
  "expiry": "2024-12-31"   // Optional: expiration date
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "link-id",
    "title": "My Awesome Link",
    "destinationUrl": "https://example.com/very/long/url",
    "slug": "awesome-link",
    "shortUrl": "http://localhost:3000/awesome-link",
    "clicks": 0,
    "isActive": true,
    "expiry": "2024-12-31T00:00:00.000Z"
  }
}
```

#### Get All User Links
```http
GET /api/links
Authorization: Bearer <token>
```

#### Get Single Link
```http
GET /api/links/:id
Authorization: Bearer <token>
```

#### Update Link
```http
PUT /api/links/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Title",
  "destinationUrl": "https://new-url.com",
  "isActive": false
}
```

#### Delete Link
```http
DELETE /api/links/:id
Authorization: Bearer <token>
```

#### Get Link by Slug (Public - No Auth Required)
```http
GET /api/links/slug/:slug
```

---

### 📊 Analytics Endpoints

#### Track Click
```http
POST /api/clicks
Content-Type: application/json

{
  "slug": "awesome-link",
  "ip": "192.168.1.1",      // Optional: auto-detected
  "userAgent": "...",       // Optional: auto-detected
  "referrer": "https://..." // Optional
}
```

#### Get Link Analytics
```http
GET /api/links/analytics/:slug
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalClicks": 150,
    "clicksByCountry": {
      "US": 75,
      "UK": 50,
      "CA": 25
    },
    "clicksByDevice": {
      "Desktop": 100,
      "Mobile": 40,
      "Tablet": 10
    },
    "clicksByBrowser": {
      "Chrome": 80,
      "Firefox": 50,
      "Safari": 20
    },
    "recentClicks": [...]
  }
}
```

---

### 🏥 Health Check

```http
GET /api/health
```

---

## 📋 Database Models

### User Model
```javascript
{
  name: String (required),
  email: String (required, unique),
  password: String (hashed, optional for Google users),
  provider: String (enum: ['local', 'google']),
  googleId: String (optional),
  avatar: String (optional),
  timestamps: true
}
```

### Link Model
```javascript
{
  user: ObjectId (ref: User),
  title: String,
  destinationUrl: String (required),
  slug: String (required, unique),
  shortUrl: String,
  clicks: Number (default: 0),
  expiry: Date (optional),
  isActive: Boolean (default: true),
  timestamps: true
}
```

### Click Model
```javascript
{
  link: ObjectId (ref: Link),
  user: ObjectId (ref: User),
  ip: String,
  country: String,
  city: String,
  device: String (Desktop/Mobile/Tablet),
  browser: String,
  os: String,
  referrer: String,
  userAgent: String,
  timestamps: true
}
```

---

## 🛡️ Security Features

- ✅ **Helmet.js** - Sets various HTTP headers for security
- ✅ **Rate Limiting** - Prevents API abuse
  - General API: 100 requests per 15 minutes
  - Auth routes: 5 requests per 15 minutes
- ✅ **Password Hashing** - Bcrypt with salt rounds
- ✅ **JWT Tokens** - Secure, stateless authentication
- ✅ **Input Validation** - express-validator sanitization
- ✅ **CORS Protection** - Configurable origin whitelist
- ✅ **Error Handling** - Secure error messages

---

## 📝 Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "message": "Error description here"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Server Error

---

## 🎯 Rate Limiting

- **General API Routes**: 100 requests per 15 minutes per IP
- **Authentication Routes**: 5 requests per 15 minutes per IP
- Rate limit headers are included in responses

---

## 🚢 Deployment

### Using PM2 (Recommended)

1. **Install PM2 globally**
   ```bash
   npm install -g pm2
   ```

2. **Start with PM2**
   ```bash
   pm2 start ecosystem.config.json
   ```

3. **Manage processes**
   ```bash
   pm2 list        # View processes
   pm2 logs        # View logs
   pm2 restart all # Restart all
   pm2 stop all    # Stop all
   ```

### Environment Variables for Production

Make sure to set these in your production environment:
- `NODE_ENV=production`
- `MONGODB_URI` - Your production MongoDB connection string
- `JWT_SECRET` - Strong, random secret key
- `CORS_ORIGIN` - Your frontend domain
- `BASE_URL` - Your production base URL

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the ISC License.

---

## 🙏 Acknowledgments

- Express.js community
- MongoDB for the amazing database
- All the open-source contributors

---

<div align="center">

**Built with ❤️ using Node.js and Express**

⭐ Star this repo if you find it useful!

</div>
