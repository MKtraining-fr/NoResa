/**
 * Analyse un lien vidéo d'annonce et renvoie de quoi l'afficher dans l'app :
 *  - youtube / vimeo : URL d'embed (lecteur intégré, l'adhérent ne quitte pas l'app)
 *  - file            : lecture native <video> (lien .mp4/.webm/…)
 *  - link            : lien reconnu mais non embarquable → bouton « Ouvrir »
 *  - none            : pas de vidéo
 */
export type VideoKind = 'youtube' | 'vimeo' | 'file' | 'link' | 'none';

export interface VideoInfo {
  kind: VideoKind;
  embedUrl?: string; // youtube / vimeo
  fileUrl?: string;  // file / link
}

export function parseVideo(url?: string | null): VideoInfo {
  const u = (url || '').trim();
  if (!u) return { kind: 'none' };

  const yt = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/i);
  if (yt) return { kind: 'youtube', embedUrl: `https://www.youtube-nocookie.com/embed/${yt[1]}` };

  const vm = u.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vm) return { kind: 'vimeo', embedUrl: `https://player.vimeo.com/video/${vm[1]}` };

  if (/\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(u)) return { kind: 'file', fileUrl: u };

  if (/^https?:\/\//i.test(u)) return { kind: 'link', fileUrl: u };
  return { kind: 'none' };
}

/** Le lien est-il reconnu comme une vidéo affichable (embed ou fichier) ? */
export function isPlayableVideo(url?: string | null): boolean {
  const k = parseVideo(url).kind;
  return k === 'youtube' || k === 'vimeo' || k === 'file';
}
