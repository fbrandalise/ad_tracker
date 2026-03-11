<template>
  <div class="login-page">
    <div class="login-container">
      <!-- Header -->
      <div class="login-header">
        <div class="logo-area">
          <div class="logo-icon">
            <i class="pi pi-chart-bar" style="font-size: 2rem; color: #3483FA;" />
          </div>
          <h1 class="app-title">ML Ad Tracker</h1>
          <p class="app-subtitle">Monitor de Performance de Anúncios</p>
        </div>
      </div>

      <!-- Config form -->
      <div class="login-card">
        <Tabs v-model:value="activeTab">
          <TabList>
            <Tab value="oauth">Conectar com ML</Tab>
            <Tab value="token">Token Manual</Tab>
            <Tab value="demo">Modo Demo</Tab>
          </TabList>

          <TabPanels>
            <!-- OAuth Tab -->
            <TabPanel value="oauth">
              <div class="tab-content">
                <p class="info-text">
                  Insira as credenciais do seu aplicativo no Mercado Livre Developers para iniciar a autenticação OAuth.
                </p>
                <div class="field">
                  <label>App ID (Client ID)</label>
                  <InputText v-model="appId" placeholder="Ex: 1234567890" class="w-full" />
                </div>
                <div class="field">
                  <label>Secret Key (Client Secret)</label>
                  <Password v-model="secretKey" placeholder="Sua secret key" class="w-full" :feedback="false" toggleMask />
                </div>
                <div class="field">
                  <label>Redirect URI</label>
                  <InputText v-model="redirectUri" class="w-full" />
                  <small class="hint">Configure este URI no painel do seu app ML</small>
                </div>
                <Button
                  label="Conectar com Mercado Livre"
                  icon="pi pi-external-link"
                  class="w-full mt-3"
                  :disabled="!appId || !secretKey"
                  @click="startOAuth"
                />
              </div>
            </TabPanel>

            <!-- Manual Token Tab -->
            <TabPanel value="token">
              <div class="tab-content">
                <p class="info-text">
                  Cole seu Access Token diretamente para autenticar. Ideal para testes rápidos.
                </p>
                <div class="field">
                  <label>Access Token</label>
                  <Textarea v-model="manualToken" placeholder="Cole seu access_token aqui..." rows="4" class="w-full" />
                </div>
                <div class="field">
                  <label>User ID</label>
                  <InputText v-model="manualUserId" placeholder="Seu user_id do Mercado Livre" class="w-full" />
                </div>
                <Button
                  label="Entrar com Token"
                  icon="pi pi-sign-in"
                  class="w-full mt-3"
                  :disabled="!manualToken || !manualUserId"
                  @click="loginWithToken"
                />
              </div>
            </TabPanel>

            <!-- Demo Tab -->
            <TabPanel value="demo">
              <div class="tab-content demo-tab">
                <div class="demo-icon">
                  <i class="pi pi-play-circle" style="font-size: 3rem; color: #3483FA;" />
                </div>
                <h3>Modo Demonstração</h3>
                <p class="info-text">
                  Explore todas as funcionalidades com dados simulados. Ideal para conhecer a ferramenta antes de conectar sua conta real.
                </p>
                <ul class="feature-list">
                  <li><i class="pi pi-check" /> Dashboard com KPIs em tempo real</li>
                  <li><i class="pi pi-check" /> Tabela de campanhas com AG Grid</li>
                  <li><i class="pi pi-check" /> Relatório de anúncios detalhado</li>
                  <li><i class="pi pi-check" /> Gráficos de performance diária</li>
                </ul>
                <Button
                  label="Entrar em Modo Demo"
                  icon="pi pi-eye"
                  severity="secondary"
                  class="w-full mt-3"
                  @click="enterDemo"
                />
              </div>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>

      <p class="footer-text">
        <a href="https://developers.mercadolivre.com.br" target="_blank">
          <i class="pi pi-external-link" /> Mercado Livre Developers
        </a>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'primevue/usetoast'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

const activeTab = ref('oauth')
const appId = ref(authStore.appId || '')
const secretKey = ref(authStore.secretKey || '')
const redirectUri = ref(window.location.origin + '/callback')
const manualToken = ref('')
const manualUserId = ref('')

function startOAuth() {
  authStore.setCredentials({ appId: appId.value, secretKey: secretKey.value })
  const authUrl = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${appId.value}&redirect_uri=${encodeURIComponent(redirectUri.value)}`
  window.location.href = authUrl
}

async function loginWithToken() {
  try {
    authStore.setTokens({
      access_token: manualToken.value,
      refresh_token: '',
      user_id: manualUserId.value
    })
    toast.add({ severity: 'success', summary: 'Conectado!', detail: 'Token configurado com sucesso.', life: 3000 })
    router.push('/dashboard')
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Token inválido.', life: 3000 })
  }
}

function enterDemo() {
  authStore.setTokens({
    access_token: 'DEMO_MODE',
    refresh_token: '',
    user_id: 'demo'
  })
  authStore.setUserInfo({ nickname: 'Demo User', email: 'demo@exemplo.com' })
  router.push('/dashboard')
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.login-container {
  width: 100%;
  max-width: 480px;
}

.login-header {
  text-align: center;
  margin-bottom: 2rem;
}

.logo-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.logo-icon {
  width: 64px;
  height: 64px;
  background: #ffe600;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.app-title {
  color: white;
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0;
}

.app-subtitle {
  color: rgba(255,255,255,0.6);
  font-size: 0.9rem;
}

.login-card {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}

.tab-content {
  padding: 1rem 0;
}

.demo-tab {
  text-align: center;
}

.demo-icon {
  margin-bottom: 1rem;
}

.demo-tab h3 {
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: #1e293b;
}

.info-text {
  color: #64748b;
  font-size: 0.875rem;
  margin-bottom: 1.25rem;
  line-height: 1.6;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-bottom: 1rem;
}

.field label {
  font-weight: 500;
  font-size: 0.875rem;
  color: #374151;
}

.hint {
  color: #94a3b8;
  font-size: 0.75rem;
}

.feature-list {
  list-style: none;
  text-align: left;
  display: inline-block;
  margin-bottom: 1rem;
}

.feature-list li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0;
  font-size: 0.875rem;
  color: #374151;
}

.feature-list li i {
  color: #16a34a;
  font-size: 0.8rem;
}

.footer-text {
  text-align: center;
  margin-top: 1.5rem;
}

.footer-text a {
  color: rgba(255,255,255,0.5);
  font-size: 0.8rem;
  text-decoration: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
}

.footer-text a:hover {
  color: white;
}

.w-full {
  width: 100%;
}

.mt-3 {
  margin-top: 0.75rem;
}
</style>
