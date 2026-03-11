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
            :class="{ 'period-btn--active': period === p.value && period !== 'custom' }"
            @click="setPeriod(p.value)"
          >{{ p.label }}</button>
          <DatePicker
            v-if="period === 'custom' || showCustomPicker"
            v-model="customRange"
            selectionMode="range"
            dateFormat="dd/mm/yy"
            placeholder="Selecionar datas"
            showIcon
            class="custom-date-picker"
            @update:model-value="onCustomRange"
          />
          <button
            class="period-btn"
            :class="{ 'period-btn--active': period === 'custom' }"
            @click="showCustomPicker = !showCustomPicker"
          >Personalizado</button>
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
          <label class="filter-label">Canal</label>
          <Select
            v-model="filterChannel"
            :options="channelOptions"
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

    <!-- ───────────────── KPI CARDS ───────────────── -->
    <div class="kpi-grid">
      <div
        v-for="kpi in kpiCards"
        :key="kpi.key"
        class="kpi-card"
      >
        <div class="kpi-top">
          <span class="kpi-label">{{ kpi.label }}</span>
          <div class="kpi-icon" :style="{ background: kpi.iconBg }">
            <i :class="kpi.icon" :style="{ color: kpi.iconColor }" />
          </div>
        </div>
        <div class="kpi-value">{{ formatKpi(kpi.value, kpi.format) }}</div>
        <div class="kpi-footer">
          <span class="kpi-change" :class="kpi.change >= 0 ? 'change-up' : 'change-down'">
            <i :class="kpi.change >= 0 ? 'pi pi-arrow-up' : 'pi pi-arrow-down'" />
            {{ Math.abs(kpi.change) }}%
          </span>
          <span class="kpi-period">vs período anterior</span>
        </div>
      </div>
    </div>

    <!-- ───────────────── PERFORMANCE CHART ───────────────── -->
    <div class="section-card">
      <div class="section-header">
        <h3 class="section-title">Desempenho ao longo do tempo</h3>
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
        <h3 class="section-title">Análise de Anúncios</h3>
        <div class="table-controls">
          <InputText
            v-model="listingSearch"
            placeholder="Buscar anúncio..."
            class="search-input"
          />
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
                  <div class="product-thumb" :style="{ background: row.thumbBg }">
                    <i class="pi pi-shopping-bag" :style="{ color: row.thumbColor }" />
                  </div>
                  <div class="product-info">
                    <span class="product-name">{{ row.name }}</span>
                    <span class="product-sku">{{ row.sku }}</span>
                  </div>
                </div>
              </td>
              <td class="td-num">{{ fmtNum(row.visits) }}</td>
              <td class="td-num">{{ fmtNum(row.sales) }}</td>
              <td>
                <div class="conv-cell">
                  <div class="conv-bar-wrap">
                    <div
                      class="conv-bar"
                      :style="{ width: row.convRate + '%', background: convColor(row.convRate) }"
                    />
                  </div>
                  <span class="conv-label" :style="{ color: convColor(row.convRate) }">
                    {{ row.convRate.toFixed(1) }}%
                  </span>
                </div>
              </td>
              <td class="td-num td-revenue">{{ fmtCurrency(row.revenue) }}</td>
              <td>
                <span class="badge" :class="statusBadgeClass(row.status)">{{ row.status }}</span>
              </td>
            </tr>
            <tr v-if="paginatedListings.length === 0">
              <td colspan="6" class="td-empty">Nenhum resultado encontrado.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="pagination">
        <span class="pagination-info">
          Exibindo {{ paginationStart }}–{{ paginationEnd }} de {{ filteredSortedListings.length }} anúncios
        </span>
        <div class="pagination-btns">
          <button class="page-btn" :disabled="currentPage === 1" @click="currentPage--">
            <i class="pi pi-chevron-left" />
          </button>
          <button
            v-for="pg in totalPages"
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
        <h3 class="section-title">Métricas de Atendimento</h3>
        <span class="section-subtitle">Qualidade do vendedor</span>
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
              <i :class="statusIcon(sm.status)" />
              {{ statusLabel(sm.status) }}
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
        <span class="section-subtitle">Gerado com base nos seus dados</span>
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

