# Microsoft Graph Proxy with Server-Side Token Storage

A secure Node.js/Fastify application that integrates with Microsoft Graph API while keeping Microsoft tokens exclusively on the server. Clients communicate using only internal JWT tokens for maximum security.

## 📋 Project Overview

This application implements a secure server-side proxy for Microsoft 365 resources. It uses OAuth 2.0 with PKCE (Proof Key for Code Exchange) authentication flow to allow users to log in with their tenant credentials while keeping all sensitive tokens protected on the backend.

**Key Benefits:**
- ✅ Users authenticate with their Microsoft 365 tenant credentials
- ✅ Secure token management - Microsoft tokens never exposed to client
- ✅ Seamless data access via Microsoft Graph API proxy
- ✅ Production-ready authentication flow

---

## ✅ Features

- 🔐 **Secure Token Management**
  - Microsoft access/refresh tokens stored exclusively on server
  - Clients use only internal JWT tokens
  - HTTP-only cookies prevent XSS attacks

- 🔄 **Automatic Token Refresh**
  - Server automatically refreshes expired Microsoft tokens
  - Transparent to client applications

- ⚡ **Graph API Proxy**
  - Simple access to Microsoft Graph API via `/graph/*` routes
  - Automatic token management for each request

- 🧠 **In-Memory Storage**
  - Fast implementation with JavaScript Map
  - Easy migration to Redis, MongoDB, or PostgreSQL

- 🔑 **PKCE OAuth 2.0 Authentication**
  - Secure OAuth2 flow without exposing secrets
  - Industry-standard implementation

---

## 🏗️ Architecture

### Token Models

| Token Type      | Storage Location | Used By   |
|----------------|------------------|-----------|
| JWT access     | HTTP-only cookie | Frontend  |
| JWT refresh    | HTTP-only cookie | Frontend  |
| MS access token| Server (Map)     | Backend   |
| MS refresh token| Server (Map)     | Backend   |

### Authentication Flow

```
┌─────────────┐
│   Browser   │
└─────────────┘
      │ 1. Click Login
      ▼
┌─────────────────────────────────────────┐
│  Fastify App - Generate PKCE Challenge  │
│  Redirect to Microsoft Login             │
└─────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│  Microsoft Login Portal                 │
│  User enters tenant credentials         │
└─────────────────────────────────────────┘
      │ Authorization code
      ▼
┌─────────────────────────────────────────┐
│  Fastify App - Token Exchange           │
│  Store MS Tokens Securely               │
│  Issue JWT Cookies to Client            │
└─────────────────────────────────────────┘
      │
      ▼
┌─────────────┐
│   Browser   │ ✅ User Authenticated
└─────────────┘
```

---

## 📁 Project Structure

```
fastify-m365/
├── server.js                    # Fastify server & authentication logic
├── services/
│   └── GraphService.js          # Microsoft Graph API client
├── public/
│   └── index.html               # Frontend application
├── nginx/
│   └── nginx.conf               # Nginx configuration (production)
├── Dockerfile                   # Docker container configuration
├── docker-compose.yml           # Docker Compose setup
├── package.json                 # Node dependencies
├── .env                         # Environment variables (not in git)
├── .gitignore                   # Git ignore rules
├── README.md                    # This file
└── MICROSOFT_365_SETUP.md       # Azure app registration guide
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 16 or higher
- npm or yarn
- Microsoft 365 tenant with admin access
- [Azure app registration](MICROSOFT_365_SETUP.md)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd fastify-m365
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
```

4. Update `.env` with your Azure credentials:
```env
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
JWT_SECRET=generate-a-strong-secret
COOKIE_SECRET=generate-a-strong-secret
```

### Running the Application

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

The application will start on `http://localhost:3000`

---

## 🔐 Configuration

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `AZURE_TENANT_ID` | Azure AD tenant ID | `12345678-1234-1234-1234-123456789012` |
| `AZURE_CLIENT_ID` | Azure app client ID | `12345678-1234-1234-1234-123456789012` |
| `AZURE_CLIENT_SECRET` | Azure app client secret | `your-secret-key` |
| `JWT_SECRET` | Secret for signing JWT tokens | `generate-with-crypto` |
| `COOKIE_SECRET` | Secret for signing cookies | `generate-with-crypto` |
| `NODE_ENV` | Environment | `development` or `production` |
| `PORT` | Server port | `3000` |

### Generate Secure Secrets

```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate COOKIE_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 📚 API Documentation

### Authentication Endpoints

#### Login
```
GET /login
```
Initiates OAuth 2.0 login flow with Microsoft.

#### Callback
```
GET /auth/callback?code=xxx&state=xxx
```
Handles Microsoft OAuth callback. Automatically called by Microsoft after user logs in.

#### Logout
```
GET /logout
```
Clears user session and tokens.

### Graph API Proxy Endpoints

#### Get Current User
```
GET /graph/me
```
Returns the authenticated user's profile information.

**Example Response:**
```json
{
  "id": "user-id",
  "displayName": "John Doe",
  "userPrincipalName": "john.doe@company.com",
  "mail": "john.doe@company.com"
}
```

#### Get User's Member Groups
```
GET /graph/me/memberOf
```
Returns groups the user belongs to.

#### Get User's Calendar Events
```
GET /graph/me/calendar/events
```
Returns user's calendar events.

#### Generic Graph API Request
```
GET /graph/{path}
```
Forward any Microsoft Graph API request through the secure proxy.

**Headers:**
```
Authorization: Bearer {JWT-token-in-cookie}
```

---

## 🔄 Token Refresh Process

When a Microsoft access token expires:

1. Server detects 401 response from Microsoft Graph
2. Uses stored refresh token to obtain new access token
3. Updates token in server storage
4. Automatically retries the original request
5. Client remains unaware of the refresh process

---

## 🐳 Docker Deployment

### Build and Run with Docker Compose

```bash
docker-compose up --build
```

The application will be available at `http://localhost`

