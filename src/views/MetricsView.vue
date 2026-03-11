<template>
  <div class="metrics-page">

    <!-- ───────────────── FILTER BAR ───────────────── -->
    <div class="filter-bar">
      <div class="filter-group">
        <label class="filter-label">Período</label>
        <div class="period-tabs">
          <button
            v-for="p in periodOptions"
            :key="p.value"
            class="period-btn"
            :class="{ 'period-btn--active': period === p.value && !customActive }"
            @click="setPeriod(p.value)"
          >{{ p.label }}</button>
          <button
            class="period-btn"
            :class="{ 'period-btn--active': customActive }"
            @click="showCustomPicker = !showCustomPicker"
          >Personalizado</button>
          <DatePicker
            v-if="showCustomPicker"
            v-model="customRange"
            selectionMode="range"
            dateFormat="dd/mm/yy"
            placeholder="Selecionar datas"
            showIcon
            class="custom-date-picker"
            @update:model-value="onCustomRange"
          />
        </div>
      </div>

      <div class="filter-row">
        <div class="filter-group">
          <label class="filter-label">Categoria</label>
          <Select
            v-model="filterCategory"
            :options="categoryOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Todas"
            class="filter-select"
          />
        </div>
        <div class="filter-group">
          <label class="filter-label">Status</label>
          <Select
            v-model="filterStatus"
            :options="statusOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Todos"
            class="filter-select"
          />
        </div>
        <div class="filter-group filter-group--search">
          <label class="filter-label">Produto / Anúncio</label>
          <InputText
            v-model="filterProduct"
            placeholder="Buscar produto..."
            class="filter-input"
          />
        </div>
        <div class="filter-actions">
          <Button
            label="Atualizar métricas"
            icon="pi pi-refresh"
            :loading="loading"
            @click="loadMetrics"
          />
        </div>
      </div>
    </div>

    <!-- Loading overlay -->
    <div v-if="loading && !hasData" class="loading-state">
      <i class="pi pi-spin pi-spinner" style="font-size:2rem;color:#3483FA" />
      <p>Carregando métricas...</p>
    </div>

    <template v-else>

      <!-- ───────────────── KPI CARDS ───────────────── -->
      <div class="kpi-grid">
        <div v-for="kpi in kpiCards" :key="kpi.key" class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-label">{{ kpi.label }}</span>
            <div class="kpi-icon" :style="{ background: kpi.iconBg }">
              <i :class="kpi.icon" :style="{ color: kpi.iconColor }" />
            </div>
          </div>
          <div class="kpi-value">{{ formatKpi(kpi.value, kpi.format) }}</div>
          <div class="kpi-footer" v-if="kpi.change !== null">
            <span class="kpi-change" :class="kpi.change >= 0 ? 'change-up' : 'change-down'">
              <i :class="kpi.change >= 0 ? 'pi pi-arrow-up' : 'pi pi-arrow-down'" />
              {{ Math.abs(kpi.change) }}%
            </span>
            <span class="kpi-period">vs período anterior</span>
          </div>
          <div class="kpi-footer" v-else>
            <span class="kpi-source">{{ kpi.source }}</span>
          </div>
        </div>
      </div>

      <!-- ───────────────── PERFORMANCE CHART ───────────────── -->
      <div class="section-card">
        <div class="section-header">
          <div>
            <h3 class="section-title">Desempenho de Anúncios (diário)</h3>
            <span class="section-subtitle">
              Fonte: Relatório de Campanhas ML
              <span v-if="isDemo" class="demo-badge">Demo</span>
            </span>
          </div>
          <div class="chart-controls">
            <div class="metric-toggles">
              <button
                v-for="m in chartMetrics"
                :key="m.key"
                class="metric-toggle"
                :class="{ 'metric-toggle--active': selectedMetrics.includes(m.key) }"
                :style="selectedMetrics.includes(m.key) ? { borderColor: m.color, color: m.color, background: m.color + '15' } : {}"
                @click="toggleMetric(m.key)"
              >
                <span class="toggle-dot" :style="{ background: m.color }" />
                {{ m.label }}
              </button>
            </div>
          </div>
        </div>
        <div class="chart-wrap">
          <canvas ref="perfChartRef" />
        </div>
      </div>

      <!-- ───────────────── LISTINGS TABLE ───────────────── -->
      <div class="section-card">
        <div class="section-header">
          <div>
            <h3 class="section-title">Análise de Anúncios</h3>
            <span class="section-subtitle">
              {{ filteredSortedListings.length }} anúncio{{ filteredSortedListings.length !== 1 ? 's' : '' }} encontrado{{ filteredSortedListings.length !== 1 ? 's' : '' }}
              <span v-if="isDemo" class="demo-badge">Demo</span>
            </span>
          </div>
          <div class="table-controls">
            <InputText v-model="listingSearch" placeholder="Buscar anúncio..." class="search-input" />
          </div>
        </div>

        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th
                  v-for="col in listingCols"
                  :key="col.key"
                  class="th-sortable"
                  :class="{ 'th-sorted': sortKey === col.key }"
                  @click="setSort(col.key)"
                >
                  {{ col.label }}
                  <i
                    class="sort-icon"
                    :class="sortKey === col.key
                      ? (sortDir === 'asc' ? 'pi pi-sort-up-fill' : 'pi pi-sort-down-fill')
                      : 'pi pi-sort'"
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in paginatedListings" :key="row.id" class="data-row">
                <td>
                  <div class="product-cell">
                    <img
                      v-if="row.thumbnail"
                      :src="row.thumbnail"
                      class="product-thumb-img"
                      :alt="row.title"
                    />
                    <div v-else class="product-thumb" :style="{ background: row.thumbBg }">
                      <i class="pi pi-shopping-bag" :style="{ color: row.thumbColor }" />
                    </div>
                    <div class="product-info">
                      <a :href="row.permalink" target="_blank" class="product-name" :title="row.title">
                        {{ row.title }}
                      </a>
                      <span class="product-sku">{{ row.id }}</span>
                    </div>
                  </div>
                </td>
                <td class="td-num">{{ row.visits_30d != null ? fmtNum(row.visits_30d) : '—' }}</td>
                <td class="td-num">{{ fmtNum(row.sold_quantity) }}</td>
                <td>
                  <div class="conv-cell">
                    <div class="conv-bar-wrap">
                      <div
                        class="conv-bar"
                        :style="{ width: Math.min(row.convRate, 100) + '%', background: convColor(row.convRate) }"
                      />
                    </div>
                    <span class="conv-label" :style="{ color: convColor(row.convRate) }">
                      {{ row.convRate.toFixed(1) }}%
                    </span>
                  </div>
                </td>
                <td class="td-num td-revenue">{{ fmtCurrency(row.revenue) }}</td>
                <td>
                  <div class="status-cell">
                    <span class="badge" :class="statusBadgeClass(row.status)">{{ statusLabel(row.status) }}</span>
                    <span v-if="row.health_status" class="health-dot" :class="`health-${row.health_status}`" :title="'Saúde: ' + row.health_status" />
                  </div>
                </td>
              </tr>
              <tr v-if="paginatedListings.length === 0 && !loading">
                <td colspan="6" class="td-empty">Nenhum resultado encontrado.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="pagination" v-if="totalPages > 1">
          <span class="pagination-info">
            Exibindo {{ paginationStart }}–{{ paginationEnd }} de {{ filteredSortedListings.length }} anúncios
          </span>
          <div class="pagination-btns">
            <button class="page-btn" :disabled="currentPage === 1" @click="currentPage--">
              <i class="pi pi-chevron-left" />
            </button>
            <button
              v-for="pg in visiblePages"
              :key="pg"
              class="page-btn"
              :class="{ 'page-btn--active': pg === currentPage }"
              @click="currentPage = pg"
            >{{ pg }}</button>
            <button class="page-btn" :disabled="currentPage === totalPages" @click="currentPage++">
              <i class="pi pi-chevron-right" />
            </button>
          </div>
        </div>
      </div>

      <!-- ───────────────── SERVICE METRICS ───────────────── -->
      <div class="section-card">
        <div class="section-header">
          <div>
            <h3 class="section-title">Métricas de Atendimento</h3>
            <span class="section-subtitle">
              Baseado na saúde dos anúncios ativos
              <span v-if="isDemo" class="demo-badge">Demo</span>
            </span>
          </div>
        </div>
        <div class="service-grid">
          <div
            v-for="sm in serviceMetrics"
            :key="sm.key"
            class="service-card"
            :class="`service-card--${sm.status}`"
          >
            <div class="service-header">
              <div class="service-icon-wrap" :class="`service-icon--${sm.status}`">
                <i :class="sm.icon" />
              </div>
              <div class="service-status-badge" :class="`status-badge--${sm.status}`">
                <i :class="sm.status === 'good' ? 'pi pi-check-circle' : sm.status === 'warning' ? 'pi pi-exclamation-circle' : 'pi pi-times-circle'" />
                {{ sm.status === 'good' ? 'Bom' : sm.status === 'warning' ? 'Atenção' : 'Crítico' }}
              </div>
            </div>
            <div class="service-value">{{ sm.value }}</div>
            <div class="service-label">{{ sm.label }}</div>
            <div class="service-target">
              Meta: {{ sm.target }}
              <span class="service-delta" :class="sm.deltaOk ? 'delta-ok' : 'delta-bad'">
                {{ sm.delta }}
              </span>
            </div>
            <div class="service-bar-wrap">
              <div
                class="service-bar"
                :class="`service-bar--${sm.status}`"
                :style="{ width: sm.pct + '%' }"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- ───────────────── AUTO INSIGHTS ───────────────── -->
      <div class="section-card">
        <div class="section-header">
          <h3 class="section-title">
            <i class="pi pi-bolt insight-icon" />
            Insights Automáticos
          </h3>
          <span class="section-subtitle">Gerado com base nos seus dados reais</span>
        </div>
        <div class="insights-grid">
          <div
            v-for="insight in insights"
            :key="insight.id"
            class="insight-card"
            :class="`insight-card--${insight.type}`"
          >
            <div class="insight-header">
              <div class="insight-icon-wrap" :class="`insight-icon--${insight.type}`">
                <i :class="insight.icon" />
              </div>
              <span class="insight-badge" :class="`insight-badge--${insight.type}`">{{ insight.tag }}</span>
            </div>
            <p class="insight-text">{{ insight.text }}</p>
            <div class="insight-action" v-if="insight.action">
              <a href="#" class="insight-link" @click.prevent>{{ insight.action }} →</a>
            </div>
          </div>
        </div>
      </div>

    </template>

    <!-- Last updated -->
    <div class="last-updated">
      <i class="pi pi-clock" />
      Última atualização: {{ lastUpdated }}
      <button class="refresh-link" @click="loadMetrics">Atualizar agora</button>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick, onUnmounted } from 'vue'
