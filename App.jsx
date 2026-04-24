import { useState, useEffect, useCallback, useRef } from "react";
// ── TMDB Config ──
// Users set their own key on first launch
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p/w300";
// TMDB Watch-Provider IDs for Germany (DE)
const PLATFORMS = [
{ id: "netflix", name: "Netflix", color: "#E50914", icon: "N", tmdbId: 8 },
{ id: "prime", name: "Prime Video", color: "#00A8E1", icon: "P", tmdbId: 9 },
{ id: "disney", name: "Disney+", color: "#113CCF", icon: "D", tmdbId: 337 },
{ id: "paramount", name: "Paramount+", color: "#0064FF", icon: "P+", tmdbId: 531 },
{ id: "hbo", name: "WOW/HBO", color: "#B01EFF", icon: "H", tmdbId: 531 },
{ id: "ard", name: "ARD", color: "#004E8A", icon: "A", tmdbId: 219 },
{ id: "zdf", name: "ZDF", color: "#FA7D19", icon: "Z", tmdbId: 537 },
];
// Provider IDs per platform - some platforms have multiple IDs in TMDB
// Use | separated in API calls to cover all variants
const PROVIDER_MAP = {
netflix: [8],
prime: [9, 119],
disney: [337],
paramount: [531, 1853],
hbo: [8, 175, 384, 283, 1796], // WOW / Sky Go / Sky Ticket variants in DE
ard: [219, 386],
zdf: [537, 536],
};
const GENRES_TMDB = {
28: { name: "Action", emoji: " " },
12: { name: "Abenteuer", emoji: " " },
16: { name: "Animation", emoji: " " },
35: { name: "Komödie", emoji: " " },
80: { name: "Krimi", emoji: " " },
99: { name: "Doku", emoji: " " },
18: { name: "Drama", emoji: " " },
10751: { name: "Familie", emoji: " " },
14: { name: "Fantasy", emoji: " " },
36: { name: "Geschichte", emoji: " " },
27: { name: "Horror", emoji: " " },
10402: { name: "Musik", emoji: " " },
9648: { name: "Mystery", emoji: " " },
10749: { name: "Romantik", emoji: " " },
878: { name: "Sci-Fi", emoji: " " },
53: { name: "Thriller", emoji: " " },
10752: { name: "Krieg", emoji: " " },
37: { name: "Western", emoji: " " },
10759: { name: "Action & Abenteuer", emoji: " " },
10765: { name: "Sci-Fi & Fantasy", emoji: " " },
10768: { name: "Krieg & Politik", emoji: " " },
10766: { name: "Soap", emoji: " " },
10767: { name: "Talk", emoji: " " },
10764: { name: "Reality", emoji: " " },
10763: { name: "News", emoji: " " },
10762: { name: "Kids", emoji: " " },
};
const GENRE_PICKS = [
{ id: 28, name: "Action", emoji: " " },
{ id: 35, name: "Komödie", emoji: " " },
{ id: 18, name: "Drama", emoji: " " },
{ id: 878, name: "Sci-Fi", emoji: " " },
{ id: 27, name: "Horror", emoji: " " },
{ id: 10749, name: "Romantik", emoji: " " },
{ id: 99, name: "Doku", emoji: " " },
{ id: 80, name: "Krimi", emoji: " " },
{ id: 14, name: "Fantasy", emoji: " " },
{ id: 53, name: "Thriller", emoji: " " },
{ id: 16, name: "Animation", emoji: " " },
{ id: 36, name: "Geschichte", emoji: " " },
];
const MOODS = [
{ id: "chill", name: "Entspannt", emoji: " ", genres: [35, 10749, 99, 16] },
{ id: "intense", name: "Intensiv", emoji: " ", genres: [53, 27, 28, 80] },
{ id: "laugh", name: "Zum Lachen", emoji: " ", genres: [35, 16] },
{ id: "think", name: "Zum Nachdenken", emoji: " ", genres: [18, 99, 878, 36] },
{ id: "adventure", name: "Abenteuer", emoji: " ", genres: [28, 14, 878, 12] },
{ id: "cozy", name: "Gemütlich", emoji: " ", genres: [10749, 35, 16, 10751] },
];
// ── Storage ──
var _mem = {};
function sGet(k) { try { return JSON.parse(localStorage.getItem(k)); } catch(e) { try { retur
function sSet(k, v) { var s = JSON.stringify(v); try { localStorage.setItem(k, s); } catch(e){ _mem[k] = s; } }
function sDel(k) { try { localStorage.removeItem(k); } catch(e) { delete _mem[k]; } }
// ── TMDB API ──
function tmdbFetch(path, apiKey, params) {
var url = TMDB_BASE + path + "?api_key=" + apiKey + "&language=de-DE&region=DE";
if (params) {
Object.keys(params).forEach(function(k) {
url += "&" + k + "=" + encodeURIComponent(params[k]);
});
}
return fetch(url).then(function(r) { return r.json(); });
}
function discoverTitles(apiKey, type, providerIds, genreIds, page, sortBy) {
var mediaType = type === "serie" ? "tv" : "movie";
var params = {
with_watch_providers: providerIds.join("|"),
watch_region: "DE",
"with_watch_monetization_types": "flatrate",
sort_by: sortBy || "popularity.desc",
page: page || 1,
"vote_count.gte": 20,
};
if (genreIds && genreIds.length > 0) {
// If first element contains | it's already a pipe-separated string
var genreStr = genreIds[0].toString().indexOf("|") !== -1 ? genreIds[0] : genreIds.join("
params.with_genres = genreStr;
}
return tmdbFetch("/discover/" + mediaType, apiKey, params);
}
function getDetails(apiKey, mediaType, id) {
return tmdbFetch("/" + mediaType + "/" + id, apiKey, { append_to_response: "reviews,credits
}
function searchTitles(apiKey, query) {
return tmdbFetch("/search/multi", apiKey, { query: query });
}
function getSimilar(apiKey, mediaType, id) {
return tmdbFetch("/" + mediaType + "/" + id + "/similar", apiKey, {});
}
// ── Components ──
function ApiKeyScreen(props) {
var onSubmit = props.onSubmit;
var _v = useState(""); var val = _v[0]; var setVal = _v[1];
var _e = useState(""); var err = _e[0]; var setErr = _e[1];
var _l = useState(false); var loading = _l[0]; var setLoading = _l[1];
function handleSubmit() {
if (!val.trim()) return;
setLoading(true);
setErr("");
tmdbFetch("/configuration", val.trim(), {}).then(function(data) {
setLoading(false);
if (data && data.images) {
onSubmit(val.trim());
} else {
setErr("Ungültiger API-Key. Bitte überprüfe deinen Key.");
}
}).catch(function() {
setLoading(false);
setErr("Verbindungsfehler. Bitte versuche es erneut.");
});
}
return (
<div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#e8e6e1", fontFamily: "'
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=In
<div style={{ width: "100%", maxWidth: 480, textAlign: "center" }}>
<h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 36, margin: "0 <p style={{ color: "#666", fontSize: 14, marginBottom: 32 }}>Dein persönlicher 0 8px"
Stream
<div style={{ background: "#12121f", borderRadius: 18, padding: 24, border: "1px soli
<h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>TMDB API-Key eingebe
<p style={{ fontSize: 12, color: "#666", lineHeight: 1.6, marginBottom: 16 }}>
Um den gesamten Streaming-Katalog zu durchsuchen, benötigst du einen kostenlosen
</p>
<div style={{ background: "#0d0d18", borderRadius: 12, padding: 14, marginBottom: 1
<p style={{ fontSize: 12, color: "#888", lineHeight: 1.8, margin: 0 }}>
1. Gehe auf <span style={{ color: "#B01EFF", fontWeight: 700 }}>themoviedb.org<
2. Erstelle einen kostenlosen Account<br />
3. Settings → API → Key beantragen<br />
4. Kopiere den API Key (v3 auth) hierher
</p>
</div>
<input
type="text"
value={val}
onChange={function(e) { setVal(e.target.value); }}
onKeyDown={function(e) { if (e.key === "Enter") handleSubmit(); }}
placeholder="Dein TMDB API-Key..."
style={{
width: "100%", padding: "14px 16px", borderRadius: 12,
background: "#0d0d18", border: "1px solid #2a2a3e", color: "#e8e6e1",
fontFamily: "'DM Sans'", fontSize: 14, outline: "none", marginBottom: 12,
}}
/>
{err ? <p style={{ fontSize: 12, color: "#ef4444", marginBottom: 12 }}>{err}</p> :
<button onClick={handleSubmit} disabled={loading || !val.trim()} style={{
width: "100%", padding: "14px", borderRadius: 12,
background: val.trim() ? "linear-gradient(135deg, #E50914, #B01EFF)" : "#1a1a2e",
border: "none", color: val.trim() ? "#fff" : "#444",
cursor: val.trim() ? "pointer" : "default",
fontFamily: "'DM Sans'", fontWeight: 700, fontSize: 15,
boxShadow: val.trim() ? "0 4px 20px #E5091444" : "none",
}}>
</button>
</div>
</div>
</div>
{loading ? "Überprüfe..." : "Verbinden →"}
);
}
function OnboardingQuiz(props) {
var onComplete = props.onComplete;
var _s = useState(0); var step = _s[0]; var setStep = _s[1];
var _p = useState([]); var plats = _p[0]; var setPlats = _p[1];
var _g = useState([]); var gens = _g[0]; var setGens = _g[1];
var _m = useState(null); var mood = _m[0]; var setMood = _m[1];
function toggle(arr, setArr, id) {
if (arr.includes(id)) { setArr(arr.filter(function(x) { return x !== id; })); }
else { setArr(arr.concat([id])); }
}
function canNext() {
if (step === 0) return plats.length > 0;
if (step === 1) return gens.length >= 2;
if (step === 2) return mood !== null;
return true;
}
function finish() {
var genreScores = {};
gens.forEach(function(g) { genreScores[g] = 3; });
onComplete({
platforms: plats,
genres: genreScores,
currentMood: mood,
liked: [],
disliked: [],
watched: [],
});
}
return (
<div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#e8e6e1", fontFamily: "'
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=In
<div style={{ width: "100%", maxWidth: 600 }}>
<div style={{ display: "flex", gap: 6, marginBottom: 36 }}>
{[0, 1, 2].map(function(i) {
return <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <
})}
</div>
{step === 0 ? (
<div style={{ animation: "fadeUp 0.4s" }}>
<h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 34, margin: "0 0
<p style={{ color: "#666", fontSize: 14, marginBottom: 28 }}>Welche Streaming-Die
<div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
{PLATFORMS.map(function(p) {
var sel = plats.includes(p.id);
return (
<button key={p.id} onClick={function() { toggle(plats, setPlats, p.id); }}
background: sel ? p.color + "22" : "#12121f",
border: "2px solid " + (sel ? p.color : "#1a1a2e"),
borderRadius: 14, padding: "14px 20px", cursor: "pointer",
color: sel ? p.color : "#555",
fontFamily: "'DM Sans'", fontWeight: 700, fontSize: 14,
display: "flex", alignItems: "center", gap: 8,
boxShadow: sel ? "0 0 24px " + p.color + "22" : "none",
}}>
<span style={{ fontSize: 20, fontWeight: 900 }}>{p.icon}</span>{p.name}
</button>
);
})}
</div>
</div>
) : null}
{step === 1 ? (
<div style={{ animation: "fadeUp 0.4s" }}>
<h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 28, marginBottom:
<p style={{ color: "#666", fontSize: 14, marginBottom: 24 }}>Wähle mindestens 2 G
<div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
{GENRE_PICKS.map(function(g) {
var sel = gens.includes(g.id);
return (
<button key={g.id} onClick={function() { toggle(gens, setGens, g.id); }} st
background: sel ? "#1e1e3a" : "#12121f",
border: "2px solid " + (sel ? "#B01EFF" : "#1a1a2e"),
borderRadius: 14, padding: "14px 8px", cursor: "pointer",
color: sel ? "#fff" : "#666", fontFamily: "'DM Sans'", fontWeight: 600, f
display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
}}>
<span style={{ fontSize: 22 }}>{g.emoji}</span>{g.name}
</button>
);
})}
</div>
</div>
) : null}
{step === 2 ? (
<div style={{ animation: "fadeUp 0.4s" }}>
<h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 28, marginBottom:
<p style={{ color: "#666", fontSize: 14, marginBottom: 24 }}>Wonach ist dir gerad
<div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
{MOODS.map(function(m) {
var sel = mood === m.id;
return (
<button key={m.id} onClick={function() { setMood(m.id); }} style={{
background: sel ? "linear-gradient(135deg, #E5091418, #B01EFF18)" : "#121
border: "2px solid " + (sel ? "#B01EFF" : "#1a1a2e"),
borderRadius: 16, padding: "18px 14px", cursor: "pointer",
color: sel ? "#fff" : "#666", fontFamily: "'DM Sans'",
display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
}}>
<span style={{ fontSize: 28 }}>{m.emoji}</span>
<span style={{ fontWeight: 700, fontSize: 14 }}>{m.name}</span>
</button>
);
})}
</div>
</div>
) : null}
<div style={{ display: "flex", justifyContent: "space-between", marginTop: 28 }}>
{step > 0 ? <button onClick={function() { setStep(step - 1); }} style={{ background
<button onClick={function() { if (step < 2) setStep(step + 1); else finish(); }} di
background: canNext() ? "linear-gradient(135deg, #E50914, #B01EFF)" : "#1a1a2e",
border: "none", borderRadius: 12, padding: "11px 28px", color: canNext() ? "#fff"
cursor: canNext() ? "pointer" : "default", fontFamily: "'DM Sans'", fontWeight: 7
boxShadow: canNext() ? "0 4px 20px #E5091444" : "none",
}}>{step < 2 ? "Weiter →" : "Los geht's! "}</button>
</div>
</div>
</div>
<style>{"@keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opa
);
}
// ── Title Card with TMDB data ──
function TitleCard(props) {
var item = props.item;
var profile = props.profile;
var apiKey = props.apiKey;
var onLike = props.onLike;
var onDislike = props.onDislike;
var onWatched = props.onWatched;
var onSimilar = props.onSimilar;
var rank = props.rank;
var pl = props.platform;
var isLiked = profile.liked.includes(item.id);
var isWatched = profile.watched && profile.watched.some(function(w) { return w.id === item.
var _exp = useState(false); var expanded = _exp[0]; var setExpanded = _exp[1];
var _det = useState(null); var details = _det[0]; var setDetails = _det[1];
var _ld = useState(false); var loadingDet = _ld[0]; var setLoadingDet = _ld[1];
var title = item.title || item.name || "Unbekannt";
var year = (item.release_date || item.first_air_date || "").substring(0, 4);
var score = item.vote_average ? Math.round(item.vote_average * 10) / 10 : 0;
var scoreColor = score >= 8.0 ? "#4ade80" : score >= 7.0 ? "#fbbf24" : score >= 5.0 ? "#fb9
var mediaType = item.media_type || (item.first_air_date ? "tv" : "movie");
var genreIds = item.genre_ids || (item.genres ? item.genres.map(function(g) { return g.id;
function handleExpand() {
if (expanded) { setExpanded(false); return; }
setExpanded(true);
if (!details && apiKey) {
setLoadingDet(true);
getDetails(apiKey, mediaType, item.id).then(function(data) {
setDetails(data);
setLoadingDet(false);
}).catch(function() { setLoadingDet(false); });
}
}
var poster = item.poster_path ? TMDB_IMG + item.poster_path : null;
return (
<div style={{
background: "#12121f", borderRadius: 18, overflow: "hidden",
border: expanded ? "1px solid " + (pl ? pl.color : "#B01EFF") + "33" : "1px solid #1a1a
boxShadow: expanded ? "0 8px 32px #00000066" : "0 2px 8px #00000022",
}}>
<div onClick={handleExpand} style={{ padding: "12px 14px", display: "flex", alignItems:
{rank !== undefined ? (
<span style={{ width: 24, height: 24, borderRadius: 7, flexShrink: 0, background: r
) : null}
{poster ? (
<img src={poster} alt="" style={{ width: 44, height: 66, borderRadius: 10, objectFi
) : (
<div style={{ width: 44, height: 66, borderRadius: 10, flexShrink: 0, background: "
)}
}}>
<div style={{ flex: 1, minWidth: 0 }}>
<div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", over
{isLiked ? <span style={{ fontSize: 10 }}> </span> : null}
</div>
<div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap", marg
<span style={{ fontSize: 10, color: "#888", background: "#1a1a2e", padding: "2px
{mediaType === "tv" ? "Serie" : "Film"}
</span>
{year ? <span style={{ fontSize: 10, color: "#555" }}>{year}</span> : null}
{pl ? <span style={{ fontSize: 10, color: pl.color, fontWeight: 700 }}>{pl.icon}<
{genreIds.slice(0, 2).map(function(gid) {
var g = GENRES_TMDB[gid];
return g ? <span key={gid} style={{ fontSize: 10 }}>{g.emoji}</span> : null;
})}
</div>
<div style={{ display: "flex", alignItems: "center", gap: 4 }}>
<span style={{ color: "#f5c518", fontSize: 10, fontWeight: 900 }}>TMDB</span>
<span style={{ color: scoreColor, fontSize: 13, fontWeight: 900 }}>{score}</span>
{item.vote_count ? <span style={{ fontSize: 9, color: "#444" }}>({item.vote_count
</div>
</div>
<div style={{ color: "#2a2a3e", fontSize: 14, flexShrink: 0, transition: "transform 0
</div>
{expanded ? (
<div style={{ padding: "0 14px 14px", animation: "fadeUp 0.3s ease" }}>
{/* Score bar */}
<div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
<div style={{ background: scoreColor + "15", border: "1px solid " + scoreColor +
<span style={{ color: "#f5c518", fontSize: 12, fontWeight: 900 }}>TMDB</span>
<span style={{ color: scoreColor, fontSize: 16, fontWeight: 900 }}>{score}</spa
<span style={{ fontSize: 11, color: "#666" }}>/10</span>
</div>
{item.vote_count ? <span style={{ fontSize: 10, color: "#555" }}>{item.vote_count
</div>
<div style={{ height: 5, borderRadius: 3, background: "#1a1a2e", overflow: "hidden"
<div style={{ height: "100%", borderRadius: 3, width: Math.min(score * 10, 100) +
</div>
{/* Description */}
<p style={{ fontSize: 13, color: "#888", lineHeight: 1.6, margin: "0 0 12px" }}>{it
{/* Genres */}
<div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
{genreIds.map(function(gid) {
var g = GENRES_TMDB[gid];
return g ? (
<span key={gid} style={{ fontSize: 11, color: "#666", background: "#0d0d18",
{g.emoji} {g.name}
</span>
) : null;
})}
</div>
{/* Reviews from TMDB */}
{loadingDet ? <p style={{ fontSize: 12, color: "#555" }}>Lade Rezensionen...</p> :
{details && details.reviews && details.reviews.results && details.reviews.results.l
<div style={{ marginBottom: 12 }}>
<div style={{ fontSize: 11, color: "#555", fontWeight: 700, textTransform: "upp
{details.reviews.results.slice(0, 3).map(function(rev, i) {
var rating = rev.author_details && rev.author_details.rating;
var sentiment = rating ? (rating >= 7 ? "pos" : rating >= 5 ? "mix" : "neg")
var bc = sentiment === "pos" ? "#4ade80" : sentiment === "neg" ? "#ef4444" :
var content = rev.content.length > 200 ? rev.content.substring(0, 200) + "...
return (
<div key={i} style={{ background: "#0d0d18", borderRadius: 12, padding: "10
<div style={{ display: "flex", justifyContent: "space-between", alignItem
<span style={{ fontSize: 11, fontWeight: 700, color: "#777" }}>{rev.aut
{rating ? <span style={{ fontSize: 9, padding: "2px 7px", borderRadius:
</div>
<p style={{ fontSize: 12, color: "#999", lineHeight: 1.5, margin: 0 }}>{c
</div>
);
})}
</div>
) : null}
{details && details.reviews && details.reviews.results && details.reviews.results.l
<p style={{ fontSize: 12, color: "#444", marginBottom: 12 }}>Noch keine Rezension
) : null}
{/* Cast */}
{details && details.credits && details.credits.cast && details.credits.cast.length
<div style={{ marginBottom: 12 }}>
<span style={{ fontSize: 11, color: "#555", fontWeight: 700 }}> <span style={{ fontSize: 12, color: "#888" }}>
Cast: </span>
{details.credits.cast.slice(0, 5).map(function(c) { return c.name; }).join(",
</span>
</div>
) : null}
{/* Actions */}
<div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
<button onClick={function(e) { e.stopPropagation(); onLike(item.id); }} style={{
flex: 1, padding: "10px", borderRadius: 12,
background: isLiked ? "#E5091422" : "#0d0d18",
border: isLiked ? "1px solid #E5091455" : "1px solid #1a1a2e",
color: isLiked ? "#E50914" : "#666", cursor: "pointer",
fontFamily: "'DM Sans'", fontWeight: 700, fontSize: 12, minWidth: 0,
}}>{isLiked ? " Gefällt" : " Merken"}</button>
{onWatched ? (
<button onClick={function(e) { e.stopPropagation(); onWatched(item); }} style={
flex: 1, padding: "10px", borderRadius: 12,
background: isWatched ? "#4ade8022" : "#0d0d18",
border: isWatched ? "1px solid #4ade8055" : "1px solid #1a1a2e",
color: isWatched ? "#4ade80" : "#666", cursor: "pointer",
fontFamily: "'DM Sans'", fontWeight: 700, fontSize: 12, minWidth: 0,
}}>{isWatched ? " Gesehen" : " Gesehen"}</button>
) : null}
<button onClick={function(e) { e.stopPropagation(); onDislike(item.id); }} padding: "10px 14px", borderRadius: 12, background: "#0d0d18",
border: "1px solid #1a1a2e", color: "#444", cursor: "pointer", fontSize: }}> </button>
</div>
{onSimilar ? (
<button onClick={function(e) { e.stopPropagation(); onSimilar(item); }} style={{
width: "100%", marginTop: 8, padding: "10px", borderRadius: 12,
background: "linear-gradient(135deg, #E5091411, #B01EFF11)",
border: "1px solid #B01EFF33",
color: "#B01EFF", cursor: "pointer",
fontFamily: "'DM Sans'", fontWeight: 700, fontSize: 12,
}}> display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
Mehr davon — ähnliche Titel finden</button>
) : null}
</div>
) : null}
</div>
style=
12,
);
}
// ── Main App ──
function MainApp(props) {
var apiKey = props.apiKey;
var initProfile = props.profile;
var onReset = props.onReset;
var _p = useState(initProfile); var profile = _p[0]; var setProfile = _p[1];
var _t = useState("foryou"); var tab = _t[0]; var setTab = _t[1];
var _m = useState(initProfile.currentMood); var mood = _m[0]; var setMood = _m[1];
var _fp = useState(null); var filterPlatform = _fp[0]; var setFP = _fp[1];
var _ss = useState(false); var showSettings = _ss[0]; var setSS = _ss[1];
var _q = useState(""); var searchQuery = _q[0]; var setSearchQuery = _q[1];
// Data states
var _forYou = useState([]); var forYouItems = _forYou[0]; var setForYou = _forYou[1];
var _series = useState([]); var seriesItems = _series[0]; var setSeries = _series[1];
var _films = useState([]); var filmsItems = _films[0]; var setFilms = _films[1];
var _top = useState([]); var topItems = _top[0]; var setTop = _top[1];
var _search = useState([]); var searchResults = _search[0]; var setSearchResults = _search[
var _loading = useState(false); var loading = _loading[0]; var setLoading = _loading[1];
var _searching = useState(false); var searching = _searching[0]; var setSearching = _search
var _similar = useState([]); var similarItems = _similar[0]; var setSimilar = _similar[1];
var _simTitle = useState(""); var similarTitle = _simTitle[0]; var setSimilarTitle = _simTi
var _simLoading = useState(false); var simLoading = _simLoading[0]; var setSimLoading = _si
var _histSearch = useState(""); var histSearch = _histSearch[0]; var setHistSearch = _histS
var _histResults = useState([]); var histResults = _histResults[0]; var setHistResults = _h
var _histSearching = useState(false); var histSearching = _histSearching[0]; var setHistSea
var searchTimeout = useRef(null);
var histTimeout = useRef(null);
// Ensure profile has watched array
if (!profile.watched) { profile.watched = []; }
function getProviderIds(platformFilter) {
var ids = [];
if (platformFilter) {
ids = PROVIDER_MAP[platformFilter] || [];
} else {
profile.platforms.forEach(function(pid) {
var pids = PROVIDER_MAP[pid] || [];
pids.forEach(function(id) {
if (ids.indexOf(id) === -1) ids.push(id);
});
});
}
return ids;
}
function getMoodGenres() {
if (!mood) return [];
var m = MOODS.find(function(x) { return x.id === mood; });
return m ? m.genres : [];
}
function getProfileGenres() {
// Combine onboarding genres with learned genres from watch history
var genreCounts = Object.assign({}, profile.genres || {});
// Boost genres from watched titles
if (profile.watched) {
profile.watched.forEach(function(w) {
if (w.genre_ids) {
w.genre_ids.forEach(function(gid) {
genreCounts[gid] = (genreCounts[gid] || 0) + 2;
});
}
});
}
var entries = Object.entries(genreCounts).filter(function(e) { return e[1] > 0; }).sort(f
return entries.slice(0, 4).map(function(e) { return parseInt(e[0]); });
}
function loadData() {
setLoading(true);
var providerIds = getProviderIds(filterPlatform);
if (providerIds.length === 0) { setLoading(false); return; }
var moodGenres = getMoodGenres();
var profileGenres = getProfileGenres();
var combinedGenres = moodGenres.concat(profileGenres);
var uniqueGenres = combinedGenres.filter(function(g, i) { return combinedGenres.indexOf(g
// Use OR logic (pipe) for genres so results aren't too narrow
var genreParam = uniqueGenres.length > 0 ? uniqueGenres.join("|") : "";
var promises = [
// For You: based on mood + profile genres (OR logic)
discoverTitles(apiKey, "serie", providerIds, genreParam ? [genreParam] : [], 1, "popula
discoverTitles(apiKey, "film", providerIds, genreParam ? [genreParam] : [], 1, "popular
// Top rated series
discoverTitles(apiKey, "serie", providerIds, [], 1, "vote_average.desc"),
// Top rated films
discoverTitles(apiKey, "film", providerIds, [], 1, "vote_average.desc"),
// Popular series (all genres - fallback)
discoverTitles(apiKey, "serie", providerIds, [], 1, "popularity.desc"),
// Popular films (all genres - fallback)
discoverTitles(apiKey, "film", providerIds, [], 1, "popularity.desc"),
];
Promise.all(promises).then(function(results) {
var forYouSeries = (results[0] && results[0].results) || [];
var forYouFilms = (results[1] && results[1].results) || [];
var topSeries = (results[2] && results[2].results) || [];
var topFilms = (results[3] && results[3].results) || [];
var popSeries = (results[4] && results[4].results) || [];
var popFilms = (results[5] && results[5].results) || [];
// Tag media types
forYouSeries.forEach(function(i) { i.media_type = "tv"; });
forYouFilms.forEach(function(i) { i.media_type = "movie"; });
topSeries.forEach(function(i) { i.media_type = "tv"; });
topFilms.forEach(function(i) { i.media_type = "movie"; });
popSeries.forEach(function(i) { i.media_type = "tv"; });
popFilms.forEach(function(i) { i.media_type = "movie"; });
// Deduplicate helper
function dedup(arr) {
var seen = {};
return arr.filter(function(i) {
if (seen[i.id]) return false;
seen[i.id] = true;
return true;
});
}
// For you: genre-based first, then fill with popular as fallback
var forYouAll = dedup(forYouSeries.concat(forYouFilms).concat(popSeries).concat(popFilm
forYouAll = forYouAll.filter(function(i) { return !profile.disliked.includes(i.id); });
setForYou(forYouAll.slice(0, 20));
setSeries(dedup(popSeries).filter(function(i) { return !profile.disliked.includes(i.id)
setFilms(dedup(popFilms).filter(function(i) { return !profile.disliked.includes(i.id);
var topAll = dedup(topSeries.concat(topFilms));
topAll.sort(function(a, b) { return (b.vote_average || 0) - (a.vote_average || 0); });
setTop(topAll.filter(function(i) { return !profile.disliked.includes(i.id); }).slice(0,
setLoading(false);
}).catch(function(err) {
console.error("TMDB error:", err);
setLoading(false);
});
}
useEffect(function() { loadData(); }, [mood, filterPlatform, profile.platforms.join(","), (
function handleSearch(q) {
setSearchQuery(q);
if (searchTimeout.current) clearTimeout(searchTimeout.current);
if (!q.trim()) { setSearchResults([]); return; }
searchTimeout.current = setTimeout(function() {
setSearching(true);
searchTitles(apiKey, q).then(function(data) {
var results = (data && data.results) || [];
results = results.filter(function(r) { return r.media_type === "movie" || r.media_typ
setSearchResults(results.slice(0, 15));
setSearching(false);
}).catch(function() { setSearching(false); });
}, 400);
}
function updateProfile(fn) {
setProfile(function(prev) {
var next = fn(prev);
sSet("sf_profile", next);
return next;
});
}
function handleLike(id) {
updateProfile(function(p) {
var liked = p.liked.includes(id) ? p.liked.filter(function(x) { return x !== id; var disliked = p.disliked.filter(function(x) { return x !== id; });
return Object.assign({}, p, { liked: liked, disliked: disliked });
}) : p
});
}
function handleDislike(id) {
updateProfile(function(p) {
var disliked = p.disliked.includes(id) ? p.disliked.filter(function(x) { return x !== i
var liked = p.liked.filter(function(x) { return x !== id; });
return Object.assign({}, p, { liked: liked, disliked: disliked });
});
}
function handleWatched(item) {
updateProfile(function(p) {
var watched = p.watched || [];
var exists = watched.some(function(w) { return w.id === item.id; });
if (exists) {
// Remove from watched
watched = watched.filter(function(w) { return w.id !== item.id; });
} else {
// Add to watched (keep last 10)
var entry = {
id: item.id,
title: item.title || item.name || "Unbekannt",
poster_path: item.poster_path,
genre_ids: item.genre_ids || (item.genres ? item.genres.map(function(g) { return g.
vote_average: item.vote_average,
media_type: item.media_type || (item.first_air_date ? "tv" : "movie"),
addedAt: Date.now(),
};
watched = [entry].concat(watched).slice(0, 10);
}
});
return Object.assign({}, p, { watched: watched });
}
function handleSimilar(item) {
var mediaType = item.media_type || (item.first_air_date ? "tv" : "movie");
var title = item.title || item.name || "Titel";
setSimilarTitle(title);
setSimLoading(true);
setSimilar([]);
setTab("similar");
getSimilar(apiKey, mediaType, item.id).then(function(data) {
var results = (data && data.results) || [];
results.forEach(function(r) { r.media_type = mediaType; });
setSimilar(results.filter(function(r) { return !profile.disliked.includes(r.id); setSimLoading(false);
}).catch(function() { setSimLoading(false); });
}).sli
}
function handleHistSearch(q) {
setHistSearch(q);
if (histTimeout.current) clearTimeout(histTimeout.current);
if (!q.trim()) { setHistResults([]); return; }
histTimeout.current = setTimeout(function() {
setHistSearching(true);
searchTitles(apiKey, q).then(function(data) {
var results = (data && data.results) || [];
results = results.filter(function(r) { return r.media_type === "movie" || r.media_typ
setHistResults(results.slice(0, 8));
setHistSearching(false);
}).catch(function() { setHistSearching(false); });
}, 400);
}
function changeMood(m) {
setMood(m);
updateProfile(function(p) { return Object.assign({}, p, { currentMood: m }); });
}
function getPlatformForItem(item) {
// We don't know the exact provider from discover, so return the filtered one or first se
if (filterPlatform) return PLATFORMS.find(function(p) { return p.id === filterPlatform; }
return PLATFORMS.find(function(p) { return profile.platforms.includes(p.id); });
}
var tabs = [
{ id: "foryou", label: "Für dich", icon: " " },
{ id: "series", label: "Serien", icon: " " },
{ id: "films", label: "Filme", icon: " " },
{ id: "history", label: "Verlauf", icon: " " },
{ id: "search", label: "Suche", icon: " " },
];
function renderList(items, showRank) {
if (loading) {
return (
<div style={{ textAlign: "center", padding: 40 }}>
<div style={{ color: "#B01EFF", fontSize: 24, marginBottom: 8 }}> <p style={{ color: "#555", fontSize: 13 }}>Lade Katalog...</p>
</div>
</div>
);
if (items.length === 0) {
return <p style={{ color: "#444", fontSize: 13, textAlign: "center", padding: 20 }
}
}}>Kei
return (
<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
{items.map(function(item, idx) {
return <TitleCard key={item.id} item={item} profile={profile} apiKey={apiKey} onLik
})}
</div>
);
}
return (
<div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#e8e6e1", fontFamily: "'
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=In
{/* Header */}
<div style={{ padding: "16px 18px 0", display: "flex", justifyContent: "space-between",
<h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 26, margin: 0, <button onClick={function() { setSS(!showSettings); }} style={{ background: "#12121f"
</div>
backgr
{showSettings ? (
<div style={{ margin: "10px 18px", padding: 14, background: "#12121f", borderRadius:
<p style={{ fontSize: 12, color: "#777", margin: "0 0 10px" }}>Profil und Daten zur
<button onClick={onReset} style={{ background: "#E5091418", border: "1px solid #E50
</div>
) : null}
{/* Mood selector */}
{tab !== "search" && tab !== "history" && tab !== "similar" ? (
<div style={{ padding: "14px 18px 0" }}>
<div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 4 }}>
{MOODS.map(function(m) {
return (
<button key={m.id} onClick={function() { changeMood(m.id); }} style={{
background: mood === m.id ? "linear-gradient(135deg, #E5091428, #B01EFF28)"
border: mood === m.id ? "1px solid #B01EFF55" : "1px solid #1a1a2e",
borderRadius: 11, padding: "7px 13px", cursor: "pointer",
color: mood === m.id ? "#fff" : "#555",
fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap
}}>{m.emoji + " " + m.name}</button>
);
})}
</div>
</div>
) : null}
{/* Platform filter */}
{tab !== "search" && tab !== "history" && tab !== "similar" ? (
<div style={{ padding: "10px 18px 0" }}>
<div style={{ display: "flex", gap: 5, overflowX: "auto" }}>
<button onClick={function() { setFP(null); }} style={{
background: !filterPlatform ? "#1e1e3a" : "transparent",
border: !filterPlatform ? "1px solid #B01EFF33" : "1px solid transparent",
borderRadius: 8, padding: "5px 10px", cursor: "pointer",
color: !filterPlatform ? "#ccc" : "#444",
fontFamily: "'DM Sans'", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", f
}}>Alle</button>
{PLATFORMS.filter(function(p) { return profile.platforms.includes(p.id); }).map(f
return (
? null
<button key={p.id} onClick={function() { setFP(p.id === filterPlatform background: filterPlatform === p.id ? p.color + "22" : "transparent",
border: filterPlatform === p.id ? "1px solid " + p.color + "55" : "1px soli
borderRadius: 8, padding: "5px 10px", cursor: "pointer",
color: filterPlatform === p.id ? p.color : "#444",
fontFamily: "'DM Sans'", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap
}}>{p.icon + " " + p.name}</button>
);
})}
</div>
</div>
) : null}
{/* Content */}
<div style={{ padding: "16px 18px" }}>
{tab === "foryou" ? (
<div>
<h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}> {renderList(forYouItems, false)}
</div>
) : null}
Empfohlen für
{tab === "series" ? (
<div>
<h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}> {renderList(seriesItems, false)}
</div>
) : null}
Beliebte Serie
{tab === "films" ? (
<div>
<h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}> {renderList(filmsItems, false)}
</div>
) : null}
Beliebte Filme
{tab === "history" ? (
<div>
<h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}> Zuletzt geschau
<p style={{ fontSize: 12, color: "#555", marginBottom: 14 }}>Suche Titel und mark
{/* Search to add */}
<input
type="text"
value={histSearch}
onChange={function(e) { handleHistSearch(e.target.value); }}
placeholder="Titel suchen und als gesehen markieren..."
style={{
width: "100%", padding: "12px 16px", borderRadius: 14,
background: "#12121f", border: "1px solid #2a2a3e", color: "#e8e6e1",
fontFamily: "'DM Sans'", fontSize: 14, outline: "none", marginBottom: 12,
}}
/>
{histSearching ? <p style={{ color: "#555", fontSize: 12, textAlign: "center" }}>
{histResults.length > 0 ? (
<div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 2
{histResults.map(function(item) {
return <TitleCard key={item.id} item={item} profile={profile} apiKey={apiKe
})}
</div>
) : null}
{/* Watched list */}
{profile.watched && profile.watched.length > 0 ? (
<div>
<div style={{ fontSize: 12, color: "#555", fontWeight: 700, textTransform: "u
Dein Verlauf ({profile.watched.length}/10)
</div>
<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
{profile.watched.map(function(w) {
var poster = w.poster_path ? TMDB_IMG + w.poster_path : null;
return (
<div key={w.id} style={{ background: "#12121f", borderRadius: 14, paddi
{poster ? (
<img src={poster} alt="" style={{ width: 36, height: 54, borderRadi
) : (
<div style={{ width: 36, height: 54, borderRadius: 8, background: "
)}
<div style={{ flex: 1, minWidth: 0 }}>
<div style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap",
<div style={{ display: "flex", gap: 4, alignItems: "center", margin
<span style={{ fontSize: 10, color: "#f5c518", fontWeight: 900 }}
<span style={{ fontSize: 12, color: w.vote_average >= 7.5 ? "#4ad
<span style={{ fontSize: 10, color: "#444" }}>{w.media_type === "
</div>
</div>
<div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
<button onClick={function() { handleSimilar(w); }} style={{
padding: "8px 12px", borderRadius: 10,
background: "#B01EFF11", border: "1px solid #B01EFF33",
color: "#B01EFF", cursor: "pointer", fontSize: 11, fontFamily: "'
}}> Ähnlich</button>
<button onClick={function() { handleWatched(w); }} style={{
padding: "8px", borderRadius: 10,
background: "#0d0d18", border: "1px solid #1a1a2e",
color: "#555", cursor: "pointer", fontSize: 12,
}}>✕</button>
</div>
</div>
);
})}
</div>
{/* Genre analysis */}
{(function() {
var genreCounts = {};
profile.watched.forEach(function(w) {
if (w.genre_ids) {
w.genre_ids.forEach(function(gid) {
genreCounts[gid] = (genreCounts[gid] || 0) + 1;
});
}
});
var sorted = Object.entries(genreCounts).sort(function(a, b) { return b[1]
if (sorted.length === 0) return null;
var maxC = sorted[0][1];
return (
<div style={{ marginTop: 18, background: "#12121f", borderRadius: 14, pad
<div style={{ fontSize: 12, color: "#555", fontWeight: 700, textTransfo
Dein Geschmacksprofil (aus Verlauf)
</div>
{sorted.map(function(entry, i) {
var g = GENRES_TMDB[parseInt(entry[0])];
if (!g) return null;
var colors = ["linear-gradient(90deg, #E50914, #B01EFF)", "#B01EFF",
return (
<div key={entry[0]} style={{ display: "flex", alignItems: "center",
<span style={{ fontSize: 16 }}>{g.emoji}</span>
<div style={{ flex: 1 }}>
<div style={{ fontSize: 12, fontWeight: 600, marginBottom: 3 }}
<div style={{ height: 5, borderRadius: 3, background: "#1a1a2e"
<div style={{ height: "100%", borderRadius: 3, width: (entry[
</div>
</div>
</div>
);
})}
</div>
);
})()}
</div>
) : (
<div style={{ textAlign: "center", padding: 30, color: "#444" }}>
<div style={{ fontSize: 40, marginBottom: 10 }}> </div>
<p style={{ fontSize: 13 }}>Noch keine Titel geschaut.</p>
<p style={{ fontSize: 12, color: "#333" }}>Suche oben nach Titeln und markier
</div>
)}
</div>
) : null}
Ähnlich wie "{s
auch g
{tab === "similar" ? (
<div>
<button onClick={function() { setTab("history"); }} style={{
background: "transparent", border: "none", color: "#B01EFF", cursor: "pointer",
fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 600, padding: 0, marginBotto
}}>← Zurück</button>
<h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}> <p style={{ fontSize: 12, color: "#555", marginBottom: 14 }}>Titel die dir {simLoading ? (
<div style={{ textAlign: "center", padding: 40 }}>
<div style={{ color: "#B01EFF", fontSize: 24, marginBottom: 8 }}> <p style={{ color: "#555", fontSize: 13 }}>Suche ähnliche Titel...</p>
</div>
</div>
) : (
<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
{similarItems.map(function(item) {
return <TitleCard key={item.id} item={item} profile={profile} apiKey={apiKe
})}
</div>
)}
{!simLoading && similarItems.length === 0 ? (
<p style={{ color: "#444", fontSize: 13, textAlign: "center", padding: 20 }}>Ke
) : null}
</div>
) : null}
{tab === "search" ? (
<div>
<input
type="text"
value={searchQuery}
onChange={function(e) { handleSearch(e.target.value); }}
placeholder="Titel suchen..."
style={{
width: "100%", padding: "14px 16px", borderRadius: 14,
background: "#12121f", border: "1px solid #2a2a3e", color: "#e8e6e1",
fontFamily: "'DM Sans'", fontSize: 15, outline: "none", marginBottom: 16,
}}
/>
{searching ? <p style={{ color: "#555", fontSize: 13, textAlign: "center" }}>Such
{searchResults.length > 0 ? (
<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
{searchResults.map(function(item) {
return <TitleCard key={item.id} item={item} profile={profile} apiKey={apiKe
})}
</div>
) : null}
{!searching && searchQuery && searchResults.length === 0 ? (
<p style={{ color: "#444", fontSize: 13, textAlign: "center", padding: 20 }}>Ke
) : null}
</div>
) : null}
</div>
{/* Bottom Nav */}
<div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#0a0a0fee",
{tabs.map(function(t) {
return (
<button key={t.id} onClick={function() { setTab(t.id); }} style={{
flex: 1, background: "transparent", border: "none",
cursor: "pointer", display: "flex", flexDirection: "column",
alignItems: "center", gap: 2, padding: "5px 0",
color: tab === t.id ? "#B01EFF" : "#444",
}}>
<span style={{ fontSize: 18 }}>{t.icon}</span>
<span style={{ fontSize: 9, fontWeight: 700, fontFamily: "'DM Sans'" }}>{t.labe
</button>
);
})}
</div>
<style>{"@keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opa
</div>
);
}
// ── Root ──
export default function StreamFinder() {
var _key = useState(function() { return sGet("sf_apikey"); });
var apiKey = _key[0]; var setApiKey = _key[1];
var _prof = useState(function() { return sGet("sf_profile"); });
var profile = _prof[0]; var setProfile = _prof[1];
function handleApiKey(key) {
sSet("sf_apikey", key);
setApiKey(key);
}
function handleProfileComplete(p) {
sSet("sf_profile", p);
setProfile(p);
}
function handleReset() {
sDel("sf_apikey");
sDel("sf_profile");
setApiKey(null);
setProfile(null);
}
if (!apiKey) {
return <ApiKeyScreen onSubmit={handleApiKey} />;
}
if (!profile) {
return <OnboardingQuiz onComplete={handleProfileComplete} />;
}
return <MainApp apiKey={apiKey} profile={profile} onReset={handleReset} />;
}
