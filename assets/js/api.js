// Tiny fetch wrapper for the Bidesiya backend.
// Loads/stores the JWT in localStorage.

const DEFAULT_BASE = (() => {
  // 1. User override (set once via localStorage in DevTools):
  //      localStorage.setItem('bidesiya.api_base', 'https://api.example.com')
  const stored = localStorage.getItem('bidesiya.api_base');
  if (stored) return stored;

  // 2. Deploy-time config via <meta name="bidesiya-api-base" content="https://...">
  //    Put this in every HTML head when hosting on GitHub Pages / Netlify / etc.
  if (typeof document !== 'undefined') {
    const meta = document.querySelector('meta[name="bidesiya-api-base"]');
    if (meta && meta.content && meta.content.trim() && !meta.content.includes('YOUR_BACKEND')) {
      return meta.content.trim();
    }
  }

  // 3. Local dev auto-detect — use the same host on port 8000 to avoid
  //    cross-origin quirks between 127.0.0.1 and localhost.
  if (typeof location !== 'undefined' && location.hostname) {
    if (location.hostname === '127.0.0.1' || location.hostname === 'localhost') {
      return `${location.protocol}//${location.hostname}:8000`;
    }
    // Fallback for a same-origin production deployment
    return location.origin;
  }
  return 'http://localhost:8000';
})();

