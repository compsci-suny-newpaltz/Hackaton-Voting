import axios from 'axios';

const api = axios.create({
  baseURL: '/hackathons/api',
  withCredentials: true
});

export default {
  // Hackathons
  getHackathons() {
    return api.get('/hackathons');
  },
  
  getHackathon(id) {
    return api.get(`/hackathons/${id}`);
  },
  
  createHackathon(data) {
    return api.post('/hackathons', data);
  },
  
  updateHackathon(id, data) {
    return api.put(`/hackathons/${id}`, data);
  },
  
  concludeHackathon(id) {
    return api.post(`/hackathons/${id}/conclude`);
  },
  
  deleteHackathon(id) {
    return api.delete(`/hackathons/${id}`);
  },
  
  uploadHackathonBanner(hackathonId, formData) {
    return api.post(`/hackathons/${hackathonId}/banner`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  // Projects
  getProject(hackathonId, projectId) {
    return api.get(`/${hackathonId}/projects/${projectId}`);
  },
  
  createProject(hackathonId, data) {
    return api.post(`/${hackathonId}/projects`, data);
  },
  
  updateProject(hackathonId, projectId, data) {
    return api.put(`/${hackathonId}/projects/${projectId}`, data);
  },
  
  uploadProjectFile(hackathonId, projectId, file, changelog) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('changelog', changelog);
    return api.post(`/${hackathonId}/projects/${projectId}/file`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  uploadProjectBanner(hackathonId, projectId, formData) {
    return api.post(`/${hackathonId}/projects/${projectId}/banner`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  uploadProjectImage(hackathonId, projectId, formData) {
    return api.post(`/${hackathonId}/projects/${projectId}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  toggleDeadlineOverride(hackathonId, projectId) {
    return api.post(`/${hackathonId}/projects/${projectId}/deadline-override`);
  },
  
  deleteProject(hackathonId, projectId) {
    return api.delete(`/${hackathonId}/projects/${projectId}`);
  },
  
  // Voting
  getVoteStatus(hackathonId, projectId) {
    return api.get(`/${hackathonId}/projects/${projectId}/vote-status`);
  },
  
  vote(hackathonId, projectId) {
    return api.post(`/${hackathonId}/projects/${projectId}/vote`);
  },
  
  // Judge voting
  getJudgeVoting(hackathonId, code) {
    return api.get(`/${hackathonId}/judgevote`, { params: { code } });
  },
  
  submitJudgeVotes(hackathonId, code, votes) {
    return api.post(`/${hackathonId}/judgevote`, { code, votes });
  },
  
  // Comments
  getComments(hackathonId, projectId) {
    return api.get(`/${hackathonId}/projects/${projectId}/comments`);
  },
  
  addComment(hackathonId, projectId, content) {
    return api.post(`/${hackathonId}/projects/${projectId}/comments`, { content });
  },
  
  updateComment(hackathonId, projectId, commentId, content) {
    return api.put(`/${hackathonId}/projects/${projectId}/comments/${commentId}`, { content });
  },
  
  deleteComment(hackathonId, projectId, commentId) {
    return api.delete(`/${hackathonId}/projects/${projectId}/comments/${commentId}`);
  },
  
  // Admin
  getAdminDashboard() {
    return api.get('/admin/dashboard');
  },
  
  getHackathonSettings(id) {
    return api.get(`/admin/hackathons/${id}/settings`);
  },
  
  getAdmins() {
    return api.get('/admin/admins');
  },
  
  addAdmin(email) {
    return api.post('/admin/admins', { email });
  },
  
  removeAdmin(email) {
    return api.delete(`/admin/admins/${email}`);
  },
  
  createJudgeCode(hackathonId, judgeName) {
    return api.post(`/admin/hackathons/${hackathonId}/judges`, { judge_name: judgeName });
  },
  
  revokeJudgeCode(hackathonId, codeId) {
    return api.post(`/admin/hackathons/${hackathonId}/judges/${codeId}/revoke`, {}, {
      params: { code: codeId }
    });
  },
  
  // Results
  getHackathonResults(hackathonId) {
    return api.get(`/${hackathonId}/results`);
  },
  
  getProjectScores(hackathonId, projectId) {
    return api.get(`/${hackathonId}/projects/${projectId}/scores`);
  }
};

