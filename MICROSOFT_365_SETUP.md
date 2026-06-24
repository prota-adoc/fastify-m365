# Microsoft 365 Application Setup Guide

This guide explains how to register your application in Microsoft Azure and configure it for user login with tenant credentials.

## Prerequisites

- Microsoft 365 Admin account or Azure subscription
- Access to [Azure Portal](https://portal.azure.com)
- Your application URL (e.g., `http://localhost:3000` for local development or your production domain)

---

## Step 1: Register Application in Azure Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **+ New registration**
4. Fill in the following details:
   - **Name**: `Fastify M365 App` (or your preferred name)
   - **Supported account types**: Select **"Accounts in this organizational directory only"** (single tenant)
   - **Redirect URI**: Leave this for now (we'll add it in the next step)
5. Click **Register**

---

## Step 2: Configure Redirect URIs

1. In your app registration, go to **Authentication**
2. Under **Platform configurations**, click **+ Add a platform**
3. Select **Web**
4. Add your redirect URI:
   - **Development**: `http://localhost:3000/auth/callback`
   - **Production**: `https://yourdomain.com/auth/callback`
5. Check the boxes:
   - ✅ Access tokens (used for implicit flows)
   - ✅ ID tokens (used for implicit flows)
6. Click **Save**

---

## Step 3: Create Client Secret

1. Go to **Certificates & secrets**
2. Under **Client secrets**, click **+ New client secret**
3. Enter a description: `Fastify app secret`
4. Set expiration: Recommended **12 months** or **24 months**
5. Click **Add**
6. ⚠️ **Important**: Copy the secret value immediately (it won't be visible again!)
   - Save it securely - you'll need it for the `.env` file

---

## Step 4: Copy Application Credentials

From the **Overview** page, copy these values:
- **Application (client) ID**: Save this as `AZURE_CLIENT_ID`
- **Directory (tenant) ID**: Save this as `AZURE_TENANT_ID`

From **Certificates & secrets**, copy:
- **Client secret value**: Save this as `AZURE_CLIENT_SECRET`

---

## Step 5: Configure API Permissions

1. Go to **API permissions**
2. Click **+ Add a permission**
3. Select **Microsoft Graph**
4. Choose **Delegated permissions**
5. Add the following permissions:
   - `User.Read` - Read user profile
   - `User.Read.All` - Read all user profiles
   - `Mail.Read` - Read user mailbox
   - `Calendar.Read` - Read user calendar
   - *(Add more based on your application needs)*
6. Click **Add permissions**
7. ⚠️ **Admin consent**: Click **Grant admin consent for [Your Tenant]** to approve permissions

---

## Step 6: Configure Environment Variables

Create a `.env` file in your project root with the following variables:

```env
# Azure/Microsoft 365 Configuration
AZURE_TENANT_ID=your-directory-tenant-id
AZURE_CLIENT_ID=your-application-client-id
AZURE_CLIENT_SECRET=your-client-secret-value

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-generate-a-strong-one
COOKIE_SECRET=your-cookie-secret-key

# Application Configuration
NODE_ENV=development
PORT=3000
```

**How to generate secure secrets:**

```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate COOKIE_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Step 7: Understand the Authentication Flow

This application uses **OAuth 2.0 with PKCE** (Proof Key for Code Exchange):

```
┌─────────────┐
│  Browser    │
└─────────────┘
      │ 1. Click "Login"
      ▼
┌─────────────────────────────────────────────────────────────┐
│  Your Fastify App (localhost:3000)                          │
│  • Generates PKCE code_challenge                            │
│  • Redirects to Microsoft login                             │
└─────────────────────────────────────────────────────────────┘
      │ 2. Redirect to Microsoft
      ▼
┌─────────────────────────────────────────────────────────────┐
│  Microsoft Login (login.microsoftonline.com)                │
│  • User enters tenant credentials                           │
│  • Microsoft returns auth code                              │
└─────────────────────────────────────────────────────────────┘
      │ 3. Redirect back with code
      ▼
┌─────────────────────────────────────────────────────────────┐
│  Your Fastify App (Backend)                                 │
│  • Exchanges code + PKCE verifier for Microsoft tokens      │
│  • Stores Microsoft tokens securely on server               │
│  • Issues JWT tokens to client (in HTTP-only cookies)       │
└─────────────────────────────────────────────────────────────┘
      │ 4. JWT in cookie
      ▼
┌─────────────┐
│  Browser    │ ✅ User is logged in!
└─────────────┘
```

---

## Step 8: Test Your Setup Locally

1. Start the application:
```bash
npm dev
```

2. Open your browser to `http://localhost:3000`

3. Click the **"Login with Microsoft"** button

4. You should be redirected to Microsoft login

5. Enter your tenant credentials (user@yourdomain.onmicrosoft.com)

6. You'll be redirected back to your app with a session token

---

## Security Best Practices

✅ **Do's:**
- Store secrets in `.env` file (never commit to git)
- Use HTTP-only cookies for JWT tokens
- Validate all tokens server-side
- Use HTTPS in production
- Set appropriate token expiration times
- Refresh tokens server-side automatically

❌ **Don'ts:**
- Expose client secrets in frontend code
- Store Microsoft tokens in browser localStorage
- Commit `.env` file to version control
- Use HTTP in production
- Trust tokens without validation

---

## Troubleshooting

### "AADSTS50058: Silent sign-in request failed"
- **Cause**: Browser cookies not configured correctly
- **Solution**: Check browser cookie settings, ensure HTTPS in production

### "Invalid client ID"
- **Cause**: Wrong `AZURE_CLIENT_ID` in `.env`
- **Solution**: Verify the ID matches your Azure app registration

### "Redirect URI mismatch"
- **Cause**: Redirect URI in code doesn't match Azure configuration
- **Solution**: Ensure `REDIRECT_URI` in code matches exactly what's in Azure Portal

### "Insufficient privileges"
- **Cause**: Missing admin consent for API permissions
- **Solution**: Grant admin consent in Azure Portal → API permissions

---

## Production Deployment

When deploying to production:

1. Update redirect URIs in Azure Portal to your production domain
2. Change `NODE_ENV` to `production` in `.env`
3. Use HTTPS-only URIs
4. Increase token expiration appropriately
5. Set up Redis or database for token storage (instead of in-memory Map)
6. Enable audit logging in Azure
7. Configure conditional access policies if needed

---

## Additional Resources

- [Microsoft Identity Platform Documentation](https://learn.microsoft.com/en-us/azure/active-directory/develop/)
- [OAuth 2.0 PKCE Specification](https://tools.ietf.org/html/rfc7636)
- [Microsoft Graph API Documentation](https://learn.microsoft.com/en-us/graph/overview)
- [Azure Active Directory Best Practices](https://learn.microsoft.com/en-us/azure/active-directory/fundamentals/active-directory-whatis)

---

## Support

For issues or questions:
- Check Azure Portal audit logs for authentication errors
- Review application logs with `npm dev`
- Consult Microsoft documentation links above
