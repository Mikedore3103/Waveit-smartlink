const API_BASE_URL = localStorage.getItem('apiBaseUrl') || 'https://waveit-smartlink-api.onrender.com';
const authToken = localStorage.getItem('token') || '';
let dashboardLinks = [];
const protectedPages = new Set(['dashboard.html', 'create-link.html', 'analytics.html']);

const authHeaders = () => ({
  'Content-Type': 'application/json',
  ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
});

const getCurrentPage = () => {
  const raw = window.location.pathname.split('/').pop() || '';
  return raw || 'index.html';
};

const renderAuthNav = () => {
  const currentPage = getCurrentPage();
  if (!protectedPages.has(currentPage)) return;

  const navItems = [
    { href: 'dashboard.html', label: 'Dashboard' },
    { href: 'create-link.html', label: 'Create Link' },
    { href: 'analytics.html', label: 'Analytics' },
  ];

  let mount = document.getElementById('authNavMount');
  if (!mount) {
    mount = document.createElement('div');
    mount.id = 'authNavMount';
    document.body.insertBefore(mount, document.body.firstChild);
  }

  mount.innerHTML = `
    <nav class="auth-nav">
      <div class="auth-nav-inner">
        <a class="auth-nav-brand" href="dashboard.html">Waveit</a>
        <button type="button" class="auth-nav-toggle" id="authNavToggle" aria-label="Toggle menu" aria-expanded="false">Menu</button>
        <div class="auth-nav-links" id="authNavLinks">
          ${navItems
            .map((item) => `<a class="${item.href === currentPage ? 'active' : ''}" href="${item.href}">${item.label}</a>`)
            .join('')}
          <button type="button" class="auth-nav-logout" id="authNavLogout">Logout</button>
        </div>
      </div>
    </nav>
  `;

  const toggle = document.getElementById('authNavToggle');
  const links = document.getElementById('authNavLinks');
  const logoutBtn = document.getElementById('authNavLogout');

  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      links.classList.toggle('open');
    });
    links.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  if (logoutBtn) logoutBtn.addEventListener('click', logout);
};

const checkAuth = () => {
  const currentPage = getCurrentPage();
  const token = localStorage.getItem('token');

  if (protectedPages.has(currentPage) && !token) {
    window.location.href = 'login.html';
    return false;
  }

  return true;
};

const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'index.html';
};

window.logout = logout;

const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
};

const formatNumber = (value) => {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num.toLocaleString() : '0';
};

const resolveClicks = (link) => Number(link.total_clicks || link.clicks || 0);
const platformClassMap = {
  Spotify: 'platform-spotify',
  'Apple Music': 'platform-apple-music',
  YouTube: 'platform-youtube',
  Audiomack: 'platform-audiomack',
  SoundCloud: 'platform-soundcloud',
  Boomplay: 'platform-boomplay',
};

const platformCtaLabel = (platformName) => {
  if (platformName === 'YouTube') return 'Watch on YouTube';
  return `Listen on ${platformName}`;
};

const getUtmFromUrl = () => {
  const p = new URLSearchParams(window.location.search);
  return {
    utm_source: p.get('utm_source') || '',
    utm_medium: p.get('utm_medium') || '',
    utm_campaign: p.get('utm_campaign') || '',
    utm_term: p.get('utm_term') || '',
    utm_content: p.get('utm_content') || '',
  };
};

const resolveUserArtistName = async () => {
  const artistNameEl = document.getElementById('artistName');
  if (!artistNameEl) return;

  const cachedUser = localStorage.getItem('user');
  if (cachedUser) {
    try {
      const user = JSON.parse(cachedUser);
      if (user.artist_name) artistNameEl.textContent = user.artist_name;
    } catch (e) {}
  }

  if (!authToken) return;
  try {
    const response = await fetch(`${API_BASE_URL}/api/me`, { headers: authHeaders() });
    if (!response.ok) return;
    const payload = await response.json();
    if (payload?.user?.artist_name) artistNameEl.textContent = payload.user.artist_name;
  } catch (e) {}
};

