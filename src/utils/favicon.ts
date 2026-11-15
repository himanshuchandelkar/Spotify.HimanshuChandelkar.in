export const DEFAULT_FAVICON_URL = '/favicon.svg';

const SAFE_DATA_IMAGE_RE =
  /^data:image\/(svg\+xml|png|webp|x-icon|vnd\.microsoft\.icon|jpeg|jpg|gif)(;[a-z0-9=+-]+)*(;base64)?,/i;

export function isDataImageUrl(url?: string): boolean {
  return Boolean(url && SAFE_DATA_IMAGE_RE.test(url.trim()));
}

export function sanitizeFaviconUrl(url?: string): string {
  const trimmed = (url || '').trim();
  if (!trimmed) return DEFAULT_FAVICON_URL;

  if (SAFE_DATA_IMAGE_RE.test(trimmed)) {
    return trimmed;
  }

  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('data:') ||
    lower.startsWith('javascript:') ||
    lower.startsWith('vbscript:')
  ) {
    return DEFAULT_FAVICON_URL;
  }

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/')
  ) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

export function detectFaviconMime(url: string): string | null {
  const trimmed = url.trim();
  if (SAFE_DATA_IMAGE_RE.test(trimmed)) {
    const match = trimmed.match(/^data:(image\/[a-z0-9.+-]+)/i);
    return match ? match[1].toLowerCase() : null;
  }

  const cleanPath = trimmed.toLowerCase().split('?')[0].split('#')[0];
  if (cleanPath.endsWith('.svg')) return 'image/svg+xml';
  if (cleanPath.endsWith('.png')) return 'image/png';
  if (cleanPath.endsWith('.webp')) return 'image/webp';
  if (cleanPath.endsWith('.ico')) return 'image/x-icon';
  return null;
}

export function describeFaviconDataUri(dataUri: string): string {
  const match = dataUri.match(/^data:image\/([a-z0-9.+-]+)/i);
  const subtype = match ? match[1].toUpperCase().replace('+XML', '').replace('X-ICON', 'ICO').replace('VND.MICROSOFT.ICON', 'ICO') : 'IMAGE';
  const approxBytes = Math.round((dataUri.length * 3) / 4);
  const sizeLabel =
    approxBytes >= 1024 ? `${Math.max(1, Math.round(approxBytes / 1024))} KB` : `${approxBytes} B`;
  return `${subtype} · ${sizeLabel}`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read the selected image file.'));
    reader.readAsDataURL(file);
  });
}

function downscaleRasterToPngDataUrl(sourceDataUrl: string, targetSize = 180): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = targetSize;
      canvas.height = targetSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas rendering unavailable in this browser.'));
        return;
      }

      ctx.clearRect(0, 0, targetSize, targetSize);
      const scale = Math.min(targetSize / img.width, targetSize / img.height);
      const drawW = Math.round(img.width * scale);
      const drawH = Math.round(img.height * scale);
      const offsetX = Math.round((targetSize - drawW) / 2);
      const offsetY = Math.round((targetSize - drawH) / 2);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Could not decode the uploaded image.'));
    img.src = sourceDataUrl;
  });
}

export async function encodeFaviconFile(file: File): Promise<string> {
  const maxUploadBytes = 2 * 1024 * 1024;
  if (file.size > maxUploadBytes) {
    throw new Error('Please choose an image smaller than 2 MB.');
  }

  const nameLower = file.name.toLowerCase();
  const ext = nameLower.includes('.') ? nameLower.split('.').pop() || '' : '';
  const mime = file.type.toLowerCase();

  const isSvg = mime === 'image/svg+xml' || ext === 'svg';
  const isIco =
    mime === 'image/x-icon' || mime === 'image/vnd.microsoft.icon' || ext === 'ico';
  const isPngOrWebp = mime === 'image/png' || mime === 'image/webp' || ext === 'png' || ext === 'webp';

  if (!isSvg && !isIco && !isPngOrWebp) {
    throw new Error('Supported formats: .svg, .png, .ico, or .webp.');
  }

  if (isSvg) {
    const rawText = await file.text();
    const cleanedSvg = rawText.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '').trim();
    if (!/<svg[\s>]/i.test(cleanedSvg)) {
      throw new Error('The selected SVG file does not contain a valid <svg> element.');
    }
    const bytes = new TextEncoder().encode(cleanedSvg);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    const encoded = `data:image/svg+xml;base64,${btoa(binary)}`;
    if (encoded.length > 350_000) {
      throw new Error('SVG favicon is too large to embed cleanly (keep under 250 KB).');
    }
    return encoded;
  }

  const rawDataUrl = await readFileAsDataUrl(file);

  if (isIco) {
    const normalizedIco = rawDataUrl.replace(
      /^data:application\/octet-stream;/i,
      'data:image/x-icon;'
    );
    if (!SAFE_DATA_IMAGE_RE.test(normalizedIco)) {
      throw new Error('Could not recognize this .ico file.');
    }
    if (normalizedIco.length > 400_000) {
      throw new Error('ICO file is too large to embed cleanly (keep under 300 KB).');
    }
    return normalizedIco;
  }

  // For PNG/WebP: keep compact files verbatim, downscale larger ones to crisp 180x180 PNG
  if (rawDataUrl.length <= 160_000 && SAFE_DATA_IMAGE_RE.test(rawDataUrl)) {
    return rawDataUrl;
  }

  const optimized = await downscaleRasterToPngDataUrl(rawDataUrl, 180);
  return optimized;
}
