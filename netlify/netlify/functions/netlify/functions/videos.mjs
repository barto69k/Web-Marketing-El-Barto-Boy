const LISTA = "UUW_JI4uNrKlgd94SLZFuriQ";
const CANAL = "UCW_JI4uNrKlgd94SLZFuriQ";

async function conClave(key) {
  const out = [];
  let page = "";
  do {
    const p = { part: "snippet,contentDetails", maxResults: "50", playlistId: LISTA, key };
    if (page) p.pageToken = page;
    const r = await fetch("https://www.googleapis.com/youtube/v3/playlistItems?" + new URLSearchParams(p));
    if (!r.ok) throw new Error("api " + r.status);
    const d = await r.json();
    for (const it of d.items || []) {
      const t = it.snippet?.title || "";
      if (t === "Private video" || t === "Deleted video") continue;
      out.push({ id: it.contentDetails.videoId, title: t, date: it.contentDetails.videoPublishedAt || it.snippet.publishedAt || "" });
    }
    page = d.nextPageToken || "";
  } while (page);
  return out;
}

async function conRss() {
  const r = await fetch("https://www.youtube.com/feeds/videos.xml?channel_id=" + CANAL);
  if (!r.ok) throw new Error("rss " + r.status);
  const x = await r.text();
  const dec = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
  return [...x.matchAll(/<entry>([\s\S]*?)<\/entry>/g)]
    .map((m) => ({
      id: /<yt:videoId>(.*?)<\/yt:videoId>/.exec(m[1])?.[1],
      title: dec(/<title>(.*?)<\/title>/.exec(m[1])?.[1] || ""),
      date: /<published>(.*?)<\/published>/.exec(m[1])?.[1] || "",
    }))
    .filter((v) => v.id);
}

export default async () => {
  const headers = { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=300" };
  const key = process.env.YOUTUBE_API_KEY;
  let videos = null, source = "rss";
  if (key) {
    try { videos = await conClave(key); source = "api"; } catch (e) { videos = null; }
  }
  if (!videos) {
    try { videos = await conRss(); source = "rss"; }
    catch (e) { return new Response(JSON.stringify({ error: "no disponible" }), { status: 502, headers: { "content-type": "application/json" } }); }
  }
  videos.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return new Response(JSON.stringify({ source, videos }), { headers });
};
