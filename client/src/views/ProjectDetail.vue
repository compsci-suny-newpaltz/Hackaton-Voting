<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div v-if="loading" class="text-center py-12">
      <div class="text-gray-600">Loading...</div>
    </div>
    
    <div v-else-if="project">
      <div v-if="project.banner_url" class="mb-6 rounded-lg overflow-hidden">
        <img 
          :src="project.banner_url" 
          :alt="project.name" 
          class="w-full h-64 object-cover"
          :style="{ objectPosition: `${project.banner_position_x || 50}% ${project.banner_position_y || 50}%` }"
        >
      </div>
      
      <h1 class="text-4xl font-bold mb-4">{{ project.name }}</h1>
      
      <!-- Edit Button for Team Members -->
      <div v-if="isTeamMember" class="mb-4">
        <router-link 
          :to="`/hackathons/${route.params.id}/projects/${route.params.projectId}/edit`"
          class="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          ✏️ Edit Project
        </router-link>
      </div>
      
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
          <button
            v-else-if="voteStatus.hasVoted"
            @click="removeVote"
            class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            ✓ Voted (click to remove)
          </button>
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
        <div v-else-if="!user" class="text-gray-600">
          <a 
            :href="`https://hydra.newpaltz.edu/login?returnTo=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`"
            class="text-blue-600 hover:underline"
          >
            Log in
          </a> to vote on this project
        </div>
      </div>
      
      <!-- Judge Scores (for concluded hackathons) -->
      <div v-if="judgeScores" class="bg-white rounded-lg border-2 border-yellow-400 p-6 mb-8">
        <h3 class="text-lg font-semibold mb-4">🏆 Judge Scores</h3>
        
        <div v-if="judgeScores.statistics.count > 0">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div class="text-center p-3 bg-gray-50 rounded">
              <div class="text-2xl font-bold text-blue-600">{{ judgeScores.statistics.average }}</div>
              <div class="text-sm text-gray-600">Average</div>
            </div>
            <div class="text-center p-3 bg-gray-50 rounded">
              <div class="text-2xl font-bold">{{ judgeScores.statistics.count }}</div>
              <div class="text-sm text-gray-600">Judges</div>
            </div>
            <div class="text-center p-3 bg-gray-50 rounded">
              <div class="text-2xl font-bold">{{ judgeScores.statistics.min }}</div>
              <div class="text-sm text-gray-600">Min</div>
            </div>
            <div class="text-center p-3 bg-gray-50 rounded">
              <div class="text-2xl font-bold">{{ judgeScores.statistics.max }}</div>
              <div class="text-sm text-gray-600">Max</div>
            </div>
          </div>
          
          <div class="space-y-2">
            <h4 class="font-semibold text-sm mb-2">Individual Scores:</h4>
            <div 
              v-for="(score, idx) in judgeScores.scores" 
              :key="idx"
              class="p-3 bg-gray-50 rounded"
            >
              <div class="flex items-center justify-between mb-1">
                <span class="font-medium text-sm">Judge {{ idx + 1 }}</span>
                <span class="font-bold text-lg">{{ score.score }}/10</span>
              </div>
              <p v-if="score.comment" class="text-sm text-gray-600 italic">"{{ score.comment }}"</p>
            </div>
          </div>
        </div>
        
        <div v-else class="text-gray-600">
          No judge scores yet
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
            :href="`https://hydra.newpaltz.edu/login?returnTo=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`"
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
                  <span v-if="comment.updated_at" class="text-xs text-gray-400 ml-2">(edited)</span>
                </div>
                
                <!-- Edit mode -->
                <div v-if="editingCommentId === comment.id">
                  <textarea 
                    v-model="editingCommentText"
                    class="w-full px-3 py-2 border rounded mb-2"
                    rows="3"
                  ></textarea>
                  <div class="flex space-x-2">
                    <button 
                      @click="saveComment(comment.id)"
                      class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    >
                      Save
                    </button>
                    <button 
                      @click="cancelEdit"
                      class="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
                
                <!-- View mode -->
                <p v-else class="text-gray-700">{{ comment.content }}</p>
              </div>
              
              <!-- Action buttons (only for comment author) -->
              <div v-if="user && comment.user_email.toLowerCase() === user.email.toLowerCase() && editingCommentId !== comment.id" class="flex space-x-1 ml-4">
                <button 
                  @click="startEdit(comment)"
                  class="px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                  title="Edit"
                >
                  ✏️
                </button>
                <button 
                  @click="deleteCommentConfirm(comment.id)"
                  class="px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div v-else class="text-center py-12">
      <p class="text-gray-600">Project not found.</p>
    </div>

    <ConfirmDialog ref="confirmDialog" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { marked } from 'marked';