Chart.register(...registerables)

// ─── State ───────────────────────────────────────────────
const loading = ref(false)
const period = ref('30d')
const showCustomPicker = ref(false)
const customRange = ref(null)
const filterCategory = ref(null)
const filterChannel = ref(null)
const filterProduct = ref('')
const lastUpdated = ref('')
const perfChartRef = ref(null)
let perfChart = null
let autoRefreshTimer = null

// Listings table
const listingSearch = ref('')
const sortKey = ref('revenue')
const sortDir = ref('desc')
const currentPage = ref(1)
const pageSize = 8

// Chart metrics selection (max 4)
const selectedMetrics = ref(['revenue', 'visits'])

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

const channelOptions = [
  { label: 'Todos', value: null },
  { label: 'Mercado Livre', value: 'meli' },
  { label: 'Loja própria', value: 'store' },
  { label: 'Produto novo', value: 'new' },
  { label: 'Produto usado', value: 'used' },
]

const listingCols = [
  { key: 'name', label: 'Produto' },
  { key: 'visits', label: 'Visitas' },
  { key: 'sales', label: 'Vendas' },
  { key: 'convRate', label: 'Conversão' },
  { key: 'revenue', label: 'Receita' },
  { key: 'status', label: 'Status' },
]

const chartMetrics = [
  { key: 'revenue', label: 'Receita', color: '#3483FA' },
  { key: 'units', label: 'Unidades', color: '#22c55e' },
  { key: 'visits', label: 'Visitas', color: '#f59e0b' },
  { key: 'conversions', label: 'Conversões', color: '#9333ea' },
]

// ─── Mock Data ────────────────────────────────────────────
function generateDailyData(days) {
  const result = []
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const weekday = d.getDay()
    const weekMult = weekday === 0 || weekday === 6 ? 0.7 : 1
    const base = 0.7 + Math.random() * 0.6
    result.push({
      date: d.toISOString().split('T')[0],
      revenue: Math.round(base * weekMult * 3800 + Math.random() * 800),
      units: Math.round(base * weekMult * 22 + Math.random() * 8),
      visits: Math.round(base * weekMult * 420 + Math.random() * 120),
      conversions: Math.round(base * weekMult * 18 + Math.random() * 6),
    })
  }
  return result
}

const days = computed(() => {
  if (period.value === 'today') return 1
  if (period.value === '7d') return 7
  return 30
})

const dailyData = ref(generateDailyData(30))

const kpiCards = computed(() => {
  const d = dailyData.value
  const revenue = d.reduce((s, r) => s + r.revenue, 0)
  const units = d.reduce((s, r) => s + r.units, 0)
  const visits = d.reduce((s, r) => s + r.visits, 0)
  const conversions = d.reduce((s, r) => s + r.conversions, 0)
  const avgTicket = units > 0 ? revenue / units : 0
  const convRate = visits > 0 ? (conversions / visits) * 100 : 0
  const cart = Math.round(visits * 0.18)

  return [
    { key: 'revenue', label: 'Receita Total', value: revenue, format: 'currency', icon: 'pi pi-dollar', iconBg: '#eff6ff', iconColor: '#3483FA', change: 12.4 },
    { key: 'gross', label: 'Vendas Brutas', value: Math.round(revenue * 1.08), format: 'currency', icon: 'pi pi-wallet', iconBg: '#f0fdf4', iconColor: '#16a34a', change: 8.7 },
    { key: 'units', label: 'Unidades Vendidas', value: units, format: 'number', icon: 'pi pi-box', iconBg: '#fdf4ff', iconColor: '#9333ea', change: 5.2 },
    { key: 'ticket', label: 'Ticket Médio', value: avgTicket, format: 'currency', icon: 'pi pi-tag', iconBg: '#fff7ed', iconColor: '#ea580c', change: 6.8 },
    { key: 'convRate', label: 'Taxa de Conversão', value: convRate, format: 'percent', icon: 'pi pi-percentage', iconBg: '#fef9c3', iconColor: '#ca8a04', change: -1.3 },
    { key: 'visits', label: 'Visitas', value: visits, format: 'number', icon: 'pi pi-eye', iconBg: '#eff6ff', iconColor: '#3483FA', change: 18.1 },
    { key: 'cart', label: 'Adicionados ao Carrinho', value: cart, format: 'number', icon: 'pi pi-shopping-cart', iconBg: '#f0fdf4', iconColor: '#16a34a', change: 9.4 },
  ]
})

