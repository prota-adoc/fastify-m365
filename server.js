const Fastify = require('fastify')
const fastify = Fastify({ logger: true })
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const jwksClient = require('jwks-rsa')
const { promisify } = require('util')
const path = require('path')
const msTokenStore = new Map()
const GraphService = require('./services/GraphService')

const graph = new GraphService({
  tenantId: process.env.AZURE_TENANT_ID,
  clientId: process.env.AZURE_CLIENT_ID,
  clientSecret: process.env.AZURE_CLIENT_SECRET
})

// plugins
fastify.register(require('@fastify/cookie'), {
  secret: process.env.COOKIE_SECRET
})
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, 'public')
})

// memory store
const refreshStore = new Map()

// JWKS
const client = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/discovery/v2.0/keys`
})
const getSigningKey = promisify(client.getSigningKey)

// ================= PKCE =================

function base64url(input) {
  return input.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest()
}

function generatePKCE() {
  const verifier = base64url(crypto.randomBytes(64))
  const challenge = base64url(sha256(verifier))
  return { verifier, challenge }
}

// ================= TOKENS =================

function generateId() {
  return crypto.randomBytes(40).toString('hex')
}

function createAccessToken(user) {
  return jwt.sign({
    sub: user.oid,
    email: user.preferred_username,
    tenant: user.tid
  }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: '15m'
  })
}

function createRefreshToken(user) {
  const jti = generateId()

  const token = jwt.sign({
    sub: user.oid,
    jti
  }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: '7d'
  })

  refreshStore.set(jti, { user })

  return token
}

// ================= VERIFY MICROSOFT =================

async function verifyMicrosoftToken(token) {
  const header = JSON.parse(
    Buffer.from(token.split('.')[0], 'base64').toString()
  )

  const key = await getSigningKey(header.kid)
  const pubKey = key.getPublicKey()

  return jwt.verify(token, pubKey, {
    algorithms: ['RS256'],
    audience: process.env.AZURE_CLIENT_ID,
    issuer: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`
  })
}

// ================= ROUTES =================

// home
fastify.get('/', (req, reply) => {
  reply.sendFile('index.html')
})

// login
fastify.get('/login', async (req, reply) => {
  const { verifier, challenge } = generatePKCE()

  const state = crypto.randomBytes(16).toString('hex') // ✅ FIX

  reply
    .setCookie('pkce', verifier, {
      httpOnly: true,
      secure: "auto", // true u prod
      sameSite: 'lax'
    })
    .setCookie('state', state, {
      httpOnly: true,
      secure: "auto",
      sameSite: 'lax'
    })

  const params = new URLSearchParams({
    client_id: process.env.AZURE_CLIENT_ID,
    response_type: 'code',
    redirect_uri: process.env.REDIRECT_URI,
    scope: 'openid profile email offline_access User.Read GroupMember.Read.All',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state: state // ✅ jako bitno
  })

  reply.redirect(
    `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/authorize?${params}`
  )
})

// callback
fastify.get('/auth/callback', async (req, reply) => {

  const { code, state } = req.query
  const verifier = req.cookies.pkce
  const cookieState = req.cookies.state

  if (!code || !verifier) {
    return reply.code(400).send({ error: 'missing pkce/code' })
  }

  if (!state || state !== cookieState) {
    return reply.code(400).send({ error: 'invalid state' })
  }

  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.AZURE_CLIENT_ID,
        client_secret: process.env.AZURE_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.REDIRECT_URI,
        code_verifier: verifier
      })
    }
  )

  if (!tokenRes.ok) {
    const err = await tokenRes.text()
    console.error("TOKEN HTTP ERROR:", err)
    return reply.code(500).send(err)
  }

  const tokenData = await tokenRes.json()

  console.log("TOKEN RESPONSE:", tokenData)

  if (!tokenData.id_token) {
    console.error("TOKEN ERROR:", tokenData)
    return reply.code(401).send(tokenData)
  }

  let idToken
  try {
    idToken = await verifyMicrosoftToken(tokenData.id_token)
  } catch {
    return reply.code(401).send({ error: 'invalid token' })
  }

  if (idToken.tid !== process.env.AZURE_TENANT_ID) {
    return reply.code(403).send({ error: 'wrong tenant' })
  }

  // ✅ cleanup
  reply.clearCookie('pkce')
  reply.clearCookie('state')

  const accessToken = createAccessToken(idToken)
  const refreshToken = createRefreshToken(idToken)
  
  msTokenStore.set(idToken.oid, {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token
  })

  reply
    .setCookie('access_token', accessToken, { httpOnly: true, secure: "auto", sameSite: 'lax', path: '/' })
    .setCookie('refresh_token', refreshToken, { httpOnly: true, secure: "auto", sameSite: 'lax', path: '/' })

    

  reply.redirect('/')
})


