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

const buildPublicLinkUrl = (slug) => {
  if (!slug) return '-';
  const url = new URL('link.html', window.location.href);
  url.searchParams.set('slug', slug);
  return url.toString();
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
const platformLogoUrlMap = {
  Spotify: 'https://cdn.simpleicons.org/spotify/1DB954',
  'Apple Music': 'https://cdn.simpleicons.org/applemusic/ffffff',
  YouTube: 'https://cdn.simpleicons.org/youtube/FF0000',
  Audiomack: 'https://cdn.simpleicons.org/audiomack/F59E0B',
  SoundCloud: 'https://cdn.simpleicons.org/soundcloud/FF5500',
  Boomplay: 'https://cdn.simpleicons.org/boompod/22C55E',
};

const platformCtaLabel = (platformName) => {
  if (platformName === 'YouTube') return 'Watch on YouTube';
  return `Listen on ${platformName}`;
};

const escapeSvgText = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const buildCoverPlaceholder = (title = 'Untitled', artist = 'Waveit') => {
  const safeTitle = escapeSvgText(String(title || 'Untitled').slice(0, 28));
  const safeArtist = escapeSvgText(String(artist || 'Waveit').slice(0, 32));
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#7c3aed"/>
          <stop offset="100%" stop-color="#06b6d4"/>
        </linearGradient>
      </defs>
      <rect width="600" height="600" fill="url(#g)"/>
      <circle cx="120" cy="120" r="120" fill="rgba(255,255,255,0.16)"/>
      <circle cx="520" cy="520" r="170" fill="rgba(0,0,0,0.15)"/>
      <text x="50%" y="50%" text-anchor="middle" fill="#ffffff" font-size="52" font-family="Arial, sans-serif" font-weight="700">${safeTitle}</text>
      <text x="50%" y="57%" text-anchor="middle" fill="rgba(255,255,255,0.9)" font-size="24" font-family="Arial, sans-serif">${safeArtist}</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const buildPlatformButtonContent = (platformName, label) => {
  const logoUrl = platformLogoUrlMap[platformName];
  const logo = logoUrl
    ? `<img class="platform-logo" src="${logoUrl}" alt="" loading="lazy" decoding="async" onerror="this.style.display='none'" />`
    : '';
  return `<span class="platform-btn-content">${logo}<span>${label}</span></span>`;
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
    const smartUrl = buildPublicLinkUrl(link.slug);

    const tr = document.createElement('tr');
    const titleTd = document.createElement('td');
    const titleWrap = document.createElement('div');
    titleWrap.className = 'song-title-cell';
    if (link.cover_image) {
      const thumb = document.createElement('img');
      thumb.className = 'song-cover-thumb';
      thumb.src = link.cover_image;
      thumb.alt = `${link.title || 'Song'} cover`;
      thumb.onerror = () => {
        thumb.onerror = null;
        thumb.src = buildCoverPlaceholder(link.title, link.artist_name || 'Waveit');
      };
      titleWrap.appendChild(thumb);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'song-cover-placeholder';
      placeholder.textContent = '♪';
      titleWrap.appendChild(placeholder);
    }
    const titleText = document.createElement('span');
    titleText.textContent = link.title || 'Untitled';
    titleWrap.appendChild(titleText);
    titleTd.appendChild(titleWrap);

    const dateTd = document.createElement('td');
    dateTd.textContent = formatDate(link.created_at);

    const clicksTd = document.createElement('td');
    clicksTd.textContent = formatNumber(clicks);

    const actionTd = document.createElement('td');
    actionTd.innerHTML = `
      <button type="button" class="btn-inline action-btn" data-action="edit" data-link-id="${link.id}">Edit</button>
      <a class="btn-inline action-btn" href="${smartUrl}" target="_blank" rel="noopener noreferrer">View</a>
      <a class="btn-inline action-btn" href="analytics.html?link_id=${encodeURIComponent(link.id)}">Analytics</a>
      <button type="button" class="btn-remove action-btn" data-action="delete" data-link-id="${link.id}">Delete</button>
    `;
    tr.appendChild(titleTd);
    tr.appendChild(dateTd);
    tr.appendChild(clicksTd);
    tr.appendChild(actionTd);
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
      cover_image: link.cover_image || null,
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
      if (action === 'edit') {
        await editDashboardLink(linkId);
      }
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

const getPlatformRows = () => Array.from(document.querySelectorAll('.platform-row'));

const findPlatformRow = (platformName) =>
  getPlatformRows().find((row) => row.querySelector('.platform-select')?.value === platformName);

const buildAutoPlatformUrls = (query) => {
  const q = encodeURIComponent(query);
  return {
    'Apple Music': `https://music.apple.com/us/search?term=${q}`,
    YouTube: `https://www.youtube.com/results?search_query=${q}`,
    Audiomack: `https://audiomack.com/search/${q}`,
    SoundCloud: `https://soundcloud.com/search?q=${q}`,
    Boomplay: `https://www.boomplay.com/search/${q}`,
  };
};

const initCreateLinkPage = () => {
  const form = document.getElementById('createLinkForm');
  const addPlatformBtn = document.getElementById('addPlatformBtn');
  const autoFillPlatformsBtn = document.getElementById('autoFillPlatformsBtn');
  const messageEl = document.getElementById('createLinkMessage');
  const previewTitleEl = document.getElementById('previewSongTitle');
  const previewCoverEl = document.getElementById('previewCover');
  const previewPlatformsEl = document.getElementById('previewPlatforms');
  const coverImageFileInput = document.getElementById('coverImageFile');
  if (!form || !addPlatformBtn || !messageEl) return;
  let coverImageFromFile = '';
  let coverImageValidationError = '';
  const MAX_COVER_FILE_BYTES = 2 * 1024 * 1024;

  const renderCreatePreview = () => {
    if (!previewTitleEl || !previewPlatformsEl) return;

    const title = document.getElementById('songTitle')?.value?.trim() || 'Your Song Title';
    const selectedCover = coverImageFromFile;
    const platforms = serializePlatforms();

    previewTitleEl.textContent = title;
    previewPlatformsEl.innerHTML = '';

    if (previewCoverEl) {
      if (selectedCover) {
        previewCoverEl.src = selectedCover;
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
      button.innerHTML = buildPlatformButtonContent(platform.platform_name, platform.platform_name);
      previewPlatformsEl.appendChild(button);
    });
  };

  addPlatformBtn.addEventListener('click', () => addPlatformRow('', '', renderCreatePreview));
  autoFillPlatformsBtn?.addEventListener('click', () => {
    const title = document.getElementById('songTitle')?.value?.trim();
    const spotifyRow = findPlatformRow('Spotify');
    const spotifyUrl = spotifyRow?.querySelector('.platform-url')?.value?.trim();

    if (!title) {
      messageEl.textContent = 'Enter song title first, then auto-fill platform links.';
      messageEl.className = 'form-message error';
      return;
    }

    if (!spotifyUrl) {
      messageEl.textContent = 'Add a Spotify link first, then auto-fill the rest.';
      messageEl.className = 'form-message error';
      return;
    }

    const generated = buildAutoPlatformUrls(title);
    const targets = Object.keys(generated);
    let filled = 0;

    targets.forEach((platform) => {
      const existing = findPlatformRow(platform);
      if (existing) {
        const urlInput = existing.querySelector('.platform-url');
        if (urlInput && !urlInput.value.trim()) {
          urlInput.value = generated[platform];
          filled += 1;
        }
        return;
      }
      addPlatformRow(platform, generated[platform], renderCreatePreview);
      filled += 1;
    });

    renderCreatePreview();
    messageEl.textContent = filled > 0
      ? `Auto-filled ${filled} platform link${filled === 1 ? '' : 's'} from your song title.`
      : 'All target platform rows already have links.';
    messageEl.className = 'form-message success';
  });
  addPlatformRow('Spotify', '', renderCreatePreview);
  document.getElementById('songTitle')?.addEventListener('input', renderCreatePreview);
  coverImageFileInput?.addEventListener('change', () => {
    const file = coverImageFileInput.files && coverImageFileInput.files[0];
    if (!file) {
      coverImageFromFile = '';
      coverImageValidationError = '';
      renderCreatePreview();
      return;
    }
    if (!file.type.startsWith('image/')) {
      coverImageFromFile = '';
      coverImageValidationError = 'Please choose a valid image file.';
      messageEl.textContent = 'Please choose a valid image file.';
      messageEl.className = 'form-message error';
      renderCreatePreview();
      return;
    }
    if (file.size > MAX_COVER_FILE_BYTES) {
      coverImageFromFile = '';
      coverImageValidationError = 'Image is too large. Please use a file smaller than 2MB.';
      messageEl.textContent = coverImageValidationError;
      messageEl.className = 'form-message error';
      renderCreatePreview();
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      coverImageFromFile = typeof reader.result === 'string' ? reader.result : '';
      coverImageValidationError = '';
      messageEl.textContent = '';
      messageEl.className = 'form-message';
      renderCreatePreview();
    };
    reader.onerror = () => {
      coverImageFromFile = '';
      coverImageValidationError = 'Failed to read image file.';
      messageEl.textContent = 'Failed to read image file.';
      messageEl.className = 'form-message error';
      renderCreatePreview();
    };
    reader.readAsDataURL(file);
  });
  renderCreatePreview();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const title = document.getElementById('songTitle')?.value?.trim();
    const selectedCover = coverImageFromFile;
    const platforms = serializePlatforms();
    const selectedFile = coverImageFileInput?.files && coverImageFileInput.files[0];
    if (!title || platforms.length === 0) {
      messageEl.textContent = 'Song title and at least one platform are required.';
      messageEl.className = 'form-message error';
      return;
    }
    if (coverImageValidationError) {
      messageEl.textContent = coverImageValidationError;
      messageEl.className = 'form-message error';
      return;
    }
    if (selectedFile && selectedFile.size > MAX_COVER_FILE_BYTES) {
      messageEl.textContent = 'Image is too large. Please use a file smaller than 2MB.';
      messageEl.className = 'form-message error';
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/links`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          title,
          cover_image: selectedCover || null,
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
  const querySlug = new URLSearchParams(window.location.search).get('slug');
  if (querySlug) return decodeURIComponent(querySlug);
  const parts = window.location.pathname.split('/').filter(Boolean);
  return parts[0] === 'l' && parts[1] ? decodeURIComponent(parts[1]) : '';
};

const applyPublicTheme = (theme) => {
  if (!theme || typeof theme !== 'object') return;
  const shell = document.getElementById('publicLinkShell');
  if (!shell) return;
  // Keep dark glass base for readability; apply only text/accent customizations.
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

    coverEl.src = link.cover_image || buildCoverPlaceholder(link.title, link.artist_name);
    coverEl.onerror = () => {
      coverEl.onerror = null;
      coverEl.src = buildCoverPlaceholder(link.title, link.artist_name);
    };
    coverEl.style.display = 'block';

    platformsEl.innerHTML = '';
    if (!Array.isArray(platforms) || platforms.length === 0) {
      stateEl.textContent = 'No platform links available yet.';
      return;
    }

    platforms.forEach((platform) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `public-platform-btn ${platformClassMap[platform.platform_name] || ''}`.trim();
      button.innerHTML = buildPlatformButtonContent(
        platform.platform_name,
        platformCtaLabel(platform.platform_name)
      );
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
      a.href = buildPublicLinkUrl(link.slug);
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

