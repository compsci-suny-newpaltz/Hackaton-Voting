<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div v-if="loading" class="text-center py-12">
      <div class="text-gray-600">Loading...</div>
    </div>
    
    <div v-else-if="!canEdit" class="max-w-md mx-auto bg-yellow-50 border border-yellow-200 rounded-lg p-6">
      <h2 class="text-xl font-semibold text-yellow-800 mb-2">Access Denied</h2>
      <p class="text-yellow-700 mb-4">
        {{ accessDeniedReason }}
      </p>
      <router-link 
        :to="`/hackathons/${$route.params.id}/projects/${$route.params.projectId}`"
        class="text-blue-600 hover:underline"
      >
        ← Back to Project
      </router-link>
    </div>
    
    <div v-else-if="project">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-3xl font-bold">Edit Project</h1>
        <router-link 
          :to="`/hackathons/${$route.params.id}/projects/${$route.params.projectId}`"
          class="px-4 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          ← Back to Project
        </router-link>
      </div>
      
      <!-- Deadline Warning -->
      <div v-if="!hackathonStatus.canSubmit && !project.deadline_override_enabled" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <h3 class="font-semibold text-red-800 mb-1">⚠️ Submission Deadline Passed</h3>
        <p class="text-sm text-red-600">
          The hackathon ended on {{ formatDate(hackathon.end_time) }}. File uploads and edits are locked.
        </p>
      </div>
      
      <div v-if="project.deadline_override_enabled" class="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <h3 class="font-semibold text-green-800 mb-1">✅ Deadline Override Enabled</h3>
        <p class="text-sm text-green-600">
          An admin has enabled deadline override for your project. You can submit changes even after the deadline.
        </p>
      </div>
      
      <!-- Basic Info -->
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <h2 class="text-xl font-semibold mb-4">Basic Information</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">Project Name</label>
            <input 
              v-model="editData.name"
              type="text"
              class="w-full px-4 py-2 border rounded"
              :disabled="!canSubmit"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-1">Description (Markdown supported)</label>
            <textarea 
              v-model="editData.description"
              rows="8"
              class="w-full px-4 py-2 border rounded font-mono text-sm"
              placeholder="# About Our Project&#10;&#10;Describe your project here..."
              :disabled="!canSubmit"
            ></textarea>
            <p class="text-xs text-gray-500 mt-1">Supports Markdown formatting</p>
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-1">GitHub Repository URL (optional)</label>
            <input 
              v-model="editData.github_link"
              type="url"
              placeholder="https://github.com/username/repo"
              class="w-full px-4 py-2 border rounded"
              :disabled="!canSubmit"
            />
          </div>
          
          <div>
            <ImageUploadWithPreview
              label="Banner Image"
              :current-image-url="project.banner_url"
              :position="{ x: project.banner_position_x || 50, y: project.banner_position_y || 50 }"
              aspect-ratio="3:1"
              preview-height-class="h-64"
              :disabled="!canSubmit"
              :uploading="uploadingBanner"
              @file-selected="selectedBanner = $event"
              @upload="uploadBanner"
              @update:position="updateBannerPosition"
              @clear="selectedBanner = null"
            />
          </div>
          
          <div>
            <ImageUploadWithPreview
              label="Project Image"
              :current-image-url="project.image_url"
              :position="{ x: project.image_position_x || 50, y: project.image_position_y || 50 }"
              aspect-ratio="4:3"
              preview-height-class="h-48"
              :disabled="!canSubmit"
              :uploading="uploadingImage"
              @file-selected="selectedImage = $event"
              @upload="uploadImage"
              @update:position="updateImagePosition"
              @clear="selectedImage = null"
            />
          </div>
          
          <button 
            @click="saveBasicInfo"
            :disabled="!canSubmit"
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Save Changes
          </button>
        </div>
      </div>
      
      <!-- File Upload -->
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <h2 class="text-xl font-semibold mb-4">Project File</h2>
        
        <div v-if="project.current_file_url" class="mb-4 p-4 bg-gray-50 rounded">
          <h3 class="font-semibold mb-2">Current File</h3>
          <p class="text-sm text-gray-700 mb-1">{{ project.current_file_name }}</p>
          <p class="text-sm text-gray-500">
            {{ formatFileSize(project.current_file_size) }} • 
            Uploaded {{ formatDate(project.uploaded_at) }}
            <span v-if="project.uploaded_by"> by {{ project.uploaded_by }}</span>
          </p>
          <a 
            :href="project.current_file_url" 
            download
            class="inline-block mt-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            Download
          </a>
        </div>
        
        <div v-else class="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <p class="text-sm text-yellow-700">No file uploaded yet.</p>
        </div>
        
        <div v-if="canSubmit">
          <label class="block text-sm font-medium mb-2">Upload {{ project.current_file_url ? 'New Version' : 'File' }}</label>
          <input 
            ref="fileInput"
            type="file"
            @change="handleFileSelect"
            class="mb-3 block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
          <p class="text-xs text-gray-500 mb-3">Max file size: 1GB</p>
          
          <div v-if="selectedFile">
            <label class="block text-sm font-medium mb-1">Changelog (optional)</label>
            <textarea 
              v-model="changelog"
              rows="3"
              placeholder="What changed in this version?"
              class="w-full px-4 py-2 border rounded mb-3"
            ></textarea>
            
            <button 
              @click="uploadFile"
              :disabled="uploading"
              class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
            >
              {{ uploading ? 'Uploading...' : 'Upload File' }}
            </button>
            <button 
              @click="cancelFileSelect"
              :disabled="uploading"
              class="ml-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
        
        <div v-else class="text-sm text-gray-600">
          File uploads are locked. The submission deadline has passed.
        </div>
      </div>
      
      <!-- File History -->
      <div v-if="fileHistory.length > 0" class="bg-white rounded-lg shadow p-6 mb-6">
        <h2 class="text-xl font-semibold mb-4">Upload History</h2>
        <div class="space-y-3">
          <div 
            v-for="file in fileHistory" 
            :key="file.id"
            class="p-3 border rounded"
          >
            <div class="flex items-start justify-between">
              <div>
                <h3 class="font-semibold text-sm">Version {{ file.version }}</h3>
                <p class="text-sm text-gray-700">{{ file.filename }}</p>
                <p class="text-xs text-gray-500">
                  {{ formatFileSize(file.file_size) }} • 
                  {{ formatDate(file.uploaded_at) }} by {{ file.uploaded_by }}
                </p>
                <p v-if="file.changelog" class="text-sm text-gray-600 mt-1 italic">"{{ file.changelog }}"</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Team Members -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold mb-4">Team Members</h2>
        <ul class="space-y-1">
          <li v-for="email in teamEmails" :key="email" class="text-sm text-gray-700">
            • {{ email }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { format } from 'date-fns';
import api from '@/api';
import ImageUploadWithPreview from '@/components/ImageUploadWithPreview.vue';
import { useToast } from '@/composables/useToast';

const route = useRoute();
const toast = useToast();
const loading = ref(true);
const project = ref(null);
const hackathon = ref(null);
const hackathonStatus = ref(null);
const fileHistory = ref([]);
const canEdit = ref(false);
const accessDeniedReason = ref('');
const user = ref(null);

const editData = ref({
  name: '',
  description: '',
  github_link: '',
  banner_url: '',
  image_url: ''
});

const selectedFile = ref(null);
const changelog = ref('');
const uploading = ref(false);
const fileInput = ref(null);

const selectedBanner = ref(null);
const uploadingBanner = ref(false);
const selectedImage = ref(null);
const uploadingImage = ref(false);

const teamEmails = computed(() => {
  if (!project.value?.team_emails) return [];
  return typeof project.value.team_emails === 'string' 
    ? JSON.parse(project.value.team_emails) 
    : project.value.team_emails;
});

const canSubmit = computed(() => {
  return hackathonStatus.value?.canSubmit || project.value?.deadline_override_enabled;
});

function formatFileSize(bytes) {
  if (!bytes) return '0 MB';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}

function formatDate(dateString) {
  if (!dateString) return '';
  return format(new Date(dateString), 'MMM d, yyyy h:mm a');
}

async function checkAuth() {
  try {
    const response = await fetch('/hackathons/api/auth/status', {
      credentials: 'include'
    });
    const data = await response.json();
    
    if (data.authenticated) {
      user.value = data.user;
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
}

async function loadData() {
  try {
    // Check auth first
    const authenticated = await checkAuth();
    if (!authenticated) {
      canEdit.value = false;
      accessDeniedReason.value = 'You must be logged in to edit projects.';
      loading.value = false;
      return;
    }
    
    // Load project
    const projectResponse = await api.getProject(route.params.id, route.params.projectId);
    project.value = projectResponse.data;
    hackathon.value = projectResponse.data.hackathon;
    fileHistory.value = projectResponse.data.fileHistory || [];
    
    // Calculate hackathon status
    const now = new Date();
    const endTime = new Date(hackathon.value.end_time);
    hackathonStatus.value = {
      canSubmit: now < endTime
    };
    
    // Check if user is team member OR admin
    const userEmail = user.value.email.toLowerCase();
    const isTeamMember = teamEmails.value.map(e => e.toLowerCase()).includes(userEmail);
    
    // Get admin status from auth
    const authResponse = await fetch('/hackathons/api/auth/status', {
      credentials: 'include'
    });
    const authData = await authResponse.json();
    const isAdmin = authData.isAdmin || false;
    
    if (!isTeamMember && !isAdmin) {
      canEdit.value = false;
      accessDeniedReason.value = 'You are not a member of this project team.';
      loading.value = false;
      return;
    }
    
    canEdit.value = true;
    
    // Initialize edit data
    editData.value = {
      name: project.value.name || '',
      description: project.value.description || '',
      github_link: project.value.github_link || '',
      banner_url: project.value.banner_url || '',
      image_url: project.value.image_url || ''
    };
  } catch (error) {
    console.error('Failed to load project:', error);
    canEdit.value = false;
    accessDeniedReason.value = 'Failed to load project.';
  } finally {
    loading.value = false;
  }
}

async function saveBasicInfo() {
  try {
    await api.updateProject(route.params.id, route.params.projectId, editData.value);
    toast.success('Project updated successfully!');
    await loadData();
  } catch (error) {
    console.error('Failed to update project:', error);
    toast.error('Failed to update project. ' + (error.response?.data?.error || ''));
  }
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    // Check file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size must be less than 50MB');
      event.target.value = '';
      return;
    }
    selectedFile.value = file;
  }
}

function cancelFileSelect() {
  selectedFile.value = null;
  changelog.value = '';
  if (fileInput.value) {
    fileInput.value.value = '';
  }
}

async function uploadFile() {
  if (!selectedFile.value) return;

  uploading.value = true;
  try {
    await api.uploadProjectFile(
      route.params.id,
      route.params.projectId,
      selectedFile.value,
      changelog.value
    );
    toast.success('File uploaded successfully!');
    cancelFileSelect();
    await loadData();
  } catch (error) {
    console.error('Failed to upload file:', error);
    toast.error('Failed to upload file. ' + (error.response?.data?.error || ''));
  } finally {
    uploading.value = false;
  }
}

async function updateBannerPosition(position) {
  try {
    await api.updateProject(route.params.id, route.params.projectId, {
      banner_position_x: Math.round(position.x),
      banner_position_y: Math.round(position.y)
    });
  } catch (error) {
    console.error('Failed to save banner position:', error);
  }
}

async function uploadBanner(file) {
  if (!file) return;
  
  uploadingBanner.value = true;
  try {
    const formData = new FormData();
    formData.append('banner', file);
    
    await api.uploadProjectBanner(route.params.id, route.params.projectId, formData);
    alert('Banner uploaded successfully!');
    selectedBanner.value = null;
    await loadData();
  } catch (error) {
    console.error('Failed to upload banner:', error);
    alert('Failed to upload banner. ' + (error.response?.data?.error || ''));
  } finally {
    uploadingBanner.value = false;
  }
}

async function uploadImage(file, position) {
  if (!file) return;
  
  uploadingImage.value = true;
  try {
    const formData = new FormData();
    formData.append('image', file);
    
    await api.uploadProjectImage(route.params.id, route.params.projectId, formData);
    
    // Save position
    if (position) {
      await api.updateProject(route.params.id, route.params.projectId, {
        image_position_x: Math.round(position.x),
        image_position_y: Math.round(position.y)
      });
    }
    
    alert('Project image uploaded successfully!');
    selectedImage.value = null;
    await loadData();
  } catch (error) {
    console.error('Failed to upload image:', error);
    alert('Failed to upload image. ' + (error.response?.data?.error || ''));
  } finally {
    uploadingImage.value = false;
  }
}

async function updateImagePosition(position) {
  try {
    await api.updateProject(route.params.id, route.params.projectId, {
      image_position_x: Math.round(position.x),
      image_position_y: Math.round(position.y)
    });
  } catch (error) {
    console.error('Failed to save image position:', error);
  }
}

onMounted(() => {
  loadData();
});
</script>
