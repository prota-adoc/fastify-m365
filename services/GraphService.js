class GraphService {
  constructor({ tenantId, clientId, clientSecret }) {
    this.tenantId = tenantId
    this.clientId = clientId
    this.clientSecret = clientSecret
    this.baseUrl = 'https://graph.microsoft.com/v1.0'
  }

  async request({ path, method = 'GET', query = {}, tokens }) {
    let { accessToken, refreshToken } = tokens

    const url = this.buildUrl(path, query)

    const call = (token) =>
      fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

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