<template>
  <div class="listings-view">
    <!-- Toolbar -->
    <div class="view-toolbar">
      <div class="toolbar-left">
        <InputText v-model="quickFilter" placeholder="Buscar por título ou ID..." class="search-input" />
        <Select
          v-model="statusFilter"
          :options="statusOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Status"
          class="status-select"
        />
        <Select
          v-model="conditionFilter"
          :options="conditionOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Condição"
          class="condition-select"
        />
      </div>
      <div class="toolbar-right">
        <Button icon="pi pi-refresh" label="Atualizar" outlined @click="loadListings" :loading="loading" />
        <Button icon="pi pi-download" label="CSV" outlined @click="exportCsv" />
        <Button icon="pi pi-external-link" label="Ver no ML" outlined @click="openSelected" :disabled="selectedRows.length !== 1" />
      </div>
    </div>

    <!-- Summary -->
    <div class="summary-bar">
      <div class="summary-item" v-for="s in summary" :key="s.label">
        <span class="summary-label">{{ s.label }}</span>
        <span class="summary-value">{{ s.value }}</span>
      </div>
    </div>

    <!-- Loading progress -->
    <div v-if="loading" class="loading-card">
      <i class="pi pi-spin pi-spinner" style="font-size:1.5rem;color:#3483FA" />
      <span>Carregando anúncios... {{ items.length }} carregados</span>
    </div>

    <!-- AG Grid -->
    <div class="grid-card" v-else>
      <AgGridVue
        class="ag-theme-alpine listings-grid"
        :rowData="filteredItems"
        :columnDefs="columnDefs"
        :defaultColDef="defaultColDef"
        :pagination="true"
        :paginationPageSize="50"
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
          <Button
            v-if="selectedRows.length === 1"
            label="Abrir no ML"
            icon="pi pi-external-link"
            severity="info"
            outlined
            size="small"
            @click="openSelected"
          />
          <Button label="Limpar" text size="small" @click="clearSelection" />
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { AgGridVue } from 'ag-grid-vue3'
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'
import { useAuthStore } from '@/stores/auth'
import { getAllUserItems, getMockListings } from '@/services/mlApi'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Button from 'primevue/button'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

ModuleRegistry.registerModules([AllCommunityModule])

const authStore = useAuthStore()
const loading = ref(false)
const items = ref([])
const quickFilter = ref('')
const statusFilter = ref('')
const conditionFilter = ref('')
const selectedRows = ref([])
let gridApi = null

const isDemo = computed(() => authStore.accessToken === 'DEMO_MODE')

const statusOptions = [
  { label: 'Todos', value: '' },
  { label: 'Ativo', value: 'active' },
  { label: 'Pausado', value: 'paused' },
  { label: 'Fechado', value: 'closed' },
  { label: 'Em revisão', value: 'under_review' }
]

const conditionOptions = [
  { label: 'Todos', value: '' },
  { label: 'Novo', value: 'new' },
  { label: 'Usado', value: 'used' }
]

function currFmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
}

function numFmt(v) {
  return new Intl.NumberFormat('pt-BR').format(v || 0)
}

function statusRenderer(params) {
  const map = {
    active: '<span style="background:#dcfce7;color:#16a34a;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:500;">Ativo</span>',
    paused: '<span style="background:#fef9c3;color:#ca8a04;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:500;">Pausado</span>',
    closed: '<span style="background:#fee2e2;color:#dc2626;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:500;">Fechado</span>',
    under_review: '<span style="background:#e0e7ff;color:#4338ca;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:500;">Em revisão</span>',
    inactive: '<span style="background:#f1f5f9;color:#64748b;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:500;">Inativo</span>'
  }
  return map[params.value] || `<span>${params.value}</span>`
}

function conditionRenderer(params) {
  return params.value === 'new'
    ? '<span style="background:#dbeafe;color:#1d4ed8;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:500;">Novo</span>'
    : '<span style="background:#f3f4f6;color:#374151;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:500;">Usado</span>'
}

function thumbnailRenderer(params) {
  if (!params.value) return ''
  return `<img src="${params.value}" style="width:40px;height:40px;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0;" onerror="this.style.display='none'" />`
}

