<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="visible"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="handleCancel"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black bg-opacity-50"></div>

        <!-- Dialog -->
        <div
          class="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="dialogId + '-title'"
        >
          <!-- Icon -->
          <div v-if="type" class="flex justify-center mb-4">
            <div
              :class="[
                'w-12 h-12 rounded-full flex items-center justify-center',
                iconBgClasses
              ]"
            >
              <span class="text-2xl">
                <span v-if="type === 'warning'">⚠️</span>
                <span v-else-if="type === 'danger'">🗑️</span>
                <span v-else-if="type === 'info'">ℹ️</span>
                <span v-else>❓</span>
              </span>
            </div>
          </div>

          <!-- Title -->
          <h3
            :id="dialogId + '-title'"
            class="text-lg font-semibold text-gray-900 text-center mb-2"
          >
            {{ title }}
          </h3>

          <!-- Message -->
          <p class="text-sm text-gray-600 text-center mb-6">
            {{ message }}
          </p>

          <!-- Actions -->
          <div class="flex gap-3">
            <button
              @click="handleCancel"
              class="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 font-medium transition-colors"
              :disabled="loading"
            >
              {{ cancelText }}
            </button>
            <button
              @click="handleConfirm"
              :class="[
                'flex-1 px-4 py-2 rounded font-medium transition-colors',
                confirmButtonClasses,
                { 'opacity-50 cursor-not-allowed': loading }
              ]"
              :disabled="loading"
            >
              <span v-if="loading" class="flex items-center justify-center">
                <svg class="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ loadingText || confirmText }}
              </span>
              <span v-else>{{ confirmText }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  title: {
    type: String,
    default: 'Confirm Action'
  },
  message: {
    type: String,
    required: true
  },
  confirmText: {
    type: String,
    default: 'Confirm'
  },
  cancelText: {
    type: String,
    default: 'Cancel'
  },
  type: {
    type: String,
    default: 'warning',
    validator: (value) => ['warning', 'danger', 'info', null].includes(value)
  },
  loadingText: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['confirm', 'cancel', 'close']);

const visible = ref(false);
const loading = ref(false);
const dialogId = `confirm-${Math.random().toString(36).substr(2, 9)}`;

const iconBgClasses = computed(() => {
  switch (props.type) {
    case 'warning':
      return 'bg-yellow-100';
    case 'danger':
      return 'bg-red-100';
    case 'info':
      return 'bg-blue-100';
    default:
      return 'bg-gray-100';
  }
});

const confirmButtonClasses = computed(() => {
  switch (props.type) {
    case 'danger':
      return 'bg-red-600 text-white hover:bg-red-700';
    case 'warning':
      return 'bg-yellow-600 text-white hover:bg-yellow-700';
    case 'info':
      return 'bg-blue-600 text-white hover:bg-blue-700';
    default:
      return 'bg-blue-600 text-white hover:bg-blue-700';
  }
});

function show() {
  visible.value = true;
  loading.value = false;
}

function hide() {
  visible.value = false;
}

async function handleConfirm() {
  loading.value = true;
  try {
    await emit('confirm');
    hide();
  } catch (error) {
    // Keep dialog open if there's an error
    loading.value = false;
    throw error;
  }
}

function handleCancel() {
  if (!loading.value) {
    emit('cancel');
    hide();
  }
}

defineExpose({
  show,
  hide
});
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.2s ease;
}

.modal-enter-from .relative {
  transform: scale(0.95);
}

.modal-leave-to .relative {
  transform: scale(0.95);
}
</style>