const mockListings = ref([
  { id: 1, name: 'Fone Bluetooth Premium XB900N', sku: 'MLB-001', visits: 4821, sales: 312, convRate: 6.5, revenue: 187200, status: 'Ativo', thumbBg: '#eff6ff', thumbColor: '#3483FA', category: 'electronics' },
  { id: 2, name: 'Tênis Running Air Max Pro', sku: 'MLB-002', visits: 3950, sales: 228, convRate: 5.8, revenue: 136800, status: 'Ativo', thumbBg: '#fdf4ff', thumbColor: '#9333ea', category: 'sports' },
  { id: 3, name: 'Smartwatch Fit Pro 2024', sku: 'MLB-003', visits: 6102, sales: 189, convRate: 3.1, revenue: 227800, status: 'Ativo', thumbBg: '#fef9c3', thumbColor: '#ca8a04', category: 'electronics' },
  { id: 4, name: 'Mochila Executiva Impermeável', sku: 'MLB-004', visits: 2340, sales: 175, convRate: 7.5, revenue: 61250, status: 'Ativo', thumbBg: '#fff7ed', thumbColor: '#ea580c', category: 'fashion' },
  { id: 5, name: 'Cafeteira Expresso 15 Bar', sku: 'MLB-005', visits: 1890, sales: 94, convRate: 5.0, revenue: 84600, status: 'Pausado', thumbBg: '#f0fdf4', thumbColor: '#16a34a', category: 'home' },
  { id: 6, name: 'Kit Skincare Hidratação Profunda', sku: 'MLB-006', visits: 3210, sales: 267, convRate: 8.3, revenue: 48060, status: 'Ativo', thumbBg: '#fdf4ff', thumbColor: '#ec4899', category: 'beauty' },
  { id: 7, name: 'Monitor Gamer 27" 144Hz', sku: 'MLB-007', visits: 5540, sales: 88, convRate: 1.6, revenue: 220000, status: 'Ativo', thumbBg: '#eff6ff', thumbColor: '#3483FA', category: 'electronics' },
  { id: 8, name: 'Cadeira Ergonômica Home Office', sku: 'MLB-008', visits: 2980, sales: 134, convRate: 4.5, revenue: 175420, status: 'Ativo', thumbBg: '#fff7ed', thumbColor: '#ea580c', category: 'home' },
  { id: 9, name: 'Camiseta Dry-Fit UV 50+', sku: 'MLB-009', visits: 1650, sales: 210, convRate: 12.7, revenue: 23100, status: 'Ativo', thumbBg: '#f0fdf4', thumbColor: '#16a34a', category: 'sports' },
  { id: 10, name: 'Perfume Importado 100ml', sku: 'MLB-010', visits: 2100, sales: 156, convRate: 7.4, revenue: 78000, status: 'Inativo', thumbBg: '#fdf4ff', thumbColor: '#9333ea', category: 'beauty' },
  { id: 11, name: 'Notebook Ultrafino 16GB', sku: 'MLB-011', visits: 7820, sales: 67, convRate: 0.9, revenue: 402000, status: 'Ativo', thumbBg: '#eff6ff', thumbColor: '#3483FA', category: 'electronics' },
  { id: 12, name: 'Conjunto Pijama Algodão', sku: 'MLB-012', visits: 980, sales: 143, convRate: 14.6, revenue: 18590, status: 'Ativo', thumbBg: '#fef9c3', thumbColor: '#ca8a04', category: 'fashion' },
])

