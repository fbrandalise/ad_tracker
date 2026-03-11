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

// ------------- Items: Performance -------------
export async function getItemVisits(itemId, last = 30, unit = 'day') {
  const res = await mlAxios.get(`/items/${itemId}/visits/time_window`, {
    params: { last, unit }
  })
  return res.data
}

export async function getItemHealth(itemId) {
  const res = await mlAxios.get(`/items/${itemId}/health`)
  return res.data
}

export async function enrichItemsWithPerformance(items, onProgress) {
  const BATCH_SIZE = 10
  const results = []

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE)
    const batchResults = await Promise.allSettled(
      batch.map(async (item) => {
        const [visits, health] = await Promise.allSettled([
          getItemVisits(item.id),
          getItemHealth(item.id)
        ])
        return {
          id: item.id,
          visits_30d: visits.status === 'fulfilled' ? (visits.value?.total_visits ?? 0) : 0,
          health_status: health.status === 'fulfilled' ? (health.value?.status ?? null) : null
        }
      })
    )
    batchResults.forEach(r => {
      if (r.status === 'fulfilled') results.push(r.value)
    })
    onProgress?.(Math.min(i + BATCH_SIZE, items.length), items.length)
  }

  return results
}

// ------------- Items (Listings) -------------
export async function getUserItemIds(userId, offset = 0, limit = 100) {
  const res = await mlAxios.get(`/users/${userId}/items/search`, {
    params: { offset, limit }
  })
  return res.data
}

export async function getItemDetails(ids) {
  const res = await mlAxios.get('/items', {
    params: {
      ids: ids.join(','),
      attributes: 'id,title,price,available_quantity,sold_quantity,status,condition,thumbnail,permalink,currency_id,category_id,listing_type_id'
    }
  })
  return res.data.map(r => r.body).filter(Boolean)
}

export async function getAllUserItems(userId) {
  const pageSize = 100
  const first = await getUserItemIds(userId, 0, pageSize)
  const total = first.paging.total
  const allIds = [...first.results]

  const remaining = total - allIds.length
  if (remaining > 0) {
    const pages = Math.ceil(remaining / pageSize)
    const requests = Array.from({ length: pages }, (_, i) =>
      getUserItemIds(userId, (i + 1) * pageSize, pageSize)
    )
    const results = await Promise.all(requests)
    results.forEach(r => allIds.push(...r.results))
  }

  const batchSize = 20
  const detailBatches = []
  for (let i = 0; i < allIds.length; i += batchSize) {
    detailBatches.push(getItemDetails(allIds.slice(i, i + batchSize)))
  }
  const batches = await Promise.all(detailBatches)
  return batches.flat()
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

export function getMockListings() {
  const items = [
    { title: 'Smartphone Samsung Galaxy S24 128GB', price: 3299.99, condition: 'new', status: 'active', available_quantity: 15, sold_quantity: 42 },
    { title: 'iPhone 15 Pro Max 256GB Preto', price: 7899.00, condition: 'new', status: 'active', available_quantity: 3, sold_quantity: 18 },
    { title: 'Notebook Dell Inspiron 15 i5 8GB', price: 2799.90, condition: 'new', status: 'active', available_quantity: 8, sold_quantity: 27 },
    { title: 'Smart TV LG 55" 4K OLED', price: 4599.00, condition: 'new', status: 'paused', available_quantity: 0, sold_quantity: 11 },
    { title: 'Fone de Ouvido Sony WH-1000XM5', price: 1899.00, condition: 'new', status: 'active', available_quantity: 22, sold_quantity: 65 },
    { title: 'Tênis Nike Air Max 270 Branco', price: 699.90, condition: 'new', status: 'active', available_quantity: 30, sold_quantity: 89 },
    { title: 'Cafeteira Nespresso Vertuo Pop', price: 549.90, condition: 'new', status: 'active', available_quantity: 12, sold_quantity: 34 },
    { title: 'PlayStation 5 Slim Digital', price: 3799.00, condition: 'new', status: 'active', available_quantity: 5, sold_quantity: 23 },
    { title: 'Xbox Series X 1TB', price: 4199.00, condition: 'new', status: 'paused', available_quantity: 2, sold_quantity: 9 },
    { title: 'Kindle Paperwhite 16GB', price: 599.00, condition: 'new', status: 'active', available_quantity: 40, sold_quantity: 120 },
    { title: 'Camera Canon EOS R50 18-45mm', price: 5299.00, condition: 'new', status: 'active', available_quantity: 4, sold_quantity: 7 },
    { title: 'Tablet Samsung Galaxy Tab S9', price: 3099.00, condition: 'new', status: 'closed', available_quantity: 0, sold_quantity: 15 },
    { title: 'Caixa de Som JBL Charge 5', price: 899.00, condition: 'new', status: 'active', available_quantity: 18, sold_quantity: 56 },
    { title: 'Perfume Importado Chanel N°5 100ml', price: 1299.00, condition: 'new', status: 'active', available_quantity: 7, sold_quantity: 31 },
    { title: 'Aspirador Robô iRobot Roomba j7+', price: 3499.00, condition: 'new', status: 'active', available_quantity: 6, sold_quantity: 14 },
    { title: 'Micro-ondas Electrolux 31L MEP41', price: 649.00, condition: 'new', status: 'active', available_quantity: 10, sold_quantity: 28 },
    { title: 'Bicicleta Elétrica Caloi E-Vibe Urban', price: 5999.00, condition: 'used', status: 'active', available_quantity: 1, sold_quantity: 3 },
    { title: 'Monitor LG UltraWide 34" Curvo', price: 2199.00, condition: 'new', status: 'active', available_quantity: 9, sold_quantity: 19 },
    { title: 'Mesa Gamer Rise Mode X40', price: 1299.00, condition: 'new', status: 'paused', available_quantity: 0, sold_quantity: 22 },
    { title: 'Cadeira Gamer DXRacer Craft L', price: 2799.00, condition: 'new', status: 'active', available_quantity: 4, sold_quantity: 11 }
  ]
  const healthOptions = ['good', 'good', 'good', 'moderate', 'moderate', 'bad']
  return items.map((item, i) => {
    const visits = Math.floor(Math.random() * 800) + 30
    return {
      id: `MLB${900000000 + i}`,
      ...item,
      currency_id: 'BRL',
      thumbnail: `https://via.placeholder.com/60x60/3483FA/FFFFFF?text=${encodeURIComponent(item.title.charAt(0))}`,
      permalink: `https://www.mercadolivre.com.br/p/MLB${900000000 + i}`,
      visits_30d: item.status === 'closed' ? 0 : visits,
      health_status: item.status === 'active' ? healthOptions[i % healthOptions.length] : null
    }
  })
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
