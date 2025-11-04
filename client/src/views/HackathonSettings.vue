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
          <button 
            @click="updateHackathon"
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Save Changes
          </button>
        </div>
      </div>
      
      <!-- Projects -->
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <h2 class="text-xl font-semibold mb-4">Projects</h2>
        <div class="space-y-2">
          <div 
            v-for="project in settings.projects" 
            :key="project.id"
            class="flex items-center justify-between p-3 border rounded"
          >
            <div>
              <h3 class="font-semibold">{{ project.name }}</h3>
              <p class="text-sm text-gray-600">{{ formatTeamEmails(project.team_emails) }}</p>
            </div>
            <label class="flex items-center">
              <input 
                type="checkbox"
                :checked="project.deadline_override_enabled"
                @change="toggleDeadlineOverride(project.id)"
                class="mr-2"
              />
              <span class="text-sm">Deadline Override</span>
            </label>
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

const route = useRoute();
const loading = ref(true);
const settings = ref(null);
const newJudgeName = ref('');
const generatedLink = ref('');

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
  } catch (error) {
    console.error('Failed to load settings:', error);
    alert('Failed to load settings');
  } finally {
    loading.value = false;
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

async function toggleDeadlineOverride(projectId) {
  try {
    await api.toggleDeadlineOverride(route.params.id, projectId);
    await loadData();
  } catch (error) {
    alert('Failed to toggle deadline override');
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

onMounted(() => {
  loadData();
});
</script>

