<template>
  <div class="countdown">
    <div v-if="status === 'upcoming'" class="text-lg font-semibold text-blue-600">
      🕐 Starts in {{ formatTimeDiff(timeUntilStart) }}
    </div>
    <div v-else-if="status === 'active'" class="text-lg font-semibold text-green-600">
      ⏰ Ends in {{ formatTimeDiff(timeUntilEnd) }}
    </div>
    <div v-else-if="status === 'ended'" class="text-lg font-semibold text-purple-600">
      🎨 Judges are voting... {{ canVote ? `(Public voting open until ${formatDate(voteExpiration)})` : '' }}
    </div>
    <div v-else-if="status === 'vote_expired'" class="text-lg font-semibold text-gray-600">
      🎨 Judges are voting... (voting closed)
    </div>
    <div v-else-if="status === 'concluded'" class="text-lg font-semibold text-yellow-600">
      🏆 Results are in!
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { formatDistanceToNow, format } from 'date-fns';

const props = defineProps({
  hackathon: Object,
  status: String
});

const now = ref(new Date());

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

function formatTimeDiff(ms) {
  if (ms <= 0) return '0 seconds';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  const parts = [];
  if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
  if (hours % 24 > 0) parts.push(`${hours % 24} hour${hours % 24 !== 1 ? 's' : ''}`);
  if (minutes % 60 > 0) parts.push(`${minutes % 60} minute${minutes % 60 !== 1 ? 's' : ''}`);
  if (seconds % 60 > 0 && days === 0) parts.push(`${seconds % 60} second${seconds % 60 !== 1 ? 's' : ''}`);
  
  return parts.join(', ') || '0 seconds';
}

function formatDate(date) {
  if (!date) return '';
  return format(date, 'MMM d, yyyy h:mm a');
}

let interval;

onMounted(() => {
  interval = setInterval(() => {
    now.value = new Date();
  }, 1000);
});

onUnmounted(() => {
  if (interval) clearInterval(interval);
});
</script>

