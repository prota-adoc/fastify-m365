class GraphService {
  constructor({ tenantId, clientId, clientSecret }) {
    this.tenantId = tenantId
    this.clientId = clientId
    this.clientSecret = clientSecret
    this.baseUrl = 'https://graph.microsoft.com/v1.0'
  }
// token aplikacije (app-only) se koristi za pristup resursima bez korisničkog konteksta, dok se token korisnika koristi kada je potrebna interakcija s resursima u ime korisnika.
async getAppOnlyToken() {
  const res = await fetch(
    `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: 'https://graph.microsoft.com/.default', // OBAVEZNO za app-only
        grant_type: 'client_credentials'
      })
    }
  )
  const data = await res.json()
  return data.access_token
}

async request({ path, method = 'GET', query = {}, tokens, body }) {
  let { accessToken, refreshToken } = tokens
  const url = this.buildUrl(path, query)

  const call = (token) => {
      const config = {
        method,
        headers: {
          Authorization: `Bearer ${token}`
        }
      }

      // Dodaj body i content-type samo ako body nije null
      if (body !== null) {
        config.headers['Content-Type'] = 'application/json'
        config.body = JSON.stringify(body)
      }

      return fetch(url, config)
    }

    let res = await call(accessToken)

    if (res.status === 401) {
      const newTokens = await this.refreshToken(refreshToken)

      accessToken = newTokens.access_token
      refreshToken = newTokens.refresh_token || refreshToken

      res = await call(accessToken)

      return {
        data: await this.parseResponse(res),
        tokens: {
          accessToken,
          refreshToken
        }
      }
    }

    if (!res.ok) {
      throw new Error(await res.text())
    }

    return {
      data: await this.parseResponse(res),
      tokens: null
    }
  }

  async post(path, options) {
    return this.request({ ...options, path, method: 'POST' })
  }

  async refreshToken(refreshToken) {
    const res = await fetch(
      `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          scope: 'openid profile email offline_access User.Read GroupMember.Read.All'
        })
      }
    )

    if (!res.ok) {
      throw new Error('Refresh failed: ' + (await res.text()))
    }

    return res.json()
  }

  buildUrl(path, query) {
    const qs = new URLSearchParams(query).toString()
    return `${this.baseUrl}/${path}${qs ? '?' + qs : ''}`
  }

  async parseResponse(res) {
    const type = res.headers.get('content-type')

    if (type && type.includes('application/json')) {
      return res.json()
    }

    return res.buffer()
  }

  async get(path, options) {
    return this.request({ ...options, path, method: 'GET' })
  }
}

module.exports = GraphService