function linkRenderer(params) {
  if (!params.value) return ''
  const id = params.data?.id || ''
  return `<a href="${params.value}" target="_blank" style="color:#3483FA;font-size:12px;font-family:monospace;">${id}</a>`
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
    field: 'thumbnail',
    headerName: '',
    width: 70,
    cellRenderer: thumbnailRenderer,
    cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
    sortable: false,
    filter: false
  },
  {
    field: 'title',
    headerName: 'Título',
    flex: 2,
    minWidth: 250,
    pinned: 'left',
    cellStyle: { fontWeight: '500', color: '#1e293b' },
    tooltipField: 'title'
  },
  {
    field: 'permalink',
    headerName: 'ID',
    width: 160,
    cellRenderer: linkRenderer,
    cellStyle: { display: 'flex', alignItems: 'center' },
    sortable: false
  },
  {
    field: 'status',
    headerName: 'Status',
    width: 120,
    cellRenderer: statusRenderer,
    cellStyle: { display: 'flex', alignItems: 'center' }
  },
  {
    field: 'condition',
    headerName: 'Condição',
    width: 110,
    cellRenderer: conditionRenderer,
    cellStyle: { display: 'flex', alignItems: 'center' }
  },
  {
    field: 'price',
    headerName: 'Preço',
    width: 130,
    valueFormatter: (p) => currFmt(p.value),
    type: 'numericColumn',
    sort: 'desc'
  },
  {
    field: 'available_quantity',
    headerName: 'Estoque',
    width: 110,
    valueFormatter: (p) => numFmt(p.value),
    type: 'numericColumn',
    cellStyle: (p) => ({
      color: p.value === 0 ? '#dc2626' : p.value <= 5 ? '#ca8a04' : '#16a34a',
      fontWeight: '600'
    })
  },
  {
    field: 'sold_quantity',
    headerName: 'Vendidos',
    width: 110,
    valueFormatter: (p) => numFmt(p.value),
    type: 'numericColumn'
  }
])

const defaultColDef = ref({
  sortable: true,
  resizable: true,
  filter: true
})

const filteredItems = computed(() => {
  let data = items.value
  if (statusFilter.value) data = data.filter(i => i.status === statusFilter.value)
  if (conditionFilter.value) data = data.filter(i => i.condition === conditionFilter.value)
  if (quickFilter.value) {
    const q = quickFilter.value.toLowerCase()
    data = data.filter(i => i.title?.toLowerCase().includes(q) || i.id?.toLowerCase().includes(q))
  }
  return data
})

const summary = computed(() => {
  const data = filteredItems.value
  const active = data.filter(i => i.status === 'active').length
  const paused = data.filter(i => i.status === 'paused').length
  const totalStock = data.reduce((s, i) => s + (i.available_quantity || 0), 0)
  const totalSold = data.reduce((s, i) => s + (i.sold_quantity || 0), 0)
  const avgPrice = data.length ? data.reduce((s, i) => s + (i.price || 0), 0) / data.length : 0
  return [
    { label: 'Total de anúncios', value: data.length },
    { label: 'Ativos', value: active },
    { label: 'Pausados', value: paused },
    { label: 'Estoque total', value: numFmt(totalStock) },
    { label: 'Total vendidos', value: numFmt(totalSold) },
    { label: 'Preço médio', value: currFmt(avgPrice) }
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
  gridApi?.exportDataAsCsv({ fileName: 'meus-anuncios.csv' })
}

function openSelected() {
  const row = selectedRows.value[0]
  if (row?.permalink) window.open(row.permalink, '_blank')
}

async function loadListings() {
  loading.value = true
  items.value = []
  try {
    items.value = isDemo.value
      ? getMockListings()
      : await getAllUserItems(authStore.userId)
  } finally {
    loading.value = false
  }
}

onMounted(() => loadListings())
</script>

<style scoped>
.listings-view {
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

.search-input { width: 260px; }
.status-select { width: 140px; }
.condition-select { width: 130px; }

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

.loading-card {
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  padding: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: #64748b;
  font-size: 0.95rem;
}

.grid-card {
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.listings-grid {
  height: 600px;
  width: 100%;
}

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
