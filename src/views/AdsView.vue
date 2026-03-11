<template>
  <div class="ads-view">
    <!-- Toolbar -->
    <div class="view-toolbar">
      <div class="toolbar-left">
        <InputText
          v-model="quickFilter"
          placeholder="Buscar anúncio ou SKU..."
          class="search-input"
        />
        <Select
          v-model="campaignFilter"
          :options="campaignOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Campanha"
          class="campaign-select"
        />
        <Select
          v-model="statusFilter"
          :options="statusOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Status"
          class="status-select"
        />
      </div>
      <div class="toolbar-right">
        <Button icon="pi pi-refresh" label="Atualizar" outlined @click="loadAds" :loading="loading" />
        <Button icon="pi pi-download" label="CSV" outlined @click="exportCsv" />
      </div>
    </div>

    <!-- Summary -->
    <div class="summary-bar">
      <div class="summary-item" v-for="s in summary" :key="s.label">
        <span class="summary-label">{{ s.label }}</span>
        <span class="summary-value">{{ s.value }}</span>
      </div>
    </div>

    <!-- Performance chart -->
    <div class="chart-strip">
      <div class="strip-header">
        <h3>Top 10 Anúncios por Gasto</h3>
        <Select
          v-model="barMetric"
          :options="barMetricOptions"
          optionLabel="label"
          optionValue="value"
          class="metric-select"
          @change="renderBarChart"
        />
      </div>
      <div class="strip-chart">
        <canvas ref="barChartRef" height="160" />
      </div>
    </div>

    <!-- AG Grid -->
    <div class="grid-card">
      <AgGridVue
        class="ag-theme-alpine ads-grid"
        :rowData="filteredAds"
        :columnDefs="columnDefs"
        :defaultColDef="defaultColDef"
        :pagination="true"
        :paginationPageSize="25"
        :animateRows="true"
        :rowSelection="'multiple'"
        @grid-ready="onGridReady"
        @selection-changed="onSelectionChanged"
      />
    </div>

    <!-- Bulk action -->
    <Transition name="slide-up">
      <div class="bulk-bar" v-if="selectedRows.length > 0">
        <span>{{ selectedRows.length }} anúncio(s) selecionado(s)</span>
        <div class="bulk-actions">
          <Button label="Pausar" icon="pi pi-pause" severity="warn" outlined size="small" @click="bulkAction('paused')" />
          <Button label="Ativar" icon="pi pi-play" severity="success" outlined size="small" @click="bulkAction('enabled')" />
          <Button label="Limpar" text size="small" @click="clearSelection" />
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { AgGridVue } from 'ag-grid-vue3'
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'
import { useAdsStore } from '@/stores/ads'
import { useAuthStore } from '@/stores/auth'
import { getMockAds, getAds } from '@/services/mlApi'
import { useToast } from 'primevue/usetoast'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Button from 'primevue/button'
import { Chart, registerables } from 'chart.js'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

Chart.register(...registerables)
ModuleRegistry.registerModules([AllCommunityModule])

const adsStore = useAdsStore()
const authStore = useAuthStore()
const toast = useToast()
const loading = ref(false)
const quickFilter = ref('')
const campaignFilter = ref('')
const statusFilter = ref('')
const selectedRows = ref([])
const barMetric = ref('spend')
const barChartRef = ref(null)
let gridApi = null
let barChart = null

const isDemo = computed(() => authStore.accessToken === 'DEMO_MODE')

const statusOptions = [
  { label: 'Todos', value: '' },
  { label: 'Ativos', value: 'enabled' },
  { label: 'Pausados', value: 'paused' }
]

const barMetricOptions = [
  { label: 'Gasto', value: 'spend' },
  { label: 'Impressões', value: 'impressions' },
  { label: 'Cliques', value: 'clicks' },
  { label: 'ROAS', value: 'roas' }
]

const campaignOptions = computed(() => {
  const names = [...new Set(adsStore.ads.map(a => a.campaign_name).filter(Boolean))]
  return [{ label: 'Todas campanhas', value: '' }, ...names.map(n => ({ label: n, value: n }))]
})

function currFmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
}

function numFmt(v) {
  return new Intl.NumberFormat('pt-BR').format(v || 0)
}