const renderLinks = (links) => {
  const body = document.getElementById('linksTableBody');
  const status = document.getElementById('tableStatus');
  const totalLinksEl = document.getElementById('totalLinks');
  const totalClicksEl = document.getElementById('totalClicks');
  const totalPlatformsEl = document.getElementById('totalPlatforms');
  if (!body || !status || !totalLinksEl || !totalClicksEl || !totalPlatformsEl) return;

  body.innerHTML = '';
  if (!Array.isArray(links) || links.length === 0) {
    body.innerHTML = '<tr><td colspan="4" class="empty-row">No smart links created yet.</td></tr>';
    status.textContent = '0 results';
    totalLinksEl.textContent = '0';
    totalClicksEl.textContent = '0';
    totalPlatformsEl.textContent = '0';
    return;
  }

  let clicksTotal = 0;
  let platformsTotal = 0;
  links.forEach((link) => {
    const clicks = resolveClicks(link);
    clicksTotal += clicks;
    const linkPlatforms = Array.isArray(link.platforms) ? link.platforms.length : 0;
    platformsTotal += linkPlatforms;
    const smartUrl = link.slug ? `${window.location.origin.replace(/\/$/, '')}/l/${link.slug}` : '-';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${link.title || 'Untitled'}</td>
      <td>${formatDate(link.created_at)}</td>
      <td>${formatNumber(clicks)}</td>
      <td>
        <a class="btn-inline action-btn" href="${smartUrl}" target="_blank" rel="noopener noreferrer">View</a>
        <a class="btn-inline action-btn" href="analytics.html?link_id=${encodeURIComponent(link.id)}">Analytics</a>
        <button type="button" class="btn-remove action-btn" data-action="delete" data-link-id="${link.id}">Delete</button>
      </td>`;
    body.appendChild(tr);
  });

  totalLinksEl.textContent = formatNumber(links.length);
  totalClicksEl.textContent = formatNumber(clicksTotal);
  totalPlatformsEl.textContent = formatNumber(platformsTotal);
  status.textContent = `${links.length} result${links.length === 1 ? '' : 's'}`;
};

const fetchUserLinks = async () => {
  const body = document.getElementById('linksTableBody');
  const status = document.getElementById('tableStatus');
  const totalLinksEl = document.getElementById('totalLinks');
  const totalClicksEl = document.getElementById('totalClicks');
  const totalPlatformsEl = document.getElementById('totalPlatforms');
  if (!body || !status || !totalLinksEl || !totalClicksEl || !totalPlatformsEl) return;

  try {
    const response = await fetch(`${API_BASE_URL}/api/links/user`, { headers: authHeaders() });
    if (!response.ok) throw new Error(`Failed with status ${response.status}`);
    const payload = await response.json();
    dashboardLinks = Array.isArray(payload) ? payload : payload.links || [];
    renderLinks(dashboardLinks);
  } catch (error) {
    body.innerHTML = '<tr><td colspan="4" class="empty-row">Unable to fetch links from API.</td></tr>';
    status.textContent = 'Fetch failed';
    totalLinksEl.textContent = '0';
    totalClicksEl.textContent = '0';
    totalPlatformsEl.textContent = '0';
  }
};

const findDashboardLinkById = (id) => dashboardLinks.find((item) => item.id === id);

const editDashboardLink = async (linkId) => {
  const link = findDashboardLinkById(linkId);
  if (!link) return;

  const nextTitle = window.prompt('Edit song title:', link.title || '');
  if (nextTitle === null) return;
  const nextCover = window.prompt('Edit cover image URL:', link.cover_image || '');
  if (nextCover === null) return;
  const nextShareTitle = window.prompt('Share title:', link.share_title || link.title || '');
  if (nextShareTitle === null) return;
  const nextShareDescription = window.prompt('Share description:', link.share_description || '');
  if (nextShareDescription === null) return;
  const accent = window.prompt('Theme accent hex color (e.g. #0ea5a0):', link.theme?.accent || '#0ea5a0');
  if (accent === null) return;

  const currentPlatforms = Array.isArray(link.platforms) ? link.platforms : [];
  const nextPlatforms = [];
  for (const p of currentPlatforms) {
    const url = window.prompt(`Update URL for ${p.platform_name}:`, p.platform_url || '');
    if (url === null) return;
    if (!url.trim()) continue;
    nextPlatforms.push({ platform_name: p.platform_name, platform_url: url.trim() });
  }
  if (nextPlatforms.length === 0) {
    window.alert('At least one platform URL is required.');
    return;
  }

  const response = await fetch(`${API_BASE_URL}/api/links/${encodeURIComponent(linkId)}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({
      title: nextTitle.trim() || link.title,
      cover_image: nextCover.trim(),
      share_title: nextShareTitle.trim(),
      share_description: nextShareDescription.trim(),
      theme: { ...(link.theme || {}), accent: accent.trim() || '#0ea5a0' },
      platforms: nextPlatforms,
    }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.message || 'Failed to update link');
};

const deleteDashboardLink = async (linkId) => {
  const response = await fetch(`${API_BASE_URL}/api/links/${encodeURIComponent(linkId)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.message || 'Failed to delete link');
};

const showQrForLink = async (linkId) => {
  const response = await fetch(`${API_BASE_URL}/api/links/${encodeURIComponent(linkId)}/qr`, {
    headers: authHeaders(),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.message || 'Failed to generate QR');
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`<h3>QR for ${payload.link_url}</h3><img src="${payload.qr_data_url}" alt="QR code" />`);
};

const initDashboardActions = () => {
  const body = document.getElementById('linksTableBody');
  if (!body) return;
  body.addEventListener('click', async (event) => {
    const target = event.target.closest('button[data-action][data-link-id]');
    if (!target) return;
    const action = target.getAttribute('data-action');
    const linkId = target.getAttribute('data-link-id');
    if (!action || !linkId) return;

    try {
      if (action === 'delete') {
        const ok = window.confirm('Delete this smartlink? This cannot be undone.');
        if (!ok) return;
        await deleteDashboardLink(linkId);
        window.alert('Link deleted successfully.');
      }
      await fetchUserLinks();
    } catch (error) {
      window.alert(error.message || 'Action failed.');
    }
  });
};

const supportedPlatforms = ['Spotify', 'Apple Music', 'YouTube', 'Audiomack', 'SoundCloud', 'Boomplay'];

const buildPlatformSelect = (selectedValue = '') => {
  const select = document.createElement('select');
  select.className = 'platform-select';
  select.required = true;
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Select platform';
  placeholder.disabled = true;
  placeholder.selected = !selectedValue;
  select.appendChild(placeholder);
  supportedPlatforms.forEach((platform) => {
    const option = document.createElement('option');
    option.value = platform;
    option.textContent = platform;
    if (platform === selectedValue) option.selected = true;
    select.appendChild(option);
  });
  return select;
};

const addPlatformRow = (platform = '', url = '', onChange) => {
  const container = document.getElementById('platformRows');
  if (!container) return;
  const row = document.createElement('div');
  row.className = 'platform-row';
  const select = buildPlatformSelect(platform);
  const urlInput = document.createElement('input');
  urlInput.type = 'url';
  urlInput.className = 'platform-url';
  urlInput.placeholder = 'https://...';
  urlInput.value = url;
  urlInput.required = true;
  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'btn-remove';
  removeBtn.textContent = 'Remove';
  removeBtn.addEventListener('click', () => {
    row.remove();
    if (typeof onChange === 'function') onChange();
  });
  select.addEventListener('change', () => {
    if (typeof onChange === 'function') onChange();
  });
  urlInput.addEventListener('input', () => {
    if (typeof onChange === 'function') onChange();
  });
  row.appendChild(select);
  row.appendChild(urlInput);
  row.appendChild(removeBtn);
  container.appendChild(row);
  if (typeof onChange === 'function') onChange();
};

const serializePlatforms = () => {
  const rows = Array.from(document.querySelectorAll('.platform-row'));
  return rows
    .map((row) => ({
      platform_name: row.querySelector('.platform-select')?.value,
      platform_url: row.querySelector('.platform-url')?.value?.trim(),
    }))
    .filter((item) => item.platform_name && item.platform_url);
};

const initCreateLinkPage = () => {
  const form = document.getElementById('createLinkForm');
  const addPlatformBtn = document.getElementById('addPlatformBtn');
  const messageEl = document.getElementById('createLinkMessage');
  const previewTitleEl = document.getElementById('previewSongTitle');
  const previewCoverEl = document.getElementById('previewCover');
  const previewPlatformsEl = document.getElementById('previewPlatforms');
  if (!form || !addPlatformBtn || !messageEl) return;

  const renderCreatePreview = () => {
    if (!previewTitleEl || !previewPlatformsEl) return;

    const title = document.getElementById('songTitle')?.value?.trim() || 'Your Song Title';
    const coverImage = document.getElementById('coverImage')?.value?.trim();
    const platforms = serializePlatforms();

    previewTitleEl.textContent = title;
    previewPlatformsEl.innerHTML = '';

    if (previewCoverEl) {
      if (coverImage) {
        previewCoverEl.src = coverImage;
        previewCoverEl.style.display = 'block';
      } else {
        previewCoverEl.style.display = 'none';
      }
    }

    if (platforms.length === 0) {
      previewPlatformsEl.innerHTML = '<p class="public-state">Add platform URLs to preview buttons</p>';
      return;
    }

    platforms.forEach((platform) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'public-platform-btn';
      button.textContent = platform.platform_name;
      previewPlatformsEl.appendChild(button);
    });
  };

  addPlatformBtn.addEventListener('click', () => addPlatformRow('', '', renderCreatePreview));
  addPlatformRow('Spotify', '', renderCreatePreview);
  document.getElementById('songTitle')?.addEventListener('input', renderCreatePreview);
  document.getElementById('coverImage')?.addEventListener('input', renderCreatePreview);
  renderCreatePreview();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const title = document.getElementById('songTitle')?.value?.trim();
    const coverImage = document.getElementById('coverImage')?.value?.trim();
    const platforms = serializePlatforms();
    if (!title || platforms.length === 0) {
      messageEl.textContent = 'Song title and at least one platform are required.';
      messageEl.className = 'form-message error';
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/links`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          title,
          cover_image: coverImage || null,
          platforms,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Failed to create smartlink');
      messageEl.textContent = 'Smartlink created successfully.';
      messageEl.className = 'form-message success';
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 500);
    } catch (error) {
      messageEl.textContent = error.message || 'Failed to create smartlink.';
      messageEl.className = 'form-message error';
    }
  });
};

