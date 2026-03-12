function detectMediaType(file) {
  const name = (file.name || '').toLowerCase();
  const fromExt = (regex) => regex.test(name);

  if (file.type === 'image/gif') return 'gif';
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';

  if (fromExt(/\.(gif)$/i)) return 'gif';
  if (fromExt(/\.(jpg|jpeg|png|webp|bmp|avif|heic|heif)$/i)) return 'image';
  if (fromExt(/\.(mp4|webm|mov|m4v|avi|mkv|wmv|flv|3gp|mpe?g|ogg|ogv|ts)$/i)) return 'video';

  return 'unknown';
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Could not encode image.'));
        return;
      }
      resolve(blob);
    }, type, quality);
  });
}

async function compressImageIfNeeded(file, onStatus) {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') {
    return file;
  }

  try {
    onStatus('Compressing image...');

    const bitmap = await createImageBitmap(file);
    const maxEdge = 1920;
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, width, height);

    let quality = 0.88;
    let blob = await canvasToBlob(canvas, 'image/webp', quality);
    const targetBytes = 2 * 1024 * 1024;

    while (blob.size > targetBytes && quality > 0.46) {
      quality -= 0.08;
      blob = await canvasToBlob(canvas, 'image/webp', quality);
    }

    if (blob.size >= file.size * 0.95) {
      return file;
    }

    const baseName = file.name.replace(/\.[^/.]+$/, '');
    return new File([blob], `${baseName}.webp`, { type: 'image/webp' });
  } catch (error) {
    // If compression fails, continue with the original file.
    return file;
  }
}

function getUploadEndpoint() {
  const fallbackEndpoint = 'https://tmpfiles.org/api/v1/upload';

  if (typeof window === 'undefined') {
    return fallbackEndpoint;
  }

  const customEndpoint = window.localStorage.getItem('shoot.uploadEndpoint');
  return customEndpoint || fallbackEndpoint;
}

function normalizeUploadedUrl(url, endpoint) {
  if (!url) return '';

  if (endpoint.includes('tmpfiles.org') && url.includes('tmpfiles.org/')) {
    return url.replace('https://tmpfiles.org/', 'https://tmpfiles.org/dl/');
  }

  return url;
}

async function uploadFile(file, onStatus) {
  const endpoint = getUploadEndpoint();
  onStatus('Uploading media...');

  const formData = new FormData();
  formData.append('file', file, file.name);

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Upload service rejected the file.');
  }

  const rawBody = await response.text();

  let payload = {};
  try {
    payload = JSON.parse(rawBody);
  } catch (e) {
    // Non-JSON responses are supported below.
  }

  const textUrlMatch = rawBody.match(/https?:\/\/\S+/i);
  const rawUrl =
    payload.url ||
    (payload.data && payload.data.url) ||
    (payload.result && payload.result.url) ||
    (textUrlMatch ? textUrlMatch[0].trim() : '');
  const uploadedUrl = normalizeUploadedUrl(rawUrl, endpoint);

  if (!uploadedUrl) {
    throw new Error('Upload succeeded but no file URL was returned.');
  }

  return uploadedUrl;
}

export async function prepareAndUploadMedia(file, onStatus = () => {}) {
  const mediaType = detectMediaType(file);
  if (mediaType === 'unknown') {
    throw new Error('Only images, GIFs, and videos are supported.');
  }

  const preparedFile = await compressImageIfNeeded(file, onStatus);
  const mediaUrl = await uploadFile(preparedFile, onStatus);

  return {
    mediaType,
    url: mediaUrl,
    mime: preparedFile.type || file.type,
    name: preparedFile.name || file.name,
    size: preparedFile.size || file.size,
  };
}
