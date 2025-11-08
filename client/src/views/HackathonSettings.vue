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

      <!-- Timing Configuration -->
      <div v-if="!settings.hackathon.concluded_at" class="bg-white rounded-lg shadow p-6 mb-6">
        <h2 class="text-xl font-semibold mb-4">Timing</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">Start Time</label>
            <input
              v-model="timingForm.start_time"
              type="datetime-local"
              class="w-full px-4 py-2 border rounded"
            />
            <p class="text-xs text-gray-500 mt-1">When the hackathon submission period begins</p>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">End Time</label>
            <input
              v-model="timingForm.end_time"
              type="datetime-local"
              class="w-full px-4 py-2 border rounded"
            />
            <p class="text-xs text-gray-500 mt-1">When the hackathon submission period ends (judge voting opens after this)</p>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Vote Expiration (Optional)</label>
            <input
              v-model="timingForm.vote_expiration"
              type="datetime-local"
              class="w-full px-4 py-2 border rounded"
            />
            <p class="text-xs text-gray-500 mt-1">When public voting closes (defaults to 7 days after end time)</p>
          </div>
          <button
            @click="updateTiming"
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Update Timing
          </button>
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
            class="p-3 border rounded"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="flex-1">
                <h3 class="font-semibold">{{ project.name }}</h3>
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

            <!-- Team Members -->
            <div class="mt-3 space-y-2">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-gray-700">Team Members:</span>
              </div>
              <div class="space-y-1">
                <div
                  v-for="email in getTeamEmails(project.team_emails)"
                  :key="email"
                  class="flex items-center justify-between bg-gray-50 px-3 py-2 rounded text-sm"
                >
                  <span>{{ email }}</span>
                  <button
                    @click="removeTeamMember(project.id, email)"
                    class="text-red-600 hover:text-red-800 text-xs"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <!-- Add Team Member Form -->
              <div class="flex gap-2 mt-2">
                <input
                  v-model="teamMemberInputs[project.id]"
                  type="email"
                  placeholder="Add team member email"
                  class="flex-1 px-3 py-2 border rounded text-sm"
                  @keyup.enter="addTeamMember(project.id)"
                />
                <button
                  @click="addTeamMember(project.id)"
                  class="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
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
      
      <!-- Judge Categories (Rubric) Management -->
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <h2 class="text-xl font-semibold mb-4">Judge Rubric Categories</h2>
        <p class="text-sm text-gray-600 mb-4">
          Customize the scoring categories that judges will use to evaluate projects. Each category can have a weight (multiplier).
        </p>

        <!-- Add New Category -->
        <div class="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 class="text-md font-semibold mb-3">Add New Category</h3>
          <div class="space-y-3">
            <div>
              <label class="block text-sm font-medium mb-1">Category Name</label>
              <input
                v-model="newCategory.name"
                type="text"
                placeholder="e.g., Innovation / Creativity"
                class="w-full px-4 py-2 border rounded"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Description</label>
              <textarea
                v-model="newCategory.description"
                placeholder="e.g., Is the idea original or a novel approach to an existing problem?"
                class="w-full px-4 py-2 border rounded"
                rows="2"
              ></textarea>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Weight (Multiplier)</label>
              <input
                v-model.number="newCategory.weight"
                type="number"
                min="0.1"
                max="5"
                step="0.1"
                class="w-full px-4 py-2 border rounded"
              />
              <p class="text-xs text-gray-500 mt-1">Default is 1.0. Higher values increase this category's impact on final score.</p>
            </div>
            <button
              @click="createCategory"
              class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Add Category
            </button>
          </div>
        </div>

        <!-- Existing Categories -->
        <div class="space-y-3">
          <div
            v-for="(category, index) in judgeCategories"
            :key="category.id"
            class="p-4 border rounded-lg"
            :class="{ 'bg-blue-50 border-blue-300': editingCategoryId === category.id }"
          >
            <!-- View Mode -->
            <div v-if="editingCategoryId !== category.id">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-3">
                    <span class="text-lg font-semibold">{{ index + 1 }}. {{ category.name }}</span>
                    <span class="text-sm px-2 py-1 bg-gray-200 rounded">
                      Weight: {{ category.weight }}×
                    </span>
                  </div>
                  <p class="text-sm text-gray-600 mt-1">{{ category.description || 'No description' }}</p>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    @click="startEditCategory(category)"
                    class="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    Edit
                  </button>
                  <button
                    @click="moveCategory(index, -1)"
                    :disabled="index === 0"
                    class="px-2 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    @click="moveCategory(index, 1)"
                    :disabled="index === judgeCategories.length - 1"
                    class="px-2 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    @click="deleteCategory(category.id)"
                    class="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>

            <!-- Edit Mode -->
            <div v-else class="space-y-3">
              <div>
                <label class="block text-sm font-medium mb-1">Category Name</label>
                <input
                  v-model="editingCategory.name"
                  type="text"
                  class="w-full px-4 py-2 border rounded"
                />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1">Description</label>
                <textarea
                  v-model="editingCategory.description"
                  class="w-full px-4 py-2 border rounded"
                  rows="2"
                ></textarea>
              </div>
              <div>
                <label class="block text-sm font-medium mb-1">Weight (Multiplier)</label>
                <input
                  v-model.number="editingCategory.weight"
                  type="number"
                  min="0.1"
                  max="5"
                  step="0.1"
                  class="w-full px-4 py-2 border rounded"
                />
              </div>
              <div class="flex gap-2">
                <button
                  @click="saveCategory"
                  class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Save Changes
                </button>
                <button
                  @click="cancelEditCategory"
                  class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>

          <div v-if="judgeCategories.length === 0" class="text-center py-8 text-gray-500">
            No categories defined yet. The default categories were created automatically.
          </div>
        </div>
      </div>

      <!-- Conclude Hackathon -->
      <div v-if="!settings.hackathon.concluded_at" class="bg-white rounded-lg shadow p-6">
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

    <!-- Confirmation Dialog -->
    <ConfirmDialog
      ref="confirmDialog"
      :title="confirmOptions.title"
      :message="confirmOptions.message"
      :confirmText="confirmOptions.confirmText"
      :cancelText="confirmOptions.cancelText"
      :type="confirmOptions.type"
      @confirm="handleConfirmAction"
      @cancel="handleCancelAction"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { format } from 'date-fns';
