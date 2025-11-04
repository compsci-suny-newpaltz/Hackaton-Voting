<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div v-if="loading" class="text-center py-12">
      <div class="text-gray-600">Loading...</div>
    </div>
    
    <div v-else>
      <!-- Current/Upcoming Hackathon -->
      <div v-if="currentHackathon" class="mb-12">
        <div v-if="currentHackathon.banner_url" class="mb-6 rounded-lg overflow-hidden">
          <img :src="currentHackathon.banner_url" :alt="currentHackathon.name" class="w-full h-64 object-cover">
        </div>
        
        <h1 class="text-4xl font-bold mb-4">{{ currentHackathon.name }}</h1>
        
        <div v-if="currentHackathon.description" class="prose mb-6" v-html="renderMarkdown(currentHackathon.description)"></div>
        
        <Countdown :hackathon="currentHackathon" :status="currentHackathon.status?.status || 'upcoming'" />
        
        <div v-if="currentHackathon.status?.status === 'active' || currentHackathon.status?.status === 'ended'" class="mt-8">
          <h2 class="text-2xl font-semibold mb-4">Projects ({{ projects.length }})</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ProjectCard 
              v-for="project in projects" 
              :key="project.id"
              :project="project"
              :hackathon-id="currentHackathon.id"
            />
          </div>
        </div>
      </div>
      
      <!-- Past Hackathons -->
      <div v-if="pastHackathons.length > 0">
        <h2 class="text-2xl font-semibold mb-4">Past Hackathons</h2>
        <div class="space-y-4">
          <div 
            v-for="hackathon in pastHackathons" 
            :key="hackathon.id"
            class="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-md transition-shadow"
            @click="$router.push(`/hackathons/${hackathon.id}`)"
          >
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-xl font-semibold">{{ hackathon.name }}</h3>
                <p class="text-gray-600 text-sm">
                  {{ formatDate(hackathon.start_time) }} - {{ formatDate(hackathon.end_time) }}
                </p>
              </div>
              <div class="text-gray-500">→</div>
            </div>
          </div>
        </div>
      </div>
      
      <div v-if="!currentHackathon && pastHackathons.length === 0" class="text-center py-12">
        <p class="text-gray-600">No hackathons available.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { marked } from 'marked';
import { format } from 'date-fns';
import api from '@/api';
import Countdown from '@/components/Countdown.vue';
import ProjectCard from '@/components/ProjectCard.vue';

const loading = ref(true);
const hackathons = ref([]);
const currentHackathon = ref(null);
const projects = ref([]);

const pastHackathons = computed(() => {
  return hackathons.value.filter(h => 
    h.status === 'concluded' || 
    (new Date(h.end_time) < new Date() && h.status !== 'upcoming' && h.status !== 'active')
  );
});

function renderMarkdown(text) {
  if (!text) return '';
  return marked.parse(text);
}

function formatDate(dateString) {
  return format(new Date(dateString), 'MMM d, yyyy');
}

async function loadData() {
  try {
    const response = await api.getHackathons();
    hackathons.value = response.data.all || [];
    currentHackathon.value = response.data.current;
    
    if (currentHackathon.value) {
      const hackathonResponse = await api.getHackathon(currentHackathon.value.id);
      projects.value = hackathonResponse.data.projects || [];
    }
  } catch (error) {
    console.error('Failed to load hackathons:', error);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadData();
});
</script>

