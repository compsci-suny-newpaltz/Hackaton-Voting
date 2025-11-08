<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div v-if="loading" class="text-center py-12">
      <div class="text-gray-600">Loading...</div>
    </div>
    <div v-else-if="hackathon">
      <div v-if="hackathon.banner_url" class="mb-6 rounded-lg overflow-hidden">
        <img :src="hackathon.banner_url" :alt="hackathon.name" class="w-full h-64 object-cover" :style="{ objectPosition: `${hackathon.banner_position_x || 50}% ${hackathon.banner_position_y || 50}%` }" />
      </div>
      <h1 class="text-4xl font-bold mb-4">{{ hackathon.name }}</h1>
      <Countdown 
        :hackathon="hackathon" 
        :status="getHackathonStatus(hackathon)"
        @refresh="reloadHackathon"
        @status-transition="handleStatusTransition"
      />
      <div v-if="hackathon.description" class="prose mt-6 mb-8" v-html="renderMarkdown(hackathon.description)"></div>
      <div v-if="hackathon && getHackathonStatus(hackathon) === 'concluded'" class="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
        <h2 class="text-2xl font-semibold mb-4">🏆 Results</h2>
        <div v-if="loadingResults" class="text-center py-4">
          <p class="text-gray-600">Loading results...</p>
        </div>
        <div v-else-if="results">
          <div class="mb-6">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-lg font-semibold">Final Rankings</h3>
              <div class="flex gap-2">
                <button @click="sortBy = 'judge'" :class="sortBy === 'judge' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'" class="px-3 py-1 rounded text-sm font-medium hover:opacity-80">Sort by Judge Score</button>
                <button @click="sortBy = 'popular'" :class="sortBy === 'popular' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'" class="px-3 py-1 rounded text-sm font-medium hover:opacity-80">Sort by Popular Vote</button>
              </div>
            </div>
            <div class="bg-white rounded-lg overflow-hidden">
              <table class="w-full">
                <thead class="bg-gray-100 border-b">
                  <tr>
                    <th class="px-4 py-3 text-left text-sm font-semibold">#</th>
                    <th class="px-4 py-3 text-left text-sm font-semibold">Project</th>
                    <th class="px-4 py-3 text-center text-sm font-semibold">Weighted Score</th>
                    <th class="px-4 py-3 text-center text-sm font-semibold">Score Range</th>
                    <th class="px-4 py-3 text-center text-sm font-semibold">Judge Votes</th>
                    <th class="px-4 py-3 text-center text-sm font-semibold">Popular Votes</th>
                    <th class="px-4 py-3 text-center text-sm font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-for="(proj, index) in sortedResults" :key="proj.id">
                    <tr class="border-b hover:bg-gray-50" :class="{ 'bg-yellow-50': index === 0 && proj.avg_judge_score }">
                      <td class="px-4 py-3 font-semibold">
                        <span v-if="index === 0 && proj.avg_judge_score" class="text-2xl">🥇</span>
                        <span v-else-if="index === 1 && proj.avg_judge_score" class="text-2xl">🥈</span>
                        <span v-else-if="index === 2 && proj.avg_judge_score" class="text-2xl">🥉</span>
                        <span v-else>{{ index + 1 }}</span>
                      </td>
                      <td class="px-4 py-3">
                        <router-link :to="`/hackathons/${hackathon.id}/projects/${proj.id}`" class="text-blue-600 hover:underline font-medium">{{ proj.name }}</router-link>
                      </td>
                      <td class="px-4 py-3 text-center">
                        <span v-if="proj.avg_judge_score" class="font-bold text-lg">{{ proj.avg_judge_score }}/10</span>
                        <span v-else class="text-gray-400">-</span>
                      </td>
                      <td class="px-4 py-3 text-center text-sm text-gray-600">
                        <span v-if="proj.min_judge_score !== null && proj.max_judge_score !== null">{{ proj.min_judge_score }} - {{ proj.max_judge_score }}</span>
                        <span v-else class="text-gray-400">-</span>
                      </td>
                      <td class="px-4 py-3 text-center text-gray-600">{{ proj.judge_vote_count || 0 }}</td>
                      <td class="px-4 py-3 text-center text-gray-600">👍 {{ proj.popular_votes || 0 }}</td>
                      <td class="px-4 py-3 text-center">
                        <button @click="toggleProjectDetails(proj.id)" class="text-blue-600 hover:underline text-sm">{{ expandedProjects.has(proj.id) ? 'Hide' : 'View' }}</button>
                      </td>
                    </tr>
                    <tr v-if="expandedProjects.has(proj.id)">
                      <td colspan="7" class="px-4 py-4 bg-gray-50">
                        <div class="space-y-2">
                          <h4 class="font-semibold mb-2">Individual Scores</h4>
                          <div v-for="detail in getProjectDetails(proj.id)" :key="detail.judge_name + '-' + detail.category_id" class="text-sm pl-4 border-l-2 border-gray-200">
                            <div class="flex items-center justify-between">
                              <span class="font-medium"><span v-if="detail.category_name" class="inline-block text-xs px-2 py-0.5 mr-2 rounded bg-gray-200 text-gray-700">{{ detail.category_name }}</span>{{ detail.judge_name }}</span>
                              <span class="font-bold">{{ detail.score }}/10</span>
                            </div>
                            <p v-if="detail.comment" class="text-gray-600 italic mt-1">"{{ detail.comment }}"</p>
                            <p class="text-xs text-gray-400 mt-1">{{ new Date(detail.voted_at).toLocaleString() }}</p>
                          </div>
                          <p v-if="!getProjectDetails(proj.id) || getProjectDetails(proj.id).length === 0" class="text-sm text-gray-500">No judge scores yet</p>
                        </div>
                      </td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>
            <div v-if="results.overall || (results.categories && results.categories.length)" class="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div v-if="results.overall && results.overall.winners && results.overall.winners.length" class="bg-white rounded-lg p-4 border">
                <h3 class="text-lg font-semibold mb-2">Overall Winner{{ results.overall.winners.length > 1 ? 's' : '' }}</h3>
                <ul class="space-y-1">
                  <li v-for="w in results.overall.winners" :key="w.project_id" class="flex items-center justify-between">
                    <span>🥇 <router-link :to="`/hackathons/${hackathon.id}/projects/${w.project_id}`" class="text-blue-600 hover:underline">{{ w.project_name }}</router-link></span>
                    <span class="font-semibold">{{ w.average_score }}/10</span>
                  </li>
                </ul>
              </div>
              <div v-if="results.categories && results.categories.length" class="bg-white rounded-lg p-4 border">
                <h3 class="text-lg font-semibold mb-2">Category Winners</h3>
                <div class="space-y-3">
                  <div v-for="cat in results.categories" :key="cat.id" class="border rounded p-3">
                    <div class="flex items-center justify-between mb-1">
                      <div class="font-medium">{{ cat.name }}<span v-if="cat.weight !== 1" class="ml-2 text-xs text-gray-500">Weight ×{{ cat.weight }}</span></div>
                    </div>
                    <div v-if="cat.winners && cat.winners.length" class="space-y-1">
                      <div v-for="w in cat.winners" :key="`${cat.id}-${w.project_id}`" class="flex items-center justify-between">
                        <router-link :to="`/hackathons/${hackathon.id}/projects/${w.project_id}`" class="text-blue-600 hover:underline">{{ w.project_name }}</router-link>
                        <span class="font-semibold">{{ w.average_score }}/10</span>
                      </div>
                    </div>
                    <div v-else class="text-sm text-gray-500">No scores yet</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="results.detailed && results.detailed.length > 0" class="mt-6">
            <h3 class="text-lg font-semibold mb-3">Individual Judge Scores</h3>
            <div class="space-y-4">
              <div v-for="projDetail in results.detailed" :key="projDetail.project_id" class="bg-white rounded-lg p-4 border">
                <h4 class="font-semibold mb-2">{{ projDetail.project_name }}</h4>
                <div v-if="projDetail.scores.length > 0" class="space-y-2">
                  <div v-for="(score, idx) in projDetail.scores" :key="idx" class="text-sm pl-4 border-l-2 border-gray-200">
                    <div class="flex items-center justify-between">
                      <span class="font-medium"><span v-if="score.category_name" class="inline-block text-xs px-2 py-0.5 mr-2 rounded bg-gray-200 text-gray-700">{{ score.category_name }}</span>{{ score.judge_name }}</span>
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
        <div v-else-if="resultsError" class="text-red-600">{{ resultsError }}</div>
      </div>
      <div v-if="projects.length > 0" class="mt-8">
        <h2 class="text-2xl font-semibold mb-4">Projects ({{ projects.length }})</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <ProjectCard v-for="project in projects" :key="project.id" :project="project" :hackathon-id="hackathon.id" />
        </div>
      </div>
      <div v-else class="text-center py-12 text-gray-600"><p>No projects submitted yet.</p></div>
    </div>
    <div v-else class="text-center py-12"><p class="text-gray-600">Hackathon not found.</p></div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
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
const sortBy = ref('judge'); // 'judge' or 'popular'
const expandedProjects = ref(new Set());

