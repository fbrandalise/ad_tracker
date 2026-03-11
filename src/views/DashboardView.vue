<template>
  <div class="dashboard">
    <!-- Date range picker -->
    <div class="dashboard-toolbar">
      <div class="date-section">
        <label class="toolbar-label">Período</label>
        <div class="date-pickers">
          <DatePicker v-model="dateFrom" dateFormat="dd/mm/yy" placeholder="De" showIcon />
          <span class="date-sep">até</span>
          <DatePicker v-model="dateTo" dateFormat="dd/mm/yy" placeholder="Até" showIcon />
        </div>
      </div>
      <div class="toolbar-actions">
        <Button label="Aplicar" icon="pi pi-check" @click="loadData" :loading="loading" />
        <Button label="Últimos 30 dias" text @click="setLast30" />
        <Button label="Últimos 7 dias" text @click="setLast7" />
      </div>
    </div>

    <!-- KPI Cards -->
    <div class="kpi-grid">
      <MetricCard
        label="Impressões"
        :value="adsStore.totalImpressions"
        format="number"
        icon="pi pi-eye"
        iconBg="#eff6ff"
        iconColor="#3483FA"
        :change="8.3"
      />
      <MetricCard
        label="Cliques"
        :value="adsStore.totalClicks"
        format="number"
        icon="pi pi-cursor"
        iconBg="#f0fdf4"
        iconColor="#16a34a"
        :change="12.1"
      />
      <MetricCard
        label="Gasto Total"
        :value="adsStore.totalSpend"
        format="currency"
        icon="pi pi-dollar"
        iconBg="#fef9c3"
        iconColor="#ca8a04"
        :change="-3.5"
      />
      <MetricCard
        label="CTR Médio"
        :value="adsStore.avgCtr"
        format="percent"
        icon="pi pi-percentage"
        iconBg="#fdf4ff"
        iconColor="#9333ea"
        :change="4.7"
      />
      <MetricCard
        label="CPC Médio"
        :value="adsStore.avgCpc"
        format="currency"
        icon="pi pi-money-bill"
        iconBg="#fff7ed"
        iconColor="#ea580c"
        :change="-2.1"
      />
      <MetricCard
        label="Conversões"
        :value="totalConversions"
        format="number"
        icon="pi pi-shopping-cart"
        iconBg="#f0fdf4"
        iconColor="#16a34a"
        :change="18.6"
      />
    </div>

    <!-- Charts row -->
    <div class="charts-row">
      <!-- Daily performance chart -->
      <div class="chart-card large">
        <div class="chart-header">
          <h3>Performance Diária</h3>
          <SelectButton v-model="chartMetric" :options="chartMetricOptions" optionLabel="label" optionValue="value" />
        </div>
        <div class="chart-body">
          <canvas ref="dailyChartRef" height="280" />
        </div>
      </div>

      <!-- Campaign status donut -->
      <div class="chart-card small">
        <div class="chart-header">
          <h3>Status das Campanhas</h3>
        </div>
        <div class="chart-body chart-donut-wrap">
          <canvas ref="statusChartRef" height="220" />
          <div class="donut-legend">
            <div v-for="item in statusLegend" :key="item.label" class="legend-item">
              <span class="legend-dot" :style="{ background: item.color }" />
              <span class="legend-label">{{ item.label }}</span>
              <span class="legend-value">{{ item.value }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Top campaigns mini-table -->
    <div class="bottom-card">
      <div class="card-header">
        <h3>Top Campanhas por Gasto</h3>
        <Button label="Ver todas" text size="small" @click="$router.push('/campaigns')" />
      </div>
      <div class="top-campaigns">
        <div v-for="(c, i) in topCampaigns" :key="c.id" class="campaign-row">
          <span class="rank">{{ i + 1 }}</span>
          <div class="campaign-info">
            <span class="campaign-name">{{ c.name }}</span>
            <span :class="statusClass(c.status)">{{ statusLabel(c.status) }}</span>
          </div>
          <div class="campaign-metrics">
            <span class="metric-val">{{ fmt(c.spend, 'currency') }}</span>
            <div class="progress-wrap">
              <div class="progress-bar" :style="{ width: spendPercent(c.spend) + '%' }" />
            </div>
          </div>
          <div class="campaign-extra">
            <span>CTR: {{ c.ctr }}%</span>
            <span>ROAS: {{ c.roas }}x</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useAdsStore } from '@/stores/ads'
