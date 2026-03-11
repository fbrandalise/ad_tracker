<template>
  <div class="callback-page">
    <div class="callback-card">
      <ProgressSpinner v-if="loading" strokeWidth="4" />
      <div v-else-if="error" class="error-state">
        <i class="pi pi-times-circle" style="font-size: 3rem; color: #ef4444;" />
        <h2>Erro na Autenticação</h2>
        <p>{{ error }}</p>
        <Button label="Voltar ao Login" icon="pi pi-arrow-left" @click="$router.push('/login')" />
      </div>
      <div v-else class="success-state">
        <i class="pi pi-check-circle" style="font-size: 3rem; color: #22c55e;" />
        <h2>Conectado com sucesso!</h2>
        <p>Redirecionando para o dashboard...</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { exchangeCodeForToken, getMe } from '@/services/mlApi'
import ProgressSpinner from 'primevue/progressspinner'
import Button from 'primevue/button'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const loading = ref(true)
const error = ref(null)

onMounted(async () => {
  const code = route.query.code
  const errParam = route.query.error

  if (errParam) {
    error.value = `Autorização negada: ${errParam}`
    loading.value = false
    return
  }

  if (!code) {
    error.value = 'Código de autorização não encontrado na URL.'
    loading.value = false
    return
  }

  try {
    const redirectUri = window.location.origin + '/callback'
    const tokenData = await exchangeCodeForToken(
      code,
      authStore.appId,
      authStore.secretKey,
      redirectUri
    )
    authStore.setTokens(tokenData)

    // Fetch user info
    try {
      const me = await getMe()
      authStore.setUserInfo(me)
    } catch {}

    loading.value = false
    setTimeout(() => router.push('/dashboard'), 1500)
  } catch (e) {
    error.value = e.response?.data?.message || 'Falha ao trocar o código pelo token.'
    loading.value = false
  }
})
</script>

<style scoped>
.callback-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.callback-card {
  background: white;
  border-radius: 16px;
  padding: 3rem 2rem;
  text-align: center;
  min-width: 320px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}

.error-state, .success-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

h2 {
  font-size: 1.3rem;
  font-weight: 600;
  color: #1e293b;
}

p {
  color: #64748b;
  font-size: 0.9rem;
}
</style>
