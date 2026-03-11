<template>
  <div class="campaigns-view">
    <!-- Toolbar -->
    <div class="view-toolbar">
      <div class="toolbar-left">
        <InputText
          v-model="quickFilter"
          placeholder="Buscar campanha..."
          prefix-icon="pi pi-search"
          class="search-input"
          @input="onFilterChange"
        />
        <Select
          v-model="statusFilter"
          :options="statusOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Status"
          class="status-select"
          @change="onFilterChange"
        />
      </div>
      <div class="toolbar-right">
        <Button
          icon="pi pi-refresh"
          label="Atualizar"
          outlined
          @click="loadCampaigns"
          :loading="loading"
        />
        <Button
          icon="pi pi-download"
          label="Exportar CSV"
          outlined
          @click="exportCsv"
        />
      </div>
    </div>

    <!-- Summary bar -->
    <div class="summary-bar">
      <div class="summary-item" v-for="s in summary" :key="s.label">
        <span class="summary-label">{{ s.label }}</span>
        <span class="summary-value">{{ s.value }}</span>
      </div>
    </div>

    <!-- AG Grid -->
    <div class="grid-card">
      <AgGridVue
        class="ag-theme-alpine campaign-grid"
        :rowData="filteredCampaigns"
        :columnDefs="columnDefs"
        :defaultColDef="defaultColDef"
        :gridOptions="gridOptions"
        :pagination="true"
        :paginationPageSize="20"
        :animateRows="true"
        :rowSelection="'multiple'"
        @grid-ready="onGridReady"
        @selection-changed="onSelectionChanged"
      />
    </div>

    <!-- Bulk action bar (appears when rows are selected) -->
    <Transition name="slide-up">
      <div class="bulk-bar" v-if="selectedRows.length > 0">
        <span>{{ selectedRows.length }} campanhas selecionadas</span>
        <div class="bulk-actions">
          <Button label="Pausar" icon="pi pi-pause" severity="warn" outlined size="small" @click="bulkPause" />
          <Button label="Ativar" icon="pi pi-play" severity="success" outlined size="small" @click="bulkEnable" />
          <Button label="Limpar seleção" text size="small" @click="clearSelection" />
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { AgGridVue } from 'ag-grid-vue3'
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'
import { useAdsStore } from '@/stores/ads'
import { useAuthStore } from '@/stores/auth'
import { getMockCampaigns, getCampaigns, updateCampaign } from '@/services/mlApi'
import { useToast } from 'primevue/usetoast'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Button from 'primevue/button'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

ModuleRegistry.registerModules([AllCommunityModule])

const adsStore = useAdsStore()
const authStore = useAuthStore()
const toast = useToast()
const loading = ref(false)
const quickFilter = ref('')
const statusFilter = ref('')
const selectedRows = ref([])
let gridApi = null

const isDemo = computed(() => authStore.accessToken === 'DEMO_MODE')

const statusOptions = [
  { label: 'Todos', value: '' },
  { label: 'Ativas', value: 'enabled' },
  { label: 'Pausadas', value: 'paused' },
  { label: 'Inativas', value: 'disabled' }
]

// Formatters
function currFmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
}

function numFmt(v) {
  return new Intl.NumberFormat('pt-BR').format(v || 0)
}

// Status cell renderer
function statusRenderer(params) {
  const map = {
    enabled: '<span style="background:#dcfce7;color:#16a34a;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:500;">Ativa</span>',
    paused: '<span style="background:#fef9c3;color:#ca8a04;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:500;">Pausada</span>',
    disabled: '<span style="background:#fee2e2;color:#dc2626;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:500;">Inativa</span>'
  }
  return map[params.value] || params.value
}

// ROAS with color
function roasRenderer(params) {
  const v = params.value || 0
  const color = v >= 8 ? '#16a34a' : v >= 4 ? '#ca8a04' : '#dc2626'
  return `<span style="color:${color};font-weight:600;">${v}x</span>`
}

// CTR renderer
function ctrRenderer(params) {
  const v = params.value || 0
  const color = v >= 2.5 ? '#16a34a' : v >= 1.5 ? '#ca8a04' : '#dc2626'
  return `<span style="color:${color};font-weight:500;">${v}%</span>`
}