import { Chart, registerables } from 'chart.js'
import DatePicker from 'primevue/datepicker'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import { useAuthStore } from '@/stores/auth'
import {
  getAllUserItems,
  enrichItemsWithPerformance,
  getCampaignsDailyReport,
  getMockListings,
  getMockDailyReport,
} from '@/services/mlApi'

Chart.register(...registerables)

const authStore = useAuthStore()
const isDemo = computed(() => authStore.accessToken === 'DEMO_MODE')

// ─── State ───────────────────────────────────────────────
const loading = ref(false)
const hasData = ref(false)
const period = ref('30d')
const customActive = ref(false)
const showCustomPicker = ref(false)
const customRange = ref(null)
const dateFrom = ref(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
const dateTo = ref(new Date())
const filterCategory = ref(null)
const filterStatus = ref(null)
const filterProduct = ref('')
const lastUpdated = ref('')
const perfChartRef = ref(null)
let perfChart = null
let autoRefreshTimer = null

// Raw data from API
const rawListings = ref([])
const dailyReport = ref([])

// Table state
const listingSearch = ref('')
const sortKey = ref('revenue')
const sortDir = ref('desc')
const currentPage = ref(1)
const pageSize = 8

// Chart
const selectedMetrics = ref(['spend', 'clicks'])

// ─── Options ─────────────────────────────────────────────
const periodOptions = [
  { label: 'Hoje', value: 'today' },
  { label: '7 dias', value: '7d' },
  { label: '30 dias', value: '30d' },
]

const categoryOptions = [
  { label: 'Todas', value: null },
  { label: 'Eletrônicos', value: 'electronics' },
  { label: 'Moda', value: 'fashion' },
  { label: 'Casa e Jardim', value: 'home' },
  { label: 'Esportes', value: 'sports' },
  { label: 'Beleza', value: 'beauty' },
]

const statusOptions = [
  { label: 'Todos', value: null },
  { label: 'Ativo', value: 'active' },
  { label: 'Pausado', value: 'paused' },
  { label: 'Fechado', value: 'closed' },
]

const listingCols = [
  { key: 'title', label: 'Produto' },
  { key: 'visits_30d', label: 'Visitas' },
  { key: 'sold_quantity', label: 'Vendas' },
  { key: 'convRate', label: 'Conversão' },
  { key: 'revenue', label: 'Receita' },
  { key: 'status', label: 'Status' },
]

// Chart metrics mapped to campaign daily report fields
const chartMetrics = [
  { key: 'spend', label: 'Gasto em Anúncios', color: '#3483FA' },
  { key: 'clicks', label: 'Cliques', color: '#22c55e' },
  { key: 'impressions', label: 'Impressões (÷100)', color: '#f59e0b' },
  { key: 'conversions', label: 'Conversões', color: '#9333ea' },
]

// ─── Computed ─────────────────────────────────────────────

// Enrich listings with computed fields
const enrichedListings = computed(() =>
  rawListings.value.map(item => ({
    ...item,
    revenue: (item.price || 0) * (item.sold_quantity || 0),
    convRate: item.visits_30d > 0
      ? Math.min(((item.sold_quantity || 0) / item.visits_30d) * 100, 100)
      : 0,
    thumbBg: '#eff6ff',
    thumbColor: '#3483FA',
  }))
)

const filteredSortedListings = computed(() => {
  let list = enrichedListings.value

  const q = listingSearch.value.toLowerCase().trim()
  if (q) list = list.filter(l => l.title?.toLowerCase().includes(q) || l.id?.toString().includes(q))

  if (filterProduct.value) {
    const p = filterProduct.value.toLowerCase()
    list = list.filter(l => l.title?.toLowerCase().includes(p))
  }

  if (filterStatus.value) list = list.filter(l => l.status === filterStatus.value)

  list = [...list].sort((a, b) => {
    const av = a[sortKey.value] ?? 0
    const bv = b[sortKey.value] ?? 0
    if (typeof av === 'string') return sortDir.value === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    return sortDir.value === 'asc' ? av - bv : bv - av
  })
  return list
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredSortedListings.value.length / pageSize)))
const paginationStart = computed(() => Math.min((currentPage.value - 1) * pageSize + 1, filteredSortedListings.value.length || 1))
const paginationEnd = computed(() => Math.min(currentPage.value * pageSize, filteredSortedListings.value.length))

