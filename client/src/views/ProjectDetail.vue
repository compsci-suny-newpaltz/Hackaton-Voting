<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div v-if="loading" class="text-center py-12">
      <div class="text-gray-600">Loading...</div>
    </div>
    
    <div v-else-if="project">
      <div v-if="project.banner_url" class="mb-6 rounded-lg overflow-hidden">
        <img :src="project.banner_url" :alt="project.name" class="w-full h-64 object-cover">
      </div>
      
      <h1 class="text-4xl font-bold mb-4">{{ project.name }}</h1>
      
      <div class="mb-6">
        <h3 class="text-lg font-semibold mb-2">Team Members</h3>
        <p class="text-gray-700">{{ formatTeamMembers(project.team_emails) }}</p>
      </div>
      
      <div v-if="project.description" class="prose mb-8" v-html="renderMarkdown(project.description)"></div>
      
      <div v-if="project.github_link" class="mb-6">
        <a :href="project.github_link" target="_blank" class="text-blue-600 hover:underline">
          🔗 View on GitHub
        </a>
      </div>
      
      <div v-if="project.current_file_url" class="mb-6">
        <h3 class="text-lg font-semibold mb-2">Project File</h3>
        <a 
          :href="project.current_file_url" 
          download
          class="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Download {{ project.current_file_name }}
        </a>
        <p class="text-sm text-gray-600 mt-2">
          {{ formatFileSize(project.current_file_size) }} • Uploaded {{ formatDate(project.uploaded_at) }}
        </p>
      </div>
      
      <!-- Voting Section -->
      <div class="bg-gray-50 rounded-lg p-6 mb-8">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">Popular Vote</h3>
          <span class="text-2xl font-bold">👍 {{ project.vote_count || 0 }}</span>
        </div>
        
        <div v-if="voteStatus">
          <button 
            v-if="voteStatus.canVote && !voteStatus.hasVoted"
            @click="castVote"
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            👍 Vote
          </button>
          <div v-else-if="voteStatus.hasVoted" class="text-gray-600">
            ✓ You voted
          </div>
          <div v-else-if="voteStatus.reason === 'own_project'" class="text-gray-600">
            Your Project
          </div>
          <div v-else class="text-gray-600">
            Voting closed
          </div>
          
          <p v-if="voteStatus.voteExpiration && voteStatus.canVote" class="text-sm text-gray-600 mt-2">
            Voting closes {{ formatDate(voteStatus.voteExpiration) }}
          </p>
        </div>
      </div>
      
      <!-- Comments Section -->
      <div class="mb-8">
        <h3 class="text-lg font-semibold mb-4">Comments ({{ comments.length }})</h3>
        
        <div v-if="user" class="mb-6">
          <textarea 
            v-model="newComment"
            placeholder="Add a comment..."
            class="w-full px-4 py-2 border rounded-lg mb-2"
            rows="3"
          ></textarea>
          <button 
            @click="addComment"
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Post Comment
          </button>
        </div>
        
        <div v-else class="mb-6 text-gray-600">
          <a 
            :href="`https://hydra.newpaltz.edu/login?returnTo=${encodeURIComponent(window.location.href)}`"
            class="text-blue-600 hover:underline"
          >
            Login to comment
          </a>
        </div>
        
        <div class="space-y-4">
          <div 
            v-for="comment in comments" 
            :key="comment.id"
            class="bg-white rounded-lg p-4 border"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center mb-2">
                  <span class="font-semibold">{{ comment.display_name }}</span>
                  <span class="text-sm text-gray-500 ml-2">{{ formatRelativeTime(comment.created_at) }}</span>
                </div>
                <p class="text-gray-700">{{ comment.content }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div v-else class="text-center py-12">
      <p class="text-gray-600">Project not found.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { marked } from 'marked';
import { formatDistanceToNow, format } from 'date-fns';
import axios from 'axios';
import api from '@/api';

const route = useRoute();
const loading = ref(true);
const project = ref(null);
const comments = ref([]);
const voteStatus = ref(null);
const user = ref(null);
const newComment = ref('');

function renderMarkdown(text) {
  if (!text) return '';
  return marked.parse(text);
}

function formatTeamMembers(teamEmails) {
  if (!teamEmails) return '';
  const emails = typeof teamEmails === 'string' ? JSON.parse(teamEmails) : teamEmails;
  return emails.join(', ');
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}

function formatDate(dateString) {
  if (!dateString) return '';
  return format(new Date(dateString), 'MMM d, yyyy h:mm a');
}

function formatRelativeTime(dateString) {
  return formatDistanceToNow(new Date(dateString), { addSuffix: true });
}

async function checkAuth() {
  try {
    const response = await axios.post('https://hydra.newpaltz.edu/check', {}, {
      withCredentials: true
    });
    if (response.data.active) {
      user.value = response.data;
    }
  } catch (error) {
    user.value = null;
  }
}

async function loadData() {
  try {
    const projectResponse = await api.getProject(route.params.id, route.params.projectId);
    project.value = projectResponse.data;
    comments.value = projectResponse.data.comments || [];
    
    if (user.value) {
      const voteResponse = await api.getVoteStatus(route.params.id, route.params.projectId);
      voteStatus.value = voteResponse.data;
    }
  } catch (error) {
    console.error('Failed to load project:', error);
  } finally {
    loading.value = false;
  }
}

async function castVote() {
  try {
    await api.vote(route.params.id, route.params.projectId);
    voteStatus.value.hasVoted = true;
    project.value.vote_count = (project.value.vote_count || 0) + 1;
  } catch (error) {
    alert('Failed to vote');
  }
}

async function addComment() {
  if (!newComment.value.trim()) return;
  
  try {
    await api.addComment(route.params.id, route.params.projectId, newComment.value);
    newComment.value = '';
    await loadData();
  } catch (error) {
    alert('Failed to add comment');
  }
}

onMounted(async () => {
  await checkAuth();
  await loadData();
});
</script>