function statusRenderer(params) {
  const map = {
    enabled: '<span style="background:#dcfce7;color:#16a34a;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:500;">Ativo</span>',
    paused: '<span style="background:#fef9c3;color:#ca8a04;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:500;">Pausado</span>'
  }
  return map[params.value] || params.value
}

function roasRenderer(params) {
  const v = params.value || 0
  const color = v >= 8 ? '#16a34a' : v >= 4 ? '#ca8a04' : '#dc2626'
  return `<span style="color:${color};font-weight:600;">${v}x</span>`
}

function ctrRenderer(params) {
  const v = params.value || 0
  const color = v >= 2.5 ? '#16a34a' : v >= 1.5 ? '#ca8a04' : '#dc2626'
  return `<span style="color:${color};font-weight:500;">${v.toFixed(2)}%</span>`
}

function sparkRenderer(params) {
  const v = params.value || 0
  const max = 2000
  const pct = Math.min(100, Math.round((v / max) * 100))
  const color = '#3483FA'
  return `<div style="display:flex;align-items:center;gap:6px;width:100%;">
    <div style="flex:1;height:6px;background:#f1f5f9;border-radius:3px;overflow:hidden;">
      <div style="height:100%;width:${pct}%;background:${color};border-radius:3px;"></div>
    </div>
    <span style="font-size:12px;color:#1e293b;min-width:40px;text-align:right;">${numFmt(v)}</span>
  </div>`
}

const columnDefs = ref([
  {
    headerCheckboxSelection: true,
    checkboxSelection: true,
    width: 50,
    pinned: 'left',
    suppressHeaderMenuButton: true,
    resizable: false,
    sortable: false
  },
  {
    field: 'title',
    headerName: 'Anúncio',
    flex: 2,
    minWidth: 200,
    pinned: 'left',
    cellStyle: { fontWeight: '500', color: '#1e293b' },
    tooltipField: 'title'
  },
  {
    field: 'sku',
    headerName: 'SKU',
    width: 120,
    cellStyle: { color: '#64748b', fontSize: '12px', fontFamily: 'monospace' }
  },
  {
    field: 'campaign_name',
    headerName: 'Campanha',
    width: 160,
    cellStyle: { color: '#475569', fontSize: '13px' }
  },
  {
    field: 'status',
    headerName: 'Status',
    width: 110,
    cellRenderer: statusRenderer,
    cellStyle: { display: 'flex', alignItems: 'center' }
  },
  {
    field: 'impressions',
    headerName: 'Impressões',
    width: 180,
    cellRenderer: sparkRenderer,
    cellStyle: { display: 'flex', alignItems: 'center', padding: '0 8px' },
    type: 'numericColumn',
    comparator: (a, b) => a - b
  },
  {
    field: 'clicks',
    headerName: 'Cliques',
    width: 110,
    valueFormatter: (p) => numFmt(p.value),
    type: 'numericColumn'
  },
  {
    field: 'ctr',
    headerName: 'CTR',
    width: 100,
    cellRenderer: ctrRenderer,
    cellStyle: { display: 'flex', alignItems: 'center' },
    type: 'numericColumn'
  },
  {
    field: 'spend',
    headerName: 'Gasto',
    width: 120,
    valueFormatter: (p) => currFmt(p.value),
    type: 'numericColumn',
    sort: 'desc'
  },
  {
    field: 'cpc',
    headerName: 'CPC',
    width: 110,
    valueFormatter: (p) => currFmt(p.value),
    type: 'numericColumn'
  },
  {
    field: 'conversions',
    headerName: 'Conversões',
    width: 120,
    valueFormatter: (p) => numFmt(p.value),
    type: 'numericColumn'
  },
  {
    field: 'roas',
    headerName: 'ROAS',
    width: 100,
    cellRenderer: roasRenderer,
    cellStyle: { display: 'flex', alignItems: 'center' },
    type: 'numericColumn'
  }
])

const defaultColDef = ref({
  sortable: true,
  resizable: true,
  filter: true
})

const filteredAds = computed(() => {
  let data = adsStore.ads
  if (statusFilter.value) data = data.filter(a => a.status === statusFilter.value)
  if (campaignFilter.value) data = data.filter(a => a.campaign_name === campaignFilter.value)
  if (quickFilter.value) {
    const q = quickFilter.value.toLowerCase()
    data = data.filter(a =>
      a.title?.toLowerCase().includes(q) || a.sku?.toLowerCase().includes(q)
    )
  }
  return data
})