const visiblePages = computed(() => {
  const total = totalPages.value
  const cur = currentPage.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = new Set([1, total, cur, cur - 1, cur + 1].filter(p => p >= 1 && p <= total))
  return [...pages].sort((a, b) => a - b)
})

const paginatedListings = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredSortedListings.value.slice(start, start + pageSize)
})

// KPI cards derived from real data
const kpiCards = computed(() => {
  const items = enrichedListings.value
  const report = dailyReport.value

  const totalRevenue = items.reduce((s, i) => s + i.revenue, 0)
  const totalUnits = items.reduce((s, i) => s + (i.sold_quantity || 0), 0)
  const totalVisits = items.reduce((s, i) => s + (i.visits_30d || 0), 0)
  const avgTicket = totalUnits > 0 ? totalRevenue / totalUnits : 0

  const totalSpend = report.reduce((s, d) => s + (d.spend || 0), 0)
  const totalClicks = report.reduce((s, d) => s + (d.clicks || 0), 0)
  const totalConversions = report.reduce((s, d) => s + (d.conversions || 0), 0)
  const convRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0

  return [
    {
      key: 'revenue', label: 'Receita Total', value: totalRevenue, format: 'currency',
      icon: 'pi pi-dollar', iconBg: '#eff6ff', iconColor: '#3483FA',
      change: null, source: 'preço × qtd vendida'
    },
    {
      key: 'units', label: 'Unidades Vendidas', value: totalUnits, format: 'number',
      icon: 'pi pi-box', iconBg: '#fdf4ff', iconColor: '#9333ea',
      change: null, source: 'total sold_quantity'
    },
    {
      key: 'ticket', label: 'Ticket Médio', value: avgTicket, format: 'currency',
      icon: 'pi pi-tag', iconBg: '#fff7ed', iconColor: '#ea580c',
      change: null, source: 'receita ÷ unidades'
    },
    {
      key: 'visits', label: 'Visitas (30d)', value: totalVisits, format: 'number',
      icon: 'pi pi-eye', iconBg: '#f0fdf4', iconColor: '#16a34a',
      change: null, source: 'visitas por anúncio'
    },
    {
      key: 'spend', label: 'Gasto em Anúncios', value: totalSpend, format: 'currency',
      icon: 'pi pi-wallet', iconBg: '#fef9c3', iconColor: '#ca8a04',
      change: null, source: 'relatório de campanhas'
    },
    {
      key: 'clicks', label: 'Cliques em Anúncios', value: totalClicks, format: 'number',
      icon: 'pi pi-cursor', iconBg: '#eff6ff', iconColor: '#3483FA',
      change: null, source: 'relatório de campanhas'
    },
    {
      key: 'convRate', label: 'Conversão (Anúncios)', value: convRate, format: 'percent',
      icon: 'pi pi-percentage', iconBg: '#fdf4ff', iconColor: '#9333ea',
      change: null, source: 'conversões ÷ cliques'
    },
  ]
})

