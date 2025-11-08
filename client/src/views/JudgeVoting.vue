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
        <div class="mt-3 text-sm text-gray-600">
          Progress: <span class="font-semibold">{{ getScoredProjectsCount() }} / {{ votingData.projects.length }}</span> projects scored
        </div>
      </div>

      <!-- Voting Status Banner -->
      <div v-if="hackathonStatus === 'upcoming' || hackathonStatus === 'active'" class="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6 mb-6">
        <div class="flex items-start gap-4">
          <div class="text-4xl">⚠️</div>
          <div class="flex-1">
            <h3 class="text-xl font-bold text-yellow-900 mb-2">Voting Not Yet Open</h3>
            <p class="text-yellow-800 mb-3">
              Judge voting opens when the hackathon submission period ends. You can fill out your scores now, and they will be saved automatically.
            </p>
            <div class="bg-yellow-100 rounded-lg p-4">
              <div class="text-sm font-semibold text-yellow-900 mb-1">Voting opens in:</div>
              <Countdown
                :hackathon="votingData.hackathon"
                :status="hackathonStatus"
                :autoPoll="false"
              />
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="hackathonStatus === 'ended' || hackathonStatus === 'vote_expired'" class="bg-green-50 border-2 border-green-400 rounded-lg p-6 mb-6">
        <div class="flex items-start gap-4">
          <div class="text-4xl">✅</div>
          <div class="flex-1">
            <h3 class="text-xl font-bold text-green-900 mb-2">Voting Is Now Open!</h3>
            <p class="text-green-800">
              The hackathon submission period has ended. You can now submit your scores.
            </p>
            <p v-if="lastSaved" class="text-sm text-green-700 mt-2">
              💾 Last saved: {{ new Date(lastSaved).toLocaleTimeString() }} EST
            </p>
          </div>
        </div>
      </div>

      <div v-else-if="hackathonStatus === 'concluded'" class="bg-gray-50 border-2 border-gray-400 rounded-lg p-6 mb-6">
        <div class="flex items-start gap-4">
          <div class="text-4xl">🏁</div>
          <div class="flex-1">
            <h3 class="text-xl font-bold text-gray-900 mb-2">Hackathon Concluded</h3>
            <p class="text-gray-800">
              This hackathon has been concluded and voting is now closed.
            </p>
          </div>
        </div>
      </div>

      <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h3 class="font-semibold mb-2">Instructions:</h3>
        <ul class="list-disc list-inside space-y-1 text-sm">
          <li>Review all projects below</li>
          <li>Click "View Full Project" to see complete details</li>
          <li>Score each project across all categories (1-10 scale)</li>
          <li>Optionally add comments for each category</li>
          <li>Scores are saved automatically as you type</li>
          <li>You can edit your scores before final submission</li>
        </ul>
        <p class="mt-2 text-sm text-gray-600">
          Projects are sorted by popular vote for your reference.
        </p>
      </div>

      <div class="space-y-8 mb-6">
        <div
          v-for="(project, index) in votingData.projects"
          :key="project.id"
          class="bg-white rounded-lg shadow-lg p-6"
          :class="{ 'ring-4 ring-green-400': isProjectFullyScored(project.id) }"
        >
          <div class="flex items-start justify-between mb-4">
            <div class="flex items-start gap-3">
              <div v-if="isProjectFullyScored(project.id)" class="text-2xl">✅</div>
              <div>
                <h3 class="text-xl font-semibold">{{ index + 1 }}. {{ project.name }}</h3>
                <p class="text-sm text-gray-600">👍 {{ project.vote_count || 0 }} popular votes</p>
              </div>
            </div>
            <a
              :href="`/hackathons/${votingData.hackathon.id}/projects/${project.id}`"
              target="_blank"
              class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm whitespace-nowrap"
            >
              View Full Project
            </a>
          </div>

          <div v-if="project.image_url" class="mb-4">
            <img :src="project.image_url" :alt="project.name" class="w-full h-48 object-cover rounded">
          </div>

          <div class="mb-4 pb-4 border-b">
            <p class="text-sm text-gray-600 mb-2">Team: {{ formatTeamMembers(project.team_emails) }}</p>
            <p class="text-sm text-gray-700">{{ project.description?.substring(0, 300) }}...</p>
          </div>

          <!-- Category-based Rubric Scoring -->
          <div class="space-y-4">
            <h4 class="font-semibold text-lg">Score this project:</h4>

            <div class="overflow-x-auto">
              <table class="w-full border-collapse">
                <thead>
                  <tr class="bg-gray-100">
                    <th class="border p-2 text-left text-sm font-semibold w-1/4">Criteria</th>
                    <th class="border p-2 text-left text-sm font-semibold w-2/5">Description</th>
                    <th class="border p-2 text-center text-sm font-semibold w-24">Score (1-10)</th>
                    <th class="border p-2 text-left text-sm font-semibold">Comments (Optional)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="category in votingData.categories"
                    :key="category.id"
                    class="hover:bg-gray-50"
                  >
                    <td class="border p-3 align-top">
                      <div class="font-semibold">{{ category.name }}</div>
                      <div v-if="category.weight !== 1" class="text-xs text-gray-600 mt-1">
                        Weight: {{ category.weight }}×
                      </div>
                    </td>
                    <td class="border p-3 align-top text-sm text-gray-700">
                      {{ category.description || 'No description' }}
                    </td>
                    <td class="border p-3 align-top text-center">
                      <input
                        v-model.number="categoryScores[project.id][category.id].score"
                        type="number"
                        min="1"
                        max="10"
                        placeholder="1-10"
                        class="w-16 px-2 py-1 border rounded text-center"
                        @input="autoSaveScores(project.id)"
                      />
                      <div class="text-xs text-gray-500 mt-1">/10</div>
                    </td>
                    <td class="border p-3 align-top">
                      <textarea
                        v-model="categoryScores[project.id][category.id].comment"
                        placeholder="Optional feedback..."
                        class="w-full px-2 py-1 border rounded text-sm resize-none"
                        rows="2"
                        @input="autoSaveScores(project.id)"
                      ></textarea>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6 sticky bottom-4">
        <div class="flex items-center justify-between mb-4">
          <div>
            <div class="text-lg font-semibold">
              Progress: {{ getScoredProjectsCount() }} / {{ votingData.projects.length }} projects fully scored
            </div>
            <div class="text-sm text-gray-600 mt-1">
              All categories must be scored (1-10) for each project
            </div>
          </div>
        </div>
        <button
          @click="submitVotes"
          :disabled="!allProjectsScored() || !canSubmitVotes"
          :class="{
            'bg-green-600 hover:bg-green-700': allProjectsScored() && canSubmitVotes,
            'bg-gray-400 cursor-not-allowed': !allProjectsScored() || !canSubmitVotes
          }"
          class="w-full px-6 py-3 text-white rounded text-lg font-semibold transition-colors"
        >
          <template v-if="!canSubmitVotes">
            ⏳ Voting opens when hackathon ends
          </template>
          <template v-else-if="!allProjectsScored()">
            Complete all scores to submit ({{ getScoredProjectsCount() }}/{{ votingData.projects.length }})
          </template>
          <template v-else>
            ✅ Submit All Scores
          </template>
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
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { format } from 'date-fns';
import api from '@/api';
import { useToast } from '@/composables/useToast';
import Countdown from '@/components/Countdown.vue';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const loading = ref(true);
const requiresCode = ref(false);
const codeInput = ref('');
const votingData = ref(null);
const alreadyVoted = ref(null);
const error = ref(null);
const scores = ref({}); // Legacy - kept for backward compatibility
const categoryScores = ref({}); // New: { projectId: { categoryId: { score, comment } } }
const autoSaveTimeout = ref(null);
const lastSaved = ref(null);
const now = ref(new Date()); // Reactive current time for auto-updating status

