<template>
  <div class="metric-card">
    <div class="metric-header">
      <span class="metric-label">{{ label }}</span>
      <div class="metric-icon" :style="{ background: iconBg }">
        <i :class="icon" :style="{ color: iconColor }" />
      </div>
    </div>
    <div class="metric-value">{{ formattedValue }}</div>
    <div class="metric-footer" v-if="change !== undefined">
      <span class="metric-change" :class="changeClass">
        <i :class="changeIcon" />
        {{ Math.abs(change) }}%
      </span>
      <span class="metric-period">vs mês anterior</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  label: { type: String, required: true },
  value: { type: [Number, String], required: true },
  format: { type: String, default: 'number' }, // 'number' | 'currency' | 'percent' | 'raw'
  icon: { type: String, default: 'pi pi-chart-bar' },
  iconBg: { type: String, default: '#eff6ff' },
  iconColor: { type: String, default: '#3483FA' },
  change: { type: Number, default: undefined }
})

const formattedValue = computed(() => {
  const v = props.value
  if (props.format === 'currency') {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
  }
  if (props.format === 'percent') {
    return `${Number(v).toFixed(2)}%`
  }
  if (props.format === 'number') {
    return new Intl.NumberFormat('pt-BR').format(v)
  }
  return v
})

const changeClass = computed(() => {
  if (props.change === undefined) return ''
  return props.change >= 0 ? 'change-positive' : 'change-negative'
})

const changeIcon = computed(() => {
  if (props.change === undefined) return ''
  return props.change >= 0 ? 'pi pi-arrow-up' : 'pi pi-arrow-down'
})
</script>

<style scoped>
.metric-card {
  background: white;
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  border: 1px solid #e8ecf0;
  transition: box-shadow 0.2s, transform 0.2s;
}

.metric-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
  transform: translateY(-1px);
}

.metric-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.metric-label {
  font-size: 0.8rem;
  color: #64748b;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.metric-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.metric-icon i {
  font-size: 1rem;
}

.metric-value {
  font-size: 1.6rem;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.2;
  margin-bottom: 0.5rem;
}

.metric-footer {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.78rem;
}

.metric-change {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  font-weight: 600;
}

.change-positive { color: #16a34a; }
.change-negative { color: #dc2626; }

.metric-period {
  color: #94a3b8;
}
</style>