import api from '@/api';
import ImageUploadWithPreview from '@/components/ImageUploadWithPreview.vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import { useToast } from '@/composables/useToast';

const route = useRoute();
const toast = useToast();

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
const judgeCategories = ref([]);
const newCategory = ref({
  name: '',
  description: '',
  weight: 1.0
});
const editingCategoryId = ref(null);
const editingCategory = ref(null);
const confirmDialog = ref(null);
const teamMemberInputs = ref({});
const confirmOptions = ref({
  title: '',
  message: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  type: 'warning'
});
let confirmResolve = null;

const timingForm = ref({
  start_time: '',
  end_time: '',
  vote_expiration: ''
});

// Helper function for showing confirmation dialogs
async function showConfirm(options) {
  return new Promise((resolve) => {
    const dialog = confirmDialog.value;
    if (!dialog) {
      resolve(false);
      return;
    }

    // Store the resolve function for the event handlers
    confirmResolve = resolve;

    // Update confirm dialog options
    confirmOptions.value = {
      title: options.title || 'Confirm Action',
      message: options.message,
      confirmText: options.confirmText || 'Confirm',
      cancelText: options.cancelText || 'Cancel',
      type: options.type || 'warning'
    };

    // Show the dialog
    dialog.show();
  });
}

function handleConfirmAction() {
  if (confirmResolve) {
    confirmResolve(true);
    confirmResolve = null;
  }
}

function handleCancelAction() {
  if (confirmResolve) {
    confirmResolve(false);
    confirmResolve = null;
  }
}

function formatTeamEmails(teamEmails) {
  if (!teamEmails) return '';
  const emails = typeof teamEmails === 'string' ? JSON.parse(teamEmails) : teamEmails;
  return emails.join(', ');
}

function formatDate(dateString) {
  if (!dateString) return '';
  return format(new Date(dateString), 'MMM d, h:mm a');
}