// Service metrics based on item health from API
const serviceMetrics = computed(() => {
  const items = enrichedListings.value
  const active = items.filter(i => i.status === 'active')
  const total = active.length || 1

  const good = active.filter(i => i.health_status === 'good').length
  const moderate = active.filter(i => i.health_status === 'moderate').length
  const bad = active.filter(i => i.health_status === 'bad' || i.health_status === 'very_bad').length
  const noStock = active.filter(i => (i.available_quantity || 0) === 0).length
  const paused = items.filter(i => i.status === 'paused').length

  const goodPct = Math.round((good / total) * 100)
  const badPct = Math.round((bad / total) * 100)

  return [
    {
      key: 'health_good', label: 'Anúncios com saúde boa', value: `${good} / ${total}`,
      target: '100%', delta: `${goodPct}% dos ativos`, deltaOk: goodPct >= 70,
      status: goodPct >= 70 ? 'good' : goodPct >= 40 ? 'warning' : 'critical',
      icon: 'pi pi-heart', pct: goodPct
    },
    {
      key: 'health_bad', label: 'Anúncios com saúde ruim', value: String(bad),
      target: '0', delta: bad > 0 ? `${badPct}% dos ativos` : 'Nenhum problema',
      deltaOk: bad === 0,
      status: bad === 0 ? 'good' : bad <= 2 ? 'warning' : 'critical',
      icon: 'pi pi-exclamation-triangle', pct: Math.min(badPct * 2, 100)
    },
    {
      key: 'nostock', label: 'Ativos sem estoque', value: String(noStock),
      target: '0', delta: noStock > 0 ? `${noStock} anúncio(s)` : 'Tudo em estoque',
      deltaOk: noStock === 0,
      status: noStock === 0 ? 'good' : noStock <= 3 ? 'warning' : 'critical',
      icon: 'pi pi-box', pct: Math.min((noStock / total) * 200, 100)
    },
    {
      key: 'paused', label: 'Anúncios pausados', value: String(paused),
      target: '0', delta: paused > 0 ? `${paused} pausado(s)` : 'Nenhum pausado',
      deltaOk: paused === 0,
      status: paused === 0 ? 'good' : paused <= 3 ? 'warning' : 'critical',
      icon: 'pi pi-pause', pct: Math.min((paused / (items.length || 1)) * 200, 100)
    },
  ]
})