import { formatDistanceToNow, format } from 'date-fns';
import api from '@/api';
import { useToast } from '@/composables/useToast';
import ConfirmDialog from '@/components/ConfirmDialog.vue';

const route = useRoute();
const toast = useToast();
const confirmDialog = ref(null);
const loading = ref(true);
const project = ref(null);
const comments = ref([]);
const voteStatus = ref(null);
const user = ref(null);
const isAdmin = ref(false);
const newComment = ref('');
const judgeScores = ref(null);
const editingCommentId = ref(null);
const editingCommentText = ref('');

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

const isTeamMember = computed(() => {
  if (!user.value || !project.value) return false;
  
  // Admins can edit any project
  if (isAdmin.value) return true;
  
  const userEmail = user.value.email.toLowerCase();
  const teamEmails = typeof project.value.team_emails === 'string' 
    ? JSON.parse(project.value.team_emails) 
    : project.value.team_emails;
  return teamEmails.map(e => e.toLowerCase()).includes(userEmail);
});

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
    const response = await fetch('/hackathons/api/auth/status', {
      credentials: 'include'
    });
    const data = await response.json();
    
    if (data.authenticated) {
      user.value = data.user;
      isAdmin.value = data.isAdmin;
    }
  } catch (error) {
    user.value = null;
    isAdmin.value = false;
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
    
    // Try to load judge scores (will fail if hackathon not concluded)
    try {
      const scoresResponse = await api.getProjectScores(route.params.id, route.params.projectId);
      if (scoresResponse.data.is_concluded) {
        judgeScores.value = scoresResponse.data;
      }
    } catch (error) {
      // Scores not available yet, that's fine
      judgeScores.value = null;
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
    toast.success('Vote recorded!');
  } catch (error) {
    // Show detailed error message from backend
    const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to vote';
    toast.error(errorMessage, { duration: 5000 });
  }
}

async function removeVote() {
  try {
    await api.removeVote(route.params.id, route.params.projectId);
    voteStatus.value.hasVoted = false;
    project.value.vote_count = Math.max(0, (project.value.vote_count || 0) - 1);
    toast.success('Vote removed. You can now vote for another project.');
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to remove vote';
    toast.error(errorMessage);
  }
}

async function addComment() {
  if (!newComment.value.trim()) return;

  try {
    await api.addComment(route.params.id, route.params.projectId, newComment.value);
    newComment.value = '';
    await loadData();
  } catch (error) {
    toast.error('Failed to add comment');
  }
}

function startEdit(comment) {
  editingCommentId.value = comment.id;
  editingCommentText.value = comment.content;
}

function cancelEdit() {
  editingCommentId.value = null;
  editingCommentText.value = '';
}

async function saveComment(commentId) {
  if (!editingCommentText.value.trim()) {
    toast.warning('Comment cannot be empty');
    return;
  }

  try {
    await api.updateComment(route.params.id, route.params.projectId, commentId, editingCommentText.value);
    cancelEdit();
    await loadData();
  } catch (error) {
    toast.error('Failed to update comment');
  }
}

async function deleteCommentConfirm(commentId) {
  const confirmed = await showConfirm({
    title: 'Delete Comment',
    message: 'Are you sure you want to delete this comment? This action cannot be undone.',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    type: 'danger'
  });

  if (!confirmed) return;

  try {
    await api.deleteComment(route.params.id, route.params.projectId, commentId);
    await loadData();
  } catch (error) {
    toast.error('Failed to delete comment');
  }
}

onMounted(async () => {
  await checkAuth();
  await loadData();
});
</script>

