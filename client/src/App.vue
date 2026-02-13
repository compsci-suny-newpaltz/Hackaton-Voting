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
                :href="`https://hydra.newpaltz.edu/logout?returnTo=${encodeURIComponent(currentUrl)}`"
                class="px-3 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                Logout
              </a>
            </template>
            <template v-else>
              <a 
                :href="`https://hydra.newpaltz.edu/login?returnTo=${encodeURIComponent(currentUrl)}`"
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

    <!-- Footer -->
    <footer class="bg-white border-t py-4 mt-8">
      <div class="text-center">
        <a
          href="https://github.com/compsci-suny-newpaltz/Hackaton-Voting"
          target="_blank"
          rel="noopener noreferrer"
          class="text-gray-500 hover:text-blue-600 transition-colors text-sm"
          title="View source on GitHub"
        >
          Made by: SUNY Hydra Lab Team 2026 @ SUNY New Paltz
        </a>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const user = ref(null);
const isAdmin = ref(false);
const currentUrl = ref('');

// Safely access window.location after mount
onMounted(() => {
  if (typeof window !== 'undefined') {
    currentUrl.value = window.location.href;
    checkAuth();
  }
});

async function checkAuth() {
  try {
    const response = await fetch('/hackathons/api/auth/status', {
      credentials: 'include'
    });
    const data = await response.json();
    
    if (data.authenticated) {
      user.value = data.user;
      isAdmin.value = data.isAdmin;
    } else {
      user.value = null;
      isAdmin.value = false;
    }
  } catch (error) {
    // Not authenticated or error
    user.value = null;
    isAdmin.value = false;
  }
}
</script>

