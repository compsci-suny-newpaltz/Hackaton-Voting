<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div v-if="loading" class="text-center py-12">
      <div class="text-gray-600">Loading...</div>
    </div>
    
    <div v-else-if="databaseError" class="text-center py-12">
      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-2xl mx-auto">
        <h2 class="text-xl font-semibold text-yellow-800 mb-2">Database Not Initialized</h2>
        <p class="text-yellow-700 mb-4">
          The database needs to be set up before the application can work properly.
        </p>
        <p class="text-sm text-yellow-600">
          Please ensure better-sqlite3 is installed and run: <code class="bg-yellow-100 px-2 py-1 rounded">npm run init-db</code>
        </p>
      </div>
    </div>
    
    <div v-else>
      <!-- Current/Upcoming Hackathon -->
      <div v-if="currentHackathon" class="mb-12">
        <div v-if="currentHackathon.banner_url" class="mb-6 rounded-lg overflow-hidden">
          <img 
            :src="currentHackathon.banner_url" 
            :alt="currentHackathon.name" 
            class="w-full h-64 object-cover"
            :style="{ objectPosition: `${currentHackathon.banner_position_x || 50}% ${currentHackathon.banner_position_y || 50}%` }"
          >
        </div>
        
        <h1 class="text-4xl font-bold mb-4">{{ currentHackathon.name }}</h1>
        
        <div v-if="currentHackathon.description" class="prose mb-6" v-html="renderMarkdown(currentHackathon.description)"></div>
        
        <Countdown :hackathon="currentHackathon" :status="getHackathonStatus(currentHackathon)" />
        
        <div v-if="shouldShowProjects" class="mt-8">
          <h2 class="text-2xl font-semibold mb-4">Projects ({{ projects.length }})</h2>
          <div v-if="projects.length === 0" class="text-center py-8 text-gray-500">
            <p>No projects yet. {{ isAdmin ? 'Initialize projects in the admin settings.' : 'Check back later!' }}</p>
          </div>
          <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
const databaseError = ref(false);
const hackathons = ref([]);
const currentHackathon = ref(null);
const projects = ref([]);
const isAdmin = ref(false);

const pastHackathons = computed(() => {
  return hackathons.value.filter(h => {
    const status = getHackathonStatus(h);
    // Past hackathons are concluded or have vote expired
    return status === 'concluded' || status === 'vote_expired';
  });
});

const shouldShowProjects = computed(() => {
  if (!currentHackathon.value) return false;
  // Show projects if hackathon has started (active, ended, vote_expired, or concluded)
  const status = getHackathonStatus(currentHackathon.value);
  return status !== 'upcoming';
});

function getHackathonStatus(hackathon) {
  if (!hackathon) return 'upcoming';
  
  const now = new Date();
  const startTime = new Date(hackathon.start_time);
  const endTime = new Date(hackathon.end_time);
  const voteExpiration = hackathon.vote_expiration 
    ? new Date(hackathon.vote_expiration)
    : new Date(endTime.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days after end
  
  // If manually concluded
  if (hackathon.concluded_at) {
    return 'concluded';
  }
  
  // Check time-based status
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

function formatDate(dateString) {
  return format(new Date(dateString), 'MMM d, yyyy');
}

async function loadData() {
  try {
    // Check admin status first
    try {
      const authResponse = await fetch('/hackathons/api/auth/status', {
        credentials: 'include'
      });
      const authData = await authResponse.json();
      isAdmin.value = authData.isAdmin || false;
    } catch (error) {
      isAdmin.value = false;
    }
    
    const response = await api.getHackathons();
    
    // Handle database errors gracefully
    if (response.data.error) {
      console.error('Database error:', response.data.error);
      databaseError.value = true;
      hackathons.value = [];
      currentHackathon.value = null;
      return;
    }
    
    databaseError.value = false;
    
    hackathons.value = response.data.all || [];
    currentHackathon.value = response.data.current;
    
    if (currentHackathon.value) {
      try {
        const hackathonResponse = await api.getHackathon(currentHackathon.value.id);
        if (hackathonResponse.data.error) {
          console.error('Database error loading hackathon:', hackathonResponse.data.error);
          projects.value = [];
        } else {
          projects.value = hackathonResponse.data.projects || [];
        }
      } catch (error) {
        console.error('Failed to load hackathon details:', error);
        projects.value = [];
      }
    }
  } catch (error) {
    console.error('Failed to load hackathons:', error);
    // Check if it's a database error
    if (error.response?.status === 500 && error.response?.data?.error) {
      databaseError.value = true;
    }
    // Set empty defaults on error
    hackathons.value = [];
    currentHackathon.value = null;
    projects.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadData();
});
</script>