// Insights generated from real data
const insights = computed(() => {
  const list = []
  const items = enrichedListings.value
  const report = dailyReport.value

  // High visits, low conversion
  const highVisitLowConv = [...items]
    .filter(i => i.visits_30d > 100 && i.convRate < 2 && i.status === 'active')
    .sort((a, b) => b.visits_30d - a.visits_30d)[0]

  if (highVisitLowConv) {
    list.push({
      id: 1, type: 'warning', tag: 'Oportunidade', icon: 'pi pi-chart-line',
      text: `"${truncate(highVisitLowConv.title, 50)}" recebeu ${fmtNum(highVisitLowConv.visits_30d)} visitas mas apenas ${highVisitLowConv.convRate.toFixed(1)}% de conversão. Considere revisar preço ou fotos.`,
      action: 'Ver anúncio'
    })
  }

  // Top revenue product
  const topRevenue = [...items].sort((a, b) => b.revenue - a.revenue)[0]
  if (topRevenue && topRevenue.revenue > 0) {
    list.push({
      id: 2, type: 'success', tag: 'Destaque', icon: 'pi pi-trophy',
      text: `Seu produto mais rentável é "${truncate(topRevenue.title, 50)}" com ${fmtCurrency(topRevenue.revenue)} em receita. ${topRevenue.available_quantity === 0 ? '⚠️ Atenção: estoque zerado!' : ''}`,
      action: null
    })
  }

  // High conversion rate
  const highConv = [...items].filter(i => i.convRate > 8 && i.sold_quantity > 5)[0]
  if (highConv) {
    list.push({
      id: 3, type: 'info', tag: 'Dica', icon: 'pi pi-lightbulb',
      text: `"${truncate(highConv.title, 50)}" tem conversão de ${highConv.convRate.toFixed(1)}% — acima da média do mercado (3–5%). Use-o como referência para otimizar outros anúncios.`,
      action: 'Ver anúncio'
    })
  }

  // Items with zero stock
  const zeroStock = items.filter(i => i.status === 'active' && (i.available_quantity || 0) === 0)
  if (zeroStock.length > 0) {
    list.push({
      id: 4, type: 'critical', tag: 'Estoque', icon: 'pi pi-box',
      text: `${zeroStock.length} anúncio(s) ativo(s) sem estoque: "${truncate(zeroStock[0].title, 40)}"${zeroStock.length > 1 ? ` e mais ${zeroStock.length - 1}` : ''}. Atualize o estoque para não perder vendas.`,
      action: 'Ver anúncios'
    })
  }

  // Ad spend insight from report
  if (report.length > 0) {
    const totalSpend = report.reduce((s, d) => s + (d.spend || 0), 0)
    const totalConv = report.reduce((s, d) => s + (d.conversions || 0), 0)
    const cpa = totalConv > 0 ? totalSpend / totalConv : 0
    if (cpa > 0) {
      list.push({
        id: 5, type: 'info', tag: 'Anúncios', icon: 'pi pi-megaphone',
        text: `No período, você gastou ${fmtCurrency(totalSpend)} em anúncios e obteve ${fmtNum(totalConv)} conversões. Custo por conversão: ${fmtCurrency(cpa)}.`,
        action: null
      })
    }
  }

  // Items with bad health
  const badHealth = items.filter(i => i.health_status === 'bad' || i.health_status === 'very_bad')
  if (badHealth.length > 0) {
    list.push({
      id: 6, type: 'warning', tag: 'Atenção', icon: 'pi pi-heart',
      text: `${badHealth.length} anúncio(s) com saúde ruim na plataforma. Anúncios com baixa qualidade têm menor alcance. Verifique os critérios de qualidade do ML.`,
      action: 'Ver anúncios'
    })
  }

  // Fallback if no real insights could be generated
  if (list.length === 0) {
    list.push({
      id: 99, type: 'info', tag: 'Info', icon: 'pi pi-info-circle',
      text: 'Nenhum insight disponível para o período selecionado. Tente ampliar o período de análise.',
      action: null
    })
  }

  return list
})

// ─── Methods ──────────────────────────────────────────────
function formatKpi(value, format) {
  if (format === 'currency') return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value)
  if (format === 'percent') return `${Number(value).toFixed(1)}%`
  return new Intl.NumberFormat('pt-BR').format(Math.round(value))
}

function fmtCurrency(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
}

function fmtNum(v) {
  return new Intl.NumberFormat('pt-BR').format(v ?? 0)
}

function truncate(str, n) {
  return str && str.length > n ? str.slice(0, n) + '…' : (str || '')
}

function toDateStr(d) {
  return d.toISOString().split('T')[0]
}

function setPeriod(v) {
  period.value = v
  customActive.value = false
  showCustomPicker.value = false
  const now = new Date()
  dateTo.value = now
  if (v === 'today') {
    dateFrom.value = new Date(now.toDateString())
  } else if (v === '7d') {
    dateFrom.value = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  } else {
    dateFrom.value = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  }
  loadMetrics()
}

function onCustomRange(val) {
  if (val && val[0] && val[1]) {
    customActive.value = true
    showCustomPicker.value = false
    dateFrom.value = val[0]
    dateTo.value = val[1]
    loadMetrics()
  }
}

function toggleMetric(key) {
  const idx = selectedMetrics.value.indexOf(key)
  if (idx >= 0) {
    if (selectedMetrics.value.length > 1) selectedMetrics.value.splice(idx, 1)
  } else {
    if (selectedMetrics.value.length < 4) selectedMetrics.value.push(key)
  }
  nextTick(renderPerfChart)
}

function setSort(key) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'desc'
  }
  currentPage.value = 1
}

function convColor(rate) {
  if (rate >= 8) return '#16a34a'
  if (rate >= 3) return '#ca8a04'
  return '#dc2626'
}

function statusBadgeClass(s) {
  const map = { active: 'badge--active', paused: 'badge--paused', closed: 'badge--inactive', inactive: 'badge--inactive' }
  return map[s] || 'badge--inactive'
}

function statusLabel(s) {
  const map = { active: 'Ativo', paused: 'Pausado', closed: 'Fechado', inactive: 'Inativo' }
  return map[s] || s
}

