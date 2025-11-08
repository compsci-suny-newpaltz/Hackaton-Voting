<template>
  <div
    :class="[
      'inline-flex items-center justify-center',
      sizeClasses
    ]"
    role="status"
    :aria-label="label || 'Loading...'"
  >
    <svg
      class="animate-spin"
      :class="colorClasses"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        class="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="4"
      ></circle>
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
    <span v-if="label" class="ml-2 text-sm font-medium" :class="textColorClasses">
      {{ label }}
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['xs', 'sm', 'md', 'lg', 'xl'].includes(value)
  },
  color: {
    type: String,
    default: 'blue',
    validator: (value) => ['blue', 'gray', 'green', 'red', 'white'].includes(value)
  },
  label: {
    type: String,
    default: ''
  }
});

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'xs':
      return 'w-4 h-4';
    case 'sm':
      return 'w-5 h-5';
    case 'md':
      return 'w-6 h-6';
    case 'lg':
      return 'w-8 h-8';
    case 'xl':
      return 'w-12 h-12';
    default:
      return 'w-6 h-6';
  }
});

const colorClasses = computed(() => {
  switch (props.color) {
    case 'blue':
      return 'text-blue-600';
    case 'gray':
      return 'text-gray-600';
    case 'green':
      return 'text-green-600';
    case 'red':
      return 'text-red-600';
    case 'white':
      return 'text-white';
    default:
      return 'text-blue-600';
  }
});

const textColorClasses = computed(() => {
  switch (props.color) {
    case 'blue':
      return 'text-blue-600';
    case 'gray':
      return 'text-gray-600';
    case 'green':
      return 'text-green-600';
    case 'red':
      return 'text-red-600';
    case 'white':
      return 'text-white';
    default:
      return 'text-gray-600';
  }
});
</script>