export const api = {
  base: DEFAULT_BASE,

  setBase(url) {
    this.base = url;
    localStorage.setItem('bidesiya.api_base', url);
  },

  get token() { return localStorage.getItem('bidesiya.token'); },
  set token(v) {
    if (v) localStorage.setItem('bidesiya.token', v);
    else localStorage.removeItem('bidesiya.token');
  },

  get userId() {
    const raw = localStorage.getItem('bidesiya.user_id');
    return raw ? Number(raw) : null;
  },
  set userId(v) {
    if (v != null) localStorage.setItem('bidesiya.user_id', String(v));
    else localStorage.removeItem('bidesiya.user_id');
  },

  isAuthed() { return !!this.token; },

  async request(method, path, body, { asForm = false } = {}) {
    const headers = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    let payload;
    if (body && !asForm) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    } else if (asForm) {
      payload = body; // FormData — browser sets its own boundary
    }

    const resp = await fetch(`${this.base}${path}`, {
      method,
      headers,
      body: payload,
    });

    if (resp.status === 204) return null;
    let data = null;
    const ct = resp.headers.get('content-type') || '';
    if (ct.includes('application/json')) data = await resp.json();
    else data = await resp.text();

    if (!resp.ok) {
      const msg = (data && data.detail) || (typeof data === 'string' ? data : `HTTP ${resp.status}`);
      const err = new Error(msg);
      err.status = resp.status;
      throw err;
    }
    return data;
  },

  get(path)             { return this.request('GET', path); },
  post(path, body)      { return this.request('POST', path, body); },
  postForm(path, form)  { return this.request('POST', path, form, { asForm: true }); },
  patch(path, body)     { return this.request('PATCH', path, body); },
  del(path)             { return this.request('DELETE', path); },

  // ---- Auth ----
  async requestOtp(phone) {
    return this.post('/auth/request-otp', { phone });
  },
  async verifyOtp(phone, code) {
    const d = await this.post('/auth/verify-otp', { phone, code });
    this.token = d.access_token;
    this.userId = d.user_id;
    return d;
  },
  async signInWithGoogle(idToken) {
    const d = await this.post('/auth/social/google', { id_token: idToken });
    this.token = d.access_token;
    this.userId = d.user_id;
    return d;
  },
  async me() { return this.get('/users/me'); },
  async updateMe(patch) { return this.patch('/users/me', patch); },
  async uploadAvatar(file) {
    const form = new FormData();
    form.append('file', file);
    return this.postForm('/users/me/avatar', form);
  },
  async removeAvatar() { return this.del('/users/me/avatar'); },
  signOut() { this.token = null; this.userId = null; },

  // ---- Posts ----
  listPosts(district) {
    const q = district ? `?district=${encodeURIComponent(district)}` : '';
    return this.get(`/posts${q}`);
  },
  createPost(body)        { return this.post('/posts', body); },
  editPost(id, body)      { return this.patch(`/posts/${id}`, body); },
  deletePost(id)          { return this.del(`/posts/${id}`); },
  likePost(id)            { return this.post(`/posts/${id}/like`); },
  unlikePost(id)          { return this.del(`/posts/${id}/like`); },
  async uploadImage(file) {
    const form = new FormData();
    form.append('file', file);
    return this.postForm('/posts/upload', form);
  },
  repost(id)                 { return this.post(`/posts/${id}/repost`); },
  undoRepost(id)             { return this.del(`/posts/${id}/repost`); },
  quote(id, body)            { return this.post(`/posts/${id}/quote`, body); },

  // ---- Hashtags (X-style) ----
  trendingHashtags(days = 7, limit = 8) {
    return this.get(`/hashtags/trending?days=${days}&limit=${limit}`);
  },
  postsForHashtag(tag, limit = 30) {
    return this.get(`/hashtags/${encodeURIComponent(tag)}/posts?limit=${limit}`);
  },

  // ---- Comments ----
  listComments(postId)                { return this.get(`/posts/${postId}/comments`); },
  addComment(postId, body)            { return this.post(`/posts/${postId}/comments`, { body }); },
  editComment(postId, id, body)       { return this.patch(`/posts/${postId}/comments/${id}`, { body }); },
  deleteComment(postId, id)           { return this.del(`/posts/${postId}/comments/${id}`); },

  // ---- Land guardian ----
  listParcels()   { return this.get('/land/parcels'); },
  addParcel(p)    { return this.post('/land/parcels', p); },
  removeParcel(id){ return this.del(`/land/parcels/${id}`); },
  listAlerts()    { return this.get('/land/alerts'); },
  ackAlert(id)    { return this.post(`/land/alerts/${id}/ack`); },

  // ---- Rich profile — LinkedIn-style ----
  listExperience(userId)               { return this.get(`/users/${userId}/experience`); },
  addExperience(body)                  { return this.post('/users/me/experience', body); },
  updateExperience(id, body)           { return this.patch(`/users/me/experience/${id}`, body); },
  deleteExperience(id)                 { return this.del(`/users/me/experience/${id}`); },

  listEducation(userId)                { return this.get(`/users/${userId}/education`); },
  addEducation(body)                   { return this.post('/users/me/education', body); },
  updateEducation(id, body)            { return this.patch(`/users/me/education/${id}`, body); },
  deleteEducation(id)                  { return this.del(`/users/me/education/${id}`); },

  // ---- Notifications (Sarkari updates) ----
  listNotifications(params = {}) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
    }
    const qs = q.toString();
    return this.get(`/notifications${qs ? '?' + qs : ''}`);
  },
  getNotification(id)             { return this.get(`/notifications/${id}`); },
  notificationCounts()            { return this.get('/notifications/counts'); },
  createNotification(body)        { return this.post('/notifications', body); },
  updateNotification(id, body)    { return this.patch(`/notifications/${id}`, body); },
  deactivateNotification(id)      { return this.del(`/notifications/${id}`); },

  // ---- Communities (Round 3) ----
  listCommunities(params = {}) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
    }
    const qs = q.toString();
    return this.get(`/communities${qs ? '?' + qs : ''}`);
  },
  getCommunity(slug)               { return this.get(`/communities/${encodeURIComponent(slug)}`); },
  createCommunity(body)            { return this.post('/communities', body); },
  updateCommunity(slug, body)      { return this.patch(`/communities/${encodeURIComponent(slug)}`, body); },
  joinCommunity(id)                { return this.post(`/communities/${id}/join`); },
  leaveCommunity(id)               { return this.del(`/communities/${id}/join`); },
  listCommunityMembers(slug)       { return this.get(`/communities/${encodeURIComponent(slug)}/members`); },
  communityPosts(slug)             { return this.get(`/communities/${encodeURIComponent(slug)}/posts`); },

  // ---- Direct messages (Round 3) ----
  listConversations()              { return this.get('/dm/conversations'); },
  startConversation(peer_id, body) { return this.post('/dm/conversations', { peer_id, body }); },
  listMessages(convId)             { return this.get(`/dm/conversations/${convId}/messages`); },
  sendMessage(convId, body)        { return this.post(`/dm/conversations/${convId}/messages`, { body }); },
  dmUnreadCount()                  { return this.get('/dm/unread-count'); },

  // ---- Inbox / notifications (Round 4) ----
  listInbox(unread_only = false)   { return this.get(`/inbox${unread_only ? '?unread_only=true' : ''}`); },
  inboxUnreadCount()               { return this.get('/inbox/unread-count'); },
  markAllRead()                    { return this.post('/inbox/mark-all-read'); },
  markRead(id)                     { return this.post(`/inbox/${id}/read`); },

  // ---- Global search (Round 4) ----
  search(q, limit = 5)             { return this.get(`/search?q=${encodeURIComponent(q)}&limit=${limit}`); },

  // ---- Notable Voices (Round 9) ----
  listNotable(category = '') {
    const qs = category ? `?category=${encodeURIComponent(category)}` : '';
    return this.get(`/notable${qs}`);
  },

  // ---- Rishta / Matrimony (Round 10) ----
  myRishta()                     { return this.get('/rishta/me'); },
  upsertRishta(body)             { return this.request('PUT', '/rishta/me', body); },
  pauseRishta()                  { return this.post('/rishta/me/pause'); },
  browseRishta(params = {}) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
    }
    const qs = q.toString();
    return this.get(`/rishta${qs ? '?' + qs : ''}`);
  },
  rishtaProfile(userId)                { return this.get(`/rishta/user/${userId}`); },
  expressInterest(userId, message)     { return this.post(`/rishta/${userId}/interest`, { message: message || null }); },
  acceptInterest(interestId)           { return this.post(`/rishta/interests/${interestId}/accept`); },
  rejectInterest(interestId)           { return this.post(`/rishta/interests/${interestId}/reject`); },
  listInterests()                      { return this.get('/rishta/interests'); },

  // ---- Tourism (Round 10) ----
  listDestinations(state, params = {}) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
    }
    const qs = q.toString();
    return this.get(`/tourism/${state}${qs ? '?' + qs : ''}`);
  },
  tourismSummary(state)                { return this.get(`/tourism/${state}/summary`); },
  getDestination(state, slug)          { return this.get(`/tourism/${state}/${slug}`); },

  // ---- Sahyog / Crowdfunding (Round 12) ----
  listCampaigns(params = {}) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
    }
    const qs = q.toString();
    return this.get(`/crowdfund${qs ? '?' + qs : ''}`);
  },
  featuredCampaign()                    { return this.get('/crowdfund/featured'); },
  myCampaigns()                         { return this.get('/crowdfund/mine'); },
  getCampaign(id)                       { return this.get(`/crowdfund/${id}`); },
  createCampaign(body)                  { return this.post('/crowdfund', body); },
  updateCampaign(id, body)              { return this.patch(`/crowdfund/${id}`, body); },
  deleteCampaign(id)                    { return this.del(`/crowdfund/${id}`); },

  listPledges(campaignId, params = {}) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
    }
    const qs = q.toString();
    return this.get(`/crowdfund/${campaignId}/pledges${qs ? '?' + qs : ''}`);
  },
  createPledge(campaignId, body)        { return this.post(`/crowdfund/${campaignId}/pledge`, body); },
  markPledgePaid(pledgeId)              { return this.post(`/crowdfund/pledges/${pledgeId}/paid`); },
  confirmPledge(pledgeId)               { return this.post(`/crowdfund/pledges/${pledgeId}/confirm`); },
  cancelPledge(pledgeId)                { return this.post(`/crowdfund/pledges/${pledgeId}/cancel`); },

  listCampaignUpdates(campaignId)       { return this.get(`/crowdfund/${campaignId}/updates`); },
  createCampaignUpdate(campaignId, body) { return this.post(`/crowdfund/${campaignId}/updates`, body); },

  adminCampaignQueue(status_filter = 'pending') {
    return this.get(`/crowdfund/admin/queue?status_filter=${status_filter}`);
  },
  adminDecideCampaign(id, status, admin_notes) {
    return this.post(`/crowdfund/admin/${id}/decide`, { status, admin_notes });
  },
  adminToggleFeature(id)                { return this.post(`/crowdfund/admin/${id}/feature`); },

  // ---- Bazaar / Marketplace (Round 11) ----
  listListings(params = {}) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
    }
    const qs = q.toString();
    return this.get(`/market${qs ? '?' + qs : ''}`);
  },
  myListings()                         { return this.get('/market/mine'); },
  getListing(id)                       { return this.get(`/market/${id}`); },
  createListing(body)                  { return this.post('/market', body); },
  updateListing(id, body)              { return this.patch(`/market/${id}`, body); },
  deleteListing(id)                    { return this.del(`/market/${id}`); },

  // ---- Reactions + polls + replies + multi-image (Round 5 · A) ----
  reactPost(id, kind = 'like')     { return this.post(`/posts/${id}/like?kind=${encodeURIComponent(kind)}`); },
  clearReaction(id)                { return this.del(`/posts/${id}/like`); },
  votePoll(postId, optionId)       { return this.post(`/posts/${postId}/poll/vote/${optionId}`); },
  listReplies(postId, parentId)    { return this.get(`/posts/${postId}/comments?parent_id=${parentId}`); },
  addReply(postId, parentId, body) { return this.post(`/posts/${postId}/comments`, { body, parent_id: parentId }); },

  // ---- Stories (Round 5 · B) ----
  storyFeed()                      { return this.get('/stories/feed'); },
  createStory(body)                { return this.post('/stories', body); },
  viewStory(id)                    { return this.post(`/stories/${id}/view`); },
  deleteStory(id)                  { return this.del(`/stories/${id}`); },

  // ---- Events (Round 5 · C) ----
  listEvents(params = {}) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
    }
    const qs = q.toString();
    return this.get(`/events${qs ? '?' + qs : ''}`);
  },
  getEvent(slug)                   { return this.get(`/events/${encodeURIComponent(slug)}`); },
  createEvent(body)                { return this.post('/events', body); },
  eventRsvp(eventId, status)       { return this.post(`/events/${eventId}/rsvp`, { status }); },
  upcomingEvents(days = 30, limit = 5) {
    return this.get(`/events/upcoming-strip?days=${days}&limit=${limit}`);
  },

  // ---- Trust: block + verification (Round 5 · D) ----
  blockUser(id)                    { return this.post(`/users/${id}/block`); },
  unblockUser(id)                  { return this.del(`/users/${id}/block`); },
  myBlocks()                       { return this.get('/users/me/blocks'); },
  requestVerification(body)        { return this.post('/verification/request', body); },
  myVerificationRequests()         { return this.get('/verification/mine'); },
  adminVerificationQueue(status_filter = 'pending') {
    return this.get(`/admin/verification/queue?status_filter=${status_filter}`);
  },
  decideVerification(id, status, reviewer_notes) {
    return this.post(`/admin/verification/${id}/decide`, { status, reviewer_notes });
  },

  // ---- Admin ----
  pollNow()       { return this.post('/admin/poll-now'); },
  health()        { return this.get('/health'); },
};
