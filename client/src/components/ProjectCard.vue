<template>
  <div class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
    <div v-if="project.image_url" class="h-48 bg-gray-100 overflow-hidden">
      <img 
        :src="project.image_url" 
        :alt="project.name" 
        class="w-full h-full object-cover"
        :style="{ objectPosition: `${project.image_position_x ?? 50}% ${project.image_position_y ?? 50}%` }"
      >
    </div>
    <div class="p-4">
      <h3 class="text-lg font-semibold mb-2">{{ project.name }}</h3>
      <div class="text-sm text-gray-600 mb-3">
        <div v-if="project.team_emails">
          Team: {{ formatTeamMembers(project.team_emails) }}
        </div>
      </div>
      <div class="flex items-center justify-between text-sm">
        <div class="flex items-center space-x-4">
          <span class="flex items-center">
            👍 {{ project.vote_count || 0 }}
          </span>
          <span class="flex items-center">
            💬 {{ project.comment_count || 0 }}
          </span>
        </div>
        <router-link 
          :to="`/hackathons/${hackathonId}/projects/${project.id}`"
          class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          View Project
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  project: Object,
  hackathonId: [String, Number]
});

function formatTeamMembers(teamEmails) {
  if (!teamEmails) return '';
  const emails = typeof teamEmails === 'string' ? JSON.parse(teamEmails) : teamEmails;
  return emails.map(email => email.split('@')[0]).join(', ');
}
</script>