// Budget bar renderer
function budgetBarRenderer(params) {
  const row = params.data
  if (!row) return ''
  const pct = row.budget > 0 ? Math.min(100, Math.round((row.spend / row.budget) * 100)) : 0
  const color = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#3483FA'
  return `
    <div style="display:flex;flex-direction:column;gap:2px;padding-top:4px;">
      <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;">
        <span>${currFmt(row.spend)}</span><span>${pct}%</span>
      </div>
      <div style="height:5px;background:#f1f5f9;border-radius:3px;overflow:hidden;">
        <div style="height:100%;width:${pct}%;background:${color};border-radius:3px;"></div>
      </div>
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
    field: 'name',
    headerName: 'Campanha',
    flex: 2,
    minWidth: 180,
    pinned: 'left',
    cellStyle: { fontWeight: '500', color: '#1e293b' }
  },
  {
    field: 'status',
    headerName: 'Status',
    width: 120,
    cellRenderer: statusRenderer,
    cellStyle: { display: 'flex', alignItems: 'center' }
  },
  {
    field: 'budget',
    headerName: 'Orçamento',
    width: 130,
    valueFormatter: (p) => currFmt(p.value),
    type: 'numericColumn'
  },
  {
    field: 'spend',
    headerName: 'Gasto / Budget',
    width: 190,
    cellRenderer: budgetBarRenderer,
    rowHeight: 60
  },
  {
    field: 'impressions',
    headerName: 'Impressões',
    width: 130,
    valueFormatter: (p) => numFmt(p.value),
    type: 'numericColumn'
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
    field: 'cpc',
    headerName: 'CPC',
    width: 110,
    valueFormatter: (p) => currFmt(p.value),
    type: 'numericColumn'
  },
  {
    field: 'conversions',
    headerName: 'Conversões',
    width: 130,
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
  filter: true,
  floatingFilter: false
})

const gridOptions = ref({
  rowHeight: 48,
  suppressMovableColumns: false,
  enableCellTextSelection: true
})

const filteredCampaigns = computed(() => {
  let data = adsStore.campaigns
  if (statusFilter.value) {
    data = data.filter(c => c.status === statusFilter.value)
  }
  if (quickFilter.value) {
    const q = quickFilter.value.toLowerCase()
    data = data.filter(c => c.name.toLowerCase().includes(q))
  }
  return data
})

const summary = computed(() => {
  const data = filteredCampaigns.value
  const totalSpend = data.reduce((s, c) => s + c.spend, 0)
  const totalImpressions = data.reduce((s, c) => s + c.impressions, 0)
  const totalClicks = data.reduce((s, c) => s + c.clicks, 0)
  const avgRoas = data.length > 0 ? (data.reduce((s, c) => s + c.roas, 0) / data.length).toFixed(1) : 0
  return [
    { label: 'Total campanhas', value: data.length },
    { label: 'Gasto total', value: currFmt(totalSpend) },
    { label: 'Impressões', value: numFmt(totalImpressions) },
    { label: 'Cliques', value: numFmt(totalClicks) },
    { label: 'ROAS médio', value: avgRoas + 'x' }
  ]
})

function onGridReady(params) {
  gridApi = params.api
}

function onFilterChange() {
  // filteredCampaigns computed handles it
}

function onSelectionChanged() {
  selectedRows.value = gridApi?.getSelectedRows() || []
}

function clearSelection() {
  gridApi?.deselectAll()
}

function exportCsv() {
  gridApi?.exportDataAsCsv({ fileName: 'campanhas.csv' })
}

async function bulkPause() {
  if (isDemo.value) {
    selectedRows.value.forEach(r => {
      const c = adsStore.campaigns.find(c => c.id === r.id)
      if (c) c.status = 'paused'
    })
    toast.add({ severity: 'success', summary: 'Campanhas pausadas', life: 2000 })
    clearSelection()
    return
  }
  for (const row of selectedRows.value) {
    await updateCampaign(row.id, { status: 'paused' })
  }
  await loadCampaigns()
  toast.add({ severity: 'success', summary: 'Campanhas pausadas', life: 2000 })
  clearSelection()
}

async function bulkEnable() {
  if (isDemo.value) {
    selectedRows.value.forEach(r => {
      const c = adsStore.campaigns.find(c => c.id === r.id)
      if (c) c.status = 'enabled'
    })
    toast.add({ severity: 'success', summary: 'Campanhas ativadas', life: 2000 })
    clearSelection()
    return
  }
  for (const row of selectedRows.value) {
    await updateCampaign(row.id, { status: 'enabled' })
  }
  await loadCampaigns()
  toast.add({ severity: 'success', summary: 'Campanhas ativadas', life: 2000 })
  clearSelection()
}

async function loadCampaigns() {
  loading.value = true
  try {
    const campaigns = isDemo.value
      ? getMockCampaigns()
      : await getCampaigns(authStore.userId)
    adsStore.setCampaigns(campaigns)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (!adsStore.campaigns.length) loadCampaigns()
})
</script>

<style scoped>
.campaigns-view {
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

.search-input {
  width: 240px;
}

.status-select {
  width: 150px;
}

/* Summary bar */
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

/* Grid */
.grid-card {
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.campaign-grid {
  height: 520px;
  width: 100%;
}

/* Bulk action bar */
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
.slide-up-leave-active {
  transition: all 0.25s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}
</style>
