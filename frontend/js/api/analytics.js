const StudentUAnalyticsAPI = {
  async completeSession(sessionId, payload) {
    return this.request(`/api/analytics/sessions/${encodeURIComponent(sessionId)}/complete`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getRecommendations(courseKey) {
    return this.request(`/api/analytics/recommendations/${encodeURIComponent(courseKey || 'general')}`);
  },

  async validateQuestion(card, question) {
    return this.request('/api/analytics/quiz/validate', {
      method: 'POST',
      body: JSON.stringify({ card, question }),
    });
  },

  async getReviewSchedule() {
    return this.request('/api/analytics/review-schedule');
  },

  async getWeakSpotDrills(courseKey, missedCardIds = []) {
    return this.request(`/api/analytics/weak-spot-drills/${encodeURIComponent(courseKey || 'general')}`, {
      method: 'POST',
      body: JSON.stringify({ missedCardIds }),
    });
  },

  async request(path, options = {}) {
    const response = await studentUFetch(path, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
    if (!response.ok) throw new Error(`Analytics request failed: ${response.status}`);
    return response.json();
  },
};

window.StudentUAnalyticsAPI = StudentUAnalyticsAPI;