function updateLastUpdated() {
  lastUpdated.value = new Date().toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

async function loadMetrics() {
  loading.value = true
  try {
    if (isDemo.value) {
      // ─── DEMO MODE: use mock data ───
      const mockItems = getMockListings()
      rawListings.value = mockItems.map(item => ({
        ...item,
        visits_30d: item.visits_30d ?? 0,
      }))
      dailyReport.value = getMockDailyReport(periodDays.value)
    } else {
      // ─── REAL MODE: call ML API ───
      const [itemsResult, reportResult] = await Promise.allSettled([
        loadRealItems(),
        getCampaignsDailyReport(
          authStore.userId,
          toDateStr(dateFrom.value),
          toDateStr(dateTo.value)
        )
      ])

      if (itemsResult.status === 'fulfilled') {
        rawListings.value = itemsResult.value
      } else {
        console.error('Falha ao carregar itens:', itemsResult.reason)
      }

      if (reportResult.status === 'fulfilled') {
        dailyReport.value = Array.isArray(reportResult.value) ? reportResult.value : []
      } else {
        console.error('Falha ao carregar relatório:', reportResult.reason)
        dailyReport.value = []
      }
    }

    hasData.value = true
    updateLastUpdated()
    await nextTick()
    renderPerfChart()
  } finally {
    loading.value = false
  }
}

async function loadRealItems() {
  const items = await getAllUserItems(authStore.userId)
  // Enrich with visits and health in batches
  const perf = await enrichItemsWithPerformance(items)
  const perfMap = Object.fromEntries(perf.map(p => [p.id, p]))
  return items.map(item => ({
    ...item,
    visits_30d: perfMap[item.id]?.visits_30d ?? 0,
    health_status: perfMap[item.id]?.health_status ?? null,
  }))
}

const periodDays = computed(() => {
  if (period.value === 'today') return 1
  if (period.value === '7d') return 7
  if (customActive.value) {
    return Math.max(1, Math.ceil((dateTo.value - dateFrom.value) / (1000 * 60 * 60 * 24)) + 1)
  }
  return 30
})

function renderPerfChart() {
  if (!perfChartRef.value || !dailyReport.value.length) return

  const data = dailyReport.value

  const labels = data.map(d => {
    const [, m, day] = d.date.split('-')
    return `${day}/${m}`
  })

  const datasets = selectedMetrics.value.map(key => {
    const meta = chartMetrics.find(m => m.key === key)
    const values = data.map(d => {
      // Scale down impressions so it's comparable on the same axis
      if (key === 'impressions') return Math.round((d[key] || 0) / 100)
      return d[key] || 0
    })
    return {
      label: meta.label,
      data: values,
      borderColor: meta.color,
      backgroundColor: meta.color + '18',
      borderWidth: 2,
      pointRadius: data.length <= 7 ? 4 : 2,
      pointHoverRadius: 6,
      fill: selectedMetrics.value.length === 1,
      tension: 0.4,
    }
  })

  if (perfChart) perfChart.destroy()

  perfChart = new Chart(perfChartRef.value, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1e293b',
          titleColor: '#94a3b8',
          bodyColor: '#fff',
          padding: 12,
          callbacks: {
            label: (ctx) => {
              const key = selectedMetrics.value[ctx.datasetIndex]
              const v = key === 'impressions' ? ctx.raw * 100 : ctx.raw
              if (key === 'spend') return ` ${ctx.dataset.label}: ${fmtCurrency(v)}`
              if (key === 'impressions') return ` Impressões: ${fmtNum(v)}`
              return ` ${ctx.dataset.label}: ${fmtNum(v)}`
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { size: 11 }, color: '#94a3b8', maxTicksLimit: 10 }
        },
        y: {
          grid: { color: '#f1f5f9' },
          ticks: {
            font: { size: 11 }, color: '#94a3b8',
            callback: v => {
              if (selectedMetrics.value.includes('spend') && selectedMetrics.value.length === 1) {
                return `R$ ${v.toLocaleString('pt-BR')}`
              }
              return v.toLocaleString('pt-BR')
            }
          }
        }
      }
    }
  })
}

// ─── Watchers ─────────────────────────────────────────────
watch(listingSearch, () => { currentPage.value = 1 })
watch(filterStatus, () => { currentPage.value = 1 })
watch(filterProduct, () => { currentPage.value = 1 })

// ─── Lifecycle ────────────────────────────────────────────
onMounted(async () => {
  await loadMetrics()
  autoRefreshTimer = setInterval(loadMetrics, 5 * 60 * 1000)
})

onUnmounted(() => {
  if (autoRefreshTimer) clearInterval(autoRefreshTimer)
  if (perfChart) perfChart.destroy()
})
</script>

