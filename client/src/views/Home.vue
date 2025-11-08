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
      <!-- Active or Upcoming Hackathons (list) -->
      <div v-if="activeUpcomingHackathons.length > 0" class="mb-12 space-y-12">
        <div 
          v-for="hack in activeUpcomingHackathons" 
          :key="hack.id" 
          class="border rounded-xl bg-white shadow p-6 relative"
        >
          <div v-if="hack.banner_url" class="mb-6 rounded-lg overflow-hidden">
            <img :src="hack.banner_url" :alt="hack.name" class="w-full h-64 object-cover" :style="{ objectPosition: `${hack.banner_position_x || 50}% ${hack.banner_position_y || 50}%` }" />
          </div>
          <div class="flex items-center justify-between mb-4">
            <h1 class="text-3xl font-bold">{{ hack.name }}</h1>
            <router-link :to="`/hackathons/${hack.id}`" class="text-sm px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700">View Details</router-link>
          </div>
          <div v-if="hack.description" class="prose mb-4" v-html="renderMarkdown(hack.description)"></div>
          <Countdown 
            :hackathon="hack" 
            :status="getHackathonStatus(hack)"
            @refresh="() => refreshSingleHackathon(hack.id)"
            @status-transition="() => handleHackathonStatusTransition(hack.id)"
          />
          <div v-if="shouldShowProjectsFor(hack)" class="mt-6">
            <h2 class="text-xl font-semibold mb-3">Projects ({{ (hack._projects && hack._projects.length) || 0 }})</h2>
            <div v-if="!(hack._projects && hack._projects.length)" class="text-center py-6 text-gray-500">
              <p>No projects yet. {{ isAdmin ? 'Initialize projects in the admin settings.' : 'Check back later!' }}</p>
            </div>
            <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <ProjectCard 
                v-for="project in hack._projects" 
                :key="project.id"
                :project="project"
                :hackathon-id="hack.id"
              />
            </div>
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
const currentHackathon = ref(null); // retained for backward compatibility (first non-concluded)
const projects = ref([]);
const isAdmin = ref(false);
const activeUpcomingHackathons = ref([]); // enriched hackathon objects with _projects

const pastHackathons = computed(() => {
  return hackathons.value.filter(h => {
    const status = getHackathonStatus(h);
    // Past hackathons are concluded or have vote expired
    return status === 'concluded' || status === 'vote_expired';
  });
});

function shouldShowProjectsFor(hack) {
  if (!hack) return false;
  const status = getHackathonStatus(hack);
  return status !== 'upcoming';
}

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
    
    hackathons.value = (response.data.all || []).map(h => ({ ...h }));
    // Build active/upcoming list
    activeUpcomingHackathons.value = hackathons.value
      .filter(h => ['upcoming','active','ended','vote_expired'].includes(getHackathonStatus(h)))
      .sort((a,b) => new Date(a.start_time) - new Date(b.start_time));

    // Pick first as currentHackathon for legacy usage
    currentHackathon.value = activeUpcomingHackathons.value[0] || null;

    // Load projects for each active/upcoming hackathon
    for (let i = 0; i < activeUpcomingHackathons.value.length; i++) {
      const h = activeUpcomingHackathons.value[i];
      // Ensure placeholder _projects to avoid undefined in template while fetch in flight
      activeUpcomingHackathons.value[i] = { ...h, _projects: [] };
      await refreshSingleHackathon(h.id);
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

async function refreshSingleHackathon(id) {
  try {
    const resp = await api.getHackathon(id);
    if (resp.data.error) {
      console.error('Database error loading hackathon:', resp.data.error);
      return;
    }
    // Replace object in activeUpcomingHackathons
    const idx = activeUpcomingHackathons.value.findIndex(h => h.id === id);
    if (idx !== -1) {
      // Keep projects under internal property for display
      const updated = { ...resp.data, _projects: resp.data.projects || [] };
      activeUpcomingHackathons.value[idx] = updated;
      // If this is the first hackathon, mirror as currentHackathon
      if (idx === 0) {
        currentHackathon.value = updated;
        projects.value = updated._projects;
      }
    }
  } catch (e) {
    console.error('Failed refreshing hackathon', id, e);
  }
}

function handleHackathonStatusTransition(id) {
  refreshSingleHackathon(id);
}

onMounted(() => {
  loadData();
});
</script>

