<template>
  <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div v-if="loading" class="text-center py-12">
      <div class="text-gray-600">Loading...</div>
    </div>
    
    <div v-else-if="requiresCode">
      <div class="max-w-md mx-auto bg-white rounded-lg shadow p-6">
        <h2 class="text-2xl font-semibold mb-4">Enter Judge Code</h2>
        <input 
          v-model="codeInput"
          type="text"
          placeholder="Enter your judge code"
          class="w-full px-4 py-2 border rounded mb-4"
          @keyup.enter="accessWithCode"
        />
        <button 
          @click="accessWithCode"
          class="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Access
        </button>
      </div>
    </div>
    
    <div v-else-if="alreadyVoted">
      <div class="max-w-md mx-auto bg-white rounded-lg shadow p-6 text-center">
        <h2 class="text-2xl font-semibold mb-4">Thank You!</h2>
        <p class="text-gray-600 mb-2">You have already submitted your votes.</p>
        <p class="text-sm text-gray-500">Submitted: {{ formatDate(alreadyVoted.votedAt) }}</p>
      </div>
    </div>
    
    <div v-else-if="votingData">
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <h1 class="text-3xl font-bold mb-2">Welcome, {{ votingData.judgeName }}!</h1>
        <h2 class="text-xl text-gray-600">Voting for: {{ votingData.hackathon.name }}</h2>
      </div>
      
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h3 class="font-semibold mb-2">Instructions:</h3>
        <ul class="list-disc list-inside space-y-1 text-sm">
          <li>Review all projects below</li>
          <li>Click "View Full Project" to see details</li>
          <li>Submit your scores for each project (1-10 scale)</li>
          <li>You can edit your scores before final submission</li>
        </ul>
        <p class="mt-2 text-sm text-gray-600">
          Projects are sorted by popular vote for your reference.
        </p>
      </div>
      
      <div class="space-y-6 mb-6">
        <div 
          v-for="(project, index) in votingData.projects" 
          :key="project.id"
          class="bg-white rounded-lg shadow p-6"
        >
          <div class="flex items-start justify-between mb-4">
            <div>
              <h3 class="text-xl font-semibold">Project {{ index + 1 }}: {{ project.name }}</h3>
              <p class="text-sm text-gray-600">👍 {{ project.vote_count || 0 }} votes</p>
            </div>
            <a 
              :href="`/hackathons/${votingData.hackathon.id}/projects/${project.id}`"
              target="_blank"
              class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              View Full Project
            </a>
          </div>
          
          <div v-if="project.image_url" class="mb-4">
            <img :src="project.image_url" :alt="project.name" class="w-full h-48 object-cover rounded">
          </div>
          
          <div class="mb-4">
            <p class="text-sm text-gray-600 mb-2">Team: {{ formatTeamMembers(project.team_emails) }}</p>
            <p class="text-sm text-gray-700">{{ project.description?.substring(0, 200) }}...</p>
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">Your Score (1-10):</label>
            <select 
              v-model="scores[project.id]"
              class="px-4 py-2 border rounded"
            >
              <option v-for="n in 10" :key="n" :value="n">{{ n }}</option>
            </select>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-lg shadow p-6">
        <button 
          @click="submitVotes"
          class="w-full px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700 text-lg font-semibold"
        >
          Submit All Scores
        </button>
      </div>
    </div>
    
    <div v-else-if="error" class="max-w-md mx-auto bg-red-50 border border-red-200 rounded-lg p-6">
      <h2 class="text-xl font-semibold text-red-800 mb-2">Error</h2>
      <p class="text-red-600">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { format } from 'date-fns';
import api from '@/api';

const route = useRoute();
const router = useRouter();
const loading = ref(true);
const requiresCode = ref(false);
const codeInput = ref('');
const votingData = ref(null);
const alreadyVoted = ref(null);
const error = ref(null);
const scores = ref({});

function formatTeamMembers(teamEmails) {
  if (!teamEmails) return '';
  const emails = typeof teamEmails === 'string' ? JSON.parse(teamEmails) : teamEmails;
  return emails.map(email => email.split('@')[0]).join(', ');
}

function formatDate(dateString) {
  if (!dateString) return '';
  return format(new Date(dateString), 'MMM d, yyyy h:mm a');
}

async function loadVotingData() {
  const code = route.query.code || codeInput.value;
  
  if (!code) {
    requiresCode.value = true;
    loading.value = false;
    return;
  }
  
  try {
    const response = await api.getJudgeVoting(route.params.id, code);
    
    if (response.data.alreadyVoted) {
      alreadyVoted.value = response.data;
    } else if (response.data.requiresCode) {
      requiresCode.value = true;
    } else {
      votingData.value = response.data;
      // Initialize scores to 5 (default)
      response.data.projects.forEach(project => {
        scores.value[project.id] = 5;
      });
    }
  } catch (error) {
    if (error.response?.status === 404 || error.response?.status === 403) {
      error.value = error.response.data.error || 'Invalid or expired code';
    } else {
      error.value = 'Failed to load voting page';
    }
  } finally {
    loading.value = false;
  }
}

async function accessWithCode() {
  if (!codeInput.value.trim()) return;
  codeInput.value = codeInput.value.trim();
  router.push({ query: { code: codeInput.value } });
  loading.value = true;
  await loadVotingData();
}

async function submitVotes() {
  if (!confirm('Are you sure? You cannot change your votes after submission.')) return;
  
  // Validate all scores are set
  const missingScores = votingData.value.projects.filter(p => !scores.value[p.id]);
  if (missingScores.length > 0) {
    alert('Please score all projects');
    return;
  }
  
  try {
    await api.submitJudgeVotes(route.params.id, route.query.code, scores.value);
    alert('Votes submitted successfully!');
    router.push({ query: { submitted: true } });
  } catch (error) {
    alert('Failed to submit votes');
  }
}

onMounted(() => {
  loadVotingData();
});
</script>

