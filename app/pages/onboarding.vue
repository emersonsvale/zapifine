<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Database } from '~~/types/database'

definePageMeta({ layout: 'onboarding' })

useHead({ title: 'Configuração - Zapifine' })

const supabase = useSupabaseClient<Database>()
const authUser = useSupabaseUser()
const { data: current, refresh: refreshCurrent } = useCurrentUser()

const step = ref<0 | 1 | 2 | 3 | 4>(0)
const finishing = ref(false)
const errorMsg = ref('')

const totalSteps = 5
const progress = computed(() =>
  Math.round(((step.value + 1) / totalSteps) * 100),
)

const userName = computed(
  () => current.value?.nome?.split(' ')[0] ?? null,
)

function goNext() {
  errorMsg.value = ''
  if (step.value < 4) step.value = ((step.value + 1) as 0 | 1 | 2 | 3 | 4)
}

async function finish() {
  if (!authUser.value?.id) return
  finishing.value = true
  errorMsg.value = ''
  try {
    const { error } = await supabase
      .from('users')
      .update({ is_onboarding_complete: true })
      .eq('id', authUser.value.id)
    if (error) throw error
    await refreshCurrent()
    await navigateTo('/dashboard', { replace: true })
  } catch (err) {
    errorMsg.value =
      err instanceof Error
        ? err.message
        : 'Falha ao finalizar configuração.'
  } finally {
    finishing.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-1">
      <div class="flex items-center justify-between text-xs text-muted-foreground">
        <span>Progresso</span>
        <span>{{ progress }}%</span>
      </div>
      <div class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          class="h-full rounded-full bg-emerald-500 transition-all"
          :style="{ width: `${progress}%` }"
        />
      </div>
    </div>

    <p
      v-if="errorMsg"
      class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {{ errorMsg }}
    </p>

    <OnboardingStepWelcome
      v-if="step === 0"
      :user-name="userName"
      @next="goNext"
    />
    <OnboardingStepEmpresa v-else-if="step === 1" @next="goNext" />
    <OnboardingStepBot v-else-if="step === 2" @next="goNext" />
    <OnboardingStepWhatsapp v-else-if="step === 3" @next="goNext" />
    <OnboardingStepDone
      v-else-if="step === 4"
      :finishing="finishing"
      @finish="finish"
    />
  </div>
</template>
