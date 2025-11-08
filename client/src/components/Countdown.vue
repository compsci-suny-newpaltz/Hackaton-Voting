<template>
  <div 
    ref="countdownEl"
    class="countdown-container relative overflow-hidden rounded-2xl p-8 transition-all duration-300"
    :class="containerClass"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
    :style="gradientStyle"
  >
    <div class="relative z-10">
      <div v-if="status === 'upcoming'" class="countdown-content">
        <div class="text-5xl mb-2">🕐</div>
        <div class="text-sm uppercase tracking-wider opacity-90 mb-2">Starting Soon</div>
        <div class="text-3xl font-bold">{{ formatTimeDiff(timeUntilStart) }}</div>
      </div>
      <div v-else-if="status === 'active'" class="countdown-content">
        <div class="text-5xl mb-2">⚡</div>
        <div class="text-sm uppercase tracking-wider opacity-90 mb-2">Active Now</div>
        <div class="text-3xl font-bold">{{ formatTimeDiff(timeUntilEnd) }} remaining</div>
      </div>
      <div v-else-if="status === 'ended'" class="countdown-content">
        <div class="text-5xl mb-2">🎨</div>
        <div class="text-sm uppercase tracking-wider opacity-90 mb-2">Judging in Progress</div>
        <div class="text-xl font-semibold">
          {{ canVote ? `Public voting open until ${formatDate(voteExpiration)}` : 'Voting period active' }}
        </div>
      </div>
      <div v-else-if="status === 'vote_expired'" class="countdown-content">
        <div class="text-5xl mb-2">⏸️</div>
        <div class="text-sm uppercase tracking-wider opacity-90 mb-2">Voting Closed</div>
        <div class="text-xl font-semibold">Awaiting final results</div>
      </div>
      <div v-else-if="status === 'concluded'" class="countdown-content">
        <div class="text-5xl mb-2">🏆</div>
        <div class="text-sm uppercase tracking-wider opacity-90 mb-2">Concluded</div>
        <div class="text-3xl font-bold">Results are in!</div>
      </div>
    </div>
    
    <!-- Animated background particles -->
    <div class="absolute inset-0 opacity-30">
      <div 
        v-for="i in particleCount" 
        :key="i"
        class="particle"
        :style="getParticleStyle(i)"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { format } from 'date-fns';

const props = defineProps({
  hackathon: Object,
  status: String,
  pollIntervalMs: { type: Number, default: 5000 },
  autoPoll: { type: Boolean, default: true }
});

// Emit events when we need parent to refresh hackathon data
const emit = defineEmits(['refresh', 'status-transition']);

const countdownEl = ref(null);
const now = ref(new Date());
const mouseX = ref(50);
const mouseY = ref(50);
const particleCount = 8;

const timeUntilStart = computed(() => {
  if (!props.hackathon) return 0;
  return new Date(props.hackathon.start_time) - now.value;
});

const timeUntilEnd = computed(() => {
  if (!props.hackathon) return 0;
  return new Date(props.hackathon.end_time) - now.value;
});

const voteExpiration = computed(() => {
  if (!props.hackathon?.vote_expiration) return null;
  return new Date(props.hackathon.vote_expiration);
});

const canVote = computed(() => {
  if (!voteExpiration.value) return false;
  return now.value < voteExpiration.value && props.status === 'ended';
});

const containerClass = computed(() => {
  const classes = {
    'upcoming': 'text-white shadow-2xl hover:shadow-blue-500/50',
    'active': 'text-white shadow-2xl hover:shadow-green-500/50',
    'ended': 'text-white shadow-2xl hover:shadow-purple-500/50',
    'vote_expired': 'text-white shadow-2xl hover:shadow-gray-500/50',
    'concluded': 'text-white shadow-2xl hover:shadow-yellow-500/50'
  };
  return classes[props.status] || classes.upcoming;
});

const gradientStyle = computed(() => {
  const gradients = {
    'upcoming': {
      base: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      overlay: `radial-gradient(circle at ${mouseX.value}% ${mouseY.value}%, rgba(255,255,255,0.2) 0%, transparent 60%)`
    },
    'active': {
      base: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
      overlay: `radial-gradient(circle at ${mouseX.value}% ${mouseY.value}%, rgba(255,255,255,0.2) 0%, transparent 60%)`
    },
    'ended': {
      base: 'linear-gradient(135deg, #8e2de2 0%, #4a00e0 100%)',
      overlay: `radial-gradient(circle at ${mouseX.value}% ${mouseY.value}%, rgba(255,255,255,0.2) 0%, transparent 60%)`
    },
    'vote_expired': {
      base: 'linear-gradient(135deg, #636363 0%, #a2ab58 100%)',
      overlay: `radial-gradient(circle at ${mouseX.value}% ${mouseY.value}%, rgba(255,255,255,0.15) 0%, transparent 60%)`
    },
    'concluded': {
      base: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      overlay: `radial-gradient(circle at ${mouseX.value}% ${mouseY.value}%, rgba(255,255,255,0.25) 0%, transparent 60%)`
    }
  };
  
  const gradient = gradients[props.status] || gradients.upcoming;
  return {
    background: `${gradient.overlay}, ${gradient.base}`
  };
});

