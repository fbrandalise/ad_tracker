import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref(localStorage.getItem('ml_access_token') || '')
  const refreshToken = ref(localStorage.getItem('ml_refresh_token') || '')
  const userId = ref(localStorage.getItem('ml_user_id') || '')
  const userInfo = ref(JSON.parse(localStorage.getItem('ml_user_info') || 'null'))
  const appId = ref(localStorage.getItem('ml_app_id') || '')
  const secretKey = ref(localStorage.getItem('ml_secret_key') || '')

  const isAuthenticated = computed(() => !!accessToken.value)

  function setTokens({ access_token, refresh_token, user_id }) {
    accessToken.value = access_token
    refreshToken.value = refresh_token || ''
    userId.value = String(user_id)
    localStorage.setItem('ml_access_token', access_token)
    localStorage.setItem('ml_refresh_token', refresh_token || '')
    localStorage.setItem('ml_user_id', String(user_id))
  }

  function setUserInfo(info) {
    userInfo.value = info
    localStorage.setItem('ml_user_info', JSON.stringify(info))
  }

  function setCredentials({ appId: id, secretKey: key }) {
    appId.value = id
    secretKey.value = key
    localStorage.setItem('ml_app_id', id)
    localStorage.setItem('ml_secret_key', key)
  }

  function logout() {
    accessToken.value = ''
    refreshToken.value = ''
    userId.value = ''
    userInfo.value = null
    localStorage.removeItem('ml_access_token')
    localStorage.removeItem('ml_refresh_token')
    localStorage.removeItem('ml_user_id')
    localStorage.removeItem('ml_user_info')
  }

  return {
    accessToken,
    refreshToken,
    userId,
    userInfo,
    appId,
    secretKey,
    isAuthenticated,
    setTokens,
    setUserInfo,
    setCredentials,
    logout
  }
})
