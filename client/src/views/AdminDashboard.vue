<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <h1 class="text-3xl font-bold mb-6">Admin Dashboard</h1>
    
    <div v-if="loading" class="text-center py-12">
      <div class="text-gray-600">Loading...</div>
    </div>
    
    <div v-else>
      <!-- Hackathons Section -->
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <h2 class="text-xl font-semibold mb-4">Hackathons</h2>
        <div class="space-y-2">
          <div 
            v-for="hackathon in hackathons" 
            :key="hackathon.id"
            class="flex items-center justify-between p-3 border rounded hover:bg-gray-50"
          >
            <div>
              <h3 class="font-semibold">{{ hackathon.name }}</h3>
              <p class="text-sm text-gray-600">{{ formatDate(hackathon.start_time) }} - {{ formatDate(hackathon.end_time) }}</p>
            </div>
            <router-link 
              :to="`/hackathons/admin/hackathons/${hackathon.id}/settings`"
              class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              Settings
            </router-link>
          </div>
        </div>
      </div>
      
      <!-- Admin Management -->
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <h2 class="text-xl font-semibold mb-4">Admin Management</h2>
        <div class="mb-4">
          <input 
            v-model="newAdminEmail"
            type="email"
            placeholder="Email address"
            class="px-4 py-2 border rounded mr-2"
          />
          <button 
            @click="addAdmin"
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Add Admin
          </button>
        </div>
        <div class="space-y-2">
          <div 
            v-for="admin in admins" 
            :key="admin.id"
            class="flex items-center justify-between p-3 border rounded"
          >
            <span>{{ admin.email }}</span>
            <button 
              @click="removeAdmin(admin.email)"
              class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
      
      <!-- Audit Logs -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold mb-4">Recent Audit Logs</h2>
        <div class="space-y-2">
          <div 
            v-for="log in auditLogs" 
            :key="log.id"
            class="p-3 border rounded text-sm"
          >
            <div class="font-semibold">{{ log.action_type }}</div>
            <div class="text-gray-600">{{ log.actor_email }} • {{ formatDate(log.timestamp) }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { format } from 'date-fns';
import api from '@/api';

const loading = ref(true);
const hackathons = ref([]);
const admins = ref([]);
const auditLogs = ref([]);
const newAdminEmail = ref('');

function formatDate(dateString) {
  return format(new Date(dateString), 'MMM d, yyyy');
}

async function loadData() {
  try {
    const response = await api.getAdminDashboard();
    hackathons.value = response.data.hackathons || [];
    admins.value = response.data.admins || [];
    auditLogs.value = response.data.auditLogs || [];
  } catch (error) {
    console.error('Failed to load dashboard:', error);
    alert('Failed to load dashboard. Are you an admin?');
  } finally {
    loading.value = false;
  }
}

async function addAdmin() {
  if (!newAdminEmail.value) return;
  try {
    await api.addAdmin(newAdminEmail.value);
    newAdminEmail.value = '';
    await loadData();
  } catch (error) {
    alert('Failed to add admin');
  }
}

async function removeAdmin(email) {
  if (!confirm(`Remove ${email} as admin?`)) return;
  try {
    await api.removeAdmin(email);
    await loadData();
  } catch (error) {
    alert('Failed to remove admin');
  }
}

onMounted(() => {
  loadData();
});
</script>

