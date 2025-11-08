<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <h1 class="text-3xl font-bold mb-6">Admin Dashboard</h1>
    
    <div v-if="loading" class="text-center py-12">
      <div class="text-gray-600">Loading...</div>
    </div>
    
    <div v-else>
      <!-- Create Hackathon -->
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <h2 class="text-xl font-semibold mb-4">Create New Hackathon</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="md:col-span-2">
            <label class="block text-sm font-medium mb-1">Name</label>
            <input v-model="newHackathon.name" type="text" class="w-full px-4 py-2 border rounded" placeholder="e.g., Fall 2025 Hackathon" />
          </div>
          <div class="md:col-span-2">
            <label class="block text-sm font-medium mb-1">Description (optional)</label>
            <textarea v-model="newHackathon.description" rows="3" class="w-full px-4 py-2 border rounded" placeholder="Brief description..."></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Start Time</label>
            <input v-model="newHackathon.start_time" type="datetime-local" class="w-full px-4 py-2 border rounded" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">End Time</label>
            <input v-model="newHackathon.end_time" type="datetime-local" class="w-full px-4 py-2 border rounded" />
          </div>
          <div class="md:col-span-2">
            <ImageUploadWithPreview
              label="Banner Image (optional)"
              aspect-ratio="3:1"
              preview-height-class="h-64"
              @file-selected="handleBannerSelected"
              @update:position="bannerPosition = $event"
              @clear="bannerFile = null"
            />
          </div>
        </div>
        <div class="mt-4 flex items-center space-x-2">
          <button @click="createHackathon" class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Create</button>
          <span class="text-sm text-gray-600">Voting expiration defaults to 7 days after the end time. You can adjust later in settings.</span>
        </div>
      </div>
      
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

    <ConfirmDialog ref="confirmDialog" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { format } from 'date-fns';
import api from '@/api';
import ImageUploadWithPreview from '@/components/ImageUploadWithPreview.vue';
import { useToast } from '@/composables/useToast';
import ConfirmDialog from '@/components/ConfirmDialog.vue';

const toast = useToast();
const confirmDialog = ref(null);
const loading = ref(true);
const hackathons = ref([]);
const admins = ref([]);
const auditLogs = ref([]);
const newAdminEmail = ref('');
const router = useRouter();
const bannerFile = ref(null);
const bannerPosition = ref({ x: 50, y: 50 });
const uploadingBanner = ref(false);

const newHackathon = ref({
  name: '',
  description: '',
  start_time: '', // bound to datetime-local
  end_time: '',   // bound to datetime-local
});

// Helper function to show confirmation dialogs
async function showConfirm(options) {
  return new Promise((resolve) => {
    const dialog = confirmDialog.value;
    if (!dialog) {
      resolve(false);
      return;
    }

    const handleConfirm = () => {
      resolve(true);
    };

    const handleCancel = () => {
      resolve(false);
    };

    // Use DOM event listeners for one-time events
    dialog.$el?.addEventListener('confirm', handleConfirm, { once: true });
    dialog.$el?.addEventListener('cancel', handleCancel, { once: true });

    // Set dialog properties
    Object.assign(dialog, {
      title: options.title || 'Confirm Action',
      message: options.message,
      confirmText: options.confirmText || 'Confirm',
      cancelText: options.cancelText || 'Cancel',
      type: options.type || 'warning',
      loadingText: options.loadingText || ''
    });

    dialog.show();
  });
}

function formatDate(dateString) {
  return format(new Date(dateString), 'MMM d, yyyy');
}

function handleBannerSelected(file) {
  bannerFile.value = file;
}

async function loadData() {
  try {
    const response = await api.getAdminDashboard();
    hackathons.value = response.data.hackathons || [];
    admins.value = response.data.admins || [];
    auditLogs.value = response.data.auditLogs || [];
  } catch (error) {
    console.error('Failed to load dashboard:', error);
    toast.error('Failed to load dashboard. Are you an admin?');
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
    toast.error('Failed to add admin');
  }
}

async function removeAdmin(email) {
  const confirmed = await showConfirm({
    title: 'Remove Admin',
    message: `Remove ${email} as admin? They will lose all admin privileges.`,
    confirmText: 'Remove',
    cancelText: 'Cancel',
    type: 'danger'
  });

  if (!confirmed) return;

  try {
    await api.removeAdmin(email);
    await loadData();
  } catch (error) {
    toast.error('Failed to remove admin');
  }
}

function toIso(dtLocal) {
  // Convert 'YYYY-MM-DDTHH:mm' (local) to ISO string
  if (!dtLocal) return '';
  const d = new Date(dtLocal);
  return d.toISOString();
}

async function createHackathon() {
  if (!newHackathon.value.name || !newHackathon.value.start_time || !newHackathon.value.end_time) {
    toast.warning('Name, start time, and end time are required.');
    return;
  }
  try {
    const payload = {
      name: newHackathon.value.name.trim(),
      description: newHackathon.value.description?.trim() || '',
      start_time: toIso(newHackathon.value.start_time),
      end_time: toIso(newHackathon.value.end_time)
    };
    
    const res = await api.createHackathon(payload);
    const hackathonId = res.data?.id;

    if (!hackathonId) {
      toast.error('Failed to create hackathon.');
      return;
    }
    
    // Upload banner if provided
    if (bannerFile.value) {
      try {
        const formData = new FormData();
        formData.append('banner', bannerFile.value);
        formData.append('position_x', bannerPosition.value.x);
        formData.append('position_y', bannerPosition.value.y);
        await api.uploadHackathonBanner(hackathonId, formData);
      } catch (uploadError) {
        console.error('Failed to upload banner:', uploadError);
        toast.warning('Hackathon created, but banner upload failed. You can add it later in settings.');
      }
    }
    
    // Reset form
    newHackathon.value = { name: '', description: '', start_time: '', end_time: '' };
    bannerFile.value = null;
    bannerPosition.value = { x: 50, y: 50 };
    await loadData();
    
    // Navigate to settings for further configuration
    router.push(`/hackathons/admin/hackathons/${hackathonId}/settings`);
  } catch (error) {
    console.error('Create hackathon failed:', error);
    toast.error('Failed to create hackathon.');
  }
}

onMounted(() => {
  loadData();
});
</script>