<style scoped>
.metrics-page {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* ── Filter Bar ── */
.filter-bar {
  background: white;
  border-radius: 12px;
  padding: 1rem 1.25rem;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.filter-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: block;
  margin-bottom: 0.35rem;
}

.period-tabs {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.period-btn {
  padding: 0.35rem 0.875rem;
  border-radius: 20px;
  border: 1.5px solid #e2e8f0;
  background: white;
  color: #475569;
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.period-btn:hover { border-color: #3483FA; color: #3483FA; }
.period-btn--active { background: #3483FA; border-color: #3483FA; color: white; }

.custom-date-picker { max-width: 220px; }

.filter-row {
  display: flex;
  align-items: flex-end;
  gap: 1rem;
  flex-wrap: wrap;
}

.filter-group { display: flex; flex-direction: column; }
.filter-group--search { flex: 1; min-width: 200px; }
.filter-select, .filter-input { width: 160px; }
.filter-group--search .filter-input { width: 100%; }
.filter-actions { margin-left: auto; }

/* ── Loading ── */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  gap: 1rem;
  color: #94a3b8;
  font-size: 0.9rem;
}

/* ── KPI Grid ── */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(175px, 1fr));
  gap: 1rem;
}

.kpi-card {
  background: white;
  border-radius: 12px;
  padding: 1.25rem;
  border: 1px solid #e2e8f0;
  transition: box-shadow 0.2s, transform 0.2s;
}

.kpi-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
  transform: translateY(-2px);
}

.kpi-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.kpi-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  line-height: 1.3;
  max-width: 110px;
}

.kpi-icon {
  width: 36px; height: 36px;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.kpi-icon i { font-size: 0.95rem; }

.kpi-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.2;
  margin-bottom: 0.5rem;
}

.kpi-footer {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.78rem;
}