### Docker Environment

- Application runs on port 3000 internally
- Nginx proxies requests on port 80
- Configure environment variables in `.env` file

---

## 🔒 Security Considerations

### Security Best Practices

✅ **Do's:**
- Store all secrets in `.env` (never commit to git)
- Use HTTP-only cookies for JWT tokens
- Validate tokens on every request
- Use HTTPS in production
- Implement rate limiting
- Set appropriate token expiration times
- Refresh tokens on the server side
- Enable CORS only for trusted domains

❌ **Don'ts:**
- Expose client secrets in frontend code
- Store Microsoft tokens in browser localStorage
- Commit `.env` file to version control
- Use HTTP in production
- Trust tokens without validation
- Allow unlimited token expiration
- Store sensitive data in localStorage

---

## 🛠️ Development

### Project Setup for Development

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file with test credentials

3. Run in watch mode:
```bash
npm run dev
```

4. Open `http://localhost:3000` in browser

### Code Structure

- **server.js**: Main Fastify server, routes, and authentication logic
- **services/GraphService.js**: Microsoft Graph API client wrapper
- **public/index.html**: Frontend HTML and JavaScript

---

## 📖 Microsoft 365 Setup

For detailed instructions on registering an application in Microsoft 365 and configuring authentication, see [MICROSOFT_365_SETUP.md](MICROSOFT_365_SETUP.md).

This guide includes:
- Step-by-step Azure app registration
- Redirect URI configuration
- Client secret generation
- API permissions setup
- Environment variable configuration
- Authentication flow explanation
- Troubleshooting guide
- Production deployment checklist

---

## 🧪 Testing

### Manual Testing

1. Start the application:
```bash
npm run dev
```

2. Navigate to `http://localhost:3000`

3. Click "Login with Microsoft"

4. Log in with your tenant credentials

5. Verify you see your user profile information

### API Testing

Use tools like Postman or curl to test Graph API endpoints:

```bash
# Get current user
curl http://localhost:3000/graph/me \
  -H "Cookie: jwt=<your-jwt-token>"
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### Code Style

- Use consistent indentation (2 spaces)
- Add comments for complex logic
- Follow existing code patterns
- Test changes before submitting

---

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🆘 Troubleshooting

### Common Issues

**1. "AADSTS50058: Silent sign-in request failed"**
- **Cause**: Browser cookies not configured correctly
- **Solution**: Check browser cookie settings, ensure HTTPS in production

**2. "Invalid client ID"**
- **Cause**: Wrong `AZURE_CLIENT_ID` in `.env`
- **Solution**: Verify the ID matches your Azure app registration

**3. "Redirect URI mismatch"**
- **Cause**: Redirect URI doesn't match Azure configuration
- **Solution**: Ensure URIs match exactly in Azure Portal and application

**4. "ENOTFOUND: Cannot find module"**
- **Cause**: Dependencies not installed
- **Solution**: Run `npm install`

See [MICROSOFT_365_SETUP.md](MICROSOFT_365_SETUP.md) for more troubleshooting tips.

---

## 📚 Resources

- [Microsoft Identity Platform](https://learn.microsoft.com/en-us/azure/active-directory/develop/)
- [Microsoft Graph API](https://learn.microsoft.com/en-us/graph/overview)
- [OAuth 2.0 PKCE](https://tools.ietf.org/html/rfc7636)
- [Fastify Documentation](https://www.fastify.io/)
- [Azure Active Directory Documentation](https://learn.microsoft.com/en-us/azure/active-directory/)

---

## ⚙️ Instalacija

```bash
npm install

🚀 Pokretanje
Shellnode server.jsShow more lines

🔑 Autentifikacija flow

Korisnik ide na /login
Redirect na Microsoft login (PKCE)
Microsoft vraća code
Server:

menja code za tokene
validira ID token
čuva MS tokene u Map
generiše sopstvene JWT tokene


Klijent dobija samo JWT cookies


🔄 Microsoft token storage
JavaScriptconst msTokenStore = new Map()// ključ: userId (OID)// vrednost:{  accessToken,  refreshToken}Show more lines

🌐 Graph API proxy
Endpoint:
GET /graph/{path}

Primer:
GET /graph/me
GET /graph/me/memberOf

Server:

validira JWT
uzima MS tokene iz Map
zove Graph API
automatski refresh ako treba


🔄 Automatski refresh
Ako Microsoft API vrati 401:

Koristi se refresh token
Dobijaju se novi tokeni
Update u msTokenStore
Request se ponavlja


🧹 Logout

briše JWT tokene
briše session iz refreshStore
briše Microsoft tokene iz msTokenStore


🛡️ Security benefiti
✅ Microsoft tokeni nikada nisu izloženi klijentu
✅ Centralizovana kontrola tokena
✅ Lak prelazak na:

Redis
bazu
distributed session storage