import { useAuthStore } from '@/stores/auth'
import { getMockCampaigns, getMockDailyReport, getCampaignsDailyReport, getCampaigns } from '@/services/mlApi'
import MetricCard from '@/components/MetricCard.vue'
import DatePicker from 'primevue/datepicker'
import Button from 'primevue/button'
import SelectButton from 'primevue/selectbutton'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

const adsStore = useAdsStore()
const authStore = useAuthStore()
const loading = ref(false)
const dateFrom = ref(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
const dateTo = ref(new Date())
const chartMetric = ref('impressions')
const chartMetricOptions = [
  { label: 'Impressões', value: 'impressions' },
  { label: 'Cliques', value: 'clicks' },
  { label: 'Gasto', value: 'spend' },
  { label: 'Conversões', value: 'conversions' }
]

const dailyChartRef = ref(null)
const statusChartRef = ref(null)
let dailyChart = null
let statusChart = null

const isDemo = computed(() => authStore.accessToken === 'DEMO_MODE')

const totalConversions = computed(() =>
  adsStore.campaigns.reduce((s, c) => s + (c.conversions || 0), 0)
)

const topCampaigns = computed(() =>
  [...adsStore.campaigns].sort((a, b) => b.spend - a.spend).slice(0, 5)
)

const maxSpend = computed(() => Math.max(...adsStore.campaigns.map(c => c.spend), 1))

function spendPercent(spend) {
  return Math.round((spend / maxSpend.value) * 100)
}

const statusLegend = computed(() => {
  const enabled = adsStore.campaigns.filter(c => c.status === 'enabled').length
  const paused = adsStore.campaigns.filter(c => c.status === 'paused').length
  const disabled = adsStore.campaigns.filter(c => c.status === 'disabled').length
  return [
    { label: 'Ativas', value: enabled, color: '#22c55e' },
    { label: 'Pausadas', value: paused, color: '#f59e0b' },
    { label: 'Inativas', value: disabled, color: '#ef4444' }
  ]
})

function statusClass(s) {
  const map = { enabled: 'badge-enabled', paused: 'badge-paused', disabled: 'badge-disabled' }
  return map[s] || 'badge-disabled'
}

function statusLabel(s) {
  const map = { enabled: 'Ativa', paused: 'Pausada', disabled: 'Inativa' }
  return map[s] || s
}

function fmt(v, format) {
  if (format === 'currency') {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
  }
  return v
}

function setLast30() {
  dateFrom.value = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  dateTo.value = new Date()
  loadData()
}

function setLast7() {
  dateFrom.value = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  dateTo.value = new Date()
  loadData()
}

async function loadData() {
  loading.value = true
  adsStore.setLoading(true)
  try {
    let campaigns, report
    if (isDemo.value) {
      campaigns = getMockCampaigns()
      report = getMockDailyReport(30)
    } else {
      [campaigns, report] = await Promise.all([
        getCampaigns(authStore.userId),
        getCampaignsDailyReport(
          authStore.userId,
          dateFrom.value.toISOString().split('T')[0],
          dateTo.value.toISOString().split('T')[0]
        )
      ])
    }
    adsStore.setCampaigns(campaigns)
    adsStore.setDailyReport(report)
    await nextTick()
    renderDailyChart()
    renderStatusChart()
  } finally {
    loading.value = false
    adsStore.setLoading(false)
  }
}

function renderDailyChart() {
  const report = adsStore.dailyReport
  if (!dailyChartRef.value || !report.length) return

  const labels = report.map(d => {
    const [y, m, day] = d.date.split('-')
    return `${day}/${m}`
  })
  const data = report.map(d => d[chartMetric.value])

  const colorMap = {
    impressions: '#3483FA',
    clicks: '#22c55e',
    spend: '#f59e0b',
    conversions: '#9333ea'
  }
  const color = colorMap[chartMetric.value]

  if (dailyChart) dailyChart.destroy()
  dailyChart = new Chart(dailyChartRef.value, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: chartMetricOptions.find(o => o.value === chartMetric.value)?.label,
        data,
        borderColor: color,
        backgroundColor: color + '18',
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const v = ctx.raw
              if (chartMetric.value === 'spend') return ` R$ ${v.toFixed(2)}`
              return ` ${v.toLocaleString('pt-BR')}`
            }
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 }, maxTicksLimit: 10 } },
        y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 } } }
      }
    }
  })
}

