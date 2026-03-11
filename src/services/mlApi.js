import axios from 'axios'
import { useAuthStore } from '@/stores/auth'

const ML_API_BASE = '/ml-api'

const mlAxios = axios.create({
  baseURL: ML_API_BASE,
  timeout: 30000
})

mlAxios.interceptors.request.use((config) => {
  const authStore = useAuthStore()
  if (authStore.accessToken) {
    config.headers.Authorization = `Bearer ${authStore.accessToken}`
  }
  return config
})

mlAxios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const authStore = useAuthStore()
      authStore.logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ------------- Auth -------------
export async function exchangeCodeForToken(code, appId, secretKey, redirectUri) {
  const res = await axios.post('/ml-api/oauth/token', null, {
    params: {
      grant_type: 'authorization_code',
      client_id: appId,
      client_secret: secretKey,
      code,
      redirect_uri: redirectUri
    }
  })
  return res.data
}

export async function refreshAccessToken(refreshToken, appId, secretKey) {
  const res = await axios.post('/ml-api/oauth/token', null, {
    params: {
      grant_type: 'refresh_token',
      client_id: appId,
      client_secret: secretKey,
      refresh_token: refreshToken
    }
  })
  return res.data
}

// ------------- User -------------
export async function getMe() {
  const res = await mlAxios.get('/users/me')
  return res.data
}

// ------------- Advertising: Campaigns -------------
export async function getCampaigns(accountId) {
  const res = await mlAxios.get('/advertising/product-ads/campaigns', {
    params: { account_id: accountId }
  })
  return res.data
}

export async function getCampaignById(campaignId) {
  const res = await mlAxios.get(`/advertising/product-ads/campaigns/${campaignId}`)
  return res.data
}

export async function updateCampaign(campaignId, data) {
  const res = await mlAxios.put(`/advertising/product-ads/campaigns/${campaignId}`, data)
  return res.data
}

// ------------- Advertising: Ad Groups -------------
export async function getAdGroups(campaignId) {
  const res = await mlAxios.get('/advertising/product-ads/ad-groups', {
    params: { campaign_id: campaignId }
  })
  return res.data
}

// ------------- Advertising: Ads -------------
export async function getAds(params = {}) {
  const res = await mlAxios.get('/advertising/product-ads/ads', { params })
  return res.data
}

// ------------- Advertising: Reports -------------
export async function getCampaignsDailyReport(accountId, dateFrom, dateTo) {
  const res = await mlAxios.get('/advertising/product-ads/reports/daily', {
    params: {
      account_id: accountId,
      date_from: dateFrom,
      date_to: dateTo
    }
  })
  return res.data
}

export async function getAdsDailyReport(accountId, dateFrom, dateTo, limit = 50) {
  const res = await mlAxios.get('/advertising/product-ads/reports/ads/daily', {
    params: {
      account_id: accountId,
      date_from: dateFrom,
      date_to: dateTo,
      limit
    }
  })
  return res.data
}

// ------------- Mock data (for demo / testing without credentials) -------------
export function getMockCampaigns() {
  return [
    { id: 1001, name: 'Campanha Eletrônicos Q1', status: 'enabled', budget: 5000, spend: 3240.50, impressions: 128450, clicks: 2890, conversions: 145, ctr: 2.25, cpc: 1.12, roas: 8.4 },
    { id: 1002, name: 'Campanha Moda Verão', status: 'enabled', budget: 3000, spend: 1890.30, impressions: 95200, clicks: 1820, conversions: 87, ctr: 1.91, cpc: 1.04, roas: 6.2 },
    { id: 1003, name: 'Campanha Casa & Jardim', status: 'paused', budget: 2000, spend: 560.80, impressions: 42300, clicks: 680, conversions: 28, ctr: 1.61, cpc: 0.82, roas: 5.1 },
    { id: 1004, name: 'Campanha Games & Consoles', status: 'enabled', budget: 8000, spend: 6120.00, impressions: 210000, clicks: 5040, conversions: 312, ctr: 2.40, cpc: 1.21, roas: 12.3 },
    { id: 1005, name: 'Campanha Beleza & Saúde', status: 'enabled', budget: 4000, spend: 2750.60, impressions: 115000, clicks: 3220, conversions: 198, ctr: 2.80, cpc: 0.85, roas: 9.7 },
    { id: 1006, name: 'Campanha Esportes', status: 'disabled', budget: 1500, spend: 0, impressions: 0, clicks: 0, conversions: 0, ctr: 0, cpc: 0, roas: 0 }
  ]
}

export function getMockAds() {
  const products = [
    'Smartphone Samsung Galaxy S24', 'iPhone 15 Pro Max', 'Notebook Dell Inspiron',
    'Smart TV LG 55"', 'Fone Sony WH-1000XM5', 'Tênis Nike Air Max', 'Vestido Floral Verão',
    'Cafeteira Nespresso', 'PlayStation 5', 'Xbox Series X', 'Kindle Paperwhite',
    'Camera Canon EOS R50', 'Tablet Samsung Tab S9', 'Caixa JBL Charge 5', 'Perfume Importado'
  ]
  return products.map((name, i) => ({
    id: 2000 + i,
    campaign_id: [1001, 1002, 1003, 1004, 1005][i % 5],
    campaign_name: ['Eletrônicos Q1', 'Moda Verão', 'Casa & Jardim', 'Games', 'Beleza'][i % 5],
    title: name,
    status: i % 7 === 0 ? 'paused' : 'enabled',
    sku: `SKU-${10000 + i}`,
    impressions: Math.floor(Math.random() * 40000) + 5000,
    clicks: Math.floor(Math.random() * 900) + 50,
    spend: parseFloat((Math.random() * 800 + 50).toFixed(2)),
    conversions: Math.floor(Math.random() * 60) + 2,
    ctr: parseFloat((Math.random() * 3 + 0.8).toFixed(2)),
    cpc: parseFloat((Math.random() * 2 + 0.5).toFixed(2)),
    roas: parseFloat((Math.random() * 12 + 2).toFixed(1))
  }))
}

export function getMockDailyReport(days = 30) {
  const report = []
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const impressions = Math.floor(Math.random() * 15000) + 3000
    const clicks = Math.floor(impressions * (Math.random() * 0.03 + 0.01))
    const spend = parseFloat((clicks * (Math.random() * 1.5 + 0.5)).toFixed(2))
    const conversions = Math.floor(clicks * (Math.random() * 0.1 + 0.02))
    report.push({
      date: d.toISOString().split('T')[0],
      impressions,
      clicks,
      spend,
      conversions,
      ctr: parseFloat(((clicks / impressions) * 100).toFixed(2)),
      cpc: clicks > 0 ? parseFloat((spend / clicks).toFixed(2)) : 0,
      roas: spend > 0 ? parseFloat(((conversions * 120) / spend).toFixed(1)) : 0
    })
  }
  return report
}
