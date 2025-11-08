<template>
  <div class="project-score-details">
    <div v-if="loading" class="text-center py-4">
      <p class="text-gray-600 text-sm">Loading score details...</p>
    </div>

    <div v-else-if="error" class="text-red-600 text-sm">
      {{ error }}
    </div>

    <div v-else-if="scoreData" class="space-y-4">
      <div class="flex items-center justify-between mb-3">
        <h4 class="font-semibold text-md">{{ projectName }} - Category Breakdown</h4>
        <div v-if="scoreData.statistics?.average" class="text-sm text-gray-600">
          Overall: <span class="font-bold text-lg">{{ scoreData.statistics.average }}/10</span>
        </div>
      </div>

      <!-- Category Breakdown Table -->
      <div v-if="categorySummary.length > 0" class="mb-4">
        <h5 class="text-sm font-semibold mb-2">Score by Category</h5>
        <div class="bg-white border rounded-lg overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 border-b">
              <tr>
                <th class="px-3 py-2 text-left font-medium">Category</th>
                <th class="px-3 py-2 text-center font-medium">Weight</th>
                <th class="px-3 py-2 text-center font-medium">Avg Score</th>
                <th class="px-3 py-2 text-center font-medium">Min - Max</th>
                <th class="px-3 py-2 text-center font-medium">Votes</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="category in categorySummary"
                :key="category.id"
                class="border-b last:border-b-0 hover:bg-gray-50"
              >
                <td class="px-3 py-2 font-medium">{{ category.name }}</td>
                <td class="px-3 py-2 text-center">
                  <span v-if="category.weight !== 1" class="text-blue-600 font-semibold">
                    {{ category.weight }}×
                  </span>
                  <span v-else class="text-gray-500">1×</span>
                </td>
                <td class="px-3 py-2 text-center font-bold">
                  {{ category.avgScore.toFixed(2) }}/10
                </td>
                <td class="px-3 py-2 text-center text-gray-600">
                  {{ category.minScore }} - {{ category.maxScore }}
                </td>
                <td class="px-3 py-2 text-center text-gray-600">
                  {{ category.count }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Individual Judge Scores -->
      <div v-if="judgeScores.length > 0">
        <h5 class="text-sm font-semibold mb-2">Individual Judge Scores</h5>
        <div class="space-y-3">
          <div
            v-for="judge in judgeScores"
            :key="judge.judgeName"
            class="bg-white border rounded-lg p-3"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="font-medium text-sm">{{ judge.judgeName }}</span>
              <span class="text-xs text-gray-500">{{ formatDate(judge.votedAt) }}</span>
            </div>

            <div class="space-y-1">
              <div
                v-for="score in judge.categoryScores"
                :key="score.categoryId"
                class="flex items-start justify-between text-sm"
              >
                <div class="flex-1">
                  <span class="text-gray-700">{{ score.categoryName }}:</span>
                  <span v-if="score.weight !== 1" class="text-xs text-blue-600 ml-1">
                    ({{ score.weight }}×)
                  </span>
                </div>
                <div class="flex-shrink-0 ml-4">
                  <span class="font-bold">{{ score.score }}/10</span>
                </div>
              </div>
            </div>

            <!-- Comments -->
            <div v-if="judge.comments.length > 0" class="mt-2 pt-2 border-t">
              <div
                v-for="comment in judge.comments"
                :key="comment.categoryId"
                class="text-xs text-gray-600 mb-1"
              >
                <span class="font-medium">{{ comment.categoryName }}:</span>
                <span class="italic ml-1">"{{ comment.comment }}"</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="text-sm text-gray-500 text-center py-4">
        No judge scores available for this project.
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { format } from 'date-fns';
import api from '@/api';

const props = defineProps({
  hackathonId: {
    type: [String, Number],
    required: true
  },
  projectId: {
    type: [String, Number],
    required: true
  },
  projectName: {
    type: String,
    required: true
  }
});

const loading = ref(false);
const scoreData = ref(null);
const error = ref(null);

const categorySummary = computed(() => {
  if (!scoreData.value?.scores) return [];

  // Group scores by category
  const categoryMap = new Map();

  scoreData.value.scores.forEach(score => {
    if (!categoryMap.has(score.category_id)) {
      categoryMap.set(score.category_id, {
        id: score.category_id,
        name: score.category_name,
        weight: score.category_weight,
        scores: []
      });
    }
    categoryMap.get(score.category_id).scores.push(score.score);
  });

  // Calculate stats for each category
  return Array.from(categoryMap.values()).map(category => {
    const scores = category.scores;
    const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);

    return {
      id: category.id,
      name: category.name,
      weight: category.weight,
      avgScore,
      minScore,
      maxScore,
      count: scores.length
    };
  }).sort((a, b) => a.id - b.id); // Sort by category ID (display order)
});

const judgeScores = computed(() => {
  if (!scoreData.value?.scores) return [];

  // Group scores by judge
  const judgeMap = new Map();

  scoreData.value.scores.forEach(score => {
    const key = `${score.judge_code_id}_${score.judge_name}`;
    if (!judgeMap.has(key)) {
      judgeMap.set(key, {
        judgeCodeId: score.judge_code_id,
        judgeName: score.judge_name,
        votedAt: score.voted_at,
        categoryScores: [],
        comments: []
      });
    }

    const judge = judgeMap.get(key);
    judge.categoryScores.push({
      categoryId: score.category_id,
      categoryName: score.category_name,
      weight: score.category_weight,
      score: score.score
    });

    if (score.comment) {
      judge.comments.push({
        categoryId: score.category_id,
        categoryName: score.category_name,
        comment: score.comment
      });
    }
  });

  return Array.from(judgeMap.values());
});

function formatDate(dateString) {
  if (!dateString) return '';
  return format(new Date(dateString), 'MMM d, yyyy h:mm a');
}

async function loadScoreDetails() {
  loading.value = true;
  error.value = null;

  try {
    const response = await api.getProjectScores(props.hackathonId, props.projectId);
    scoreData.value = response.data;
  } catch (err) {
    console.error('Failed to load score details:', err);
    error.value = err.response?.data?.error || 'Failed to load score details';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadScoreDetails();
});
</script>

<style scoped>
.project-score-details {
  max-width: 100%;
}
</style>
