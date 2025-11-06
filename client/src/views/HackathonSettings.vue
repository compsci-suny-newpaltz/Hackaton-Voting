<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <h1 class="text-3xl font-bold mb-6">Hackathon Settings</h1>
    
    <div v-if="loading" class="text-center py-12">
      <div class="text-gray-600">Loading...</div>
    </div>
    
    <div v-else-if="settings">
      <!-- Basic Info -->
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <h2 class="text-xl font-semibold mb-4">Basic Information</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">Name</label>
            <input 
              v-model="settings.hackathon.name"
              type="text"
              class="w-full px-4 py-2 border rounded"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Description</label>
            <textarea 
              v-model="settings.hackathon.description"
              class="w-full px-4 py-2 border rounded"
              rows="4"
            ></textarea>
          </div>
          <div>
            <ImageUploadWithPreview
              label="Banner Image"
              :current-image-url="settings.hackathon.banner_url"
              :position="{ x: settings.hackathon.banner_position_x || 50, y: settings.hackathon.banner_position_y || 50 }"
              aspect-ratio="3:1"
              preview-height-class="h-64"
              :uploading="uploadingBanner"
              @file-selected="handleBannerSelected"
              @upload="uploadBanner"
              @update:position="updateBannerPosition"
              @clear="bannerFile = null"
            />
          </div>
          <div class="flex justify-between items-center">
            <button 
              @click="updateHackathon"
              class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save Changes
            </button>
            <button 
              @click="deleteHackathon"
              class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Delete Hackathon
            </button>
          </div>
        </div>
      </div>
      
      <!-- Projects -->
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <h2 class="text-xl font-semibold mb-4">Projects</h2>
        
        <!-- Initialize New Project -->
        <div class="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 class="text-md font-semibold mb-3">Initialize New Project</h3>
          <div class="space-y-3">
            <div>
              <label class="block text-sm font-medium mb-1">Project Name</label>
              <input 
                v-model="newProject.name"
                type="text"
                placeholder="e.g., Team Alpha - AI Assistant"
                class="w-full px-4 py-2 border rounded"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Team Member Emails (comma-separated)</label>
              <input 
                v-model="newProject.emails"
                type="text"
                placeholder="student1@newpaltz.edu, student2@newpaltz.edu"
                class="w-full px-4 py-2 border rounded"
              />
              <p class="text-xs text-gray-500 mt-1">Enter New Paltz email addresses separated by commas</p>
            </div>
            <button 
              @click="createProject"
              class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Initialize Project
            </button>
          </div>
        </div>
        
        <!-- Existing Projects -->
        <div class="space-y-2">
          <div 
            v-for="project in settings.projects" 
            :key="project.id"
            class="flex items-center justify-between p-3 border rounded"
          >
            <div class="flex-1">
              <h3 class="font-semibold">{{ project.name }}</h3>
              <p class="text-sm text-gray-600">{{ formatTeamEmails(project.team_emails) }}</p>
            </div>
            <div class="flex items-center gap-4">
              <label class="flex items-center">
                <input 
                  type="checkbox"
                  :checked="project.deadline_override_enabled"
                  @change="toggleDeadlineOverride(project.id)"
                  class="mr-2"
                />
                <span class="text-sm">Deadline Override</span>
              </label>
              <button
                @click="deleteProject(project.id)"
                class="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
          
          <div v-if="settings.projects.length === 0" class="text-center py-8 text-gray-500">
            No projects initialized yet. Create one above.
          </div>
        </div>
      </div>
      
      <!-- Judges Management -->
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <h2 class="text-xl font-semibold mb-4">Judges Management</h2>
        
        <div class="mb-4">
          <input 
            v-model="newJudgeName"
            type="text"
            placeholder="Judge Name"
            class="px-4 py-2 border rounded mr-2"
          />
          <button 
            @click="generateJudgeLink"
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Generate Voting Link
          </button>
        </div>
        
        <div v-if="generatedLink" class="mb-4 p-4 bg-green-50 border border-green-200 rounded">
          <p class="font-semibold mb-2">Judge Link Generated:</p>
          <input 
            :value="generatedLink"
            readonly
            class="w-full px-4 py-2 bg-white border rounded mb-2"
          />
          <button 
            @click="copyLink"
            class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
          >
            Copy Link
          </button>
        </div>
        
        <div class="space-y-2">
          <div 
            v-for="judge in settings.judges" 
            :key="judge.id"
            class="p-3 border rounded"
          >
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-semibold">{{ judge.judge_name }}</h3>
                <p class="text-sm text-gray-600">{{ judge.link }}</p>
                <p class="text-sm" :class="judge.voted ? 'text-green-600' : 'text-yellow-600'">
                  {{ judge.voted ? '✅ Voted' : '⏳ Not Voted' }}
                  <span v-if="judge.voted_at"> • {{ formatDate(judge.voted_at) }}</span>
                </p>
              </div>
              <div class="flex space-x-2">
                <button 
                  @click="copyJudgeLink(judge.link)"
                  class="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                >
                  Copy
                </button>
                <button 
                  @click="revokeJudgeCode(judge.id, judge.code)"
                  class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                >
                  Revoke
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Conclude Hackathon -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold mb-4">Conclude Hackathon</h2>
        <p class="text-gray-600 mb-4">
          Once concluded, judge results will become public and ALL voting will be permanently closed.
        </p>
        <button 
          @click="concludeHackathon"
          class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Conclude Hackathon & Publish Results
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { format } from 'date-fns';
import api from '@/api';
import ImageUploadWithPreview from '@/components/ImageUploadWithPreview.vue';