const serviceMetrics = ref([
  {
    key: 'response', label: 'Tempo médio de resposta', value: '4h 12min', target: '< 24h',
    delta: '83% abaixo da meta', deltaOk: true, status: 'good', icon: 'pi pi-comments', pct: 17
  },
  {
    key: 'complaints', label: 'Reclamações abertas', value: '3', target: '0',
    delta: '+3 reclamações', deltaOk: false, status: 'warning', icon: 'pi pi-exclamation-triangle', pct: 60
  },
  {
    key: 'cancellations', label: 'Taxa de cancelamentos', value: '1.4%', target: '< 2%',
    delta: '30% abaixo da meta', deltaOk: true, status: 'good', icon: 'pi pi-times-circle', pct: 28
  },
  {
    key: 'delayed', label: 'Pedidos com atraso', value: '2', target: '0',
    delta: '+2 em atraso', deltaOk: false, status: 'critical', icon: 'pi pi-clock', pct: 85
  },
])

const insights = computed(() => {
  const list = []
  const sorted = [...mockListings.value].sort((a, b) => b.visits - a.visits)
  const highVisitLowConv = sorted.find(l => l.visits > 3000 && l.convRate < 3)
  if (highVisitLowConv) {
    list.push({
      id: 1, type: 'warning', tag: 'Oportunidade',
      icon: 'pi pi-chart-line',
      text: `"${highVisitLowConv.name}" recebeu ${fmtNum(highVisitLowConv.visits)} visitas mas apenas ${highVisitLowConv.convRate.toFixed(1)}% de conversão. Revise o preço ou as fotos do anúncio.`,
      action: 'Ver anúncio'
    })
  }
  list.push({
    id: 2, type: 'success', tag: 'Destaque',
    icon: 'pi pi-trophy',
    text: 'Produtos da categoria Esportes cresceram 18% esta semana em relação à semana anterior. Considere aumentar o estoque.',
    action: 'Ver categoria'
  })
  const highConv = sorted.find(l => l.convRate > 10)
  if (highConv) {
    list.push({
      id: 3, type: 'info', tag: 'Dica',
      icon: 'pi pi-lightbulb',
      text: `"${highConv.name}" tem conversão de ${highConv.convRate.toFixed(1)}% — acima da média do mercado (3–5%). Use-o como modelo para outros anúncios.`,
      action: 'Ver anúncio'
    })
  }
  list.push({
    id: 4, type: 'critical', tag: 'Atenção',
    icon: 'pi pi-bell',
    text: 'Seu tempo de resposta de 4h12min está bom, mas você tem 2 pedidos com atraso na entrega. Regularize para evitar penalização na reputação.',
    action: 'Ver pedidos'
  })
  list.push({
    id: 5, type: 'success', tag: 'Resultado',
    icon: 'pi pi-arrow-up',
    text: `Receita total cresceu 12.4% comparado ao período anterior. Visitas aumentaram 18.1% — seu ranqueamento está melhorando.`,
    action: null
  })
  list.push({
    id: 6, type: 'warning', tag: 'Estoque',
    icon: 'pi pi-box',
    text: '"Camiseta Dry-Fit UV 50+" tem a maior taxa de conversão (12.7%) mas poucas unidades. Reabasteça para não perder vendas.',
    action: 'Ver estoque'
  })
  return list
})

