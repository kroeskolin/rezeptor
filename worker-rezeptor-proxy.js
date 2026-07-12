// Vollständiger Cloudflare-Worker "rezeptor-proxy" inkl. /reelinfo (Instagram).
// Diese Datei ist nur eine Referenz/Kopie — sie wird vom Rezeptor-App-Build NICHT
// verwendet. Inhalt 1:1 ins Worker-Dashboard/wrangler einspielen und deployen.

export default {
  async fetch(request, env) {
    const allowedOrigin = "https://kroeskolin.github.io";

    const corsHeaders = {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Zugangs-Schutz: nur Anfragen aus der App durchlassen. Browser senden bei
    // Cross-Origin-fetch immer einen Origin-Header — header-loses curl/Bots (die
    // typische Missbrauchsquelle) werden so abgewiesen. WICHTIG zusätzlich:
    // im Cloudflare-Dashboard ein Rate-Limit pro IP aktivieren (echte Kostenbremse).
    const origin = request.headers.get("Origin") || "";
    const referer = request.headers.get("Referer") || "";
    if (!origin.startsWith(allowedOrigin) && !referer.startsWith(allowedOrigin)) {
      return new Response("Forbidden", { status: 403, headers: corsHeaders });
    }

    const url = new URL(request.url);

    // YouTube video info proxy: GET /videoinfo?videoId=...
    if (request.method === "GET" && url.pathname === "/videoinfo") {
      const videoId = url.searchParams.get("videoId");
      if (!videoId) return new Response("Missing videoId", { status: 400 });

      try {
        const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${env.YOUTUBE_API_KEY}`;
        const apiResponse = await fetch(apiUrl);
        const data = await apiResponse.json();

        if (!apiResponse.ok) {
          return new Response(JSON.stringify({ error: data.error?.message || "YouTube API error" }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const snippet = data.items?.[0]?.snippet;
        if (!snippet) {
          return new Response(JSON.stringify({ error: "Video not found" }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({
          title: snippet.title || "",
          description: snippet.description || "",
          thumbnail: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || "",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // YouTube top comment proxy: GET /comment?videoId=...
    if (request.method === "GET" && url.pathname === "/comment") {
      const videoId = url.searchParams.get("videoId");
      if (!videoId) return new Response("Missing videoId", { status: 400 });

      try {
        const apiUrl = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&order=relevance&maxResults=5&textFormat=plainText&key=${env.YOUTUBE_API_KEY}`;
        const apiResponse = await fetch(apiUrl);
        const data = await apiResponse.json();

        if (!apiResponse.ok) {
          return new Response(JSON.stringify({ error: data.error?.message || "YouTube API error", comments: [] }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const comments = (data.items || []).map(item =>
          item.snippet.topLevelComment.snippet.textDisplay
        );

        return new Response(JSON.stringify({ comments }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message, comments: [] }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Instagram-Reel caption proxy: GET /reelinfo?code=...
    if (request.method === "GET" && url.pathname === "/reelinfo") {
      return handleReelInfo(url.searchParams.get("code"), corsHeaders);
    }

    // HTML-Fetch proxy: GET /fetch?url=...
    if (request.method === "GET" && url.pathname === "/fetch") {
      const targetUrl = url.searchParams.get("url");
      if (!targetUrl) return new Response("Missing url", { status: 400 });
      const pageResponse = await fetch(targetUrl, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      const text = await pageResponse.text();
      return new Response(text, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    }

    // Image proxy: GET /?url=...
    if (request.method === "GET" && url.searchParams.has("url")) {
      const imageUrl = url.searchParams.get("url");
      const imgResponse = await fetch(imageUrl, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      const contentType = imgResponse.headers.get("content-type") || "image/jpeg";
      return new Response(imgResponse.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": contentType,
        },
      });
    }

    // Gemini proxy: POST /
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const body = await request.json();
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    const data = await geminiResponse.json();
    return new Response(JSON.stringify(data), {
      status: geminiResponse.status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Instagram-Reel: Caption von der öffentlichen embed/captioned-Seite holen.
// Kein Login, kein API-Key, keine Secrets. (Getestet an Reel DYHbtVytpxS.)
// ─────────────────────────────────────────────────────────────────────────────
async function handleReelInfo(code, corsHeaders) {
  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
    });

  if (!code || !/^[A-Za-z0-9_-]+$/.test(code)) {
    return json({ caption: "", username: "", thumbnail: null, error: "bad-code" }, 400);
  }

  // WICHTIG: schlichtes "Mozilla/5.0". Ein zu spezifischer Browser-UA (Chrome…)
  // wird von Instagram für Datacenter-IPs mit LEERER Antwort geblockt. Die
  // bestehende /fetch-Route nutzt denselben schlichten UA und liefert zuverlässig.
  const UA = "Mozilla/5.0";

  // /reel/ zuerst, dann /p/ (Foto-Posts) — der Shortcode allein verrät den Typ nicht.
  const urls = [
    `https://www.instagram.com/reel/${code}/embed/captioned/`,
    `https://www.instagram.com/p/${code}/embed/captioned/`,
  ];

  let html = "";
  for (const u of urls) {
    try {
      const r = await fetch(u, { headers: { "User-Agent": UA } });
      if (!r.ok) continue;
      const bodyText = await r.text();
      if (bodyText.includes('class="Caption"') || bodyText.includes("og:description")) {
        html = bodyText;
        break;
      }
    } catch (_) {
      /* nächste URL versuchen */
    }
  }

  if (!html) return json({ caption: "", username: "", thumbnail: null, error: "no-caption" });

  let username = "";
  let caption = "";
  let source = "";

  const block = html.match(/<div class="Caption">([\s\S]*?)<\/div>/);
  if (block) {
    let inner = block[1];
    const u = inner.match(/<a class="CaptionUsername"[^>]*>([\s\S]*?)<\/a>/);
    if (u) {
      username = stripTags(u[1]).trim();
      inner = inner.slice(inner.indexOf("</a>") + 4);
    }
    caption = cleanCaption(inner);
    source = "embed";
  }

  // Fallback: gekürzte Caption aus og:description, falls das Markup mal anders ist.
  if (!caption) {
    const og = html.match(/<meta property="og:description" content="([^"]*)"/);
    if (og) {
      caption = decodeEntities(og[1]).trim();
      source = "og-description";
    }
  }

  // Thumbnail: das Post-Bild (nicht das kleine Profilbild).
  let thumbnail = null;
  let m = html.match(/<img class="EmbeddedMediaImage"[^>]*\ssrc="([^"]+)"/);
  if (!m) m = html.match(/<meta property="og:image" content="([^"]+)"/);
  if (m) thumbnail = decodeEntities(m[1]);

  // Abschließendes "View all N comments" / "View N comments" wegschneiden.
  caption = caption.replace(/\s*View (?:all )?[\d.,]+ comments?\s*$/i, "").trim();

  if (!caption) return json({ caption: "", username, thumbnail, error: "no-caption" });
  return json({ caption, username, thumbnail, source });
}

function stripTags(s) {
  return s.replace(/<[^>]+>/g, "");
}

function cleanCaption(s) {
  return decodeEntities(
    s.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")
  )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&"); // zuletzt, sonst Doppel-Decode
}
