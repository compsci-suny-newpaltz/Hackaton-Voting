<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div v-if="loading" class="text-center py-12">
      <div class="text-gray-600">Loading...</div>
    </div>
    
    <div v-else-if="hackathon">
      <div v-if="hackathon.banner_url" class="mb-6 rounded-lg overflow-hidden">
        <img 
          :src="hackathon.banner_url" 
          :alt="hackathon.name" 
          class="w-full h-64 object-cover"
          :style="{ objectPosition: `${hackathon.banner_position_x || 50}% ${hackathon.banner_position_y || 50}%` }"
        >
      </div>
      
      <h1 class="text-4xl font-bold mb-4">{{ hackathon.name }}</h1>
      
      <Countdown :hackathon="hackathon" :status="getHackathonStatus(hackathon)" />
      
      <div v-if="hackathon.description" class="prose mt-6 mb-8" v-html="renderMarkdown(hackathon.description)"></div>
      
      <div v-if="getHackathonStatus(hackathon) === 'concluded'" class="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
        <h2 class="text-2xl font-semibold mb-4">🏆 Results</h2>
        
        <div v-if="loadingResults" class="text-center py-4">
          <p class="text-gray-600">Loading results...</p>
        </div>
        
        <div v-else-if="results">
          <div class="mb-6">
            <h3 class="text-lg font-semibold mb-3">Final Rankings</h3>
            <div class="bg-white rounded-lg overflow-hidden">
              <table class="w-full">
                <thead class="bg-gray-100 border-b">
                  <tr>
                    <th class="px-4 py-3 text-left text-sm font-semibold">#</th>
                    <th class="px-4 py-3 text-left text-sm font-semibold">Project</th>
                    <th class="px-4 py-3 text-center text-sm font-semibold">Avg Judge Score</th>
                    <th class="px-4 py-3 text-center text-sm font-semibold">Judge Votes</th>
                    <th class="px-4 py-3 text-center text-sm font-semibold">Popular Votes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr 
                    v-for="(proj, index) in results.summary" 
                    :key="proj.id"
                    class="border-b hover:bg-gray-50"
                    :class="{ 'bg-yellow-50': index === 0 && proj.avg_judge_score }"
                  >
                    <td class="px-4 py-3 font-semibold">
                      <span v-if="index === 0 && proj.avg_judge_score" class="text-2xl">🥇</span>
                      <span v-else-if="index === 1 && proj.avg_judge_score" class="text-2xl">🥈</span>
                      <span v-else-if="index === 2 && proj.avg_judge_score" class="text-2xl">🥉</span>
                      <span v-else>{{ index + 1 }}</span>
                    </td>
                    <td class="px-4 py-3">
                      <router-link 
                        :to="`/hackathons/${hackathon.id}/projects/${proj.id}`"
                        class="text-blue-600 hover:underline font-medium"
                      >
                        {{ proj.name }}
                      </router-link>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <span v-if="proj.avg_judge_score" class="font-bold text-lg">
                        {{ proj.avg_judge_score }}/10
                      </span>
                      <span v-else class="text-gray-400">-</span>
                    </td>
                    <td class="px-4 py-3 text-center text-gray-600">
                      {{ proj.judge_vote_count || 0 }}
                    </td>
                    <td class="px-4 py-3 text-center text-gray-600">
                      👍 {{ proj.popular_votes || 0 }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <div v-if="results.detailed && results.detailed.length > 0" class="mt-6">
            <h3 class="text-lg font-semibold mb-3">Individual Judge Scores</h3>
            <div class="space-y-4">
              <div 
                v-for="projDetail in results.detailed" 
                :key="projDetail.project_id"
                class="bg-white rounded-lg p-4 border"
              >
                <h4 class="font-semibold mb-2">{{ projDetail.project_name }}</h4>
                <div v-if="projDetail.scores.length > 0" class="space-y-2">
                  <div 
                    v-for="(score, idx) in projDetail.scores" 
                    :key="idx"
                    class="text-sm pl-4 border-l-2 border-gray-200"
                  >
                    <div class="flex items-center justify-between">
                      <span class="font-medium">{{ score.judge_name }}</span>
                      <span class="font-bold">{{ score.score }}/10</span>
                    </div>
                    <p v-if="score.comment" class="text-gray-600 italic mt-1">"{{ score.comment }}"</p>
                  </div>
                </div>
                <p v-else class="text-sm text-gray-500">No judge scores yet</p>
              </div>
            </div>
          </div>
        </div>
        
        <div v-else-if="resultsError" class="text-red-600">
          {{ resultsError }}
        </div>
      </div>
      
      <div v-if="projects.length > 0" class="mt-8">
        <h2 class="text-2xl font-semibold mb-4">Projects ({{ projects.length }})</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <ProjectCard 
            v-for="project in projects" 
            :key="project.id"
            :project="project"
            :hackathon-id="hackathon.id"
          />
        </div>
      </div>
      
      <div v-else class="text-center py-12 text-gray-600">
        <p>No projects submitted yet.</p>
      </div>
    </div>
    
    <div v-else class="text-center py-12">
      <p class="text-gray-600">Hackathon not found.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { marked } from 'marked';
import api from '@/api';
import Countdown from '@/components/Countdown.vue';
import ProjectCard from '@/components/ProjectCard.vue';

const route = useRoute();
const loading = ref(true);
const hackathon = ref(null);
const projects = ref([]);
const loadingResults = ref(false);
const results = ref(null);
const resultsError = ref(null);

function getHackathonStatus(hackathon) {
  if (!hackathon) return 'upcoming';
  
  const now = new Date();
  const startTime = new Date(hackathon.start_time);
  const endTime = new Date(hackathon.end_time);
  const voteExpiration = hackathon.vote_expiration 
    ? new Date(hackathon.vote_expiration)
    : new Date(endTime.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  if (hackathon.concluded_at) return 'concluded';
  if (now < startTime) return 'upcoming';
  if (now >= startTime && now < endTime) return 'active';
  if (now >= endTime && now < voteExpiration) return 'ended';
  if (now >= voteExpiration) return 'vote_expired';
  
  return 'upcoming';
}

function renderMarkdown(text) {
  if (!text) return '';
  return marked.parse(text);
}

async function loadData() {
  try {
    const response = await api.getHackathon(route.params.id);
    hackathon.value = response.data;
    projects.value = response.data.projects || [];
    
    // Load results if hackathon is concluded
    if (getHackathonStatus(hackathon.value) === 'concluded') {
      await loadResults();
    }
  } catch (error) {
    console.error('Failed to load hackathon:', error);
  } finally {
    loading.value = false;
  }
}

async function loadResults() {
  loadingResults.value = true;
  try {
    const response = await api.getHackathonResults(route.params.id);
    results.value = response.data;
  } catch (error) {
    console.error('Failed to load results:', error);
    if (error.response?.status === 403) {
      resultsError.value = 'Results not yet available';
    } else {
      resultsError.value = 'Failed to load results';
    }
  } finally {
    loadingResults.value = false;
  }
}

onMounted(() => {
  loadData();
});
</script>