.kpi-change { display: flex; align-items: center; gap: 0.2rem; font-weight: 600; }
.kpi-change i { font-size: 0.7rem; }
.change-up { color: #16a34a; }
.change-down { color: #dc2626; }
.kpi-period { color: #94a3b8; }
.kpi-source { color: #94a3b8; font-style: italic; font-size: 0.72rem; }

/* ── Section Card ── */
.section-card {
  background: white;
  border-radius: 12px;
  padding: 1.25rem;
  border: 1px solid #e2e8f0;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.section-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.section-subtitle { font-size: 0.8rem; color: #94a3b8; display: block; margin-top: 2px; }

.demo-badge {
  background: #fef9c3;
  color: #ca8a04;
  font-size: 0.68rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 10px;
  margin-left: 4px;
}

.insight-icon { color: #f59e0b; }

/* ── Chart ── */
.chart-controls { display: flex; gap: 0.5rem; }
.metric-toggles { display: flex; gap: 0.4rem; flex-wrap: wrap; }

.metric-toggle {
  display: flex; align-items: center; gap: 0.35rem;
  padding: 0.3rem 0.75rem;
  border-radius: 20px;
  border: 1.5px solid #e2e8f0;
  background: white; color: #64748b;
  font-size: 0.8rem; font-weight: 500;
  cursor: pointer; transition: all 0.15s;
}
.metric-toggle:hover { border-color: #94a3b8; }

.toggle-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

.chart-wrap { position: relative; height: 280px; }

/* ── Table ── */
.table-controls { display: flex; gap: 0.5rem; }
.search-input { width: 220px; }
.table-wrap { overflow-x: auto; }

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}
.data-table thead { background: #f8fafc; }

.th-sortable {
  padding: 0.75rem 1rem;
  text-align: left;
  font-size: 0.75rem; font-weight: 700; color: #64748b;
  text-transform: uppercase; letter-spacing: 0.04em;
  cursor: pointer; white-space: nowrap;
  border-bottom: 2px solid #e2e8f0;
  transition: color 0.15s; user-select: none;
}
.th-sortable:hover { color: #1e293b; }
.th-sorted { color: #3483FA; }
.sort-icon { font-size: 0.7rem; margin-left: 0.3rem; opacity: 0.6; }

.data-row { border-bottom: 1px solid #f1f5f9; transition: background 0.15s; }
.data-row:hover { background: #f8fafc; }
.data-row td { padding: 0.75rem 1rem; color: #334155; }

.product-cell { display: flex; align-items: center; gap: 0.75rem; }

.product-thumb-img {
  width: 38px; height: 38px;
  border-radius: 6px; object-fit: cover;
  border: 1px solid #e2e8f0; flex-shrink: 0;
}

.product-thumb {
  width: 38px; height: 38px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.product-thumb i { font-size: 1rem; }

.product-info { display: flex; flex-direction: column; gap: 0.1rem; overflow: hidden; }

.product-name {
  font-weight: 600; color: #1e293b; font-size: 0.875rem;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  max-width: 240px; text-decoration: none;
}
.product-name:hover { color: #3483FA; text-decoration: underline; }
.product-sku { font-size: 0.72rem; color: #94a3b8; }

.td-num { text-align: right; font-variant-numeric: tabular-nums; }
.td-revenue { font-weight: 700; color: #3483FA !important; }

.conv-cell { display: flex; align-items: center; gap: 0.5rem; min-width: 110px; }
.conv-bar-wrap { flex: 1; height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden; }
.conv-bar { height: 100%; border-radius: 3px; transition: width 0.5s; }
.conv-label { font-size: 0.8rem; font-weight: 700; min-width: 36px; text-align: right; }

.status-cell { display: flex; align-items: center; gap: 0.4rem; }

.badge {
  padding: 2px 8px; border-radius: 12px;
  font-size: 0.72rem; font-weight: 600; white-space: nowrap;
}
.badge--active { background: #dcfce7; color: #16a34a; }
.badge--paused { background: #fef9c3; color: #ca8a04; }
.badge--inactive { background: #fee2e2; color: #dc2626; }

.health-dot {
  width: 8px; height: 8px; border-radius: 50%;
}
.health-good { background: #22c55e; }
.health-moderate { background: #f59e0b; }
.health-bad, .health-very_bad { background: #ef4444; }

.td-empty { text-align: center; color: #94a3b8; padding: 2rem !important; font-style: italic; }

/* ── Pagination ── */
.pagination {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: 1rem; flex-wrap: wrap; gap: 0.5rem;
}
.pagination-info { font-size: 0.8rem; color: #94a3b8; }
.pagination-btns { display: flex; gap: 0.25rem; }

.page-btn {
  min-width: 32px; height: 32px;
  border-radius: 6px; border: 1px solid #e2e8f0;
  background: white; color: #475569;
  font-size: 0.82rem; font-weight: 500;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all 0.15s; padding: 0 0.5rem;
}
.page-btn:hover:not(:disabled) { border-color: #3483FA; color: #3483FA; }
.page-btn--active { background: #3483FA; border-color: #3483FA; color: white; }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* ── Service Metrics ── */
.service-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; }

.service-card { border-radius: 10px; padding: 1.25rem; border: 1.5px solid #e2e8f0; background: #fafbfc; }
.service-card--good { border-color: #bbf7d0; background: #f0fdf4; }
.service-card--warning { border-color: #fde68a; background: #fffbeb; }
.service-card--critical { border-color: #fecaca; background: #fff5f5; }

.service-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.875rem; }

.service-icon-wrap { width: 38px; height: 38px; border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 1rem; }
.service-icon--good { background: #dcfce7; color: #16a34a; }
.service-icon--warning { background: #fef9c3; color: #ca8a04; }
.service-icon--critical { background: #fee2e2; color: #dc2626; }

.service-status-badge { display: flex; align-items: center; gap: 0.25rem; padding: 2px 8px; border-radius: 12px; font-size: 0.72rem; font-weight: 700; }
.status-badge--good { background: #dcfce7; color: #16a34a; }
.status-badge--warning { background: #fef9c3; color: #ca8a04; }
.status-badge--critical { background: #fee2e2; color: #dc2626; }

.service-value { font-size: 1.75rem; font-weight: 800; color: #1e293b; line-height: 1; margin-bottom: 0.3rem; }
.service-label { font-size: 0.8rem; font-weight: 600; color: #475569; margin-bottom: 0.5rem; }
.service-target { font-size: 0.75rem; color: #94a3b8; margin-bottom: 0.75rem; }
.service-delta { font-weight: 600; margin-left: 0.3rem; }
.delta-ok { color: #16a34a; }
.delta-bad { color: #dc2626; }
.service-bar-wrap { height: 5px; background: #e2e8f0; border-radius: 3px; overflow: hidden; }
.service-bar { height: 100%; border-radius: 3px; transition: width 0.6s; }
.service-bar--good { background: #22c55e; }
.service-bar--warning { background: #f59e0b; }
.service-bar--critical { background: #ef4444; }

/* ── Insights ── */
.insights-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }

.insight-card { border-radius: 10px; padding: 1.1rem; border: 1.5px solid #e2e8f0; background: #fafbfc; display: flex; flex-direction: column; gap: 0.6rem; }
.insight-card--success { border-color: #bbf7d0; background: #f0fdf4; }
.insight-card--warning { border-color: #fde68a; background: #fffbeb; }
.insight-card--info { border-color: #bfdbfe; background: #eff6ff; }
.insight-card--critical { border-color: #fecaca; background: #fff5f5; }

.insight-header { display: flex; align-items: center; gap: 0.5rem; }
.insight-icon-wrap { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; flex-shrink: 0; }
.insight-icon--success { background: #dcfce7; color: #16a34a; }
.insight-icon--warning { background: #fef9c3; color: #ca8a04; }
.insight-icon--info { background: #dbeafe; color: #3483FA; }
.insight-icon--critical { background: #fee2e2; color: #dc2626; }

.insight-badge { padding: 2px 8px; border-radius: 12px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
.insight-badge--success { background: #dcfce7; color: #16a34a; }
.insight-badge--warning { background: #fef9c3; color: #ca8a04; }
.insight-badge--info { background: #dbeafe; color: #2563eb; }
.insight-badge--critical { background: #fee2e2; color: #dc2626; }

.insight-text { font-size: 0.835rem; color: #334155; line-height: 1.55; margin: 0; }
.insight-action { margin-top: auto; }
.insight-link { font-size: 0.8rem; font-weight: 600; color: #3483FA; text-decoration: none; }
.insight-link:hover { text-decoration: underline; }

/* ── Last Updated ── */
.last-updated {
  text-align: center; font-size: 0.78rem; color: #94a3b8;
  padding: 0.5rem; display: flex; align-items: center; justify-content: center; gap: 0.4rem;
}
.refresh-link { background: none; border: none; color: #3483FA; font-size: 0.78rem; font-weight: 600; cursor: pointer; padding: 0; text-decoration: underline; }

/* ── Responsive ── */
@media (max-width: 900px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .filter-row { flex-direction: column; align-items: stretch; }
  .filter-select, .filter-input, .filter-group--search .filter-input { width: 100%; }
  .filter-actions { margin-left: 0; }
  .service-grid { grid-template-columns: 1fr 1fr; }
  .insights-grid { grid-template-columns: 1fr; }
}

@media (max-width: 600px) {
  .kpi-grid { grid-template-columns: 1fr 1fr; }
  .service-grid { grid-template-columns: 1fr; }
  .chart-wrap { height: 220px; }
  .search-input { width: 100%; }
  .product-name { max-width: 130px; }
}
</style>
