import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';
import './style.css';

import Home from './views/Home.vue';
import HackathonDetail from './views/HackathonDetail.vue';
import ProjectDetail from './views/ProjectDetail.vue';
import ProjectEdit from './views/ProjectEdit.vue';
import AdminDashboard from './views/AdminDashboard.vue';
import HackathonSettings from './views/HackathonSettings.vue';
import JudgeVoting from './views/JudgeVoting.vue';

const routes = [
  { path: '/', redirect: '/hackathons/' },
  { path: '/hackathons/', name: 'home', component: Home },
  { path: '/hackathons/:id', name: 'hackathon-detail', component: HackathonDetail },
  { path: '/hackathons/:id/projects/:projectId', name: 'project-detail', component: ProjectDetail },
  { path: '/hackathons/:id/projects/:projectId/edit', name: 'project-edit', component: ProjectEdit },
  { path: '/hackathons/admin/dashboard', name: 'admin-dashboard', component: AdminDashboard },
  { path: '/hackathons/admin/hackathons/:id/settings', name: 'hackathon-settings', component: HackathonSettings },
  { path: '/hackathons/:id/judgevote', name: 'judge-voting', component: JudgeVoting }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

const app = createApp(App);
app.use(router);
app.mount('#app');