function renderStatusChart() {
  if (!statusChartRef.value) return
  const legend = statusLegend.value

  if (statusChart) statusChart.destroy()
  statusChart = new Chart(statusChartRef.value, {
    type: 'doughnut',
    data: {
      labels: legend.map(l => l.label),
      datasets: [{
        data: legend.map(l => l.value),
        backgroundColor: legend.map(l => l.color),
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: { display: false }
      }
    }
  })
}

watch(chartMetric, () => renderDailyChart())

onMounted(() => loadData())
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* Toolbar */
.dashboard-toolbar {
  background: white;
  border-radius: 12px;
  padding: 1rem 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  border: 1px solid #e2e8f0;
}

.toolbar-label {
  font-size: 0.8rem;
  font-weight: 500;
  color: #64748b;
  margin-right: 0.5rem;
}

.date-section {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.date-pickers {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.date-sep {
  color: #94a3b8;
  font-size: 0.85rem;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

/* KPI Grid */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
}

/* Charts row */
.charts-row {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 1rem;
}

.chart-card {
  background: white;
  border-radius: 12px;
  padding: 1.25rem;
  border: 1px solid #e2e8f0;
}

.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.chart-header h3 {
  font-size: 0.95rem;
  font-weight: 600;
  color: #1e293b;
}

.chart-body {
  position: relative;
  height: 240px;
}

.chart-donut-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  height: auto;
}

.donut-legend {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-label {
  flex: 1;
  color: #475569;
}

.legend-value {
  font-weight: 600;
  color: #1e293b;
}

/* Bottom card */
.bottom-card {
  background: white;
  border-radius: 12px;
  padding: 1.25rem;
  border: 1px solid #e2e8f0;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.card-header h3 {
  font-size: 0.95rem;
  font-weight: 600;
  color: #1e293b;
}

.top-campaigns {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.campaign-row {
  display: grid;
  grid-template-columns: 24px 1fr 200px 120px;
  align-items: center;
  gap: 1rem;
  padding: 0.6rem 0;
  border-bottom: 1px solid #f1f5f9;
}

.campaign-row:last-child {
  border-bottom: none;
}

.rank {
  font-size: 0.85rem;
  font-weight: 700;
  color: #94a3b8;
  text-align: center;
}

.campaign-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  overflow: hidden;
}

.campaign-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.campaign-metrics {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.metric-val {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1e293b;
}

.progress-wrap {
  height: 4px;
  background: #f1f5f9;
  border-radius: 2px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: #3483FA;
  border-radius: 2px;
  transition: width 0.5s;
}

.campaign-extra {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.8rem;
  color: #64748b;
}

/* Status badges - reused from global */
.badge-enabled {
  background: #dcfce7;
  color: #16a34a;
  padding: 1px 6px;
  border-radius: 10px;
  font-size: 0.72rem;
  font-weight: 500;
  width: fit-content;
}

.badge-paused {
  background: #fef9c3;
  color: #ca8a04;
  padding: 1px 6px;
  border-radius: 10px;
  font-size: 0.72rem;
  font-weight: 500;
  width: fit-content;
}

.badge-disabled {
  background: #fee2e2;
  color: #dc2626;
  padding: 1px 6px;
  border-radius: 10px;
  font-size: 0.72rem;
  font-weight: 500;
  width: fit-content;
}

@media (max-width: 1100px) {
  .charts-row {
    grid-template-columns: 1fr;
  }

  .campaign-row {
    grid-template-columns: 24px 1fr;
  }

  .campaign-metrics, .campaign-extra {
    display: none;
  }
}
</style>