function formatDatetimeLocal(dateString) {
  if (!dateString) return '';
  // Convert to datetime-local format (YYYY-MM-DDTHH:mm)
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

async function loadData() {
  try {
    const response = await api.getHackathonSettings(route.params.id);
    console.log('Settings API response:', response.data);
    console.log('Projects in response:', response.data.projects);
    settings.value = response.data;
    judgeCategories.value = response.data.judgeCategories || [];
    // Initialize banner position
    if (settings.value.hackathon) {
      bannerPosition.value = {
        x: settings.value.hackathon.banner_position_x || 50,
        y: settings.value.hackathon.banner_position_y || 50
      };

      // Initialize timing form with current values
      timingForm.value = {
        start_time: formatDatetimeLocal(settings.value.hackathon.start_time),
        end_time: formatDatetimeLocal(settings.value.hackathon.end_time),
        vote_expiration: formatDatetimeLocal(settings.value.hackathon.vote_expiration)
      };
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
    toast.error('Failed to load settings');
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
    toast.success('Banner uploaded successfully!');
    bannerFile.value = null;
    await loadData();
  } catch (error) {
    console.error('Failed to upload banner:', error);
    toast.error('Failed to upload banner. ' + (error.response?.data?.error || ''));
  } finally {
    uploadingBanner.value = false;
  }
}

async function updateHackathon() {
  try {
    await api.updateHackathon(route.params.id, settings.value.hackathon);
    toast.success('Updated successfully');
  } catch (error) {
    toast.error('Failed to update');
  }
}

async function updateTiming() {
  try {
    // Convert datetime-local format to ISO format
    const updateData = {
      start_time: timingForm.value.start_time ? new Date(timingForm.value.start_time).toISOString() : undefined,
      end_time: timingForm.value.end_time ? new Date(timingForm.value.end_time).toISOString() : undefined,
      vote_expiration: timingForm.value.vote_expiration ? new Date(timingForm.value.vote_expiration).toISOString() : undefined
    };

    await api.updateHackathon(route.params.id, updateData);
    toast.success('Timing updated successfully');
    await loadData();
  } catch (error) {
    console.error('Failed to update timing:', error);
    const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Failed to update timing';
    toast.error(errorMsg);
  }
}

async function deleteHackathon() {
  const confirmed = await showConfirm({
    title: 'Delete Hackathon',
    message: 'Are you sure you want to delete this hackathon? This will delete all projects, votes, and comments. This action cannot be undone!',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    type: 'danger'
  });

  if (!confirmed) return;

  try {
    await api.deleteHackathon(route.params.id);
    toast.success('Hackathon deleted successfully');
    window.location.href = '/hackathons/admin';
  } catch (error) {
    console.error('Failed to delete hackathon:', error);
    toast.error('Failed to delete hackathon');
  }
}

async function toggleDeadlineOverride(projectId) {
  try {
    await api.toggleDeadlineOverride(route.params.id, projectId);
    await loadData();
  } catch (error) {
    toast.error('Failed to toggle deadline override');
  }
}

async function deleteProject(projectId) {
  const confirmed = await showConfirm({
    title: 'Delete Project',
    message: 'Are you sure you want to delete this project? This will delete all votes and comments. This action cannot be undone!',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    type: 'danger'
  });

  if (!confirmed) return;

  try {
    await api.deleteProject(route.params.id, projectId);
    toast.success('Project deleted successfully');
    await loadData();
  } catch (error) {
    console.error('Failed to delete project:', error);
    toast.error('Failed to delete project');
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
    toast.error('Failed to generate judge link');
  }
}

function copyLink() {
  navigator.clipboard.writeText(generatedLink.value);
  toast.success('Link copied to clipboard!');
}

function copyJudgeLink(link) {
  navigator.clipboard.writeText(link);
  toast.success('Link copied to clipboard!');
}

async function revokeJudgeCode(codeId, code) {
  const confirmed = await showConfirm({
    title: 'Revoke Judge Code',
    message: 'Are you sure you want to revoke this judge code? The judge will no longer be able to vote.',
    confirmText: 'Revoke',
    cancelText: 'Cancel',
    type: 'warning'
  });

  if (!confirmed) return;

  try {
    await api.revokeJudgeCode(route.params.id, code);
    await loadData();
    toast.success('Judge code revoked');
  } catch (error) {
    toast.error('Failed to revoke code');
  }
}

async function concludeHackathon() {
  // Check if any judges haven't voted yet
  const judgesNotVoted = settings.value.judges?.filter(judge => !judge.voted) || [];

  let message = 'Are you sure you want to conclude this hackathon? Judge results will become public and ALL voting will be permanently closed. This action cannot be undone.';

  if (judgesNotVoted.length > 0) {
    const judgeNames = judgesNotVoted.map(j => j.judge_name || 'Unnamed Judge').join(', ');
    message = `⚠️ Warning: The following judges have not voted yet:\n\n${judgeNames}\n\nAre you sure you want to conclude anyway? This action cannot be undone.`;
  }

  const confirmed = await showConfirm({
    title: 'Conclude Hackathon',
    message: message,
    confirmText: 'Conclude',
    cancelText: 'Cancel',
    type: 'warning'
  });

  if (!confirmed) return;

  try {
    await api.concludeHackathon(route.params.id);
    toast.success('Hackathon concluded!');
    await loadData();
  } catch (error) {
    toast.error('Failed to conclude hackathon');
  }
}

async function createProject() {
  if (!newProject.value.name || !newProject.value.emails) {
    toast.warning('Please provide both project name and team emails.');
    return;
  }

  // Parse emails
  const emails = newProject.value.emails
    .split(',')
    .map(e => e.trim())
    .filter(e => e.length > 0);

  if (emails.length === 0) {
    toast.warning('Please provide at least one email address.');
    return;
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const invalidEmails = emails.filter(e => !emailRegex.test(e));
  if (invalidEmails.length > 0) {
    toast.error(`Invalid email addresses: ${invalidEmails.join(', ')}`);
    return;
  }

  try {
    console.log('Creating project with data:', { name: newProject.value.name.trim(), team_emails: emails });
    const response = await api.createProject(route.params.id, {
      name: newProject.value.name.trim(),
      team_emails: emails
    });
    console.log('Project created successfully, response:', response.data);
    newProject.value = { name: '', emails: '' };
    console.log('Reloading data...');
    await loadData();
    console.log('Data reloaded, settings.projects:', settings.value?.projects);
    toast.success('Project initialized successfully!');
  } catch (error) {
    console.error('Failed to create project:', error);
    toast.error('Failed to create project. ' + (error.response?.data?.error || ''));
  }
}

// Team Member Management Functions
function getTeamEmails(teamEmails) {
  if (!teamEmails) return [];
  return typeof teamEmails === 'string' ? JSON.parse(teamEmails) : teamEmails;
}

async function addTeamMember(projectId) {
  const email = teamMemberInputs.value[projectId];
  if (!email || !email.trim()) {
    toast.warning('Please enter an email address.');
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    toast.error('Invalid email format.');
    return;
  }

  try {
    await api.addTeamMember(route.params.id, projectId, email.trim());
    teamMemberInputs.value[projectId] = '';
    await loadData();
    toast.success('Team member added successfully!');
  } catch (error) {
    console.error('Failed to add team member:', error);
    toast.error('Failed to add team member. ' + (error.response?.data?.error || ''));
  }
}

async function removeTeamMember(projectId, email) {
  const confirmed = await showConfirm({
    title: 'Remove Team Member',
    message: `Are you sure you want to remove ${email} from this project?`,
    confirmText: 'Remove',
    cancelText: 'Cancel'
  });

  if (!confirmed) return;

  try {
    await api.removeTeamMember(route.params.id, projectId, email);
    await loadData();
    toast.success('Team member removed successfully!');
  } catch (error) {
    console.error('Failed to remove team member:', error);
    toast.error('Failed to remove team member. ' + (error.response?.data?.error || ''));
  }
}

// Judge Category Management Functions
async function createCategory() {
  if (!newCategory.value.name.trim()) {
    toast.warning('Please provide a category name.');
    return;
  }

  try {
    await api.createJudgeCategory(route.params.id, {
      name: newCategory.value.name.trim(),
      description: newCategory.value.description.trim(),
      weight: newCategory.value.weight
    });
    newCategory.value = { name: '', description: '', weight: 1.0 };
    await loadData();
    toast.success('Category created successfully!');
  } catch (error) {
    console.error('Failed to create category:', error);
    toast.error('Failed to create category. ' + (error.response?.data?.error || ''));
  }
}

function startEditCategory(category) {
  editingCategoryId.value = category.id;
  editingCategory.value = { ...category };
}

function cancelEditCategory() {
  editingCategoryId.value = null;
  editingCategory.value = null;
}

async function saveCategory() {
  if (!editingCategory.value.name.trim()) {
    toast.warning('Category name cannot be empty.');
    return;
  }

  try {
    await api.updateJudgeCategory(editingCategoryId.value, {
      name: editingCategory.value.name.trim(),
      description: editingCategory.value.description.trim(),
      weight: editingCategory.value.weight
    });
    editingCategoryId.value = null;
    editingCategory.value = null;
    await loadData();
    toast.success('Category updated successfully!');
  } catch (error) {
    console.error('Failed to update category:', error);
    toast.error('Failed to update category. ' + (error.response?.data?.error || ''));
  }
}

async function deleteCategory(categoryId) {
  const confirmed = await showConfirm({
    title: 'Delete Category',
    message: 'Are you sure you want to delete this category? This will delete all judge scores for this category. This action cannot be undone!',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    type: 'danger'
  });

  if (!confirmed) return;

  try {
    await api.deleteJudgeCategory(categoryId);
    await loadData();
    toast.success('Category deleted successfully!');
  } catch (error) {
    console.error('Failed to delete category:', error);
    toast.error('Failed to delete category. ' + (error.response?.data?.error || ''));
  }
}

async function moveCategory(index, direction) {
  const newCategories = [...judgeCategories.value];
  const targetIndex = index + direction;

  if (targetIndex < 0 || targetIndex >= newCategories.length) {
    return;
  }

  // Swap
  [newCategories[index], newCategories[targetIndex]] = [newCategories[targetIndex], newCategories[index]];

  // Extract IDs in new order
  const categoryIds = newCategories.map(c => c.id);

  try {
    await api.reorderJudgeCategories(route.params.id, categoryIds);
    await loadData();
  } catch (error) {
    console.error('Failed to reorder categories:', error);
    toast.error('Failed to reorder categories.');
  }
}

onMounted(() => {
  loadData();
});
</script>