const summary = computed(() => {
  const data = filteredAds.value
  const totalSpend = data.reduce((s, a) => s + a.spend, 0)
  const totalClicks = data.reduce((s, a) => s + a.clicks, 0)
  const totalImpressions = data.reduce((s, a) => s + a.impressions, 0)
  const totalConversions = data.reduce((s, a) => s + a.conversions, 0)
  const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : 0
  return [
    { label: 'Total anúncios', value: data.length },
    { label: 'Gasto total', value: currFmt(totalSpend) },
    { label: 'Cliques', value: numFmt(totalClicks) },
    { label: 'Conversões', value: numFmt(totalConversions) },
    { label: 'CTR médio', value: avgCtr + '%' }
  ]
})

function onGridReady(params) {
  gridApi = params.api
}

function onSelectionChanged() {
  selectedRows.value = gridApi?.getSelectedRows() || []
}

function clearSelection() {
  gridApi?.deselectAll()
}

function exportCsv() {
  gridApi?.exportDataAsCsv({ fileName: 'anuncios.csv' })
}

function bulkAction(status) {
  selectedRows.value.forEach(r => {
    const ad = adsStore.ads.find(a => a.id === r.id)
    if (ad) ad.status = status
  })
  const label = status === 'paused' ? 'pausados' : 'ativados'
  toast.add({ severity: 'success', summary: `Anúncios ${label}`, life: 2000 })
  clearSelection()
}

function renderBarChart() {
  const top10 = [...filteredAds.value]
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 10)
  if (!barChartRef.value || !top10.length) return

  const labels = top10.map(a => a.title.length > 30 ? a.title.substring(0, 30) + '…' : a.title)
  const data = top10.map(a => a[barMetric.value])
  const metric = barMetricOptions.find(o => o.value === barMetric.value)

  if (barChart) barChart.destroy()
  barChart = new Chart(barChartRef.value, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: metric?.label,
        data,
        backgroundColor: '#3483FA',
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const v = ctx.raw
              if (barMetric.value === 'spend' || barMetric.value === 'cpc') return ` ${currFmt(v)}`
              if (barMetric.value === 'roas') return ` ${v}x`
              return ` ${numFmt(v)}`
            }
          }
        }
      },
      scales: {
        x: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 } } },
        y: { grid: { display: false }, ticks: { font: { size: 11 } } }
      }
    }
  })
}

watch(filteredAds, async () => {
  await nextTick()
  renderBarChart()
})

async function loadAds() {
  loading.value = true
  try {
    const ads = isDemo.value ? getMockAds() : await getAds({ account_id: authStore.userId })
    adsStore.setAds(ads)
    await nextTick()
    renderBarChart()
  } finally {
    loading.value = false
  }
}

onMounted(() => loadAds())
</script>

<style scoped>
.ads-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.view-toolbar {
  background: white;
  border-radius: 12px;
  padding: 0.875rem 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  border: 1px solid #e2e8f0;
}

.toolbar-left, .toolbar-right {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  flex-wrap: wrap;
}

.search-input { width: 240px; }
.campaign-select { width: 180px; }
.status-select { width: 140px; }
.metric-select { width: 140px; }

/* Summary */
.summary-bar {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.summary-item {
  background: white;
  border-radius: 10px;
  padding: 0.75rem 1.125rem;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  flex: 1;
  min-width: 100px;
}

.summary-label {
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 500;
}

.summary-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1e293b;
}

/* Chart strip */
.chart-strip {
  background: white;
  border-radius: 12px;
  padding: 1.25rem;
  border: 1px solid #e2e8f0;
}

.strip-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.strip-header h3 {
  font-size: 0.95rem;
  font-weight: 600;
  color: #1e293b;
}

.strip-chart {
  height: 300px;
}

/* Grid */
.grid-card {
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.ads-grid {
  height: 550px;
  width: 100%;
}

/* Bulk bar */
.bulk-bar {
  position: fixed;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  background: #1e293b;
  color: white;
  padding: 0.875rem 1.5rem;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 8px 32px rgba(0,0,0,0.25);
  z-index: 200;
  font-size: 0.875rem;
}

.bulk-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.slide-up-enter-active,
.slide-up-leave-active { transition: all 0.25s ease; }
.slide-up-enter-from,
.slide-up-leave-to { opacity: 0; transform: translateX(-50%) translateY(20px); }
</style>
