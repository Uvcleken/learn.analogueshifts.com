/**
 * Converts a raw video share URL into an embeddable iframe src URL.
 * Supports YouTube, Vimeo, Loom, and Google Drive.
 */
export function getEmbedUrl(url: string): string {
  if (!url) return url;

  // YouTube: https://www.youtube.com/watch?v=ABC123 or https://youtu.be/ABC123
  const ytMatch = url.match(/(?:v=|youtu\.be\/)([\w-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;

  // Vimeo: https://vimeo.com/123456789
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;

  // Loom: https://www.loom.com/share/ABC123
  const loomMatch = url.match(/loom\.com\/share\/([\w]+)/);
  if (loomMatch) return `https://www.loom.com/embed/${loomMatch[1]}`;

  // Google Drive: https://drive.google.com/file/d/FILE_ID/view
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (driveMatch) return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;

  // Return original URL if no match
  return url;
}