const getSlugFromPath = () => {
  const parts = window.location.pathname.split('/').filter(Boolean);
  return parts[0] === 'l' && parts[1] ? decodeURIComponent(parts[1]) : '';
};

const applyPublicTheme = (theme) => {
  if (!theme || typeof theme !== 'object') return;
  const shell = document.getElementById('publicLinkShell');
  if (!shell) return;
  if (theme.background) document.body.style.background = theme.background;
  if (theme.card) shell.style.background = theme.card;
  if (theme.text) shell.style.color = theme.text;
  if (theme.accent) {
    shell.style.setProperty('--accent', theme.accent);
    document.querySelectorAll('.public-platform-btn').forEach((btn) => {
      btn.style.borderColor = theme.accent;
    });
  }
};

const trackClickAndRedirect = async (linkId, platformName, destinationUrl) => {
  const utm = getUtmFromUrl();
  try {
    await fetch(`${API_BASE_URL}/api/track-click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        link_id: linkId,
        platform_clicked: platformName,
        ...utm,
      }),
      keepalive: true,
    });
  } catch (error) {
    // redirect regardless
  } finally {
    window.location.href = destinationUrl;
  }
};

const initPublicLinkPage = async () => {
  const shell = document.getElementById('publicLinkShell');
  if (!shell) return;
  const coverEl = document.getElementById('publicCover');
  const titleEl = document.getElementById('publicSongTitle');
  const artistEl = document.getElementById('publicArtistName');
  const platformsEl = document.getElementById('publicPlatforms');
  const stateEl = document.getElementById('publicState');
  const slug = getSlugFromPath();
  if (!slug) return;

  try {
    const response = await fetch(`${API_BASE_URL}/api/public/links/${encodeURIComponent(slug)}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || 'Link not found');

    const { link, platforms } = payload;
    titleEl.textContent = link.title || 'Untitled';
    artistEl.textContent = link.artist_name || 'Unknown artist';
    stateEl.textContent = '';

    if (link.cover_image) {
      coverEl.src = link.cover_image;
      coverEl.style.display = 'block';
    } else {
      coverEl.style.display = 'none';
    }

    platformsEl.innerHTML = '';
    if (!Array.isArray(platforms) || platforms.length === 0) {
      stateEl.textContent = 'No platform links available yet.';
      return;
    }

    platforms.forEach((platform) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `public-platform-btn ${platformClassMap[platform.platform_name] || ''}`.trim();
      button.textContent = platformCtaLabel(platform.platform_name);
      button.addEventListener('click', () => {
        trackClickAndRedirect(link.id, platform.platform_name, platform.platform_url);
      });
      platformsEl.appendChild(button);
    });

    applyPublicTheme(link.theme || {});
  } catch (error) {
    titleEl.textContent = 'Smartlink not found';
    artistEl.textContent = '';
    coverEl.style.display = 'none';
    platformsEl.innerHTML = '';
    stateEl.textContent = error.message || 'Unable to load this smartlink.';
  }
};

