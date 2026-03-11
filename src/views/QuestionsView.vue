<template>
  <div class="questions-view">
    <!-- Toolbar -->
    <div class="view-toolbar">
      <div class="toolbar-left">
        <InputText v-model="searchFilter" placeholder="Buscar por pergunta ou produto..." class="search-input" />
        <div class="filter-tabs">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            :class="['tab-btn', { active: activeTab === tab.value }]"
            @click="activeTab = tab.value"
          >
            {{ tab.label }}
            <span class="tab-count" v-if="tab.count > 0">{{ tab.count }}</span>
          </button>
        </div>
      </div>
      <div class="toolbar-right">
        <Button icon="pi pi-refresh" label="Atualizar" outlined @click="loadQuestions" :loading="loading" />
      </div>
    </div>

    <!-- Summary -->
    <div class="summary-bar">
      <div class="summary-item" v-for="s in summary" :key="s.label">
        <span class="summary-label">{{ s.label }}</span>
        <span class="summary-value" :style="s.color ? `color:${s.color}` : ''">{{ s.value }}</span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-card">
      <i class="pi pi-spin pi-spinner" style="font-size:1.5rem;color:#3483FA" />
      <span>Carregando perguntas...</span>
    </div>

    <!-- Empty -->
    <div v-else-if="filteredQuestions.length === 0" class="empty-state">
      <i class="pi pi-comments" />
      <p>Nenhuma pergunta encontrada</p>
    </div>

    <!-- Questions list -->
    <div v-else class="questions-list">
      <div
        v-for="q in filteredQuestions"
        :key="q.id"
        :class="['question-card', { 'question-card--unanswered': q.status === 'UNANSWERED' }]"
      >
        <!-- Item info -->
        <div class="question-item-info">
          <img
            :src="q.item_thumbnail"
            :alt="q.item_title"
            class="item-thumb"
            onerror="this.style.display='none'"
          />
          <a :href="q.item_permalink" target="_blank" class="item-title">{{ q.item_title }}</a>
        </div>

        <!-- Question body -->
        <div class="question-body">
          <div class="question-meta">
            <span class="buyer-name">
              <i class="pi pi-user" style="font-size:0.75rem" />
              {{ q.from?.nickname }}
            </span>
            <span class="question-date">{{ formatDate(q.date_created) }}</span>
            <span :class="['status-badge', q.status === 'UNANSWERED' ? 'badge-warn' : 'badge-success']">
              {{ q.status === 'UNANSWERED' ? 'Sem resposta' : 'Respondida' }}
            </span>
          </div>

          <p class="question-text">{{ q.text }}</p>

          <!-- Existing answer -->
          <div v-if="q.answer" class="answer-block">
            <div class="answer-header">
              <i class="pi pi-reply" />
              <span>Sua resposta</span>
              <span class="answer-date">{{ formatDate(q.answer.date_created) }}</span>
            </div>
            <p class="answer-text">{{ q.answer.text }}</p>
          </div>

          <!-- Answer form -->
          <div v-else-if="answeringId === q.id" class="answer-form">
            <Textarea
              v-model="answerText"
              rows="3"
              placeholder="Digite sua resposta para o comprador..."
              class="answer-textarea"
              :disabled="submitting"
            />
            <div class="answer-form-actions">
              <Button label="Cancelar" text size="small" @click="cancelAnswer" :disabled="submitting" />
              <Button
                label="Enviar resposta"
                icon="pi pi-send"
                size="small"
                :loading="submitting"
                :disabled="!answerText.trim()"
                @click="submitAnswer(q)"
              />
            </div>
          </div>

          <!-- Answer button -->
          <div v-else-if="q.status === 'UNANSWERED'" class="answer-action">
            <Button
              icon="pi pi-reply"
              label="Responder"
              size="small"
              outlined
              @click="startAnswer(q.id)"
            />
          </div>
        </div>
      </div>

      <!-- Load more -->
      <div v-if="hasMore" class="load-more">
        <Button
          label="Carregar mais perguntas"
          icon="pi pi-chevron-down"
          outlined
          :loading="loadingMore"
          @click="loadMore"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getQuestions, postAnswer, getMockQuestions } from '@/services/mlApi'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'

