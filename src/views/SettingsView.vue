<template>
  <div class="settings-view">
    <div class="settings-grid">
      <!-- API Credentials -->
      <div class="settings-card">
        <div class="card-header">
          <div class="card-icon" style="background:#eff6ff;">
            <i class="pi pi-key" style="color:#3483FA;" />
          </div>
          <div>
            <h3>Credenciais da API</h3>
            <p>Configure sua conexão com o Mercado Livre</p>
          </div>
        </div>

        <div class="form-section">
          <div class="field">
            <label>App ID (Client ID)</label>
            <InputText v-model="form.appId" class="w-full" placeholder="Seu App ID" />
          </div>
          <div class="field">
            <label>Secret Key</label>
            <Password v-model="form.secretKey" class="w-full" :feedback="false" toggleMask placeholder="Sua Secret Key" />
          </div>
          <div class="field">
            <label>Access Token atual</label>
            <div class="token-display">
              <code>{{ tokenPreview }}</code>
              <Button icon="pi pi-copy" text rounded v-tooltip="'Copiar'" @click="copyToken" />
            </div>
          </div>
          <div class="field-row">
            <Button label="Salvar credenciais" icon="pi pi-check" @click="saveCredentials" />
            <Button label="Reconectar OAuth" icon="pi pi-external-link" outlined @click="reconnect" :disabled="!form.appId || !form.secretKey" />
          </div>
        </div>

        <!-- Connection status -->
        <div class="connection-status" :class="connectionStatusClass">
          <i :class="connectionStatusIcon" />
          <span>{{ connectionStatusText }}</span>
        </div>
      </div>

      <!-- Refresh settings -->
      <div class="settings-card">
        <div class="card-header">
          <div class="card-icon" style="background:#f0fdf4;">
            <i class="pi pi-clock" style="color:#16a34a;" />
          </div>
          <div>
            <h3>Atualização Automática</h3>
            <p>Configure intervalos de atualização dos dados</p>
          </div>
        </div>

        <div class="form-section">
          <div class="field">
            <label>Intervalo de atualização</label>
            <Select
              v-model="refreshInterval"
              :options="refreshOptions"
              optionLabel="label"
              optionValue="value"
              class="w-full"
            />
          </div>
          <div class="field">
            <label>Última atualização</label>
            <div class="last-updated">
              <i class="pi pi-history" />
              <span>{{ lastUpdated }}</span>
            </div>
          </div>
          <div class="field">
            <div class="toggle-row">
              <div>
                <span class="toggle-label">Alertas de orçamento</span>
                <span class="toggle-sub">Notificar quando atingir 90% do orçamento</span>
              </div>
              <ToggleSwitch v-model="budgetAlerts" />
            </div>
          </div>
          <div class="field">
            <div class="toggle-row">
              <div>
                <span class="toggle-label">Alertas de ROAS</span>
                <span class="toggle-sub">Notificar quando ROAS cair abaixo de 3x</span>
              </div>
              <ToggleSwitch v-model="roasAlerts" />
            </div>
          </div>
          <Button label="Salvar preferências" icon="pi pi-check" @click="savePreferences" />
        </div>
      </div>

      <!-- Account info -->
      <div class="settings-card">
        <div class="card-header">
          <div class="card-icon" style="background:#fdf4ff;">
            <i class="pi pi-user" style="color:#9333ea;" />
          </div>
          <div>
            <h3>Conta Conectada</h3>
            <p>Informações da sua conta Mercado Livre</p>
          </div>
        </div>

        <div class="account-info" v-if="authStore.userInfo">
          <div class="account-avatar">{{ userInitials }}</div>
          <div class="account-details">
            <div class="account-name">{{ authStore.userInfo.nickname || 'Usuário' }}</div>
            <div class="account-id">ID: {{ authStore.userId }}</div>
          </div>
        </div>
        <div v-else class="no-account">
          <i class="pi pi-info-circle" />
          <span>Nenhuma conta conectada</span>
        </div>

        <div class="danger-zone">
          <h4>Zona de Risco</h4>
          <Button
            label="Desconectar conta"
            icon="pi pi-sign-out"
            severity="danger"
            outlined
            @click="confirmLogout"
          />
        </div>
      </div>

      <!-- About -->
      <div class="settings-card">
        <div class="card-header">
          <div class="card-icon" style="background:#fff7ed;">
            <i class="pi pi-info-circle" style="color:#ea580c;" />
          </div>
          <div>
            <h3>Sobre o ML Ad Tracker</h3>
            <p>Versão e informações do sistema</p>
          </div>
        </div>

        <div class="about-info">
          <div class="about-item">
            <span class="about-key">Versão</span>
            <span class="about-val">1.0.0</span>
          </div>
          <div class="about-item">
            <span class="about-key">Stack</span>
            <span class="about-val">Vue 3 + PrimeVue + AG Grid</span>
          </div>
          <div class="about-item">
            <span class="about-key">API</span>
            <span class="about-val">Mercado Livre Advertising API</span>
          </div>
          <div class="about-item">
            <span class="about-key">Modo</span>
            <span class="about-val">
              <Tag :severity="isDemo ? 'warn' : 'success'" :value="isDemo ? 'Demo' : 'Produção'" />
            </span>
          </div>
        </div>

        <div class="links">
          <a href="https://developers.mercadolivre.com.br/pt_br/api-docs-anuncios" target="_blank">
            <i class="pi pi-external-link" /> Documentação da API
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'primevue/usetoast'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Select from 'primevue/select'
import Button from 'primevue/button'
import ToggleSwitch from 'primevue/toggleswitch'
import Tag from 'primevue/tag'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

