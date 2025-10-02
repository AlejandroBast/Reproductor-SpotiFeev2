// Minimal Audius API helper (client-side). This is a best-effort adapter that
// fetches tracks from the public discovery provider and normalizes them for the app.
// Note: depending on Audius CORS and API changes you may need to proxy requests.

export type AudiusTrack = {
  id: number | string;
  title?: string;
  user?: any;
  artwork?: any;
  [key: string]: any;
};

async function safeFetch(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Audius request failed: ${res.status}`);
  return res.json();
}

function pickArtwork(track: AudiusTrack): string {
  // Try a few fields commonly present in Audius responses. If none, return empty string.
  if (!track) return "";
  if (typeof track.artwork === "string" && track.artwork) return track.artwork;
  if (track.artwork && typeof track.artwork === "object") {
    // artwork may contain sizes
    if (track.artwork['150x150']) return track.artwork['150x150'];
    if (track.artwork['200x200']) return track.artwork['200x200'];
    if (track.artwork['sizes'] && track.artwork['sizes'][0]) return track.artwork['sizes'][0];
  }
  // older responses may include 'cover_art' or 'cover_art_sizes'
  if (track.cover_art) return track.cover_art;
  if (track.cover_art_sizes && track.cover_art_sizes['150x150']) return track.cover_art_sizes['150x150'];
  return "";
}

function pickStreamUrl(track: AudiusTrack): string {
  // Best-effort: Audius commonly exposes a stream endpoint. We'll try a few variants.
  if (!track) return "";
  if (track.stream_url) return track.stream_url;
  if (track.download && typeof track.download === 'string') return track.download;
  // fallback to discovery provider stream route
  if (track.id) return `https://discoveryprovider.audius.co/v1/tracks/${track.id}/stream`;
  return "";
}

export async function searchTracks(query: string, limit = 10) {
  const url = `https://discoveryprovider.audius.co/v1/tracks/search?query=${encodeURIComponent(query)}&limit=${limit}`;
  const json = await safeFetch(url);
  const list = json?.data || json || [];
  return list.map((t: AudiusTrack) => ({
    id: String(t.id),
    song: t.title || t.name || `Track ${t.id}`,
    artist: (t.user && (t.user.name || t.user.handle)) || (t.owner && t.owner.name) || "Unknown",
    src: pickStreamUrl(t),
    cover: pickArtwork(t) || (t.user && t.user.avatar) || "",
  }));
}

export async function getTrending(limit = 10) {
  const url = `https://discoveryprovider.audius.co/v1/tracks/trending?limit=${limit}`;
  const json = await safeFetch(url);
  const list = json?.data || json || [];
  return list.map((t: AudiusTrack) => ({
    id: String(t.id),
    song: t.title || t.name || `Track ${t.id}`,
    artist: (t.user && (t.user.name || t.user.handle)) || (t.owner && t.owner.name) || "Unknown",
    src: pickStreamUrl(t),
    cover: pickArtwork(t) || (t.user && t.user.avatar) || "",
  }));
}