const authStore = useAuthStore()
const toast = useToast()

const loading = ref(false)
const loadingMore = ref(false)
const submitting = ref(false)
const questions = ref([])
const searchFilter = ref('')
const activeTab = ref('all')
const answeringId = ref(null)
const answerText = ref('')
const currentOffset = ref(0)
const hasMore = ref(false)
const PAGE_SIZE = 50

const isDemo = computed(() => authStore.accessToken === 'DEMO_MODE')

const tabs = computed(() => [
  { label: 'Todas', value: 'all', count: questions.value.length },
  { label: 'Sem resposta', value: 'unanswered', count: questions.value.filter(q => q.status === 'UNANSWERED').length },
  { label: 'Respondidas', value: 'answered', count: questions.value.filter(q => q.status === 'ANSWERED').length }
])

const filteredQuestions = computed(() => {
  let data = questions.value

  if (activeTab.value === 'unanswered') data = data.filter(q => q.status === 'UNANSWERED')
  else if (activeTab.value === 'answered') data = data.filter(q => q.status === 'ANSWERED')

  if (searchFilter.value.trim()) {
    const q = searchFilter.value.toLowerCase()
    data = data.filter(i =>
      i.text?.toLowerCase().includes(q) ||
      i.item_title?.toLowerCase().includes(q) ||
      i.from?.nickname?.toLowerCase().includes(q)
    )
  }

  return data
})

const summary = computed(() => {
  const total = questions.value.length
  const unanswered = questions.value.filter(q => q.status === 'UNANSWERED').length
  const answered = questions.value.filter(q => q.status === 'ANSWERED').length
  const rate = total > 0 ? Math.round((answered / total) * 100) : 0
  return [
    { label: 'Total de perguntas', value: total },
    { label: 'Sem resposta', value: unanswered, color: unanswered > 0 ? '#ca8a04' : '#16a34a' },
    { label: 'Respondidas', value: answered, color: '#16a34a' },
    { label: 'Taxa de resposta', value: `${rate}%`, color: rate >= 80 ? '#16a34a' : rate >= 50 ? '#ca8a04' : '#dc2626' }
  ]
})

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now - d
  const diffMin = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMin / 60)
  const diffD = Math.floor(diffH / 24)
  if (diffMin < 60) return `${diffMin}min atrás`
  if (diffH < 24) return `${diffH}h atrás`
  if (diffD === 1) return 'ontem'
  if (diffD < 7) return `${diffD} dias atrás`
  return d.toLocaleDateString('pt-BR')
}

function startAnswer(id) {
  answeringId.value = id
  answerText.value = ''
}

function cancelAnswer() {
  answeringId.value = null
  answerText.value = ''
}

async function submitAnswer(question) {
  if (!answerText.value.trim()) return
  submitting.value = true
  try {
    if (isDemo.value) {
      await new Promise(r => setTimeout(r, 800))
      const idx = questions.value.findIndex(q => q.id === question.id)
      if (idx !== -1) {
        questions.value[idx] = {
          ...questions.value[idx],
          status: 'ANSWERED',
          answer: {
            text: answerText.value.trim(),
            date_created: new Date().toISOString(),
            status: 'ACTIVE'
          }
        }
      }
    } else {
      await postAnswer(question.id, answerText.value.trim())
      const idx = questions.value.findIndex(q => q.id === question.id)
      if (idx !== -1) {
        questions.value[idx] = {
          ...questions.value[idx],
          status: 'ANSWERED',
          answer: {
            text: answerText.value.trim(),
            date_created: new Date().toISOString(),
            status: 'ACTIVE'
          }
        }
      }
    }
    toast.add({ severity: 'success', summary: 'Resposta enviada!', detail: 'O comprador será notificado.', life: 3000 })
    cancelAnswer()
  } catch {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível enviar a resposta. Tente novamente.', life: 4000 })
  } finally {
    submitting.value = false
  }
}