function handleMouseMove(event) {
  if (!countdownEl.value) return;
  const rect = countdownEl.value.getBoundingClientRect();
  mouseX.value = ((event.clientX - rect.left) / rect.width) * 100;
  mouseY.value = ((event.clientY - rect.top) / rect.height) * 100;
}

function handleMouseLeave() {
  mouseX.value = 50;
  mouseY.value = 50;
}

function getParticleStyle(index) {
  const angle = (index / particleCount) * Math.PI * 2;
  const distance = 20 + (index % 3) * 15;
  const size = 4 + (index % 4) * 2;
  const duration = 3 + (index % 3);
  
  return {
    position: 'absolute',
    width: `${size}px`,
    height: `${size}px`,
    background: 'rgba(255, 255, 255, 0.6)',
    borderRadius: '50%',
    left: `${50 + Math.cos(angle) * distance}%`,
    top: `${50 + Math.sin(angle) * distance}%`,
    animation: `float ${duration}s ease-in-out infinite`,
    animationDelay: `${index * 0.2}s`
  };
}

function formatTimeDiff(ms) {
  if (ms <= 0) return 'any moment now';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  const parts = [];
  if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
  if (hours % 24 > 0) parts.push(`${hours % 24} hour${hours % 24 !== 1 ? 's' : ''}`);
  if (minutes % 60 > 0) parts.push(`${minutes % 60} minute${minutes % 60 !== 1 ? 's' : ''}`);
  if (seconds % 60 > 0 && days === 0) parts.push(`${seconds % 60} second${seconds % 60 !== 1 ? 's' : ''}`);
  
  return parts.join(', ') || 'any moment now';
}

function formatDate(date) {
  if (!date) return '';
  return format(date, 'MMM d, yyyy h:mm a');
}

let interval;
let pollTimer;

function shouldPollStatus() {
  if (!props.autoPoll || !props.hackathon) return false;
  // Poll when we are in a liminal state: upcoming (near start), active (near end), ended (waiting for conclusion), vote_expired (waiting for conclude), or until concluded
  const status = props.status;
  if (status === 'concluded') return false;
  return ['upcoming', 'active', 'ended', 'vote_expired'].includes(status);
}

function maybeTriggerTransitionCheck() {
  if (!props.hackathon) return;
  const nowMs = now.value.getTime();
  const startMs = new Date(props.hackathon.start_time).getTime();
  const endMs = new Date(props.hackathon.end_time).getTime();
  const voteExpMs = props.hackathon.vote_expiration ? new Date(props.hackathon.vote_expiration).getTime() : endMs + 7*24*60*60*1000;

  // If any countdown crosses 0, ask parent to refresh immediately
  if (props.status === 'upcoming' && nowMs >= startMs) {
    emit('status-transition', { from: 'upcoming', to: 'active' });
    emit('refresh');
  } else if (props.status === 'active' && nowMs >= endMs) {
    emit('status-transition', { from: 'active', to: 'ended' });
    emit('refresh');
  } else if (props.status === 'ended' && nowMs >= voteExpMs) {
    emit('status-transition', { from: 'ended', to: 'vote_expired' });
    emit('refresh');
  }
}

function startPolling() {
  if (!shouldPollStatus()) return;
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    // Regular heartbeat to parent to refresh
    emit('refresh');
  }, props.pollIntervalMs);
}

function stopPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
}

onMounted(() => {
  interval = setInterval(() => {
    now.value = new Date();
    maybeTriggerTransitionCheck();
  }, 1000);
  startPolling();
});

onUnmounted(() => {
  if (interval) clearInterval(interval);
  stopPolling();
});

// Watch status changes from parent to adjust polling lifecycle
watch(() => props.status, () => {
  stopPolling();
  startPolling();
});
</script>

<style scoped>
.countdown-container {
  backdrop-filter: blur(10px);
  transform: scale(1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.countdown-container:hover {
  transform: scale(1.02);
}

.countdown-content {
  text-align: center;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

@keyframes float {
  0%, 100% {
    transform: translateY(0) translateX(0);
    opacity: 0.3;
  }
  50% {
    transform: translateY(-20px) translateX(10px);
    opacity: 0.6;
  }
}

.particle {
  filter: blur(1px);
}
</style>