const route = useRoute();
const loading = ref(true);
const settings = ref(null);
const newJudgeName = ref('');
const generatedLink = ref('');
const newProject = ref({
  name: '',
  emails: ''
});
const bannerFile = ref(null);
const bannerPosition = ref({ x: 50, y: 50 });
const uploadingBanner = ref(false);

function formatTeamEmails(teamEmails) {
  if (!teamEmails) return '';
  const emails = typeof teamEmails === 'string' ? JSON.parse(teamEmails) : teamEmails;
  return emails.join(', ');
}

function formatDate(dateString) {
  if (!dateString) return '';
  return format(new Date(dateString), 'MMM d, h:mm a');
}

async function loadData() {
  try {
    const response = await api.getHackathonSettings(route.params.id);
    settings.value = response.data;
    // Initialize banner position
    if (settings.value.hackathon) {
      bannerPosition.value = {
        x: settings.value.hackathon.banner_position_x || 50,
        y: settings.value.hackathon.banner_position_y || 50
      };
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
    alert('Failed to load settings');
  } finally {
    loading.value = false;
  }
}

function handleBannerSelected(file) {
  bannerFile.value = file;
}

async function updateBannerPosition(position) {
  bannerPosition.value = position;
  
  // If there's a current banner, save the position immediately
  if (settings.value.hackathon.banner_url) {
    try {
      await api.updateHackathon(route.params.id, {
        banner_position_x: position.x,
        banner_position_y: position.y
      });
      // Update local state
      settings.value.hackathon.banner_position_x = position.x;
      settings.value.hackathon.banner_position_y = position.y;
    } catch (error) {
      console.error('Failed to update banner position:', error);
    }
  }
}

async function uploadBanner(file, position) {
  if (!file) return;
  
  uploadingBanner.value = true;
  try {
    const formData = new FormData();
    formData.append('banner', file);
    formData.append('position_x', position.x);
    formData.append('position_y', position.y);
    
    await api.uploadHackathonBanner(route.params.id, formData);
    alert('Banner uploaded successfully!');
    bannerFile.value = null;
    await loadData();
  } catch (error) {
    console.error('Failed to upload banner:', error);
    alert('Failed to upload banner. ' + (error.response?.data?.error || ''));
  } finally {
    uploadingBanner.value = false;
  }
}

async function updateHackathon() {
  try {
    await api.updateHackathon(route.params.id, settings.value.hackathon);
    alert('Updated successfully');
  } catch (error) {
    alert('Failed to update');
  }
}

async function deleteHackathon() {
  if (!confirm('Are you sure you want to delete this hackathon? This will delete all projects, votes, and comments. This action cannot be undone!')) return;
  try {
    await api.deleteHackathon(route.params.id);
    alert('Hackathon deleted successfully');
    window.location.href = '/hackathons/admin';
  } catch (error) {
    console.error('Failed to delete hackathon:', error);
    alert('Failed to delete hackathon');
  }
}

async function toggleDeadlineOverride(projectId) {
  try {
    await api.toggleDeadlineOverride(route.params.id, projectId);
    await loadData();
  } catch (error) {
    alert('Failed to toggle deadline override');
  }
}

async function deleteProject(projectId) {
  if (!confirm('Are you sure you want to delete this project? This will delete all votes and comments. This action cannot be undone!')) return;
  try {
    await api.deleteProject(route.params.id, projectId);
    alert('Project deleted successfully');
    await loadData();
  } catch (error) {
    console.error('Failed to delete project:', error);
    alert('Failed to delete project');
  }
}

async function generateJudgeLink() {
  if (!newJudgeName.value.trim()) return;
  try {
    const response = await api.createJudgeCode(route.params.id, newJudgeName.value);
    generatedLink.value = response.data.link;
    newJudgeName.value = '';
    await loadData();
  } catch (error) {
    alert('Failed to generate judge link');
  }
}

function copyLink() {
  navigator.clipboard.writeText(generatedLink.value);
  alert('Link copied to clipboard!');
}

function copyJudgeLink(link) {
  navigator.clipboard.writeText(link);
  alert('Link copied to clipboard!');
}

async function revokeJudgeCode(codeId, code) {
  if (!confirm('Revoke this judge code?')) return;
  try {
    await api.revokeJudgeCode(route.params.id, code);
    await loadData();
  } catch (error) {
    alert('Failed to revoke code');
  }
}

async function concludeHackathon() {
  if (!confirm('Are you sure? This action cannot be undone.')) return;
  try {
    await api.concludeHackathon(route.params.id);
    alert('Hackathon concluded!');
    await loadData();
  } catch (error) {
    alert('Failed to conclude hackathon');
  }
}

async function createProject() {
  if (!newProject.value.name || !newProject.value.emails) {
    alert('Please provide both project name and team emails.');
    return;
  }
  
  // Parse emails
  const emails = newProject.value.emails
    .split(',')
    .map(e => e.trim())
    .filter(e => e.length > 0);
  
  if (emails.length === 0) {
    alert('Please provide at least one email address.');
    return;
  }
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const invalidEmails = emails.filter(e => !emailRegex.test(e));
  if (invalidEmails.length > 0) {
    alert(`Invalid email addresses: ${invalidEmails.join(', ')}`);
    return;
  }
  
  try {
    await api.createProject(route.params.id, {
      name: newProject.value.name.trim(),
      team_emails: emails
    });
    newProject.value = { name: '', emails: '' };
    await loadData();
    alert('Project initialized successfully!');
  } catch (error) {
    console.error('Failed to create project:', error);
    alert('Failed to create project. ' + (error.response?.data?.error || ''));
  }
}

onMounted(() => {
  loadData();
});
</script>

