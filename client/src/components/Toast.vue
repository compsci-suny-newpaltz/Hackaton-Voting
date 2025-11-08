<template>
  <Transition name="toast">
    <div
      v-if="visible"
      :class="[
        'fixed z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg',
        'min-w-[300px] max-w-md',
        typeClasses
      ]"
      :style="positionStyle"
      role="alert"
    >
      <!-- Icon -->
      <div class="flex-shrink-0 text-xl">
        <span v-if="type === 'success'">✅</span>
        <span v-else-if="type === 'error'">❌</span>
        <span v-else-if="type === 'warning'">⚠️</span>
        <span v-else-if="type === 'info'">ℹ️</span>
      </div>

      <!-- Message -->
      <div class="flex-1 text-sm font-medium">
        {{ message }}
      </div>

      <!-- Close button -->
      <button
        v-if="dismissible"
        @click="close"
        class="flex-shrink-0 text-lg hover:opacity-70 transition-opacity"
        aria-label="Close"
      >
        ×
      </button>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'info',
    validator: (value) => ['success', 'error', 'warning', 'info'].includes(value)
  },
  duration: {
    type: Number,
    default: 3000 // 3 seconds
  },
  position: {
    type: String,
    default: 'top-right',
    validator: (value) => ['top-right', 'top-left', 'bottom-right', 'bottom-left', 'top-center', 'bottom-center'].includes(value)
  },
  dismissible: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['close']);

const visible = ref(false);
let timeoutId = null;

const typeClasses = computed(() => {
  switch (props.type) {
    case 'success':
      return 'bg-green-50 border border-green-200 text-green-800';
    case 'error':
      return 'bg-red-50 border border-red-200 text-red-800';
    case 'warning':
      return 'bg-yellow-50 border border-yellow-200 text-yellow-800';
    case 'info':
    default:
      return 'bg-blue-50 border border-blue-200 text-blue-800';
  }
});

const positionStyle = computed(() => {
  const styles = {};

  switch (props.position) {
    case 'top-right':
      styles.top = '1rem';
      styles.right = '1rem';
      break;
    case 'top-left':
      styles.top = '1rem';
      styles.left = '1rem';
      break;
    case 'bottom-right':
      styles.bottom = '1rem';
      styles.right = '1rem';
      break;
    case 'bottom-left':
      styles.bottom = '1rem';
      styles.left = '1rem';
      break;
    case 'top-center':
      styles.top = '1rem';
      styles.left = '50%';
      styles.transform = 'translateX(-50%)';
      break;
    case 'bottom-center':
      styles.bottom = '1rem';
      styles.left = '50%';
      styles.transform = 'translateX(-50%)';
      break;
  }

  return styles;
});

function close() {
  visible.value = false;
  if (timeoutId) {
    clearTimeout(timeoutId);
  }
  setTimeout(() => {
    emit('close');
  }, 300); // Wait for transition
}

onMounted(() => {
  // Show toast after mount
  visible.value = true;

  // Auto-dismiss if duration is set
  if (props.duration > 0) {
    timeoutId = setTimeout(() => {
      close();
    }, props.duration);
  }
});

onUnmounted(() => {
  if (timeoutId) {
    clearTimeout(timeoutId);
  }
});
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(-1rem);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(-1rem);
}
</style>
