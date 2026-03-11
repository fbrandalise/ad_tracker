<template>
  <div class="layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="brand">
          <div class="brand-icon">
            <i class="pi pi-chart-bar" />
          </div>
          <span class="brand-name">ML Ad Tracker</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <router-link to="/dashboard" class="nav-item" active-class="nav-item--active">
          <i class="pi pi-home" />
          <span>Dashboard</span>
        </router-link>
        <router-link to="/campaigns" class="nav-item" active-class="nav-item--active">
          <i class="pi pi-megaphone" />
          <span>Campanhas</span>
        </router-link>
        <router-link to="/ads" class="nav-item" active-class="nav-item--active">
          <i class="pi pi-tag" />
          <span>Anúncios</span>
        </router-link>
        <router-link to="/listings" class="nav-item" active-class="nav-item--active">
          <i class="pi pi-shopping-bag" />
          <span>Meus Anúncios</span>
        </router-link>
        <router-link to="/metrics" class="nav-item" active-class="nav-item--active">
          <i class="pi pi-chart-line" />
          <span>Métricas</span>
        </router-link>
        <router-link to="/questions" class="nav-item" active-class="nav-item--active">
          <i class="pi pi-comments" />
          <span>Perguntas</span>
        </router-link>
        <router-link to="/settings" class="nav-item" active-class="nav-item--active">
          <i class="pi pi-cog" />
          <span>Configurações</span>
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <div class="user-info" v-if="authStore.userInfo">
          <div class="user-avatar">
            {{ userInitials }}
          </div>
          <div class="user-details">
            <span class="user-name">{{ authStore.userInfo.nickname || 'Usuário' }}</span>
            <span class="user-tag" :class="isDemo ? 'tag-demo' : 'tag-live'">
              {{ isDemo ? 'Demo' : 'Live' }}
            </span>
          </div>
        </div>
        <button class="logout-btn" @click="logout">
          <i class="pi pi-sign-out" />
        </button>
      </div>
    </aside>

    <!-- Main content -->
    <main class="main-content">
      <header class="topbar">
        <div class="topbar-left">
          <h2 class="page-title">{{ currentPageTitle }}</h2>
        </div>
        <div class="topbar-right">
          <Tag v-if="isDemo" severity="warn" value="Modo Demo" icon="pi pi-info-circle" />
          <Button
            icon="pi pi-refresh"
            text
            rounded
            v-tooltip.bottom="'Atualizar dados'"
            @click="$emit('refresh')"
          />
        </div>
      </header>

      <div class="page-content">
        <router-view />
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import Button from 'primevue/button'
import Tag from 'primevue/tag'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const isDemo = computed(() => authStore.accessToken === 'DEMO_MODE')

const userInitials = computed(() => {
  const name = authStore.userInfo?.nickname || 'U'
  return name.substring(0, 2).toUpperCase()
})

const pageTitles = {
  Dashboard: 'Dashboard',
  Campaigns: 'Campanhas',
  Ads: 'Anúncios',
  Listings: 'Meus Anúncios',
  Metrics: 'Métricas',
  Questions: 'Perguntas e Respostas',
  Settings: 'Configurações'
}

const currentPageTitle = computed(() => pageTitles[route.name] || 'ML Ad Tracker')

function logout() {
  authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
}

/* Sidebar */
.sidebar {
  width: 240px;
  min-width: 240px;
  background: #1e293b;
  color: white;
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  z-index: 100;
}

.sidebar-header {
  padding: 1.25rem 1rem;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.brand-icon {
  width: 36px;
  height: 36px;
  background: #ffe600;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1e293b;
  font-size: 1.1rem;
}

.brand-name {
  font-weight: 700;
  font-size: 1rem;
  color: white;
}

.sidebar-nav {
  flex: 1;
  padding: 1rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.875rem;
  border-radius: 8px;
  color: rgba(255,255,255,0.6);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.15s;
}

.nav-item:hover {
  background: rgba(255,255,255,0.08);
  color: white;
}

.nav-item--active {
  background: #3483FA;
  color: white;
}

.nav-item i {
  font-size: 1rem;
  width: 20px;
  text-align: center;
}

/* Footer */
.sidebar-footer {
  padding: 1rem;
  border-top: 1px solid rgba(255,255,255,0.08);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex: 1;
  overflow: hidden;
}

.user-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #3483FA;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  flex-shrink: 0;
}

.user-details {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.user-name {
  font-size: 0.8rem;
  font-weight: 500;
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-tag {
  font-size: 0.65rem;
  padding: 1px 6px;
  border-radius: 10px;
  width: fit-content;
  margin-top: 2px;
}

.tag-demo { background: #fef9c3; color: #ca8a04; }
.tag-live { background: #dcfce7; color: #16a34a; }

.logout-btn {
  background: none;
  border: none;
  color: rgba(255,255,255,0.4);
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  transition: all 0.15s;
}

.logout-btn:hover {
  background: rgba(255,255,255,0.1);
  color: white;
}

/* Topbar */
.main-content {
  margin-left: 240px;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.topbar {
  height: 60px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  position: sticky;
  top: 0;
  z-index: 50;
}

.page-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1e293b;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.page-content {
  padding: 1.5rem;
  flex: 1;
  background: #f5f7fa;
}
</style>