const isDemo = computed(() => authStore.accessToken === 'DEMO_MODE')

const form = ref({
  appId: authStore.appId,
  secretKey: authStore.secretKey
})

const refreshInterval = ref('300')
const budgetAlerts = ref(true)
const roasAlerts = ref(true)

const refreshOptions = [
  { label: 'A cada 1 minuto', value: '60' },
  { label: 'A cada 5 minutos', value: '300' },
  { label: 'A cada 15 minutos', value: '900' },
  { label: 'A cada 30 minutos', value: '1800' },
  { label: 'A cada hora', value: '3600' },
  { label: 'Manual', value: '0' }
]

const lastUpdated = computed(() => new Date().toLocaleString('pt-BR'))

const tokenPreview = computed(() => {
  const t = authStore.accessToken
  if (!t) return 'Nenhum token configurado'
  if (t === 'DEMO_MODE') return 'DEMO_MODE (token simulado)'
  return t.substring(0, 20) + '...' + t.substring(t.length - 8)
})

const userInitials = computed(() => {
  const name = authStore.userInfo?.nickname || 'U'
  return name.substring(0, 2).toUpperCase()
})

const connectionStatusClass = computed(() => {
  if (!authStore.isAuthenticated) return 'status-disconnected'
  if (isDemo.value) return 'status-demo'
  return 'status-connected'
})

const connectionStatusIcon = computed(() => {
  if (!authStore.isAuthenticated) return 'pi pi-times-circle'
  if (isDemo.value) return 'pi pi-info-circle'
  return 'pi pi-check-circle'
})

const connectionStatusText = computed(() => {
  if (!authStore.isAuthenticated) return 'Desconectado'
  if (isDemo.value) return 'Conectado em modo Demo'
  return 'Conectado — Conta real'
})

function saveCredentials() {
  authStore.setCredentials({ appId: form.value.appId, secretKey: form.value.secretKey })
  toast.add({ severity: 'success', summary: 'Credenciais salvas!', life: 2000 })
}

function reconnect() {
  authStore.setCredentials({ appId: form.value.appId, secretKey: form.value.secretKey })
  const redirectUri = window.location.origin + '/callback'
  const authUrl = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${form.value.appId}&redirect_uri=${encodeURIComponent(redirectUri)}`
  window.location.href = authUrl
}

function copyToken() {
  navigator.clipboard.writeText(authStore.accessToken)
  toast.add({ severity: 'info', summary: 'Token copiado!', life: 1500 })
}

function savePreferences() {
  toast.add({ severity: 'success', summary: 'Preferências salvas!', life: 2000 })
}

function confirmLogout() {
  authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.settings-view {
  max-width: 1100px;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(480px, 1fr));
  gap: 1.25rem;
}

.settings-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.card-header {
  display: flex;
  align-items: flex-start;
  gap: 0.875rem;
}

.card-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 1.1rem;
}

.card-header h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 0.2rem;
}

.card-header p {
  font-size: 0.8rem;
  color: #64748b;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.field label {
  font-size: 0.825rem;
  font-weight: 500;
  color: #374151;
}

.field-row {
  display: flex;
  gap: 0.625rem;
  flex-wrap: wrap;
}

.w-full { width: 100%; }

.token-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
}

.token-display code {
  flex: 1;
  font-size: 0.8rem;
  color: #475569;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Connection status */
.connection-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.875rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
}

.status-connected { background: #f0fdf4; color: #16a34a; }
.status-demo { background: #fef9c3; color: #ca8a04; }
.status-disconnected { background: #fee2e2; color: #dc2626; }

/* Toggle */
.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.toggle-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #1e293b;
  display: block;
}

.toggle-sub {
  font-size: 0.775rem;
  color: #64748b;
  display: block;
  margin-top: 2px;
}

/* Last updated */
.last-updated {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  color: #64748b;
  background: #f8fafc;
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
}

/* Account */
.account-info {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.875rem;
  background: #f8fafc;
  border-radius: 10px;
}

.account-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #3483FA;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1rem;
  flex-shrink: 0;
}

.account-name {
  font-weight: 600;
  color: #1e293b;
  font-size: 0.95rem;
}

.account-id {
  font-size: 0.8rem;
  color: #64748b;
  font-family: monospace;
  margin-top: 2px;
}

.no-account {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #94a3b8;
  font-size: 0.875rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 10px;
}

.danger-zone {
  border-top: 1px solid #fee2e2;
  padding-top: 1rem;
}

.danger-zone h4 {
  font-size: 0.8rem;
  font-weight: 500;
  color: #dc2626;
  margin-bottom: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* About */
.about-info {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.about-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.875rem;
}

.about-key {
  color: #64748b;
  width: 100px;
  flex-shrink: 0;
}

.about-val {
  font-weight: 500;
  color: #1e293b;
}

.links {
  border-top: 1px solid #f1f5f9;
  padding-top: 0.875rem;
}

.links a {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: #3483FA;
  font-size: 0.85rem;
  text-decoration: none;
}

.links a:hover {
  text-decoration: underline;
}
</style>
