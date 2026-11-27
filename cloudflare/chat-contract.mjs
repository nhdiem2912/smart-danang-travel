// Shared wire contract for the Worker relay and the Gemini backend.
export const MAX_BYTES = 6 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export function validImage(image) {
  if (!image || typeof image !== 'object' ||
      !['image/jpeg', 'image/png', 'image/webp'].includes(image.mimeType) ||
      typeof image.data !== 'string') return false;
  const data = image.data;
  if (!data.length || data.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4 ||
      data.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) return false;
  const padding = data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0;
  if (data.length * 3 / 4 - padding > MAX_IMAGE_BYTES) return false;
  let prefix;
  try { prefix = atob(data.slice(0, 16)); } catch { return false; }
  if (image.mimeType === 'image/jpeg') {
    return prefix.startsWith('\xff\xd8\xff');
  }
  if (image.mimeType === 'image/png') {
    return prefix.startsWith('\x89PNG\r\n\x1a\n');
  }
  return prefix.startsWith('RIFF') && prefix.slice(8, 12) === 'WEBP';
}

export function validInput(value) {
  if (!value || !['vi', 'en', 'ko', 'ja', 'zh'].includes(value.language) ||
      !Array.isArray(value.messages) || value.messages.length < 1 || value.messages.length > 7) return false;
  let images = 0;
  for (const [index, message] of value.messages.entries()) {
    if (!message || message.role !== (index % 2 === 0 ? 'user' : 'assistant') ||
        typeof message.text !== 'string' || !message.text.trim() || message.text.length > 2000) return false;
    if (message.image !== undefined) {
      if (message.role !== 'user' || !validImage(message.image) || ++images > 2) return false;
    }
  }
  return value.messages.at(-1).role === 'user' && value.messages.at(-1).text.length <= 1000;
}

export function googleContents(messages) {
  return messages.map(message => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: [
      ...(message.image ? [{ inlineData: {
        mimeType: message.image.mimeType,
        data: message.image.data,
      } }] : []),
      { text: message.text.trim() },
    ],
  }));
}