// ─── Computed ─────────────────────────────────────────────
const filteredSortedListings = computed(() => {
  let list = mockListings.value
  const q = listingSearch.value.toLowerCase().trim()
  if (q) list = list.filter(l => l.name.toLowerCase().includes(q) || l.sku.toLowerCase().includes(q))
  if (filterCategory.value) list = list.filter(l => l.category === filterCategory.value)
  if (filterProduct.value) {
    const p = filterProduct.value.toLowerCase()
    list = list.filter(l => l.name.toLowerCase().includes(p))
  }
  list = [...list].sort((a, b) => {
    const av = a[sortKey.value]
    const bv = b[sortKey.value]
    if (typeof av === 'string') return sortDir.value === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    return sortDir.value === 'asc' ? av - bv : bv - av
  })
  return list
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredSortedListings.value.length / pageSize)))
const paginationStart = computed(() => Math.min((currentPage.value - 1) * pageSize + 1, filteredSortedListings.value.length))
const paginationEnd = computed(() => Math.min(currentPage.value * pageSize, filteredSortedListings.value.length))
const paginatedListings = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredSortedListings.value.slice(start, start + pageSize)
})

const chartData = computed(() => {
  const data = dailyData.value.slice(-(days.value))
  return data
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
  return new Intl.NumberFormat('pt-BR').format(v)
}

function setPeriod(v) {
  period.value = v
  showCustomPicker.value = false
  dailyData.value = generateDailyData(days.value === 1 ? 1 : days.value)
  nextTick(renderPerfChart)
}

function onCustomRange(val) {
  if (val && val[0] && val[1]) {
    period.value = 'custom'
    showCustomPicker.value = false
    const diff = Math.ceil((val[1] - val[0]) / (1000 * 60 * 60 * 24)) + 1
    dailyData.value = generateDailyData(diff)
    nextTick(renderPerfChart)
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
  if (rate >= 4) return '#ca8a04'
  return '#dc2626'
}

function statusBadgeClass(status) {
  if (status === 'Ativo') return 'badge--active'
  if (status === 'Pausado') return 'badge--paused'
  return 'badge--inactive'
}

function statusIcon(s) {
  if (s === 'good') return 'pi pi-check-circle'
  if (s === 'warning') return 'pi pi-exclamation-circle'
  return 'pi pi-times-circle'
}

function statusLabel(s) {
  if (s === 'good') return 'Bom'
  if (s === 'warning') return 'Atenção'
  return 'Crítico'
}

function updateLastUpdated() {
  const now = new Date()
  lastUpdated.value = now.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

async function loadMetrics() {
  loading.value = true
  await new Promise(r => setTimeout(r, 700))
  dailyData.value = generateDailyData(days.value === 1 ? 1 : days.value)
  updateLastUpdated()
  await nextTick()
  renderPerfChart()
  loading.value = false
}

function renderPerfChart() {
  if (!perfChartRef.value) return
  const data = chartData.value

  const labels = data.map(d => {
    const [, m, day] = d.date.split('-')
    return `${day}/${m}`
  })

  const datasets = selectedMetrics.value.map(key => {
    const meta = chartMetrics.find(m => m.key === key)
    return {
      label: meta.label,
      data: data.map(d => d[key]),
      borderColor: meta.color,
      backgroundColor: meta.color + '18',
      borderWidth: 2,
      pointRadius: data.length <= 7 ? 4 : 2,
      pointHoverRadius: 6,
      fill: selectedMetrics.value.length === 1,
      tension: 0.4,
      yAxisID: key === 'revenue' ? 'yRevenue' : 'yUnits',
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
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: '#1e293b',
          titleColor: '#94a3b8',
          bodyColor: '#fff',
          padding: 12,
          callbacks: {
            label: (ctx) => {
              const key = selectedMetrics.value[ctx.datasetIndex]
              const v = ctx.raw
              if (key === 'revenue') return ` ${ctx.dataset.label}: ${fmtCurrency(v)}`
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
        yRevenue: {
          type: 'linear',
          display: selectedMetrics.value.includes('revenue'),
          position: 'left',
          grid: { color: '#f1f5f9' },
          ticks: {
            font: { size: 11 }, color: '#94a3b8',
            callback: v => `R$ ${(v / 1000).toFixed(0)}k`
          }
        },
        yUnits: {
          type: 'linear',
          display: selectedMetrics.value.some(k => k !== 'revenue'),
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: { font: { size: 11 }, color: '#94a3b8' }
        }
      }
    }
  })
}

// ─── Watchers ─────────────────────────────────────────────
watch(listingSearch, () => { currentPage.value = 1 })
watch(filterCategory, () => { currentPage.value = 1 })

// ─── Lifecycle ────────────────────────────────────────────
onMounted(async () => {
  updateLastUpdated()
  await nextTick()
  renderPerfChart()
  // Auto refresh every 5 minutes
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

.period-btn:hover {
  border-color: #3483FA;
  color: #3483FA;
}

.period-btn--active {
  background: #3483FA;
  border-color: #3483FA;
  color: white;
}

.custom-date-picker {
  max-width: 200px;
}

.filter-row {
  display: flex;
  align-items: flex-end;
  gap: 1rem;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
}

.filter-group--search {
  flex: 1;
  min-width: 200px;
}

.filter-select, .filter-input {
  width: 160px;
}

.filter-group--search .filter-input {
  width: 100%;
}

.filter-actions {
  margin-left: auto;
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
  max-width: 100px;
}

.kpi-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
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

.kpi-change {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  font-weight: 600;
}

.kpi-change i { font-size: 0.7rem; }

.change-up { color: #16a34a; }
.change-down { color: #dc2626; }

.kpi-period { color: #94a3b8; }

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

.section-subtitle {
  font-size: 0.8rem;
  color: #94a3b8;
}

.insight-icon { color: #f59e0b; }

/* ── Performance Chart ── */
.chart-controls {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.metric-toggles {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.metric-toggle {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.75rem;
  border-radius: 20px;
  border: 1.5px solid #e2e8f0;
  background: white;
  color: #64748b;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.metric-toggle:hover {
  border-color: #94a3b8;
}

.toggle-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.chart-wrap {
  position: relative;
  height: 280px;
}

/* ── Listings Table ── */
.table-controls {
  display: flex;
  gap: 0.5rem;
}

.search-input {
  width: 220px;
}

.table-wrap {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.data-table thead {
  background: #f8fafc;
}

.th-sortable {
  padding: 0.75rem 1rem;
  text-align: left;
  font-size: 0.75rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  cursor: pointer;
  white-space: nowrap;
  border-bottom: 2px solid #e2e8f0;
  transition: color 0.15s;
  user-select: none;
}

.th-sortable:hover { color: #1e293b; }
.th-sorted { color: #3483FA; }

.sort-icon {
  font-size: 0.7rem;
  margin-left: 0.3rem;
  opacity: 0.6;
}

.data-row {
  border-bottom: 1px solid #f1f5f9;
  transition: background 0.15s;
}

.data-row:hover { background: #f8fafc; }

.data-row td {
  padding: 0.75rem 1rem;
  color: #334155;
}

.product-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.product-thumb {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.product-thumb i { font-size: 1rem; }

.product-info {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  overflow: hidden;
}

.product-name {
  font-weight: 600;
  color: #1e293b;
  font-size: 0.875rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 220px;
}

.product-sku {
  font-size: 0.72rem;
  color: #94a3b8;
}

.td-num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.td-revenue {
  font-weight: 700;
  color: #3483FA !important;
}

.conv-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 120px;
}

.conv-bar-wrap {
  flex: 1;
  height: 6px;
  background: #f1f5f9;
  border-radius: 3px;
  overflow: hidden;
}

.conv-bar {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s;
  max-width: 100%;
}

.conv-label {
  font-size: 0.8rem;
  font-weight: 700;
  min-width: 36px;
  text-align: right;
}

.badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.72rem;
  font-weight: 600;
  white-space: nowrap;
}

.badge--active { background: #dcfce7; color: #16a34a; }
.badge--paused { background: #fef9c3; color: #ca8a04; }
.badge--inactive { background: #fee2e2; color: #dc2626; }

.td-empty {
  text-align: center;
  color: #94a3b8;
  padding: 2rem !important;
  font-style: italic;
}

/* ── Pagination ── */
.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 1rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.pagination-info {
  font-size: 0.8rem;
  color: #94a3b8;
}

.pagination-btns {
  display: flex;
  gap: 0.25rem;
}

.page-btn {
  min-width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: white;
  color: #475569;
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  padding: 0 0.5rem;
}

.page-btn:hover:not(:disabled) {
  border-color: #3483FA;
  color: #3483FA;
}

.page-btn--active {
  background: #3483FA;
  border-color: #3483FA;
  color: white;
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ── Service Metrics ── */
.service-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
}

.service-card {
  border-radius: 10px;
  padding: 1.25rem;
  border: 1.5px solid #e2e8f0;
  background: #fafbfc;
}

.service-card--good { border-color: #bbf7d0; background: #f0fdf4; }
.service-card--warning { border-color: #fde68a; background: #fffbeb; }
.service-card--critical { border-color: #fecaca; background: #fff5f5; }

.service-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.875rem;
}

.service-icon-wrap {
  width: 38px;
  height: 38px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
}

.service-icon--good { background: #dcfce7; color: #16a34a; }
.service-icon--warning { background: #fef9c3; color: #ca8a04; }
.service-icon--critical { background: #fee2e2; color: #dc2626; }

.service-status-badge {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.72rem;
  font-weight: 700;
}

.status-badge--good { background: #dcfce7; color: #16a34a; }
.status-badge--warning { background: #fef9c3; color: #ca8a04; }
.status-badge--critical { background: #fee2e2; color: #dc2626; }

.service-value {
  font-size: 1.75rem;
  font-weight: 800;
  color: #1e293b;
  line-height: 1;
  margin-bottom: 0.3rem;
}

.service-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #475569;
  margin-bottom: 0.5rem;
}

.service-target {
  font-size: 0.75rem;
  color: #94a3b8;
  margin-bottom: 0.75rem;
}

.service-delta {
  font-weight: 600;
  margin-left: 0.3rem;
}

.delta-ok { color: #16a34a; }
.delta-bad { color: #dc2626; }

.service-bar-wrap {
  height: 5px;
  background: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
}

.service-bar {
  height: 100%;
  border-radius: 3px;
  transition: width 0.6s;
}

.service-bar--good { background: #22c55e; }
.service-bar--warning { background: #f59e0b; }
.service-bar--critical { background: #ef4444; }

/* ── Insights ── */
.insights-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.insight-card {
  border-radius: 10px;
  padding: 1.1rem;
  border: 1.5px solid #e2e8f0;
  background: #fafbfc;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.insight-card--success { border-color: #bbf7d0; background: #f0fdf4; }
.insight-card--warning { border-color: #fde68a; background: #fffbeb; }
.insight-card--info { border-color: #bfdbfe; background: #eff6ff; }
.insight-card--critical { border-color: #fecaca; background: #fff5f5; }

.insight-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.insight-icon-wrap {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.insight-icon--success { background: #dcfce7; color: #16a34a; }
.insight-icon--warning { background: #fef9c3; color: #ca8a04; }
.insight-icon--info { background: #dbeafe; color: #3483FA; }
.insight-icon--critical { background: #fee2e2; color: #dc2626; }

.insight-badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.insight-badge--success { background: #dcfce7; color: #16a34a; }
.insight-badge--warning { background: #fef9c3; color: #ca8a04; }
.insight-badge--info { background: #dbeafe; color: #2563eb; }
.insight-badge--critical { background: #fee2e2; color: #dc2626; }

.insight-text {
  font-size: 0.835rem;
  color: #334155;
  line-height: 1.55;
  margin: 0;
}

.insight-action { margin-top: auto; }

.insight-link {
  font-size: 0.8rem;
  font-weight: 600;
  color: #3483FA;
  text-decoration: none;
}

.insight-link:hover { text-decoration: underline; }

/* ── Last Updated ── */
.last-updated {
  text-align: center;
  font-size: 0.78rem;
  color: #94a3b8;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
}

.refresh-link {
  background: none;
  border: none;
  color: #3483FA;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}

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