const initDashboard = async () => {
  const marker = document.getElementById('linksTableBody');
  if (!marker) return;
  initDashboardActions();
  await resolveUserArtistName();
  await fetchUserLinks();
};

const analyticsCharts = { daily: null, platform: null, countries: null };
const destroyChartIfExists = (key) => {
  if (analyticsCharts[key]) {
    analyticsCharts[key].destroy();
    analyticsCharts[key] = null;
  }
};

const buildAnalyticsChart = (key, canvasId, config) => {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === 'undefined') return;
  destroyChartIfExists(key);
  analyticsCharts[key] = new Chart(canvas, config);
};

const updateAnalyticsStatus = (message, variant = '') => {
  const statusEl = document.getElementById('analyticsStatus');
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.className = `form-message${variant ? ` ${variant}` : ''}`;
};

const renderDeviceBreakdown = (devices) => {
  const listEl = document.getElementById('deviceBreakdownList');
  if (!listEl) return;
  listEl.innerHTML = '';
  if (!Array.isArray(devices) || devices.length === 0) {
    listEl.innerHTML = '<li><span>No data</span><strong>0</strong></li>';
    return;
  }
  devices.forEach((item) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${item.device || 'unknown'}</span><strong>${formatNumber(item.clicks)}</strong>`;
    listEl.appendChild(li);
  });
};

const renderAnalyticsDashboard = (payload) => {
  const totals = payload.totals || {};
  const byPlatform = Array.isArray(payload.by_platform) ? payload.by_platform : [];
  const topCountries = Array.isArray(payload.top_countries) ? payload.top_countries : [];
  const dailyClicks = Array.isArray(payload.daily_clicks) ? payload.daily_clicks : [];
  const devices = Array.isArray(payload.devices) ? payload.devices : [];

  document.getElementById('analyticsTotalClicks').textContent = formatNumber(totals.total_clicks || 0);
  document.getElementById('analyticsTopCountry').textContent = topCountries[0]?.country || '-';
  document.getElementById('analyticsTopPlatform').textContent = byPlatform[0]?.platform_clicked || '-';

  buildAnalyticsChart('daily', 'dailyClicksChart', {
    type: 'line',
    data: {
      labels: dailyClicks.map((item) => item.day),
      datasets: [{
        label: 'Clicks',
        data: dailyClicks.map((item) => Number(item.clicks) || 0),
        borderColor: '#0ea5a0',
        backgroundColor: 'rgba(14,165,160,0.2)',
        borderWidth: 2,
        tension: 0.35,
        fill: true,
      }],
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } },
  });

  buildAnalyticsChart('platform', 'platformClicksChart', {
    type: 'pie',
    data: {
      labels: byPlatform.map((item) => item.platform_clicked),
      datasets: [{ data: byPlatform.map((item) => Number(item.clicks) || 0), backgroundColor: ['#0ea5a0', '#102239', '#f59e0b', '#22c55e', '#ef4444', '#6366f1'] }],
    },
    options: { responsive: true, maintainAspectRatio: false },
  });

  buildAnalyticsChart('countries', 'countriesChart', {
    type: 'bar',
    data: {
      labels: topCountries.map((item) => item.country),
      datasets: [{ label: 'Clicks', data: topCountries.map((item) => Number(item.clicks) || 0), backgroundColor: '#102239', borderRadius: 6 }],
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } },
  });

  renderDeviceBreakdown(devices);
  updateAnalyticsStatus('Analytics loaded.', 'success');
};

const fetchAnalytics = async (linkId) => {
  const response = await fetch(`${API_BASE_URL}/api/analytics/${encodeURIComponent(linkId)}`, { headers: authHeaders() });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.message || `Failed with status ${response.status}`);
  return payload;
};

const initAnalyticsPage = async () => {
  const selectEl = document.getElementById('analyticsLinkSelect');
  if (!selectEl) return;
  if (!authToken) {
    updateAnalyticsStatus('You must be logged in to view analytics.', 'error');
    return;
  }

  try {
    const linksResponse = await fetch(`${API_BASE_URL}/api/links`, { headers: authHeaders() });
    const linksPayload = await linksResponse.json();
    if (!linksResponse.ok) throw new Error(linksPayload.message || 'Failed to load links');

    const links = Array.isArray(linksPayload) ? linksPayload : linksPayload.links;
    if (!Array.isArray(links) || links.length === 0) {
      selectEl.innerHTML = '<option value="">No links available</option>';
      updateAnalyticsStatus('Create a smartlink first to see analytics.', 'error');
      return;
    }

    selectEl.innerHTML = links.map((link) => `<option value="${link.id}">${link.title || 'Untitled'} (${link.slug || '-'})</option>`).join('');
    const initialId = new URLSearchParams(window.location.search).get('link_id') || links[0].id;
    selectEl.value = initialId;

    const loadSelected = async () => {
      const selectedId = selectEl.value;
      if (!selectedId) return;
      updateAnalyticsStatus('Loading analytics...');
      const url = new URL(window.location.href);
      url.searchParams.set('link_id', selectedId);
      window.history.replaceState({}, '', url);
      const payload = await fetchAnalytics(selectedId);
      renderAnalyticsDashboard(payload);
    };

    selectEl.addEventListener('change', loadSelected);
    await loadSelected();
  } catch (error) {
    updateAnalyticsStatus(error.message || 'Failed to load analytics.', 'error');
  }
};

const initArtistProfilePage = async () => {
  const shell = document.getElementById('artistProfileShell');
  if (!shell) return;
  const parts = window.location.pathname.split('/').filter(Boolean);
  const artistSlug = parts[0] === 'artist' ? parts[1] : '';
  if (!artistSlug) return;

  const nameEl = document.getElementById('artistProfileName');
  const bioEl = document.getElementById('artistProfileBio');
  const avatarEl = document.getElementById('artistProfileAvatar');
  const linksEl = document.getElementById('artistProfileLinks');

  try {
    const response = await fetch(`${API_BASE_URL}/api/public/artists/${encodeURIComponent(artistSlug)}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || 'Artist not found');

    nameEl.textContent = payload.artist.artist_name || 'Artist';
    bioEl.textContent = payload.artist.bio || '';
    if (payload.artist.avatar_image) {
      avatarEl.src = payload.artist.avatar_image;
      avatarEl.style.display = 'block';
    }

    const t = payload.artist.profile_theme || {};
    if (t.background) shell.style.background = t.background;
    if (t.text) shell.style.color = t.text;

    linksEl.innerHTML = '';
    (payload.links || []).forEach((link) => {
      const a = document.createElement('a');
      a.className = 'public-platform-btn';
      a.href = `/l/${link.slug}`;
      a.textContent = link.title;
      linksEl.appendChild(a);
    });
  } catch (error) {
    nameEl.textContent = 'Artist not found';
    bioEl.textContent = error.message || 'Failed to load profile';
  }
};

const initLandingPage = () => {
  const landingHero = document.querySelector('.landing-hero');
  if (!landingHero) return;

  const userRaw = localStorage.getItem('user');
  if (!userRaw) return;

  try {
    const user = JSON.parse(userRaw);
    if (user?.artist_name) {
      const heroSubtext = document.querySelector('.landing-subtext');
      if (heroSubtext) {
        heroSubtext.textContent = `Welcome back, ${user.artist_name}. Your fans are one click away from every platform.`;
      }
    }
  } catch (e) {}
};

const init = async () => {
  if (!checkAuth()) return;
  renderAuthNav();
  initLandingPage();
  initCreateLinkPage();
  await initDashboard();
  await initAnalyticsPage();
  await initPublicLinkPage();
  await initArtistProfilePage();
};

init();