const sortedResults = computed(() => {
  if (!results.value?.summary) return [];

  const summary = [...results.value.summary];

  if (sortBy.value === 'popular') {
    return summary.sort((a, b) => {
      if (a.popular_votes === b.popular_votes) {
        // Secondary sort by judge score
        if (a.avg_judge_score === null) return 1;
        if (b.avg_judge_score === null) return -1;
        return b.avg_judge_score - a.avg_judge_score;
      }
      return b.popular_votes - a.popular_votes;
    });
  }

  // Default: sort by judge score (already sorted by backend)
  return summary;
});

function toggleProjectDetails(projectId) {
  if (expandedProjects.value.has(projectId)) {
    expandedProjects.value.delete(projectId);
  } else {
    expandedProjects.value.add(projectId);
  }
  // Trigger reactivity
  expandedProjects.value = new Set(expandedProjects.value);
}

function getProjectDetails(projectId) {
  if (!results.value?.detailed) return [];
  const projectDetail = results.value.detailed.find(d => d.project_id === projectId);
  return projectDetail?.scores || [];
}

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
    console.log('Loading hackathon:', route.params.id);
    const response = await api.getHackathon(route.params.id);
    console.log('Hackathon response:', response.data);
    hackathon.value = response.data;
    projects.value = response.data.projects || [];
    console.log('Projects:', projects.value.length);

    // Load results if hackathon is concluded
    const status = getHackathonStatus(hackathon.value);
    console.log('Hackathon status:', status);
    if (status === 'concluded') {
      console.log('Loading results...');
      await loadResults();
    }
  } catch (error) {
    console.error('Failed to load hackathon:', error);
    hackathon.value = null;
  } finally {
    loading.value = false;
    console.log('Loading finished. hackathon:', hackathon.value !== null);
  }
}

async function loadResults() {
  loadingResults.value = true;
  try {
    console.log('Fetching results for hackathon:', route.params.id);
    const response = await api.getHackathonResults(route.params.id);
    console.log('Results response:', response.data);
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
    console.log('Results loaded:', results.value !== null);
  }
}

onMounted(() => {
  loadData();
});

async function reloadHackathon() {
  try {
    const response = await api.getHackathon(route.params.id);
    hackathon.value = response.data;
    projects.value = response.data.projects || [];
    const status = getHackathonStatus(hackathon.value);
    if (status === 'concluded' && !results.value) {
      await loadResults();
    }
  } catch (e) {
    console.error('Failed to reload hackathon:', e);
  }
}

async function handleStatusTransition(evt) {
  // On any transition, reload hackathon and possibly results
  await reloadHackathon();
  const status = getHackathonStatus(hackathon.value);
  if (status === 'concluded') {
    await loadResults();
  }
}
</script>

