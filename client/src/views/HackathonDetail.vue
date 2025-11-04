<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div v-if="loading" class="text-center py-12">
      <div class="text-gray-600">Loading...</div>
    </div>
    
    <div v-else-if="hackathon">
      <div v-if="hackathon.banner_url" class="mb-6 rounded-lg overflow-hidden">
        <img :src="hackathon.banner_url" :alt="hackathon.name" class="w-full h-64 object-cover">
      </div>
      
      <h1 class="text-4xl font-bold mb-4">{{ hackathon.name }}</h1>
      
      <Countdown :hackathon="hackathon" :status="hackathon.status?.status || 'upcoming'" />
      
      <div v-if="hackathon.description" class="prose mt-6 mb-8" v-html="renderMarkdown(hackathon.description)"></div>
      
      <div v-if="hackathon.status?.status === 'concluded'" class="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
        <h2 class="text-2xl font-semibold mb-4">🏆 Results</h2>
        <p class="text-gray-700">Judge results are now public!</p>
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

function renderMarkdown(text) {
  if (!text) return '';
  return marked.parse(text);
}

async function loadData() {
  try {
    const response = await api.getHackathon(route.params.id);
    hackathon.value = response.data;
    projects.value = response.data.projects || [];
  } catch (error) {
    console.error('Failed to load hackathon:', error);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadData();
});
</script>