// Compute hackathon status for voting eligibility
const hackathonStatus = computed(() => {
  if (!votingData.value?.hackathon) return null;
  const hackathon = votingData.value.hackathon;

  // Get current time in Eastern Time (using reactive now ref)
  const currentTime = new Date(now.value.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const startTime = new Date(new Date(hackathon.start_time).toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const endTime = new Date(new Date(hackathon.end_time).toLocaleString('en-US', { timeZone: 'America/New_York' }));

  if (hackathon.concluded_at) return 'concluded';
  if (currentTime < startTime) return 'upcoming';
  if (currentTime < endTime) return 'active';
  return 'ended';
});

const canSubmitVotes = computed(() => {
  // Judges can only submit when hackathon is "ended" or later (but not concluded)
  return hackathonStatus.value === 'ended' || hackathonStatus.value === 'vote_expired';
});

function formatTeamMembers(teamEmails) {
  if (!teamEmails) return '';
  const emails = typeof teamEmails === 'string' ? JSON.parse(teamEmails) : teamEmails;
  return emails.map(email => email.split('@')[0]).join(', ');
}

function formatDate(dateString) {
  if (!dateString) return '';
  // Format in Eastern Time (America/New_York)
  const date = new Date(dateString);
  const estDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  return format(estDate, 'MMM d, yyyy h:mm a') + ' EST';
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

      // Initialize category scores for each project
      categoryScores.value = {};
      response.data.projects.forEach(project => {
        categoryScores.value[project.id] = {};
        response.data.categories.forEach(category => {
          categoryScores.value[project.id][category.id] = {
            score: null, // No default score - judges must enter a value
            comment: ''
          };
        });
      });

      // Try to restore saved progress from localStorage
      const restored = loadFromLocalStorage();
      if (restored) {
        toast.success('Progress restored from previous session!');
      }
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

function isProjectFullyScored(projectId) {
  if (!categoryScores.value[projectId]) return false;

  const projectScores = categoryScores.value[projectId];
  const categories = votingData.value.categories;

  // Check if all categories have valid scores (not null and 1-10)
  return categories.every(category => {
    const scoreData = projectScores[category.id];
    return scoreData &&
           scoreData.score !== null &&
           scoreData.score !== '' &&
           !isNaN(scoreData.score) &&
           scoreData.score >= 1 &&
           scoreData.score <= 10;
  });
}

function getScoredProjectsCount() {
  if (!votingData.value) return 0;
  return votingData.value.projects.filter(p => isProjectFullyScored(p.id)).length;
}

function allProjectsScored() {
  if (!votingData.value) return false;
  return votingData.value.projects.every(p => isProjectFullyScored(p.id));
}

function autoSaveScores(projectId) {
  // Validate input (only clamp if not null/empty)
  if (categoryScores.value[projectId]) {
    Object.values(categoryScores.value[projectId]).forEach(scoreData => {
      if (scoreData.score !== null && scoreData.score !== '' && !isNaN(scoreData.score)) {
        if (scoreData.score < 1) scoreData.score = 1;
        if (scoreData.score > 10) scoreData.score = 10;
      }
    });
  }

  // Debounce auto-save to localStorage
  if (autoSaveTimeout.value) {
    clearTimeout(autoSaveTimeout.value);
  }

  autoSaveTimeout.value = setTimeout(() => {
    saveToLocalStorage();
  }, 300); // 300ms debounce
}

function saveToLocalStorage() {
  if (!votingData.value) return;

  const saveData = {
    hackathonId: route.params.id,
    code: route.query.code,
    categoryScores: categoryScores.value,
    timestamp: new Date().toISOString()
  };

  const key = `judge-votes-${route.params.id}-${route.query.code}`;
  try {
    localStorage.setItem(key, JSON.stringify(saveData));
    lastSaved.value = saveData.timestamp;
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
}

function loadFromLocalStorage() {
  if (!votingData.value) return false;

  const key = `judge-votes-${route.params.id}-${route.query.code}`;
  try {
    const savedData = localStorage.getItem(key);
    if (!savedData) return false;

    const parsed = JSON.parse(savedData);

    // Validate that saved data matches current structure
    if (parsed.hackathonId !== route.params.id || parsed.code !== route.query.code) {
      return false;
    }

    // Merge saved scores over defaults
    Object.keys(parsed.categoryScores).forEach(projectId => {
      if (categoryScores.value[projectId]) {
        Object.keys(parsed.categoryScores[projectId]).forEach(categoryId => {
          if (categoryScores.value[projectId][categoryId]) {
            categoryScores.value[projectId][categoryId] = parsed.categoryScores[projectId][categoryId];
          }
        });
      }
    });

    lastSaved.value = parsed.timestamp;
    return true;
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return false;
  }
}

function clearLocalStorage() {
  const key = `judge-votes-${route.params.id}-${route.query.code}`;
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to clear localStorage:', error);
  }
}

async function submitVotes() {
  if (!allProjectsScored()) {
    toast.warning(`Please score all projects across all categories before submitting.`);
    return;
  }

  // Simple confirmation using browser confirm (since we don't have ConfirmDialog component in template)
  // Could be enhanced later with a proper modal
  const confirmed = window.confirm('Are you sure? You cannot change your votes after submission.');
  if (!confirmed) return;

  try {
    // Transform categoryScores to the format expected by the backend
    // Format: { projectId: { categories: { categoryId: { score, comment } } } }
    const votesPayload = {};
    Object.keys(categoryScores.value).forEach(projectId => {
      votesPayload[projectId] = {
        categories: categoryScores.value[projectId]
      };
    });

    await api.submitJudgeVotes(route.params.id, route.query.code, votesPayload);
    toast.success('Votes submitted successfully!');

    // Clear localStorage since votes are submitted
    clearLocalStorage();

    // Immediately set alreadyVoted to show thank you message without refresh
    alreadyVoted.value = {
      votedAt: new Date().toISOString(),
      judgeName: votingData.value.judgeName
    };

    // Clear voting data to hide form
    votingData.value = null;
  } catch (error) {
    console.error('Failed to submit votes:', error);
    toast.error('Failed to submit votes: ' + (error.response?.data?.error || 'Unknown error'));
  }
}

let timeUpdateInterval = null;

onMounted(() => {
  loadVotingData();

  // Update current time every second for status recalculation
  timeUpdateInterval = setInterval(() => {
    now.value = new Date();
  }, 1000);
});

onUnmounted(() => {
  // Clean up interval when component unmounts
  if (timeUpdateInterval) {
    clearInterval(timeUpdateInterval);
  }
});
</script>

