<template>
  <div id="app" class="min-h-screen bg-gray-50">
    <nav class="bg-white shadow-sm border-b">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center">
            <router-link to="/hackathons/" class="text-xl font-bold text-gray-900">
              Hackathon System
            </router-link>
          </div>
          <div class="flex items-center space-x-4">
            <template v-if="user">
              <span class="text-sm text-gray-600">{{ user.email }}</span>
              <a 
                v-if="isAdmin" 
                href="/hackathons/admin/dashboard" 
                class="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Admin
              </a>
              <a 
                :href="`https://hydra.newpaltz.edu/logout?returnTo=${encodeURIComponent(window.location.href)}`"
                class="px-3 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                Logout
              </a>
            </template>
            <template v-else>
              <a 
                :href="`https://hydra.newpaltz.edu/login?returnTo=${encodeURIComponent(window.location.href)}`"
                class="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Login with New Paltz
              </a>
            </template>
          </div>
        </div>
      </div>
    </nav>
    
    <main>
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const user = ref(null);
const isAdmin = ref(false);

async function checkAuth() {
  try {
    const response = await axios.post('https://hydra.newpaltz.edu/check', {}, {
      withCredentials: true
    });
    if (response.data.active) {
      user.value = response.data;
      // Check if admin (client-side check, server will verify)
      const email = response.data.email?.toLowerCase();
      const roles = (response.data.roles || []).map(r => r.toLowerCase());
      isAdmin.value = email === 'gopeen1@newpaltz.edu' || roles.includes('faculty');
    }
  } catch (error) {
    // Not authenticated
    user.value = null;
  }
}

onMounted(() => {
  checkAuth();
});
</script>