async function loadQuestions() {
  loading.value = true
  questions.value = []
  currentOffset.value = 0
  hasMore.value = false
  cancelAnswer()
  try {
    if (isDemo.value) {
      questions.value = getMockQuestions()
    } else {
      const data = await getQuestions(authStore.userId, { offset: 0, limit: PAGE_SIZE })
      questions.value = normalizeQuestions(data.questions || [])
      hasMore.value = (data.total || 0) > PAGE_SIZE
    }
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  loadingMore.value = true
  currentOffset.value += PAGE_SIZE
  try {
    const data = await getQuestions(authStore.userId, { offset: currentOffset.value, limit: PAGE_SIZE })
    questions.value.push(...normalizeQuestions(data.questions || []))
    hasMore.value = questions.value.length < (data.total || 0)
  } finally {
    loadingMore.value = false
  }
}

function normalizeQuestions(raw) {
  return raw.map(q => ({
    ...q,
    item_title: q.item?.title || q.item_id,
    item_thumbnail: q.item?.thumbnail || null,
    item_permalink: q.item?.permalink || null
  }))
}

onMounted(() => loadQuestions())
</script>

<style scoped>
.questions-view {
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
  gap: 0.75rem;
  flex-wrap: wrap;
}

.search-input { width: 280px; }

.filter-tabs {
  display: flex;
  gap: 0.25rem;
  background: #f1f5f9;
  border-radius: 8px;
  padding: 3px;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.875rem;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  transition: all 0.15s;
}

.tab-btn:hover { color: #1e293b; }

.tab-btn.active {
  background: white;
  color: #1e293b;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.tab-count {
  background: #3483FA;
  color: white;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 1px 6px;
  min-width: 18px;
  text-align: center;
}

.tab-btn.active .tab-count { background: #3483FA; }
.tab-btn:not(.active) .tab-count { background: #94a3b8; }

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
  min-width: 120px;
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

/* Loading / empty */
.loading-card, .empty-state {
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  padding: 3rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: #94a3b8;
}

.empty-state i { font-size: 2.5rem; }
.empty-state p { font-size: 0.95rem; margin: 0; }

/* Questions list */
.questions-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.question-card {
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  transition: box-shadow 0.15s;
}

.question-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.07);
}

.question-card--unanswered {
  border-left: 3px solid #f59e0b;
}

/* Item info */
.question-item-info {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding-bottom: 0.625rem;
  border-bottom: 1px solid #f1f5f9;
}

.item-thumb {
  width: 36px;
  height: 36px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.item-title {
  font-size: 0.82rem;
  color: #3483FA;
  text-decoration: none;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 600px;
}

.item-title:hover { text-decoration: underline; }

/* Question body */
.question-body {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.question-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.buyer-name {
  font-size: 0.8rem;
  font-weight: 600;
  color: #475569;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.question-date {
  font-size: 0.75rem;
  color: #94a3b8;
}

.status-badge {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
}

.badge-warn { background: #fef9c3; color: #ca8a04; }
.badge-success { background: #dcfce7; color: #16a34a; }

.question-text {
  font-size: 0.95rem;
  color: #1e293b;
  margin: 0;
  line-height: 1.5;
}

/* Answer block */
.answer-block {
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.answer-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: #16a34a;
}

.answer-date {
  font-size: 0.72rem;
  color: #94a3b8;
  font-weight: 400;
  margin-left: auto;
}

.answer-text {
  font-size: 0.9rem;
  color: #374151;
  margin: 0;
  line-height: 1.5;
}

/* Answer form */
.answer-form {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.answer-textarea {
  width: 100%;
  font-size: 0.9rem;
  resize: vertical;
}

.answer-form-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
}

.answer-action { margin-top: 0.25rem; }

/* Load more */
.load-more {
  display: flex;
  justify-content: center;
  padding: 0.5rem 0;
}
</style>
