const defaultLinkTheme = {
  background: '#f5f7fb',
  card: '#ffffff',
  text: '#102239',
  accent: '#0ea5a0',
  buttonText: '#ffffff',
};

const defaultProfileTheme = {
  background: '#f4f8ff',
  text: '#102239',
  accent: '#0ea5a0',
};

const clampColor = (value, fallback) => {
  if (typeof value !== 'string') return fallback;
  const v = value.trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v) ? v : fallback;
};

const sanitizeLinkTheme = (theme) => {
  const input = theme && typeof theme === 'object' ? theme : {};
  return {
    background: clampColor(input.background, defaultLinkTheme.background),
    card: clampColor(input.card, defaultLinkTheme.card),
    text: clampColor(input.text, defaultLinkTheme.text),
    accent: clampColor(input.accent, defaultLinkTheme.accent),
    buttonText: clampColor(input.buttonText, defaultLinkTheme.buttonText),
  };
};

const sanitizeProfileTheme = (theme) => {
  const input = theme && typeof theme === 'object' ? theme : {};
  return {
    background: clampColor(input.background, defaultProfileTheme.background),
    text: clampColor(input.text, defaultProfileTheme.text),
    accent: clampColor(input.accent, defaultProfileTheme.accent),
  };
};

module.exports = {
  defaultLinkTheme,
  defaultProfileTheme,
  sanitizeLinkTheme,
  sanitizeProfileTheme,
};
