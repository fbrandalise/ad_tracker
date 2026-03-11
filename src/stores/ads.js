import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAdsStore = defineStore('ads', () => {
  const campaigns = ref([])
  const adGroups = ref([])
  const ads = ref([])
  const dailyReport = ref([])
  const loading = ref(false)
  const error = ref(null)
  const dateRange = ref({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  })

  const totalSpend = computed(() =>
    campaigns.value.reduce((sum, c) => sum + (c.spend || 0), 0)
  )

  const totalImpressions = computed(() =>
    campaigns.value.reduce((sum, c) => sum + (c.impressions || 0), 0)
  )

  const totalClicks = computed(() =>
    campaigns.value.reduce((sum, c) => sum + (c.clicks || 0), 0)
  )

  const avgCtr = computed(() =>
    totalImpressions.value > 0
      ? ((totalClicks.value / totalImpressions.value) * 100).toFixed(2)
      : 0
  )

  const avgCpc = computed(() =>
    totalClicks.value > 0
      ? (totalSpend.value / totalClicks.value).toFixed(2)
      : 0
  )

  function setCampaigns(data) {
    campaigns.value = data
  }

  function setAdGroups(data) {
    adGroups.value = data
  }

  function setAds(data) {
    ads.value = data
  }

  function setDailyReport(data) {
    dailyReport.value = data
  }

  function setLoading(val) {
    loading.value = val
  }

  function setError(val) {
    error.value = val
  }

  function setDateRange(from, to) {
    dateRange.value = { from, to }
  }

  return {
    campaigns,
    adGroups,
    ads,
    dailyReport,
    loading,
    error,
    dateRange,
    totalSpend,
    totalImpressions,
    totalClicks,
    avgCtr,
    avgCpc,
    setCampaigns,
    setAdGroups,
    setAds,
    setDailyReport,
    setLoading,
    setError,
    setDateRange
  }
})
