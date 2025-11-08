<template>
  <div class="space-y-4">
    <div>
      <label class="block text-sm font-medium mb-1">{{ label }}</label>
      <p class="text-xs text-gray-600 mb-2">{{ recommendedText }}</p>
      
      <!-- Current Image Preview -->
      <div v-if="currentImageUrl" class="mb-4">
        <p class="text-sm font-medium mb-2">Current Image (drag to reposition)</p>
        <div class="relative rounded-lg overflow-hidden border bg-gray-100">
          <div 
            :class="previewHeightClass"
            :style="!previewHeightClass ? { height: previewHeight } : {}"
            class="relative overflow-hidden cursor-move"
            @mousedown="startDrag"
            @touchstart="startDrag"
          >
            <img 
              :src="currentImageUrl" 
              alt="Current image"
              class="w-full h-full object-cover select-none"
              :style="{ objectPosition: `${imagePosition.x}% ${imagePosition.y}%` }"
              draggable="false"
            />
          </div>
        </div>
        <p class="text-xs text-gray-500 mt-1">
          Position: {{ Math.round(imagePosition.x) }}%, {{ Math.round(imagePosition.y) }}%
        </p>
      </div>
      
      <!-- File Input -->
      <input 
        ref="fileInputRef"
        type="file" 
        accept="image/jpeg,image/png,image/webp"
        @change="handleFileSelect"
        class="w-full px-4 py-2 border rounded"
        :disabled="disabled"
      />
      <p class="text-xs text-gray-500 mt-1">JPG, PNG, or WebP. Max 25MB.</p>
    </div>
    
    <!-- Preview with Positioning -->
    <div v-if="previewUrl" class="space-y-2">
      <label class="block text-sm font-medium">Preview (drag to reposition):</label>
      <div class="relative rounded-lg overflow-hidden border bg-gray-100">
        <div 
          :class="previewHeightClass"
          :style="!previewHeightClass ? { height: previewHeight } : {}"
          class="relative overflow-hidden cursor-move"
          @mousedown="startDrag"
          @touchstart="startDrag"
        >
          <img 
            ref="previewImageRef"
            :src="previewUrl" 
            :alt="label + ' preview'"
            class="w-full h-full object-cover select-none"
            :style="{ objectPosition: `${imagePosition.x}% ${imagePosition.y}%` }"
            draggable="false"
          />
        </div>
        <div class="absolute top-2 right-2 flex gap-2">
          <button
            @click="clearImage"
            class="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            type="button"
          >
            Remove
          </button>
        </div>
      </div>
      <p class="text-xs text-gray-500">
        Position: {{ Math.round(imagePosition.x) }}%, {{ Math.round(imagePosition.y) }}%
      </p>
      
      <!-- Upload Button -->
      <button 
        v-if="!autoUpload"
        @click="$emit('upload', selectedFile, imagePosition)"
        :disabled="uploading || disabled"
        class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
        type="button"
      >
        {{ uploading ? 'Uploading...' : 'Upload Image' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useToast } from '@/composables/useToast';

const toast = useToast();

const props = defineProps({
  label: {
    type: String,
    required: true
  },
  currentImageUrl: {
    type: String,
    default: null
  },
  position: {
    type: Object,
    default: () => ({ x: 50, y: 50 })
  },
  aspectRatio: {
    type: String,
    default: '3:1', // width:height (e.g., '3:1' for banner, '4:3' for project image)
  },
  previewHeightClass: {
    type: String,
    default: null // e.g., 'h-64' to match home page banner
  },
  disabled: {
    type: Boolean,
    default: false
  },
  uploading: {
    type: Boolean,
    default: false
  },
  autoUpload: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:position', 'upload', 'clear', 'file-selected']);

const fileInputRef = ref(null);
const previewImageRef = ref(null);
const selectedFile = ref(null);
const previewUrl = ref(null);
const imagePosition = ref({ x: props.position?.x ?? 50, y: props.position?.y ?? 50 });
const isDragging = ref(false);
const dragStart = ref({ x: 0, y: 0 });

// Calculate preview height based on aspect ratio
const previewHeight = computed(() => {
  // If a specific height class is provided, use percentage-based height
  if (props.previewHeightClass) {
    return '100%'; // Will be constrained by parent with the class
  }
  const [width, height] = props.aspectRatio.split(':').map(Number);
  const ratio = height / width;
  // Base width is full container, calculate height to maintain ratio
  // Using a max-width assumption of ~800px for preview
  return `${ratio * 100}%`;
});

const recommendedText = computed(() => {
  const ratioMap = {
    '3:1': 'Recommended: 1200x400px',
    '4:3': 'Recommended: 800x600px',
    '16:9': 'Recommended: 1920x1080px',
    '1:1': 'Recommended: 800x800px'
  };
  return `${ratioMap[props.aspectRatio] || 'Recommended dimensions'}, max 25MB (JPG, PNG, WebP)`;
});

// Watch for position prop changes
watch(() => props.position, (newPos) => {
  if (newPos) {
    imagePosition.value = { x: newPos.x, y: newPos.y };
  }
}, { deep: true, immediate: true });

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Validate file type
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    toast.error('Please select a JPG, PNG, or WebP image.');
    if (fileInputRef.value) fileInputRef.value.value = '';
    return;
  }

  // Validate file size (25MB)
  if (file.size > 25 * 1024 * 1024) {
    toast.error('Image must be less than 25MB.');
    if (fileInputRef.value) fileInputRef.value.value = '';
    return;
  }
  
  selectedFile.value = file;
  
  // Create preview
  const reader = new FileReader();
  reader.onload = (e) => {
    previewUrl.value = e.target.result;
    // Reset position for new image
    imagePosition.value = { x: 50, y: 50 };
  };
  reader.readAsDataURL(file);
  
  emit('file-selected', file);
}

function clearImage() {
  selectedFile.value = null;
  previewUrl.value = null;
  imagePosition.value = { x: 50, y: 50 };
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
  }
  emit('clear');
}