// refresh
fastify.post('/refresh', async (req, reply) => {
  const token = req.cookies.refresh_token

  try {
    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET)

    const session = refreshStore.get(payload.jti)
    if (!session) throw Error()

    refreshStore.delete(payload.jti)

    const newAccess = createAccessToken(session.user)
    const newRefresh = createRefreshToken(session.user)

    reply
      .setCookie('access_token', newAccess, { httpOnly: true, secure: "auto", sameSite: 'lax', path: '/' })
      .setCookie('refresh_token', newRefresh, { httpOnly: true, secure: "auto", sameSite: 'lax', path: '/' })

    reply.send({ ok: true })
  } catch {
    reply.code(403).send({ error: 'refresh failed' })
  }
})

// me
fastify.get('/me', async (req, reply) => {
  const token = req.cookies.access_token

  // 1. Provera da li uopšte postoji kolačić
  if (!token) {
    return reply.code(401).send({ error: 'unauthorized - missing token' })
  }

  try {
    // 2. Verifikacija našeg JWT-a
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET)

    // 3. Provera da li u msTokenStore mapi postoje Microsoft tokeni za ovog korisnika
    // (U tvom callback-u si sačuvao pod ključem idToken.oid, što je u našem JWT-u zapravo 'sub')
    const msTokens = msTokenStore.get(payload.sub)

    if (!msTokens || !msTokens.accessToken) {
      return reply.code(401).send({ error: 'unauthorized - microsoft session expired or missing' })
    }

    // Ako je sve u redu, vraćamo podatke o korisniku
    reply.send(payload)
  } catch (err) {
    reply.code(401).send({ error: 'unauthorized' })
  }
})


//graph proxy
fastify.get('/graph/*', async (req, reply) => {
  try {
    // Optimizovano: jwt.verify je sada pozvan samo jednom
    const user = jwt.verify(
      req.cookies.access_token,
      process.env.JWT_ACCESS_SECRET
    )

    const tokens = msTokenStore.get(user.sub)

    if (!tokens || !tokens.accessToken || !tokens.refreshToken) {
      return reply.code(401).send({ error: 'missing ms tokens' })
    }

    const path = req.params['*']

    const { data, tokens: newTokens } = await graph.get(path, {
      query: req.query,
      tokens
    })

    if (newTokens) {
      msTokenStore.set(user.sub, newTokens)
    }

    reply.send(data)

  } catch (e) {
    console.error(e.message)

    // Pokušavamo da parsiramo tekst greške iz GraphService-a nazad u JSON objekat
    let parsedGraphError = e.message;
    try {
      parsedGraphError = JSON.parse(e.message);
    } catch (parseErr) {
      // Ako Graph nije vratio JSON, ostavljamo grešku kao sirovi string
    }

    reply.code(401).send({ 
      error: 'graph error',
      originalQuery: {
        path: req.params['*'],
        query: req.query
      },
      graphError: parsedGraphError
    })
  }
})
// logout
fastify.get('/logout', async (req, reply) => {

  req.cookies.refresh_token &&
    jwt.verify(req.cookies.refresh_token, process.env.JWT_REFRESH_SECRET, (e, p) => {
      if (p) refreshStore.delete(p.jti)
    })

  jwt.verify(req.cookies.access_token, process.env.JWT_ACCESS_SECRET, (e, p) => {
    if (p) msTokenStore.delete(p.sub)
  })

  reply
    .clearCookie('access_token')
    .clearCookie('refresh_token')
  // ✅ opcionalno: odjava i sa Microsoft naloga
  //reply.redirect(`https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/logout?post_logout_redirect_uri=http://localhost:3000` )
  reply.redirect('/')
})

// start
fastify.listen({
  port: process.env.PORT || 3000,
  host: '0.0.0.0'
})