function startDrag(event) {
  event.preventDefault();
  isDragging.value = true;
  
  const clientX = event.type === 'touchstart' ? event.touches[0].clientX : event.clientX;
  const clientY = event.type === 'touchstart' ? event.touches[0].clientY : event.clientY;
  
  dragStart.value = { x: clientX, y: clientY };
  
  const handleMove = (e) => {
    if (!isDragging.value) return;

    const moveX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    const moveY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

    const deltaX = moveX - dragStart.value.x;
    const deltaY = moveY - dragStart.value.y;

    // Convert pixel movement to percentage (inverted because we're moving the focal point)
    const sensitivity = 0.2;
    const newX = Math.max(0, Math.min(100, imagePosition.value.x - deltaX * sensitivity));
    const newY = Math.max(0, Math.min(100, imagePosition.value.y - deltaY * sensitivity));

    imagePosition.value = { x: newX, y: newY };
    dragStart.value = { x: moveX, y: moveY };

    // NOTE: Debounced behavior - do NOT emit on every move to avoid excessive network calls.
    // Final emission occurs in handleEnd.
  };
  
  const handleEnd = () => {
    if (isDragging.value) {
      isDragging.value = false;
      // Emit final (debounced) position after short delay to batch quick end events
      const finalPos = {
        x: Math.round(imagePosition.value.x),
        y: Math.round(imagePosition.value.y)
      };
      // Small timeout to debounce potential extra mouseup/touchend bursts
      setTimeout(() => emit('update:position', finalPos), 50);
    }
    document.removeEventListener('mousemove', handleMove);
    document.removeEventListener('mouseup', handleEnd);
    document.removeEventListener('touchmove', handleMove);
    document.removeEventListener('touchend', handleEnd);
  };
  
  document.addEventListener('mousemove', handleMove);
  document.addEventListener('mouseup', handleEnd);
  document.addEventListener('touchmove', handleMove, { passive: false });
  document.addEventListener('touchend', handleEnd);
}

defineExpose({
  clearImage
});
</script>
