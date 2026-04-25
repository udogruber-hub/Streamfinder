import { useState, useEffect, useRef } from "react";

const PROXY_URL = "https://stream.thoramus.workers.dev";
const TMDB_API_KEY = "7b1cb8c1071afbbf54d15e7724645086";
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p/w300";

const PLATFORMS = [
  { id:"netflix",   name:"Netflix",     color:"#E50914", icon:"N",  tmdbIds:[8] },
  { id:"prime",     name:"Prime Video", color:"#00A8E1", icon:"P",  tmdbIds:[9,119] },
  { id:"appletv",   name:"Apple TV+",   color:"#A2AAAD", icon:"🍎", tmdbIds:[350] },
  { id:"disney",    name:"Disney+",     color:"#113CCF", icon:"D",  tmdbIds:[337] },
  { id:"wow",       name:"WOW",         color:"#00B4CC", icon:"W",  tmdbIds:[29,30] },
  { id:"paramount", name:"Paramount+",  color:"#0064FF", icon:"P+", tmdbIds:[531,1853] },
  { id:"hbomax",    name:"HBO Max",     color:"#9B59B6", icon:"H",  tmdbIds:[1899,384] },
  { id:"rtl",       name:"RTL+",        color:"#FF0000", icon:"R",  tmdbIds:[257] },
];

const MEDIATHEKEN = [
  { id:"ard",  name:"ARD Mediathek", color:"#004E8A", emoji:"🔵", url:"https://www.ardmediathek.de", searchUrl:"https://www.ardmediathek.de/suche/", channel:"ARD" },
  { id:"zdf",  name:"ZDF Mediathek", color:"#FA7D19", emoji:"🟠", url:"https://www.zdf.de",          searchUrl:"https://www.zdf.de/suche/", channel:"ZDF" },
  { id:"arte", name:"Arte",          color:"#C8102E", emoji:"🔴", url:"https://www.arte.tv/de/",     searchUrl:"https://www.arte.tv/de/search/", channel:"ARTE" },
  { id:"br",   name:"BR Mediathek",  color:"#009FE3", emoji:"🔷", url:"https://www.br.de/mediathek", searchUrl:"https://www.br.de/mediathek/suche/", channel:"BR" },
  { id:"3sat", name:"3sat",          color:"#666",    emoji:"3️⃣", url:"https://www.3sat.de",         searchUrl:"https://www.3sat.de/suche/", channel:"3Sat" },
  { id:"funk", name:"funk",          color:"#FF5F00", emoji:"⚡", url:"https://www.funk.net",         searchUrl:"https://www.funk.net/suche/", channel:"funk" },
];

const GENRES_TMDB = {
  28:"Action",12:"Abenteuer",16:"Animation",35:"Komödie",80:"Krimi",
  99:"Doku",18:"Drama",10751:"Familie",14:"Fantasy",36:"Geschichte",
  27:"Horror",9648:"Mystery",10749:"Romantik",878:"Sci-Fi",53:"Thriller",
  10752:"Krieg",37:"Western",10759:"Action & Abenteuer",10765:"Sci-Fi & Fantasy",
};
const GENRE_EMOJI = {
  28:"💥",12:"⚡",16:"✨",35:"😂",80:"🔍",99:"📷",18:"🎭",10751:"👨‍👩‍👧",
  14:"🐉",36:"📜",27:"👻",9648:"🔮",10749:"💕",878:"🚀",53:"🔪",10752:"⚔️",37:"🤠",
};

const MOODS = [
  { id:"action",   label:"Adrenalin pur",     emoji:"🔥", genres:[28,53,12] },
  { id:"laugh",    label:"Lachen bis es wehtut", emoji:"🤣", genres:[35,16] },
  { id:"cry",      label:"Schön heulen",       emoji:"😭", genres:[18,10749] },
  { id:"scifi",    label:"Kopf verbiegen",     emoji:"🛸", genres:[878,14,10765] },
  { id:"horror",   label:"Nicht allein schauen", emoji:"😱", genres:[27,9648] },
  { id:"doku",     label:"Schlauer werden",    emoji:"🧐", genres:[99,36] },
  { id:"chill",    label:"Sofa & Seele baumeln", emoji:"🛋️", genres:[35,10749,16] },
  { id:"krimi",    label:"Wer war's?",         emoji:"🕵️", genres:[80,9648,53] },
];

const REF_TITLES = [
  {title:"Breaking Bad",    emoji:"🧪", genres:[18,80]},
  {title:"Titanic",         emoji:"🚢", genres:[10749,18]},
  {title:"Game of Thrones", emoji:"⚔️", genres:[14,18]},
  {title:"The Office",      emoji:"😂", genres:[35]},
  {title:"Inception",       emoji:"🌀", genres:[878,28]},
  {title:"Squid Game",      emoji:"🎮", genres:[53,18]},
  {title:"Planet Erde",     emoji:"🌍", genres:[99]},
  {title:"The Boys",        emoji:"💥", genres:[28,35]},
  {title:"John Wick",       emoji:"🔫", genres:[28,53]},
  {title:"Bridgerton",      emoji:"💕", genres:[10749,18]},
  {title:"Stranger Things", emoji:"👾", genres:[878,27,18]},
  {title:"Tatort",          emoji:"🔍", genres:[80,18]},
];

const WEEKDAY_VIBES = ["Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag","Sonntag"];

const QUIPS_HOME = [
  "Dein Sofa ruft. Wir haben gehört. 📞",
  "Besser als dein Ex im Empfehlen. Garantiert.",
  "Heute Abend wird gebingt. Kein Widerspruch.",
  "Kein Stress — wir denken für dich nach. Du kuck.",
  "Fernbedienung bereit? Los.",
  "Der Algorithmus hat gesprochen. Hör zu.",
  "3... 2... 1... Binge! 🍿",
];

const SURPRISE_MSGS = [
  "🎲 Die Würfel haben entschieden!",
  "🎰 Jackpot! Du schaust heute...",
  "🔮 Das Schicksal hat gesprochen:",
  "🎯 Volltreffer! Heute Abend gibt's...",
  "🍿 Dein Sofa hat abgestimmt:",
  "🎬 Trommelwirbel bitte...",
  "✨ Tadaaa! Das wird gut:",
];

const ORACLE_INTROS = [
  "Die Sterne haben gesprochen... 🌟",
  "Das Universum flüstert dir zu... ✨",
  "Nach stundenlanger Meditation offenbare ich... 🔮",
  "Die Streaming-Götter haben entschieden... ⚡",
];

function rnd(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

var _mem = {};
function sGet(k){try{return JSON.parse(localStorage.getItem(k));}catch(e){return _mem[k]?JSON.parse(_mem[k]):null;}}
function sSet(k,v){var s=JSON.stringify(v);try{localStorage.setItem(k,s);}catch(e){_mem[k]=s;}}
function sDel(k){try{localStorage.removeItem(k);}catch(e){delete _mem[k];}}

function tmdbFetch(path,params){
  var url=TMDB_BASE+path+"?api_key="+TMDB_API_KEY+"&language=de-DE&region=DE";
  if(params)Object.keys(params).forEach(k=>{url+="&"+k+"="+encodeURIComponent(params[k]);});
  return fetch(url).then(r=>r.json());
}
function discoverTitles(type,providerIds,genreStr,page,sortBy){
  var mt=type==="serie"?"tv":"movie";
  var params={with_watch_providers:providerIds.join("|"),watch_region:"DE",with_watch_monetization_types:"flatrate",sort_by:sortBy||"popularity.desc",page:page||1,"vote_count.gte":20};
  if(genreStr)params.with_genres=genreStr;
  return tmdbFetch("/discover/"+mt,params);
}
function getDetails(mediaType,id){ return tmdbFetch("/"+mediaType+"/"+id,{append_to_response:"credits,watch/providers,videos"}); }
function searchTitles(query){ return tmdbFetch("/search/multi",{query}); }
function getSimilar(mediaType,id){ return tmdbFetch("/"+mediaType+"/"+id+"/similar",{}); }
function getTrending(mediaType){ return fetch(TMDB_BASE+"/trending/"+mediaType+"/week?api_key="+TMDB_API_KEY+"&language=de-DE").then(r=>r.json()); }

async function searchMediathek(query){
  try{
    const res=await fetch("https://mediathekviewweb.de/api/query",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({queries:[{fields:["title","topic"],query}],sortBy:"timestamp",sortOrder:"desc",future:false,offset:0,size:10}),
    });
    const data=await res.json();
    return data.result?.results||[];
  }catch(e){return[];}
}

async function getMediathekChannel(channel){
  try{
    const res=await fetch("https://mediathekviewweb.de/api/query",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({queries:[{fields:["channel"],query:channel}],sortBy:"timestamp",sortOrder:"desc",future:false,offset:0,size:12}),
    });
    const data=await res.json();
    return data.result?.results||[];
  }catch(e){return[];}
}

async function callAI(messages,systemPrompt){
  const res=await fetch(PROXY_URL,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({model:"llama-3.3-70b-versatile",max_tokens:1000,messages:[{role:"system",content:systemPrompt},...messages]}),
  });
  const data=await res.json();
  if(data.choices&&data.choices[0])return data.choices[0].message.content;
  throw new Error(data.error?.message||"Fehler");
}

function buildCtx(profile){
  const platforms=(profile.platforms||[]).map(id=>PLATFORMS.find(p=>p.id===id)?.name||id).join(", ");
  const ratings=profile.ratings||{};
  const topRated=Object.entries(ratings).filter(([,v])=>v>=4).map(([t,v])=>t+"("+v+"★)").slice(0,6).join(", ");
  const lowRated=Object.entries(ratings).filter(([,v])=>v<=2&&v>0).map(([t])=>t).slice(0,3).join(", ");
  const topGenres=Object.entries(profile.genres||{}).filter(([,v])=>v>0).sort(([,a],[,b])=>b-a).slice(0,6).map(([gid])=>GENRES_TMDB[gid]||gid).join(", ");
  const watched=(profile.watched||[]).slice(0,8).map(w=>w.title).join(", ");
  return{platforms,topRated,lowRated,topGenres,watched};
}

async function getTop5(profile,type){
  const ctx=buildCtx(profile);
  const typeLabel=type==="serie"?"Serien (KEINE Filme, NUR Serien/Shows)":"Filme (KEINE Serien, NUR Kinofilme)";
  const typeStrict=type==="serie"?"Serie":"Film";
  const system=`Du bist ein Streaming-Experte. Antworte NUR mit JSON-Array, keine Backticks. WICHTIG: Nur ${typeStrict === "Serie" ? "Serien und Shows" : "Kinofilme"} empfehlen! Format: [{"title":"...","year":"...","platform":"...","reason":"...","emoji":"...","type":"${typeStrict}"}]`;
  const msg=`Empfehle genau 5 ${typeLabel} auf: ${ctx.platforms||"diverse"}.\nHoch bewertet: ${ctx.topRated||"noch nichts"}.\nGesehen: ${ctx.watched||"nichts"}.\nLieblingsgenres: ${ctx.topGenres||"gemischt"}.\nNiedrig bewertet: ${ctx.lowRated||"nichts"}.\nreason = 1 witziger aber ehrlicher Satz Deutsch.\nWICHTIG: Nur ${typeStrict === "Serie" ? "Serien" : "Filme"} — kein Mix!`;
  const text=await callAI([{role:"user",content:msg}],system);
  try{return JSON.parse(text.replace(/```json|```/g,"").trim());}catch{return[];}
}

async function getPlatformTop3(profile,platformName,type){
  const ctx=buildCtx(profile);
  const typeStrict=type==="serie"?"Serien (KEINE Filme)":"Filme (KEINE Serien)";
  const system=`Du bist ein Streaming-Experte. Antworte NUR mit JSON-Array, keine Backticks. Format: [{"title":"...","year":"...","type":"${type==="serie"?"Serie":"Film"}","reason":"...","emoji":"..."}]`;
  const msg=`Empfehle genau 3 ${typeStrict} die JETZT auf ${platformName} Deutschland verfügbar sind.\nHoch bewertet: ${ctx.topRated||"noch nichts"}.\nGesehen: ${ctx.watched||"nichts"}.\nLieblingsgenres: ${ctx.topGenres||"gemischt"}.\nreason = 1 kurzer witziger Satz warum.\nNUR ${type==="serie"?"Serien":"Filme"}!`;
  const text=await callAI([{role:"user",content:msg}],system);
  try{return JSON.parse(text.replace(/```json|```/g,"").trim());}catch{return[];}
}

async function getSurprise(profile){
  const ctx=buildCtx(profile);
  const system=`Du bist ein dramatischer Streaming-Orakel. Antworte NUR mit JSON, keine Backticks. Format: {"title":"...","year":"...","platform":"...","prophecy":"...","emoji":"..."}`;
  const msg=`Wähle EINEN perfekten Titel für heute Abend.\nPlattformen: ${ctx.platforms}.\nHoch bewertet: ${ctx.topRated||"nichts"}.\nGesehen: ${ctx.watched||"nichts"}.\nGenres: ${ctx.topGenres||"gemischt"}.\nprophecy = dramatisch-witzige Prophezeiung auf Deutsch. Max 2 Sätze.`;
  const text=await callAI([{role:"user",content:msg}],system);
  try{return JSON.parse(text.replace(/```json|```/g,"").trim());}catch{return null;}
}

async function getPersonalityType(profile){
  const ctx=buildCtx(profile);
  const system=`Du bist ein witziger Streaming-Psychologe. Antworte NUR mit JSON, keine Backticks. Format: {"type":"...","emoji":"...","description":"...","weakness":"...","recommendation":"..."}`;
  const msg=`Analysiere diesen Streaming-Nutzer.\nHoch bewertet: ${ctx.topRated||"nichts"}.\nNiedrig bewertet: ${ctx.lowRated||"nichts"}.\nGesehen: ${ctx.watched||"nichts"}.\nLieblingsgenres: ${ctx.topGenres||"gemischt"}.\ntype = kreativer lustiger Name (z.B. "Der Serienleichen-Sammler").\ndescription = 2 Sätze witzige Charakterbeschreibung Deutsch.\nweakness = 1 Satz Streaming-Schwäche.\nrecommendation = 1 konkreter Titelvorschlag.`;
  const text=await callAI([{role:"user",content:msg}],system);
  try{return JSON.parse(text.replace(/```json|```/g,"").trim());}catch{return null;}
}

async function getOracle(profile){
  const ctx=buildCtx(profile);
  const system=`Du bist ein mystisches Streaming-Orakel. Antworte NUR mit JSON, keine Backticks. Format: {"title":"...","year":"...","platform":"...","prophecy":"...","emoji":"..."}`;
  const msg=`Wähle EINEN anderen Titel als beim letzten Mal — etwas Unerwartetes, Überraschendes.\nPlattformen: ${ctx.platforms}.\nNiedrig bewertet (vermeide diese Genres): ${ctx.lowRated||"nichts"}.\nGesehen: ${ctx.watched||"nichts"}.\nGenres: ${ctx.topGenres||"gemischt"}.\nprophecy = mystisch-witzige Prophezeiung auf Deutsch. Max 2 Sätze. Klingt wie ein echtes Orakel.`;
  const text=await callAI([{role:"user",content:msg}],system);
  try{return JSON.parse(text.replace(/```json|```/g,"").trim());}catch{return null;}
}

async function getPopcornMeter(title){
  const day=WEEKDAY_VIBES[new Date().getDay()===0?6:new Date().getDay()-1];
  const system=`Du bist ein witziger Streaming-Kritiker. Antworte NUR mit JSON, keine Backticks. Format: {"score":85,"label":"...","reason":"...","popcorn":"..."}`;
  const msg=`Bewerte wie gut "${title}" für einen ${day}abend passt.\nscore = Zahl 0-100.\nlabel = lustiger Titel.\nreason = 1 witziger Satz Deutsch.\npopcorn = Popcorn-Emoji-Rating (🍿🍿🍿 für gut).`;
  const text=await callAI([{role:"user",content:msg}],system);
  try{return JSON.parse(text.replace(/```json|```/g,"").trim());}catch{return null;}
}

async function refreshHomeRecs(profile){
  const ctx=buildCtx(profile);
  const system=`Du bist ein Streaming-Experte. Antworte NUR mit JSON-Array, keine Backticks. Format: [{"title":"...","year":"...","type":"Film oder Serie","platform":"...","reason":"...","emoji":"..."}]`;
  const msg=`Empfehle 6 frische Titel basierend auf diesem Profil.\nPlattformen: ${ctx.platforms}.\nHoch bewertet: ${ctx.topRated||"nichts"}.\nGesehen: ${ctx.watched||"nichts"}.\nGenres: ${ctx.topGenres||"gemischt"}.\nWähle abwechslungsreiche Titel — Mix aus Serien und Filmen.\nreason = 1 witziger Satz Deutsch.`;
  const text=await callAI([{role:"user",content:msg}],system);
  try{return JSON.parse(text.replace(/```json|```/g,"").trim());}catch{return[];}
}

// ── Star Rating ──
function StarRating({itemTitle,profile,onRate,size}){
  const current=(profile.ratings||{})[itemTitle]||0;
  const [hover,setHover]=useState(0);
  const sz=size||20;
  return(
    <div style={{display:"flex",gap:2,alignItems:"center"}}>
      {[1,2,3,4,5].map(star=>(
        <button key={star} onClick={e=>{e.stopPropagation();onRate(itemTitle,star===current?0:star);}}
          onMouseEnter={()=>setHover(star)} onMouseLeave={()=>setHover(0)}
          style={{background:"transparent",border:"none",cursor:"pointer",padding:"1px",fontSize:sz,lineHeight:1,transition:"transform 0.1s",transform:(hover||current)>=star?"scale(1.2)":"scale(1)"}}>
          <span style={{color:(hover||current)>=star?"#f5c518":"#2a2340"}}>{(hover||current)>=star?"★":"☆"}</span>
        </button>
      ))}
    </div>
  );
}

// ── Popcorn Meter ──
function PopcornMeter({item}){
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(false);
  const title=item.title||item.name||"";
  const day=WEEKDAY_VIBES[new Date().getDay()===0?6:new Date().getDay()-1];
  async function check(){
    setLoading(true);
    const result=await getPopcornMeter(title).catch(()=>null);
    setData(result);setLoading(false);
  }
  return(
    <div style={{marginTop:10}}>
      {!data&&!loading&&<button onClick={e=>{e.stopPropagation();check();}} style={{width:"100%",background:"#1a1a2e",border:"1px solid #2a2340",borderRadius:10,padding:"8px",color:"#888",cursor:"pointer",fontSize:12,fontFamily:"'DM Sans'",fontWeight:600}}>🍿 Popcorn-o-Meter für {day}</button>}
      {loading&&<p style={{fontSize:12,color:"#888",textAlign:"center"}}>Messe Popcorn-Kompatibilität... 🍿</p>}
      {data&&(
        <div style={{background:"linear-gradient(135deg,#1a1a2e,#12121f)",borderRadius:12,padding:"10px 12px",border:"1px solid #2a2340"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
            <span style={{fontSize:13,fontWeight:700,color:"#f5c518"}}>{data.popcorn}</span>
            <span style={{fontSize:14,fontWeight:800,color:data.score>=70?"#4ade80":data.score>=40?"#fbbf24":"#ef4444"}}>{data.score}/100</span>
          </div>
          <div style={{height:4,borderRadius:2,background:"#0d0d18",marginBottom:6,overflow:"hidden"}}>
            <div style={{height:"100%",borderRadius:2,width:data.score+"%",background:data.score>=70?"linear-gradient(90deg,#4ade80,#22d3ee)":data.score>=40?"#fbbf24":"#ef4444",transition:"width 0.8s"}}/>
          </div>
          <p style={{fontSize:11,color:"#ff6b35",fontWeight:700,marginBottom:2}}>{data.label}</p>
          <p style={{fontSize:11,color:"#a09aaa",fontStyle:"italic",margin:0}}>{data.reason}</p>
        </div>
      )}
    </div>
  );
}

// ── Detail Modal ──
function DetailModal({item,profile,onClose,onRate,onLike,onWatched}){
  const [details,setDetails]=useState(null);
  const title=item.title||item.name||"";
  const year=(item.release_date||item.first_air_date||"").substring(0,4);
  const score=item.vote_average?Math.round(item.vote_average*10)/10:0;
  const scoreColor=score>=8?"#4ade80":score>=7?"#fbbf24":"#fb923c";
  const mediaType=item.media_type||(item.first_air_date?"tv":"movie");
  const isLiked=(profile.liked||[]).includes(item.id);
  const isWatched=(profile.watched||[]).some(w=>w.id===item.id);
  const backdrop=item.backdrop_path?"https://image.tmdb.org/t/p/w780"+item.backdrop_path:null;
  const poster=item.poster_path?TMDB_IMG+item.poster_path:null;
  const myRating=(profile.ratings||{})[title]||0;

  useEffect(()=>{
    getDetails(mediaType,item.id).then(setDetails).catch(()=>{});
  },[]);

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:200,overflowY:"auto"}} onClick={onClose}>
      <div style={{background:"linear-gradient(180deg,#13121f,#09090f)",minHeight:"100vh",maxWidth:560,margin:"0 auto"}} onClick={e=>e.stopPropagation()}>
        {/* Backdrop */}
        <div style={{position:"relative",height:220}}>
          {backdrop?<img src={backdrop} alt="" style={{width:"100%",height:"100%",objectFit:"cover",opacity:0.6}}/>:<div style={{width:"100%",height:"100%",background:"linear-gradient(135deg,#1a1525,#0f0e1a)"}}/>}
          <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,transparent 30%,#13121f 100%)"}}/>
          <button onClick={onClose} style={{position:"absolute",top:16,right:16,background:"rgba(0,0,0,0.6)",border:"none",borderRadius:20,padding:"8px 14px",color:"#fff",cursor:"pointer",fontSize:13,fontFamily:"'DM Sans'",fontWeight:700,backdropFilter:"blur(10px)"}}>✕ Schließen</button>
          <div style={{position:"absolute",top:16,left:16,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(10px)",borderRadius:10,padding:"5px 12px"}}>
            <span style={{fontSize:11,fontWeight:700,color:"#f0ece4"}}>{mediaType==="tv"?"📺 Serie":"🎬 Film"}</span>
          </div>
        </div>

        <div style={{padding:"0 20px 40px"}}>
          <div style={{display:"flex",gap:14,alignItems:"flex-end",marginTop:-50,marginBottom:16}}>
            {poster&&<img src={poster} alt="" style={{width:80,height:120,borderRadius:14,objectFit:"cover",flexShrink:0,border:"3px solid #2a2340",boxShadow:"0 8px 32px #000000aa"}}/>}
            <div style={{flex:1,paddingBottom:4}}>
              <h2 style={{fontFamily:"'Instrument Serif',serif",fontSize:22,margin:"0 0 4px",color:"#f0ece4",lineHeight:1.2}}>{title}</h2>
              <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                {year&&<span style={{fontSize:12,color:"#888"}}>{year}</span>}
                <div style={{display:"inline-flex",alignItems:"center",gap:3,background:scoreColor+"18",padding:"3px 8px",borderRadius:6}}>
                  <span style={{color:"#f5c518",fontSize:12}}>★</span>
                  <span style={{color:scoreColor,fontSize:13,fontWeight:900}}>{score}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Your rating */}
          <div style={{background:"#12121f",borderRadius:14,padding:"14px 16px",marginBottom:14,display:"flex",alignItems:"center",justifyContent:"space-between",border:"1px solid #1e1e30"}}>
            <div>
              <div style={{fontSize:12,color:"#a09aaa",fontWeight:600}}>Deine Bewertung</div>
              {myRating>0&&<div style={{fontSize:11,color:"#f5c518",marginTop:2}}>{"★".repeat(myRating)+"☆".repeat(5-myRating)}</div>}
            </div>
            <StarRating itemTitle={title} profile={profile} onRate={onRate} size={26}/>
          </div>

          {/* Overview */}
          {item.overview&&<p style={{fontSize:14,color:"#9a8e9a",lineHeight:1.7,marginBottom:16}}>{item.overview}</p>}

          {/* Genres */}
          {(item.genre_ids||[]).length>0&&(
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
              {(item.genre_ids||[]).map(gid=>GENRES_TMDB[gid]?<span key={gid} style={{fontSize:12,color:"#b0a8b8",background:"#1a1a2e",padding:"4px 10px",borderRadius:8}}>{GENRE_EMOJI[gid]} {GENRES_TMDB[gid]}</span>:null)}
            </div>
          )}

          {/* Cast */}
          {details?.credits?.cast?.length>0&&(
            <div style={{marginBottom:16}}>
              <p style={{fontSize:11,color:"#888",fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>Besetzung</p>
              <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4}}>
                {details.credits.cast.slice(0,8).map(c=>(
                  <div key={c.id} style={{flexShrink:0,textAlign:"center",width:60}}>
                    <div style={{width:50,height:50,borderRadius:25,background:"#1a1a2e",margin:"0 auto 4px",overflow:"hidden",border:"1px solid #2a2340"}}>
                      {c.profile_path?<img src={"https://image.tmdb.org/t/p/w92"+c.profile_path} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>👤</div>}
                    </div>
                    <div style={{fontSize:10,color:"#a09aaa",lineHeight:1.2}}>{c.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Where to watch */}
          {details?.["watch/providers"]?.results?.DE?.flatrate?.length>0&&(
            <div style={{marginBottom:16}}>
              <p style={{fontSize:11,color:"#888",fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>Verfügbar bei</p>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {details["watch/providers"].results.DE.flatrate.map(prov=>{
                  const known=PLATFORMS.find(p=>p.tmdbIds.includes(prov.provider_id));
                  return(<div key={prov.provider_id} style={{display:"flex",alignItems:"center",gap:6,background:known?known.color+"22":"#1a1a2e",border:"1px solid "+(known?known.color+"44":"#2a2a3e"),borderRadius:10,padding:"6px 12px"}}>
                    {prov.logo_path&&<img src={"https://image.tmdb.org/t/p/w45"+prov.logo_path} alt="" style={{width:20,height:20,borderRadius:5}}/>}
                    <span style={{fontSize:12,fontWeight:700,color:known?known.color:"#888"}}>{prov.provider_name}</span>
                  </div>);
                })}
              </div>
            </div>
          )}

          {/* Popcorn Meter */}
          <PopcornMeter item={item}/>

          {/* Actions */}
          <div style={{display:"flex",gap:10,marginTop:16}}>
            <button onClick={()=>onLike(item)} style={{flex:1,padding:"13px",borderRadius:14,background:isLiked?"#E5091422":"#12121f",border:isLiked?"1px solid #E5091455":"1px solid #1e1e30",color:isLiked?"#E50914":"#888",cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"'DM Sans'"}}>{isLiked?"❤️ Gemerkt":"🤍 Merken"}</button>
            <button onClick={()=>onWatched(item)} style={{flex:1,padding:"13px",borderRadius:14,background:isWatched?"#3b82f622":"#12121f",border:isWatched?"1px solid #3b82f655":"1px solid #1e1e30",color:isWatched?"#3b82f6":"#888",cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"'DM Sans'"}}>{isWatched?"✅ Gesehen":"👁 Als gesehen"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Hero Card ──
function HeroCard({item,profile,onRate,onLike,onWatched,onSelect}){
  const title=item.title||item.name||"";
  const year=(item.release_date||item.first_air_date||"").substring(0,4);
  const score=item.vote_average?Math.round(item.vote_average*10)/10:0;
  const scoreColor=score>=8?"#4ade80":score>=7?"#fbbf24":"#fb923c";
  const mediaType=item.media_type||(item.first_air_date?"tv":"movie");
  const isLiked=(profile.liked||[]).includes(item.id);
  const isWatched=(profile.watched||[]).some(w=>w.id===item.id);
  const backdrop=item.backdrop_path?"https://image.tmdb.org/t/p/w780"+item.backdrop_path:null;
  const poster=item.poster_path?TMDB_IMG+item.poster_path:null;
  return(
    <div style={{borderRadius:24,overflow:"hidden",border:"1px solid #1e1e30",marginBottom:14,cursor:"pointer"}} onClick={()=>onSelect(item)}>
      <div style={{position:"relative",height:190,background:"#0d0d18"}}>
        {backdrop&&<img src={backdrop} alt="" style={{width:"100%",height:"100%",objectFit:"cover",opacity:0.55}}/>}
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,transparent 20%,#0d0d18 100%)"}}/>
        <div style={{position:"absolute",top:12,right:12,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(10px)",borderRadius:10,padding:"5px 10px",display:"flex",alignItems:"center",gap:4}}>
          <span style={{color:"#f5c518",fontSize:12}}>★</span>
          <span style={{color:scoreColor,fontSize:13,fontWeight:900}}>{score}</span>
        </div>
        <div style={{position:"absolute",top:12,left:12,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(10px)",borderRadius:10,padding:"5px 12px"}}>
          <span style={{fontSize:11,fontWeight:700,color:"#f0ece4"}}>{mediaType==="tv"?"📺 Serie":"🎬 Film"}</span>
        </div>
      </div>
      <div style={{background:"linear-gradient(145deg,#13121f,#0f0e1a)",padding:"14px 16px"}}>
        <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
          {poster&&<img src={poster} alt="" style={{width:50,height:75,borderRadius:10,objectFit:"cover",flexShrink:0,marginTop:-36,border:"2px solid #2a2340",boxShadow:"0 8px 24px #00000088"}}/>}
          <div style={{flex:1,minWidth:0}}>
            <h3 style={{margin:"0 0 4px",fontSize:17,fontWeight:800,color:"#f0ece4"}}>{title}</h3>
            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:6}}>
              {year&&<span style={{fontSize:11,color:"#888"}}>{year}</span>}
              {(item.genre_ids||[]).slice(0,2).map(gid=>GENRES_TMDB[gid]?<span key={gid} style={{fontSize:11,color:"#a09aaa"}}>{GENRE_EMOJI[gid]} {GENRES_TMDB[gid]}</span>:null)}
            </div>
            {item.overview&&<p style={{margin:"0 0 8px",fontSize:13,color:"#b0a8b8",lineHeight:1.5,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{item.overview}</p>}
            <StarRating itemTitle={title} profile={profile} onRate={onRate} size={20}/>
          </div>
        </div>
        <div style={{display:"flex",gap:8,marginTop:12}}>
          <button onClick={e=>{e.stopPropagation();onLike(item);}} style={{flex:1,padding:"9px",borderRadius:12,background:isLiked?"#E5091422":"#1a1a2e",border:isLiked?"1px solid #E5091455":"1px solid #2a2340",color:isLiked?"#E50914":"#888",cursor:"pointer",fontWeight:700,fontSize:12,fontFamily:"'DM Sans'"}}>{isLiked?"❤️ Gemerkt":"🤍 Merken"}</button>
          <button onClick={e=>{e.stopPropagation();onWatched(item);}} style={{padding:"9px 14px",borderRadius:12,background:isWatched?"#3b82f622":"#1a1a2e",border:isWatched?"1px solid #3b82f655":"1px solid #2a2340",color:isWatched?"#3b82f6":"#888",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:700,fontSize:12}}>{isWatched?"✅":"👁"}</button>
          <button onClick={e=>{e.stopPropagation();onSelect(item);}} style={{padding:"9px 14px",borderRadius:12,background:"#1a1a2e",border:"1px solid #2a2340",color:"#888",cursor:"pointer",fontSize:12,fontFamily:"'DM Sans'",fontWeight:700}}>Details</button>
        </div>
      </div>
    </div>
  );
}

// ── Title Card ──
function TitleCard({item,profile,onRate,onLike,onWatched,onSelect}){
  const title=item.title||item.name||"";
  const year=(item.release_date||item.first_air_date||"").substring(0,4);
  const score=item.vote_average?Math.round(item.vote_average*10)/10:0;
  const scoreColor=score>=8?"#4ade80":score>=7?"#fbbf24":"#fb923c";
  const mediaType=item.media_type||(item.first_air_date?"tv":"movie");
  const isLiked=(profile.liked||[]).includes(item.id);
  const isWatched=(profile.watched||[]).some(w=>w.id===item.id);
  const poster=item.poster_path?TMDB_IMG+item.poster_path:null;
  const myRating=(profile.ratings||{})[title]||0;
  return(
    <div onClick={()=>onSelect(item)} style={{background:"#12121f",borderRadius:18,overflow:"hidden",border:"1px solid #1e1e30",marginBottom:8,cursor:"pointer",transition:"border 0.2s"}}>
      <div style={{padding:14,display:"flex",gap:12,alignItems:"flex-start"}}>
        {poster?<img src={poster} alt="" style={{width:50,height:75,borderRadius:10,objectFit:"cover",flexShrink:0}}/>:<div style={{width:50,height:75,borderRadius:10,background:"#1a1a2e",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🎬</div>}
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
            <h3 style={{margin:0,fontSize:15,fontWeight:800,color:"#f0ece4",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{title}</h3>
            {isLiked&&<span style={{fontSize:11,flexShrink:0}}>❤️</span>}
            {isWatched&&<span style={{fontSize:11,flexShrink:0}}>✅</span>}
          </div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:4}}>
            <span style={{fontSize:11,color:"#a09aaa",background:"#1a1a2e",padding:"2px 8px",borderRadius:6,fontWeight:700}}>{mediaType==="tv"?"Serie":"Film"}</span>
            {year&&<span style={{fontSize:11,color:"#888"}}>{year}</span>}
          </div>
          {item.overview&&<p style={{margin:"0 0 5px",fontSize:12,color:"#a09aaa",lineHeight:1.4,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{item.overview}</p>}
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{display:"inline-flex",alignItems:"center",gap:3,background:scoreColor+"18",padding:"2px 8px",borderRadius:6}}>
              <span style={{color:"#f5c518",fontSize:11}}>★</span>
              <span style={{color:scoreColor,fontSize:12,fontWeight:900}}>{score}</span>
            </div>
            {myRating>0&&<span style={{fontSize:12,color:"#f5c518"}}>{"★".repeat(myRating)+"☆".repeat(5-myRating)}</span>}
          </div>
        </div>
        <div style={{color:"#ff6b35",fontSize:11,fontFamily:"'DM Sans'",fontWeight:700,flexShrink:0,marginTop:4}}>Details ›</div>
      </div>
    </div>
  );
}

// ── Platform Card with Top 3 ──
function PlatformCard({platform,profile,onBrowse,onSelect,browseType}){
  const [recs,setRecs]=useState(null);
  const [loading,setLoading]=useState(false);
  const [open,setOpen]=useState(false);
  const loaded=useRef(false);

  function handleToggle(){
    const next=!open;setOpen(next);
    if(next&&!loaded.current){
      loaded.current=true;setLoading(true);
      getPlatformTop3(profile,platform.name,browseType||"serie").then(d=>{setRecs(d);setLoading(false);}).catch(()=>{setRecs([]);setLoading(false);});
    }
  }

  return(
    <div style={{background:"#12121f",borderRadius:18,overflow:"hidden",border:"1px solid #1e1e30",marginBottom:10}}>
      <div style={{padding:"14px 16px",display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:44,height:44,borderRadius:12,background:platform.color+"22",border:"1px solid "+platform.color+"44",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:900,color:platform.color,flexShrink:0}}>{platform.icon}</div>
        <div style={{flex:1}}>
          <div style={{fontSize:15,fontWeight:800,color:"#f0ece4"}}>{platform.name}</div>
          <div style={{fontSize:11,color:"#888"}}>Top 3 nur für dich</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>onBrowse(platform)} style={{background:platform.color+"22",border:"1px solid "+platform.color+"44",borderRadius:10,padding:"7px 12px",color:platform.color,cursor:"pointer",fontSize:11,fontFamily:"'DM Sans'",fontWeight:700}}>Alle →</button>
          <button onClick={handleToggle} style={{background:open?"#ff6b3522":"#1a1a2e",border:open?"1px solid #ff6b3544":"1px solid #2a2340",borderRadius:10,padding:"7px 12px",color:open?"#ff6b35":"#555",cursor:"pointer",fontSize:11,fontFamily:"'DM Sans'",fontWeight:700}}>{open?"▲":"🎯 Top 3"}</button>
        </div>
      </div>
      {open&&(
        <div style={{padding:"0 16px 14px",animation:"fadeUp 0.3s ease"}}>
          <div style={{height:1,background:"#1e1e30",marginBottom:12}}/>
          {loading&&<div style={{textAlign:"center",padding:12}}><div style={{fontSize:20,animation:"spin 1.5s linear infinite",display:"inline-block"}}>✨</div><p style={{fontSize:12,color:"#888",marginTop:6}}>Analysiere deinen Geschmack…</p></div>}
          {!loading&&recs&&recs.length===0&&<p style={{fontSize:12,color:"#888",textAlign:"center"}}>Noch zu wenig Daten.</p>}
          {!loading&&recs&&recs.map((rec,i)=>(
            <div key={i} style={{display:"flex",gap:10,padding:"10px 0",borderBottom:i<recs.length-1?"1px solid #1e1e30":"none",alignItems:"flex-start",cursor:"pointer"}} onClick={()=>onSelect&&onSelect({title:rec.title,name:rec.title,overview:rec.reason,vote_average:0,genre_ids:[],poster_path:null,media_type:rec.type==="Serie"?"tv":"movie",release_date:rec.year||""})}>
              <div style={{width:28,height:28,borderRadius:8,background:platform.color+"22",border:"1px solid "+platform.color+"33",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>{rec.emoji||"🎬"}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                  <span style={{fontSize:13,fontWeight:800,color:"#f0ece4"}}>{rec.title}</span>
                  {rec.year&&<span style={{fontSize:10,color:"#888",background:"#0d0d18",padding:"2px 6px",borderRadius:5}}>{rec.year}</span>}
                  <span style={{fontSize:10,color:"#777",background:"#0d0d18",padding:"2px 6px",borderRadius:5}}>{rec.type}</span>
                </div>
                <p style={{fontSize:11,color:"#a09aaa",margin:0,lineHeight:1.4,fontStyle:"italic"}}>"{rec.reason}"</p>
              </div>
              <div style={{fontSize:14,fontWeight:900,color:"#2a2340",flexShrink:0}}>#{i+1}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Mediatheken ──
function MediathekenGroup(){
  const [open,setOpen]=useState(false);
  const [activeChannel,setActiveChannel]=useState(null);
  const [channelItems,setChannelItems]=useState([]);
  const [channelLoading,setChannelLoading]=useState(false);
  const [searchQ,setSearchQ]=useState("");
  const [searchResults,setSearchResults]=useState([]);
  const [searching,setSearching]=useState(false);
  const searchRef=useRef(null);

  function loadChannel(m){
    if(activeChannel?.id===m.id){setActiveChannel(null);setChannelItems([]);return;}
    setActiveChannel(m);setChannelLoading(true);setChannelItems([]);
    getMediathekChannel(m.channel).then(items=>{setChannelItems(items);setChannelLoading(false);}).catch(()=>setChannelLoading(false));
  }

  function handleSearch(q){
    setSearchQ(q);
    if(searchRef.current)clearTimeout(searchRef.current);
    if(!q.trim()){setSearchResults([]);return;}
    searchRef.current=setTimeout(()=>{
      setSearching(true);
      searchMediathek(q).then(r=>{setSearchResults(r.slice(0,10));setSearching(false);}).catch(()=>setSearching(false));
    },500);
  }

  function formatDuration(s){
    if(!s)return"";
    const m=Math.floor(s/60);
    return m>60?Math.floor(m/60)+"h "+(m%60)+"min":m+"min";
  }

  return(
    <div style={{background:"#12121f",borderRadius:18,overflow:"hidden",border:"1px solid #1e1e30",marginBottom:16}}>
      <div onClick={()=>setOpen(!open)} style={{padding:14,display:"flex",alignItems:"center",gap:12,cursor:"pointer"}}>
        <div style={{width:44,height:44,borderRadius:12,background:"linear-gradient(135deg,#004E8A33,#FA7D1922)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>📡</div>
        <div style={{flex:1}}>
          <div style={{fontSize:15,fontWeight:800,color:"#f0ece4"}}>Öffentlich-Rechtliche</div>
          <div style={{fontSize:11,color:"#888"}}>ARD · ZDF · Arte · BR · 3sat · funk — kostenlos!</div>
        </div>
        <div style={{color:"#2a2340",fontSize:14,transition:"transform 0.3s",transform:open?"rotate(180deg)":"rotate(0)"}}>▾</div>
      </div>
      {open&&(
        <div style={{padding:"0 14px 14px"}}>
          <div style={{height:1,background:"#1e1e30",marginBottom:12}}/>
          {/* Search */}
          <input value={searchQ} onChange={e=>handleSearch(e.target.value)} placeholder="Mediatheken durchsuchen… 🔍" style={{width:"100%",padding:"10px 14px",borderRadius:12,background:"#0d0d18",border:"1px solid #1e1e30",color:"#e8e6e1",fontFamily:"'DM Sans'",fontSize:13,outline:"none",marginBottom:10}}/>
          {searching&&<p style={{fontSize:12,color:"#888",textAlign:"center",marginBottom:8}}>Suche…</p>}
          {searchResults.length>0&&(
            <div style={{marginBottom:12}}>
              {searchResults.map((item,i)=>(
                <a key={i} href={item.url_video||item.url_website||"#"} target="_blank" rel="noopener noreferrer" style={{display:"flex",alignItems:"flex-start",gap:10,padding:"8px",borderRadius:10,textDecoration:"none",color:"#c4b8c8",marginBottom:4,background:"#0d0d18"}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,color:"#f0ece4",marginBottom:2}}>{item.title}</div>
                    <div style={{display:"flex",gap:6}}>
                      <span style={{fontSize:10,color:"#ff6b35",fontWeight:700}}>{item.channel}</span>
                      {item.duration&&<span style={{fontSize:10,color:"#888"}}>{formatDuration(item.duration)}</span>}
                    </div>
                    {item.description&&<p style={{fontSize:11,color:"#a09aaa",margin:"3px 0 0",lineHeight:1.4,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{item.description}</p>}
                  </div>
                  <span style={{color:"#ff6b35",fontSize:14,flexShrink:0}}>▶</span>
                </a>
              ))}
            </div>
          )}
          {/* Channel buttons */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
            {MEDIATHEKEN.map(m=>(
              <button key={m.id} onClick={()=>loadChannel(m)} style={{background:activeChannel?.id===m.id?m.color+"22":"#0d0d18",border:"1px solid "+(activeChannel?.id===m.id?m.color+"55":"#1e1e30"),borderRadius:12,padding:"10px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:8,transition:"all 0.2s"}}>
                <span style={{fontSize:18}}>{m.emoji}</span>
                <div style={{textAlign:"left"}}>
                  <div style={{fontSize:12,fontWeight:700,color:activeChannel?.id===m.id?"#f0ece4":"#8a7e90"}}>{m.name}</div>
                  <div style={{fontSize:10,color:"#888"}}>Aktuelle Inhalte</div>
                </div>
              </button>
            ))}
          </div>
          {/* Channel items */}
          {channelLoading&&<div style={{textAlign:"center",padding:12}}><div style={{fontSize:20,animation:"spin 1.5s linear infinite",display:"inline-block"}}>📡</div><p style={{fontSize:12,color:"#888",marginTop:4}}>Lade aktuelle Inhalte…</p></div>}
          {!channelLoading&&activeChannel&&channelItems.length>0&&(
            <div>
              <p style={{fontSize:11,color:"#888",fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>Aktuell bei {activeChannel.name}</p>
              {channelItems.map((item,i)=>(
                <a key={i} href={item.url_video||item.url_website||activeChannel.url} target="_blank" rel="noopener noreferrer" style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 8px",borderRadius:12,textDecoration:"none",color:"#c4b8c8",borderBottom:i<channelItems.length-1?"1px solid #1e1e30":"none"}}>
                  <div style={{width:32,height:32,borderRadius:8,background:activeChannel.color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{activeChannel.emoji}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,color:"#f0ece4",marginBottom:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.title}</div>
                    <div style={{display:"flex",gap:6,marginBottom:2}}>
                      {item.topic&&<span style={{fontSize:10,color:"#ff6b35",fontWeight:600}}>{item.topic}</span>}
                      {item.duration&&<span style={{fontSize:10,color:"#888"}}>{formatDuration(item.duration)}</span>}
                    </div>
                    {item.description&&<p style={{fontSize:11,color:"#a09aaa",margin:0,lineHeight:1.4,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{item.description}</p>}
                  </div>
                  <span style={{color:"#ff6b35",fontSize:16,flexShrink:0}}>▶</span>
                </a>
              ))}
              <a href={activeChannel.searchUrl} target="_blank" rel="noopener noreferrer" style={{display:"block",textAlign:"center",marginTop:10,fontSize:12,color:"#ff6b35",fontWeight:700,textDecoration:"none"}}>Alle Inhalte bei {activeChannel.name} →</a>
            </div>
          )}
          {!channelLoading&&activeChannel&&channelItems.length===0&&<p style={{fontSize:12,color:"#888",textAlign:"center"}}>Keine Inhalte gefunden.</p>}
        </div>
      )}
    </div>
  );
}

// ── Onboarding ──
function Onboarding({onComplete}){
  const [step,setStep]=useState(0);
  const [plats,setPlats]=useState([]);
  const [ratings,setRatings]=useState({});
  function finish(){
    const genres={};
    Object.keys(ratings).forEach(title=>{
      const ref=REF_TITLES.find(r=>r.title===title);if(!ref)return;
      const v=ratings[title]==="love"?3:ratings[title]==="ok"?1:ratings[title]==="nope"?-2:0;
      if(v!==0)ref.genres.forEach(g=>{genres[g]=(genres[g]||0)+v;});
    });
    onComplete({platforms:plats,genres,liked:[],disliked:[],watched:[],liked_titles:[],ratings:{}});
  }
  return(
    <div style={{minHeight:"100vh",background:"#09090f",color:"#f0ece4",fontFamily:"'DM Sans',sans-serif",display:"flex",flexDirection:"column"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet"/>
      <div style={{position:"fixed",top:"-10%",left:"50%",transform:"translateX(-50%)",width:600,height:600,background:"radial-gradient(circle,#ff6b3515 0%,transparent 70%)",pointerEvents:"none"}}/>
      <div style={{flex:1,display:"flex",flexDirection:"column",padding:"40px 24px 32px",position:"relative",maxWidth:540,margin:"0 auto",width:"100%"}}>
        <div style={{display:"flex",gap:6,marginBottom:36}}>
          {[0,1].map(i=><div key={i} style={{flex:1,height:3,borderRadius:2,background:i<=step?"linear-gradient(90deg,#ff6b35,#e84393)":"#1e1830",opacity:i>step?0.3:1,transition:"all 0.4s"}}/>)}
        </div>
        {step===0&&(
          <div style={{animation:"fadeUp 0.4s ease"}}>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{display:"inline-block",background:"linear-gradient(135deg,#ff6b3522,#e8439322)",borderRadius:24,padding:"16px 24px",border:"1px solid #ff6b3533",marginBottom:16}}>
                <span style={{fontSize:48}}>🍿</span>
              </div>
              <h1 style={{fontFamily:"'Instrument Serif',serif",fontSize:34,margin:"0 0 8px",lineHeight:1.1}}>
                <span style={{background:"linear-gradient(135deg,#ff6b35,#e84393)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>StreamFinder</span>
              </h1>
              <p style={{color:"#a09aaa",fontSize:15,margin:0}}>Kein Bullshit. Nur gute Picks. 🎯</p>
            </div>
            <p style={{color:"#a09aaa",marginBottom:16,fontSize:14,textAlign:"center"}}>Welche Dienste hast du? (Alle die zutreffen)</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
              {PLATFORMS.map(p=>{
                const sel=plats.includes(p.id);
                return(<button key={p.id} onClick={()=>setPlats(s=>s.includes(p.id)?s.filter(x=>x!==p.id):[...s,p.id])} style={{background:sel?"linear-gradient(135deg,"+p.color+"33,"+p.color+"11)":"#12121f",border:"1px solid "+(sel?p.color+"88":"#1e1e30"),borderRadius:16,padding:"13px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:10,transition:"all 0.2s",boxShadow:sel?"0 0 16px "+p.color+"22":"none"}}>
                  <div style={{width:34,height:34,borderRadius:9,background:sel?p.color+"33":"#1a1a2e",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:900,color:sel?p.color:"#888",flexShrink:0}}>{p.icon}</div>
                  <span style={{fontSize:12,fontWeight:700,color:sel?"#f0ece4":"#6a5e70"}}>{p.name}</span>
                  {sel&&<span style={{marginLeft:"auto",color:"#ff6b35",fontSize:14}}>✓</span>}
                </button>);
              })}
            </div>
            <button onClick={()=>setPlats(s=>s.includes("mediatheken")?s.filter(x=>x!=="mediatheken"):[...s,"mediatheken"])} style={{width:"100%",background:plats.includes("mediatheken")?"linear-gradient(135deg,#004E8A33,#FA7D1922)":"#12121f",border:"1px solid "+(plats.includes("mediatheken")?"#004E8A88":"#1e1e30"),borderRadius:16,padding:"13px 16px",cursor:"pointer",display:"flex",alignItems:"center",gap:12,marginBottom:28,transition:"all 0.2s"}}>
              <div style={{width:34,height:34,borderRadius:9,background:"#1a1a2e",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>📡</div>
              <div style={{textAlign:"left"}}><div style={{fontSize:12,fontWeight:700,color:plats.includes("mediatheken")?"#f0ece4":"#6a5e70"}}>Öffentlich-Rechtliche</div><div style={{fontSize:10,color:"#888"}}>ARD · ZDF · Arte — komplett kostenlos!</div></div>
              {plats.includes("mediatheken")&&<span style={{marginLeft:"auto",color:"#ff6b35"}}>✓</span>}
            </button>
            <button onClick={()=>plats.length>0&&setStep(1)} style={{width:"100%",background:plats.length>0?"linear-gradient(135deg,#ff6b35,#e84393)":"#1a1525",border:"none",borderRadius:18,padding:"17px",color:plats.length>0?"#fff":"#444",cursor:plats.length>0?"pointer":"default",fontFamily:"'DM Sans'",fontWeight:800,fontSize:16,boxShadow:plats.length>0?"0 8px 28px #ff6b3540":"none",transition:"all 0.3s"}}>
              {plats.length>0?"Weiter — fast da! →":"Mindestens einen Dienst wählen"}
            </button>
          </div>
        )}
        {step===1&&(
          <div style={{animation:"fadeUp 0.4s ease"}}>
            <h2 style={{fontFamily:"'Instrument Serif',serif",fontSize:28,margin:"0 0 6px"}}><span style={{background:"linear-gradient(135deg,#ff6b35,#e84393)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Schon gesehen?</span></h2>
            <p style={{color:"#a09aaa",fontSize:13,marginBottom:6}}>Bewerte ein paar Klassiker — dann kennen wir deinen Geschmack.</p>
            <p style={{color:"#777",fontSize:11,marginBottom:18}}>❤️ Genial &nbsp;·&nbsp; 👎 Nope &nbsp;·&nbsp; ❓ Noch nicht</p>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:24}}>
              {REF_TITLES.map(rt=>{
                const r=ratings[rt.title];
                return(<div key={rt.title} style={{background:r==="love"?"linear-gradient(135deg,#ff6b3514,#e8439310)":r==="nope"?"#ef444410":"#12121f",borderRadius:14,padding:"11px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",border:"1px solid "+(r==="love"?"#ff6b3530":r==="nope"?"#ef444430":"#1e1e30"),transition:"all 0.2s"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:20}}>{rt.emoji}</span><span style={{fontSize:14,fontWeight:700,color:"#f0ece4"}}>{rt.title}</span></div>
                  <div style={{display:"flex",gap:5}}>
                    {[{v:"love",l:"❤️"},{v:"nope",l:"👎"},{v:"unknown",l:"❓"}].map(o=>(
                      <button key={o.v} onClick={()=>setRatings(s=>({...s,[rt.title]:o.v}))} style={{width:38,height:38,borderRadius:10,background:r===o.v?"#2a2340":"transparent",border:r===o.v?"2px solid #ff6b3555":"2px solid transparent",cursor:"pointer",fontSize:17,display:"flex",alignItems:"center",justifyContent:"center",transform:r===o.v?"scale(1.15)":"scale(1)",transition:"all 0.15s"}}>{o.l}</button>
                    ))}
                  </div>
                </div>);
              })}
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setStep(0)} style={{background:"transparent",border:"1px solid #2a2340",borderRadius:14,padding:"14px 20px",color:"#a09aaa",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:600}}>←</button>
              <button onClick={finish} style={{flex:1,background:"linear-gradient(135deg,#ff6b35,#e84393)",border:"none",borderRadius:14,padding:"14px",color:"#fff",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:800,fontSize:15,boxShadow:"0 6px 24px #ff6b3540"}}>
                {Object.keys(ratings).length>=3?"Los geht's! 🍿":"Überspringen →"}
              </button>
            </div>
          </div>
        )}
      </div>
      <style>{"@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}} *{box-sizing:border-box}"}</style>
    </div>
  );
}

// ── Main App ──
function MainApp({profile:initProfile,onReset}){
  const [profile,setProfile]=useState(initProfile);
  const [tab,setTab]=useState("home");
  const [showSettings,setSS]=useState(false);
  const [selectedItem,setSelectedItem]=useState(null);
  const [searchQuery,setSQ]=useState("");
  const [searchResults,setSR]=useState([]);
  const [searching,setSearching]=useState(false);
  const [similarItems,setSimilar]=useState([]);
  const [similarTitle,setSimTitle]=useState("");
  const [simLoading,setSimLoad]=useState(false);
  const [prevTab,setPrevTab]=useState("home");
  const searchRef=useRef(null);
  const [homeQuip]=useState(()=>rnd(QUIPS_HOME));

  const [heroItems,setHeroItems]=useState([]);
  const [feedItems,setFeedItems]=useState([]);
  const [feedLoading,setFeedLoading]=useState(true);
  const [activeMood,setActiveMood]=useState(null);
  const [aiRefreshing,setAiRefreshing]=useState(false);
  const [aiRecs,setAiRecs]=useState([]);

  const [surpriseData,setSurpriseData]=useState(null);
  const [surpriseLoading,setSurpriseLoading]=useState(false);
  const [oracleData,setOracleData]=useState(null);
  const [oracleLoading,setOracleLoading]=useState(false);
  const [personality,setPersonality]=useState(null);
  const [personalityLoading,setPersonalityLoading]=useState(false);

  const [browseType,setBrowseType]=useState("serie");
  const [top5Serie,setTop5Serie]=useState([]);
  const [top5Film,setTop5Film]=useState([]);
  const [top5Loading,setTop5Loading]=useState(true);
  const [browseItems,setBrowseItems]=useState([]);
  const [browseLoading,setBrowseLoading]=useState(false);
  const [browsePlatform,setBrowsePlatform]=useState(null);

  if(!profile.watched)profile.watched=[];
  if(!profile.liked_titles)profile.liked_titles=[];
  if(!profile.ratings)profile.ratings={};

  function updateProfile(fn){
    setProfile(prev=>{const next=fn(prev);sSet("sf_profile",next);return next;});
  }

  function handleLike(item){
    updateProfile(p=>{
      const id=item.id,title=item.title||item.name||"";
      const isLiked=(p.liked||[]).includes(id);
      const liked=isLiked?p.liked.filter(x=>x!==id):[...p.liked,id];
      const liked_titles=isLiked?(p.liked_titles||[]).filter(t=>t!==title):[...(p.liked_titles||[]),title];
      const genres={...p.genres};
      if(!isLiked)(item.genre_ids||[]).forEach(g=>{genres[g]=(genres[g]||0)+2;});
      return{...p,liked,liked_titles,genres,disliked:(p.disliked||[]).filter(x=>x!==id)};
    });
  }

  function handleRate(itemTitle,stars){
    updateProfile(p=>{
      const ratings={...(p.ratings||{}),[itemTitle]:stars};
      const ref=REF_TITLES.find(r=>r.title===itemTitle);
      const genres={...p.genres};
      if(ref){const boost=stars>=4?3:stars>=3?1:stars<=2&&stars>0?-2:0;if(boost!==0)ref.genres.forEach(g=>{genres[g]=(genres[g]||0)+boost;});}
      return{...p,ratings,genres};
    });
  }

  function handleWatched(item){
    updateProfile(p=>{
      const watched=p.watched||[];
      const exists=watched.some(w=>w.id===item.id);
      if(exists)return{...p,watched:watched.filter(w=>w.id!==item.id)};
      const entry={id:item.id,title:item.title||item.name||"?",poster_path:item.poster_path,genre_ids:item.genre_ids||[],vote_average:item.vote_average,media_type:item.media_type||"movie",addedAt:Date.now()};
      const genres={...p.genres};
      (item.genre_ids||[]).forEach(g=>{genres[g]=(genres[g]||0)+1;});
      return{...p,watched:[entry,...watched].slice(0,30),genres};
    });
  }

  const cardProps={profile,onRate:handleRate,onLike:handleLike,onWatched:handleWatched,onSelect:setSelectedItem};

  useEffect(()=>{
    loadHomeFeed();
    loadTop5();
  },[]);

  function loadHomeFeed(){
    const userPlats=PLATFORMS.filter(p=>profile.platforms.includes(p.id));
    if(!userPlats.length){setFeedLoading(false);return;}
    const allIds=userPlats.flatMap(p=>p.tmdbIds);
    const pg=Object.entries(profile.genres||{}).filter(([,v])=>v>0).sort(([,a],[,b])=>b-a).slice(0,3).map(([gid])=>gid);
    const genreStr=pg.length>0?pg.join("|"):null;
    const watchedIds=new Set((profile.watched||[]).map(w=>w.id));
    const disliked=new Set(profile.disliked||[]);
    setFeedLoading(true);
    Promise.all([getTrending("tv"),getTrending("movie"),discoverTitles("serie",allIds,genreStr,1,"vote_average.desc"),discoverTitles("film",allIds,genreStr,1,"vote_average.desc")])
    .then(([tser,tfil,dser,dfil])=>{
      const all=[...(tser.results||[]).map(r=>({...r,media_type:"tv"})),...(tfil.results||[]).map(r=>({...r,media_type:"movie"})),...(dser.results||[]).map(r=>({...r,media_type:"tv"})),...(dfil.results||[]).map(r=>({...r,media_type:"movie"}))];
      const seen=new Set();const deduped=[];
      all.forEach(item=>{if(!seen.has(item.id)&&!disliked.has(item.id)&&!watchedIds.has(item.id)&&item.vote_average>=6){seen.add(item.id);deduped.push(item);}});
      deduped.forEach(item=>{let s=(item.vote_average||0)*2;(item.genre_ids||[]).forEach(g=>{s+=(profile.genres[g]||0)*0.5;});item._score=s;});
      deduped.sort((a,b)=>b._score-a._score);
      setHeroItems(deduped.slice(0,3));setFeedItems(deduped.slice(3,20));setFeedLoading(false);
    }).catch(()=>setFeedLoading(false));
  }

  function loadTop5(){
    setTop5Loading(true);
    Promise.all([getTop5(profile,"serie"),getTop5(profile,"film")])
    .then(([s,f])=>{setTop5Serie(s);setTop5Film(f);setTop5Loading(false);})
    .catch(()=>setTop5Loading(false));
  }

  async function doAiRefresh(){
    setAiRefreshing(true);setAiRecs([]);
    const recs=await refreshHomeRecs(profile).catch(()=>[]);
    setAiRecs(recs);setAiRefreshing(false);
  }

  function applyMood(mood){
    if(activeMood===mood.id){setActiveMood(null);loadHomeFeed();return;}
    setActiveMood(mood.id);
    const userPlats=PLATFORMS.filter(p=>profile.platforms.includes(p.id));
    const allIds=userPlats.flatMap(p=>p.tmdbIds);
    const watchedIds=new Set((profile.watched||[]).map(w=>w.id));
    const disliked=new Set(profile.disliked||[]);
    setFeedLoading(true);
    Promise.all([discoverTitles("serie",allIds,mood.genres.join("|"),1,"popularity.desc"),discoverTitles("film",allIds,mood.genres.join("|"),1,"popularity.desc")])
    .then(([ser,fil])=>{
      const all=[...(ser.results||[]).map(r=>({...r,media_type:"tv"})),...(fil.results||[]).map(r=>({...r,media_type:"movie"}))];
      const seen=new Set();const deduped=[];
      all.forEach(item=>{if(!seen.has(item.id)&&!disliked.has(item.id)&&!watchedIds.has(item.id)){seen.add(item.id);deduped.push(item);}});
      deduped.sort((a,b)=>(b.vote_average||0)-(a.vote_average||0));
      setHeroItems(deduped.slice(0,3));setFeedItems(deduped.slice(3,20));setFeedLoading(false);
    }).catch(()=>setFeedLoading(false));
  }

  async function doSurprise(){
    setSurpriseLoading(true);setSurpriseData(null);
    setSurpriseData(await getSurprise(profile).catch(()=>null));
    setSurpriseLoading(false);
  }

  async function doOracle(){
    setOracleLoading(true);setOracleData(null);
    setOracleData(await getOracle(profile).catch(()=>null));
    setOracleLoading(false);
  }

  async function doPersonality(){
    setPersonalityLoading(true);setPersonality(null);
    setPersonality(await getPersonalityType(profile).catch(()=>null));
    setPersonalityLoading(false);
  }

  function loadBrowse(pl,type){
    const t=type||browseType;
    setBrowsePlatform(pl);setBrowseLoading(true);setBrowseItems([]);
    const pg=Object.entries(profile.genres||{}).filter(([,v])=>v>0).sort(([,a],[,b])=>b-a).slice(0,3).map(([gid])=>gid);
    const genreStr=pg.length>0?pg.join("|"):null;
    discoverTitles(t,pl.tmdbIds,genreStr,1,"popularity.desc").then(res=>{
      setBrowseItems((res.results||[]).map(r=>({...r,media_type:t==="serie"?"tv":"movie"})).slice(0,25));
      setBrowseLoading(false);
    }).catch(()=>setBrowseLoading(false));
  }

  function handleSearch(q){
    setSQ(q);
    if(searchRef.current)clearTimeout(searchRef.current);
    if(!q.trim()){setSR([]);return;}
    searchRef.current=setTimeout(()=>{
      setSearching(true);
      searchTitles(q).then(data=>{setSR((data?.results||[]).filter(r=>r.media_type==="movie"||r.media_type==="tv").slice(0,15));setSearching(false);}).catch(()=>setSearching(false));
    },400);
  }

  const userPlatforms=PLATFORMS.filter(p=>profile.platforms.includes(p.id));
  const top5Current=browseType==="serie"?top5Serie:top5Film;
  const day=WEEKDAY_VIBES[new Date().getDay()===0?6:new Date().getDay()-1];

  const tabs=[
    {id:"home",    label:"Für dich",  icon:"✨"},
    {id:"browse",  label:"Entdecken", icon:"🔍"},
    {id:"fun",     label:"Spaß",      icon:"🎲"},
    {id:"liked",   label:"Merkliste", icon:"❤️"},
    {id:"history", label:"Verlauf",   icon:"📋"},
  ];

  return(
    <div style={{minHeight:"100vh",background:"#09090f",color:"#f0ece4",fontFamily:"'DM Sans',sans-serif",paddingBottom:90}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet"/>

      {selectedItem&&<DetailModal item={selectedItem} profile={profile} onClose={()=>setSelectedItem(null)} onRate={handleRate} onLike={handleLike} onWatched={handleWatched}/>}

      {/* Header */}
      <div style={{padding:"20px 18px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{background:"linear-gradient(135deg,#ff6b3522,#e8439322)",borderRadius:14,padding:"8px 10px",border:"1px solid #ff6b3530"}}>
            <span style={{fontSize:24}}>🍿</span>
          </div>
          <div>
            <h1 style={{fontFamily:"'Instrument Serif',serif",fontSize:22,margin:0,background:"linear-gradient(135deg,#ff6b35,#e84393)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:"-0.5px"}}>StreamFinder</h1>
            <p style={{fontSize:10,color:"#777",margin:0,fontStyle:"italic"}}>{homeQuip}</p>
          </div>
        </div>
        <button onClick={()=>setSS(!showSettings)} style={{background:"#12121f",border:"1px solid #1e1e30",borderRadius:12,width:40,height:40,cursor:"pointer",color:"#888",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>⚙️</button>
      </div>
      {showSettings&&(
        <div style={{margin:"10px 18px",padding:14,background:"#12121f",borderRadius:14,border:"1px solid #1e1e30"}}>
          <p style={{fontSize:12,color:"#777",margin:"0 0 10px"}}>Neustart? Alles löschen und von vorne? Na gut.</p>
          <button onClick={onReset} style={{background:"#E5091418",border:"1px solid #E5091444",borderRadius:10,padding:"9px 18px",color:"#E50914",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:600,fontSize:12}}>🔄 Alles zurücksetzen</button>
        </div>
      )}

      <div style={{paddingTop:14}}>

        {/* HOME */}
        {tab==="home"&&(
          <div>
            {/* Mood */}
            <div style={{padding:"0 18px",marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <p style={{fontSize:11,color:"#888",fontWeight:700,textTransform:"uppercase",letterSpacing:0.8,margin:0}}>Stimmung — {day}?</p>
                <button onClick={doAiRefresh} disabled={aiRefreshing} style={{background:"linear-gradient(135deg,#ff6b3522,#e8439322)",border:"1px solid #ff6b3530",borderRadius:10,padding:"6px 12px",color:"#ff6b35",cursor:"pointer",fontSize:11,fontFamily:"'DM Sans'",fontWeight:700,display:"flex",alignItems:"center",gap:4}}>
                  <span style={{display:"inline-block",animation:aiRefreshing?"spin 1s linear infinite":"none"}}>🔄</span>
                  {aiRefreshing?"Lädt…":"Neue Picks"}
                </button>
              </div>
              <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4}}>
                {MOODS.map(m=>{
                  const active=activeMood===m.id;
                  return(<button key={m.id} onClick={()=>applyMood(m)} style={{background:active?"linear-gradient(135deg,#ff6b35,#e84393)":"#12121f",border:"1px solid "+(active?"transparent":"#1e1e30"),borderRadius:20,padding:"8px 14px",cursor:"pointer",color:active?"#fff":"#8a7e90",fontFamily:"'DM Sans'",fontWeight:700,fontSize:12,whiteSpace:"nowrap",flexShrink:0,transition:"all 0.2s",display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:16}}>{m.emoji}</span>{m.label}
                  </button>);
                })}
              </div>
            </div>

            {/* AI Refresh Recs */}
            {aiRecs.length>0&&(
              <div style={{padding:"0 18px",marginBottom:14}}>
                <p style={{fontSize:11,color:"#ff6b35",fontWeight:700,textTransform:"uppercase",letterSpacing:0.8,marginBottom:10}}>✨ Frische Picks für dich</p>
                <div style={{display:"flex",gap:10,overflowX:"auto",paddingBottom:4}}>
                  {aiRecs.map((rec,i)=>{
                    const pl=PLATFORMS.find(p=>p.name===rec.platform)||null;
                    return(<div key={i} style={{flexShrink:0,width:150,background:"linear-gradient(145deg,#1a1525,#130f1e)",border:"1px solid "+(pl?pl.color+"33":"#2a1f3d"),borderRadius:16,padding:14,cursor:"pointer"}} onClick={()=>setSelectedItem({title:rec.title,name:rec.title,overview:rec.reason,vote_average:0,genre_ids:[],poster_path:null,media_type:rec.type==="Serie"?"tv":"movie",release_date:rec.year||""})}>
                      <div style={{fontSize:24,marginBottom:6}}>{rec.emoji||"🎬"}</div>
                      <div style={{fontSize:13,fontWeight:800,color:"#f0ece4",marginBottom:3,lineHeight:1.2}}>{rec.title}</div>
                      {rec.year&&<div style={{fontSize:10,color:"#888",marginBottom:4}}>{rec.year} · {rec.type}</div>}
                      {pl&&<div style={{fontSize:10,color:pl.color,fontWeight:700,marginBottom:4}}>{pl.icon} {pl.name}</div>}
                      <p style={{fontSize:11,color:"#a09aaa",margin:0,lineHeight:1.4,fontStyle:"italic"}}>"{rec.reason}"</p>
                    </div>);
                  })}
                </div>
              </div>
            )}

            {feedLoading?(
              <div style={{textAlign:"center",padding:40}}><div style={{fontSize:28,animation:"spin 2s linear infinite",display:"inline-block"}}>🍿</div><p style={{fontSize:13,color:"#888",marginTop:8}}>Einen Moment… schauen was gut ist.</p></div>
            ):(
              <div style={{padding:"0 18px"}}>
                {heroItems.length>0&&(<div style={{marginBottom:10}}><p style={{fontSize:11,color:"#888",fontWeight:700,textTransform:"uppercase",letterSpacing:0.8,marginBottom:10}}>Top-Picks</p>{heroItems.map(item=><HeroCard key={item.id} item={item} {...cardProps}/>)}</div>)}
                {feedItems.length>0&&(<div><p style={{fontSize:11,color:"#888",fontWeight:700,textTransform:"uppercase",letterSpacing:0.8,marginBottom:10}}>Weitere Empfehlungen</p>{feedItems.map(item=><TitleCard key={item.id} item={item} {...cardProps}/>)}</div>)}
              </div>
            )}
          </div>
        )}

        {/* BROWSE */}
        {tab==="browse"&&(
          <div style={{padding:"0 18px"}}>
            <input value={searchQuery} onChange={e=>handleSearch(e.target.value)} placeholder="Titel suchen… 🔍" style={{width:"100%",padding:"13px 16px",borderRadius:14,background:"#12121f",border:"1px solid #1e1e30",color:"#e8e6e1",fontFamily:"'DM Sans'",fontSize:14,outline:"none",marginBottom:14}}/>
            {searchQuery?(
              <div>
                {searching&&<p style={{color:"#888",fontSize:13,textAlign:"center"}}>Suche…</p>}
                {searchResults.map(item=><TitleCard key={item.id} item={item} {...cardProps}/>)}
              </div>
            ):(
              <div>
                {/* Serie/Film Tabs */}
                <div style={{display:"flex",gap:8,marginBottom:16}}>
                  {["serie","film"].map(t=>(
                    <button key={t} onClick={()=>{setBrowseType(t);if(browsePlatform)loadBrowse(browsePlatform,t);}} style={{flex:1,padding:"10px",borderRadius:12,background:browseType===t?"linear-gradient(135deg,#ff6b35,#e84393)":"#12121f",border:"1px solid "+(browseType===t?"transparent":"#1e1e30"),color:browseType===t?"#fff":"#888",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:700,fontSize:13,transition:"all 0.2s"}}>
                      {t==="serie"?"📺 Serien":"🎬 Filme"}
                    </button>
                  ))}
                </div>

                {/* Top 5 */}
                <div style={{background:"linear-gradient(135deg,#1a1525,#13101e)",borderRadius:18,padding:"14px 16px",marginBottom:16,border:"1px solid #2a1f3d"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <p style={{fontSize:11,color:"#ff6b35",fontWeight:700,textTransform:"uppercase",letterSpacing:0.8,margin:0}}>🎯 Top 5 — Nur für dich</p>
                    <button onClick={loadTop5} style={{background:"transparent",border:"none",color:"#888",cursor:"pointer",fontSize:12,fontFamily:"'DM Sans'"}}>🔄</button>
                  </div>
                  {top5Loading?(
                    <div style={{textAlign:"center",padding:10}}><div style={{fontSize:20,animation:"spin 1.5s linear infinite",display:"inline-block"}}>✨</div><p style={{fontSize:12,color:"#888",marginTop:6}}>Analysiere Geschmack…</p></div>
                  ):top5Current.length===0?(
                    <p style={{fontSize:12,color:"#888",textAlign:"center"}}>Noch zu wenig Daten — bewerte ein paar Titel!</p>
                  ):top5Current.map((rec,i)=>{
                    const pl=PLATFORMS.find(p=>p.name===rec.platform)||null;
                    return(
                      <div key={i} style={{display:"flex",gap:12,padding:"10px 0",borderBottom:i<top5Current.length-1?"1px solid #1e1e30":"none",alignItems:"flex-start",cursor:"pointer"}} onClick={()=>setSelectedItem({title:rec.title,name:rec.title,overview:rec.reason,vote_average:0,genre_ids:[],poster_path:null,media_type:"movie",release_date:rec.year||""})}>
                        <div style={{width:32,height:32,borderRadius:10,background:pl?pl.color+"22":"#1a1a2e",border:"1px solid "+(pl?pl.color+"44":"#2a2340"),display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{rec.emoji||"🎬"}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                            <span style={{fontSize:14,fontWeight:800,color:"#f0ece4"}}>{rec.title}</span>
                            {rec.year&&<span style={{fontSize:10,color:"#888",background:"#0d0d18",padding:"2px 6px",borderRadius:5}}>{rec.year}</span>}
                          </div>
                          {pl&&<div style={{fontSize:10,color:pl.color,fontWeight:700,marginBottom:2}}>{pl.icon} {pl.name}</div>}
                          <p style={{fontSize:11,color:"#a09aaa",margin:0,lineHeight:1.4,fontStyle:"italic"}}>"{rec.reason}"</p>
                        </div>
                        <div style={{fontSize:16,fontWeight:900,color:"#2a2340",flexShrink:0}}>#{i+1}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Platforms */}
                <p style={{fontSize:11,color:"#888",fontWeight:700,textTransform:"uppercase",letterSpacing:0.8,marginBottom:10}}>Deine Dienste</p>
                {userPlatforms.map(p=><PlatformCard key={p.id} platform={p} profile={profile} onBrowse={pl=>loadBrowse(pl)} onSelect={setSelectedItem} browseType={browseType}/>)}
                {profile.platforms.includes("mediatheken")&&<MediathekenGroup/>}
                {browseLoading&&<div style={{textAlign:"center",padding:30}}><div style={{fontSize:28,animation:"spin 2s linear infinite",display:"inline-block"}}>🍿</div></div>}
                {!browseLoading&&browseItems.map(item=><TitleCard key={item.id} item={item} {...cardProps}/>)}
              </div>
            )}
          </div>
        )}

        {/* FUN */}
        {tab==="fun"&&(
          <div style={{padding:"0 18px"}}>
            <h2 style={{fontFamily:"'Instrument Serif',serif",fontSize:26,margin:"0 0 4px",background:"linear-gradient(135deg,#ff6b35,#e84393)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>🎲 Spaß-Ecke</h2>
            <p style={{fontSize:12,color:"#888",marginBottom:20}}>Weil normales Suchen so langweilig ist.</p>

            {/* Überrasch mich */}
            <div style={{background:"linear-gradient(135deg,#1a1525,#13101e)",borderRadius:20,padding:20,marginBottom:16,border:"1px solid #2a1f3d",textAlign:"center"}}>
              <div style={{fontSize:36,marginBottom:8}}>🎲</div>
              <h3 style={{fontFamily:"'Instrument Serif',serif",fontSize:20,margin:"0 0 6px",color:"#f0ece4"}}>Überrasch mich!</h3>
              <p style={{fontSize:13,color:"#a09aaa",marginBottom:14}}>Du kannst dich nicht entscheiden? Kein Problem. Wir entscheiden. Du schaust. Ende der Diskussion.</p>
              {!surpriseData&&!surpriseLoading&&(
                <button onClick={doSurprise} style={{background:"linear-gradient(135deg,#ff6b35,#e84393)",border:"none",borderRadius:14,padding:"14px 28px",color:"#fff",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:800,fontSize:15,boxShadow:"0 6px 24px #ff6b3540"}}>🎰 Schicksal herausfordern</button>
              )}
              {surpriseLoading&&<div><div style={{fontSize:32,animation:"spin 1s linear infinite",display:"inline-block"}}>🎲</div><p style={{fontSize:13,color:"#c4b8c8",marginTop:8}}>Würfelt… die Spannung ist kaum auszuhalten.</p></div>}
              {surpriseData&&!surpriseLoading&&(
                <div style={{animation:"fadeUp 0.5s ease"}}>
                  <p style={{fontSize:14,color:"#ff6b35",fontWeight:800,marginBottom:8}}>{rnd(SURPRISE_MSGS)}</p>
                  <div style={{background:"#0d0d18",borderRadius:14,padding:"16px",marginBottom:12,textAlign:"left",border:"1px solid #2a1f3d"}}>
                    <div style={{fontSize:28,marginBottom:8}}>{surpriseData.emoji||"🎬"}</div>
                    <div style={{fontSize:18,fontWeight:800,color:"#f0ece4",marginBottom:4}}>{surpriseData.title} {surpriseData.year&&<span style={{fontSize:12,color:"#b0a8b8"}}>({surpriseData.year})</span>}</div>
                    {surpriseData.platform&&<div style={{fontSize:12,color:"#ff6b35",fontWeight:700,marginBottom:8}}>{surpriseData.platform}</div>}
                    <p style={{fontSize:13,color:"#c4b8c8",fontStyle:"italic",lineHeight:1.6,margin:0}}>"{surpriseData.prophecy}"</p>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>setSelectedItem({title:surpriseData.title,name:surpriseData.title,overview:surpriseData.prophecy,vote_average:0,genre_ids:[],poster_path:null,media_type:"movie",release_date:surpriseData.year||""})} style={{flex:1,background:"#1a1a2e",border:"1px solid #2a2340",borderRadius:12,padding:"10px",color:"#c4b8c8",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:700,fontSize:12}}>Details</button>
                    <button onClick={doSurprise} style={{flex:1,background:"transparent",border:"1px solid #ff6b3544",borderRadius:12,padding:"10px",color:"#ff6b35",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:700,fontSize:12}}>🎲 Nochmal</button>
                  </div>
                </div>
              )}
            </div>

            {/* Orakel — separates Ergebnis */}
            <div style={{background:"linear-gradient(135deg,#1a1020,#130818)",borderRadius:20,padding:20,marginBottom:16,border:"1px solid #3d1f5a",textAlign:"center"}}>
              <div style={{fontSize:36,marginBottom:8}}>🔮</div>
              <h3 style={{fontFamily:"'Instrument Serif',serif",fontSize:20,margin:"0 0 6px",color:"#d4b8f0"}}>Das Orakel des Abends</h3>
              <p style={{fontSize:13,color:"#a09aaa",marginBottom:14}}>Mystischer als "Überrasch mich". Unabhängig. Und deutlich dramatischer.</p>
              {!oracleData&&!oracleLoading&&(
                <button onClick={doOracle} style={{background:"linear-gradient(135deg,#7c3aed,#e84393)",border:"none",borderRadius:14,padding:"14px 28px",color:"#fff",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:800,fontSize:15,boxShadow:"0 6px 24px #7c3aed44"}}>
                  🔮 Orakel befragen
                </button>
              )}
              {oracleLoading&&<div><div style={{fontSize:32,animation:"spin 2s linear infinite",display:"inline-block"}}>🔮</div><p style={{fontSize:13,color:"#c4b8c8",marginTop:8}}>Das Orakel meditiert… bitte Geduld.</p></div>}
              {oracleData&&!oracleLoading&&(
                <div style={{animation:"fadeUp 0.5s ease"}}>
                  <div style={{background:"rgba(124,58,237,0.12)",borderRadius:14,padding:"16px",marginBottom:12,textAlign:"left",border:"1px solid #3d1f5a"}}>
                    <div style={{fontSize:28,marginBottom:8}}>{oracleData.emoji||"🔮"}</div>
                    <div style={{fontSize:18,fontWeight:800,color:"#f0ece4",marginBottom:4}}>{oracleData.title} {oracleData.year&&<span style={{fontSize:12,color:"#b0a8b8"}}>({oracleData.year})</span>}</div>
                    {oracleData.platform&&<div style={{fontSize:12,color:"#a78bfa",fontWeight:700,marginBottom:8}}>{oracleData.platform}</div>}
                    <p style={{fontSize:13,color:"#c4b8d4",fontStyle:"italic",lineHeight:1.6,margin:0}}>"{oracleData.prophecy}"</p>
                  </div>
                  <button onClick={doOracle} style={{background:"transparent",border:"1px solid #3d1f5a",borderRadius:12,padding:"10px 20px",color:"#a78bfa",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:700,fontSize:13}}>🔮 Neu befragen</button>
                </div>
              )}
            </div>

            {/* Persönlichkeit */}
            <div style={{background:"linear-gradient(135deg,#0f1a1a,#0d1f1a)",borderRadius:20,padding:20,border:"1px solid #1f3d2a"}}>
              <div style={{fontSize:36,marginBottom:8,textAlign:"center"}}>🧠</div>
              <h3 style={{fontFamily:"'Instrument Serif',serif",fontSize:20,margin:"0 0 6px",color:"#a0f0c8",textAlign:"center"}}>Dein Streaming-Typ</h3>
              <p style={{fontSize:12,color:"#a09aaa",marginBottom:14,textAlign:"center"}}>Wir analysieren deine Bewertungen und enthüllen wer du wirklich bist. Bitte nicht erschrecken.</p>
              {!personality&&!personalityLoading&&(
                <button onClick={doPersonality} style={{width:"100%",background:"linear-gradient(135deg,#22d3ee,#4ade80)",border:"none",borderRadius:14,padding:"14px",color:"#0d1f1a",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:800,fontSize:15}}>🔬 Persönlichkeit analysieren</button>
              )}
              {personalityLoading&&<div style={{textAlign:"center"}}><div style={{fontSize:28,animation:"spin 1.5s linear infinite",display:"inline-block"}}>🧠</div><p style={{fontSize:12,color:"#888",marginTop:8}}>Analysiere Filmgeschmack… bitte ehrlich bleiben.</p></div>}
              {personality&&!personalityLoading&&(
                <div style={{animation:"fadeUp 0.5s ease"}}>
                  <div style={{background:"#0d1a14",borderRadius:16,padding:"16px",border:"1px solid #1f3d2a",marginBottom:12,textAlign:"center"}}>
                    <div style={{fontSize:40,marginBottom:8}}>{personality.emoji||"🎬"}</div>
                    <div style={{fontSize:20,fontWeight:800,color:"#4ade80",marginBottom:6}}>{personality.type}</div>
                    <p style={{fontSize:13,color:"#a0f0c8",lineHeight:1.6,marginBottom:8}}>{personality.description}</p>
                    <div style={{background:"#0a1410",borderRadius:10,padding:"8px 12px",marginBottom:8}}>
                      <span style={{fontSize:11,color:"#ef4444",fontWeight:700}}>⚠️ Schwäche: </span>
                      <span style={{fontSize:11,color:"#888"}}>{personality.weakness}</span>
                    </div>
                    <div style={{background:"#0a1410",borderRadius:10,padding:"8px 12px"}}>
                      <span style={{fontSize:11,color:"#4ade80",fontWeight:700}}>🎯 Perfekt für dich: </span>
                      <span style={{fontSize:11,color:"#888"}}>{personality.recommendation}</span>
                    </div>
                  </div>
                  <button onClick={doPersonality} style={{width:"100%",background:"transparent",border:"1px solid #1f3d2a",borderRadius:12,padding:"10px",color:"#4ade80",cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:700,fontSize:13}}>🔄 Nochmal analysieren</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* LIKED */}
        {tab==="liked"&&(
          <div style={{padding:"0 18px"}}>
            <h3 style={{fontSize:20,fontWeight:800,marginBottom:14}}>❤️ Merkliste</h3>
            {(profile.liked||[]).length===0
              ?<div style={{textAlign:"center",padding:40,color:"#777"}}><div style={{fontSize:40,marginBottom:10}}>🤍</div><p>Noch nichts gemerkt. Raus da und schauen!</p></div>
              :[...heroItems,...feedItems,...searchResults,...browseItems].filter((item,idx,arr)=>(profile.liked||[]).includes(item.id)&&arr.findIndex(x=>x.id===item.id)===idx).map(item=><TitleCard key={item.id} item={item} {...cardProps}/>)
            }
          </div>
        )}

        {/* HISTORY */}
        {tab==="history"&&(
          <div style={{padding:"0 18px"}}>
            <h3 style={{fontSize:20,fontWeight:800,marginBottom:6}}>📋 Verlauf</h3>
            <p style={{fontSize:12,color:"#888",marginBottom:16}}>Je mehr du markierst, desto besser die Empfehlungen. Der Algorithmus beobachtet. Er urteilt. Er empfiehlt.</p>
            {(profile.watched||[]).length===0
              ?<div style={{textAlign:"center",padding:40,color:"#777"}}><div style={{fontSize:40,marginBottom:10}}>📋</div><p>Noch keine Titel gesehen. Oder du gibst's nicht zu.</p></div>
              :(profile.watched||[]).map(w=>(
                <div key={w.id} style={{background:"#12121f",borderRadius:14,padding:"12px",border:"1px solid #1e1e30",display:"flex",alignItems:"center",gap:12,marginBottom:8,cursor:"pointer"}} onClick={()=>setSelectedItem(w)}>
                  {w.poster_path?<img src={TMDB_IMG+w.poster_path} alt="" style={{width:36,height:54,borderRadius:8,objectFit:"cover",flexShrink:0}}/>:<div style={{width:36,height:54,borderRadius:8,background:"#1a1a2e",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>🎬</div>}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{w.title}</div>
                    <div style={{fontSize:11,color:"#888",marginTop:2}}>{w.media_type==="tv"?"Serie":"Film"}</div>
                    {(profile.ratings||{})[w.title]>0&&<div style={{fontSize:12,color:"#f5c518",marginTop:2}}>{"★".repeat((profile.ratings||{})[w.title])+"☆".repeat(5-((profile.ratings||{})[w.title]))}</div>}
                  </div>
                  <button onClick={e=>{e.stopPropagation();handleWatched(w);}} style={{padding:"7px 10px",borderRadius:10,background:"#1a1a2e",border:"1px solid #2a2340",color:"#888",cursor:"pointer",fontSize:12}}>✕</button>
                </div>
              ))
            }
            {(()=>{
              const sorted=Object.entries(profile.genres||{}).filter(([,v])=>v>0).sort(([,a],[,b])=>b-a).slice(0,6);
              if(!sorted.length)return null;
              const max=sorted[0][1];
              const colors=["linear-gradient(90deg,#ff6b35,#e84393)","#e84393","#ff6b35","#fbbf24","#4ade80","#00A8E1"];
              return(
                <div style={{marginTop:20,background:"#12121f",borderRadius:14,padding:16,border:"1px solid #1e1e30"}}>
                  <p style={{fontSize:11,color:"#888",fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginBottom:12}}>Dein Geschmacksprofil</p>
                  {sorted.map(([gid,val],i)=>(
                    <div key={gid} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                      <span style={{fontSize:15,width:22}}>{GENRE_EMOJI[gid]||"🎬"}</span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:12,fontWeight:600,marginBottom:3,color:"#c4b8c8"}}>{GENRES_TMDB[gid]||gid}</div>
                        <div style={{height:4,borderRadius:2,background:"#1a1a2e",overflow:"hidden"}}>
                          <div style={{height:"100%",borderRadius:2,width:(val/max*100)+"%",background:colors[i]||"#e84393",transition:"width 0.6s"}}/>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"linear-gradient(180deg,transparent,#09090f 40%)",backdropFilter:"blur(20px)",borderTop:"1px solid #1e1e30",display:"flex",padding:"8px 8px 20px",zIndex:100}}>
        {tabs.map(t=>{
          const isActive=tab===t.id;
          return(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,background:isActive?"linear-gradient(135deg,#ff6b3520,#e8439318)":"transparent",border:isActive?"1px solid #ff6b3530":"1px solid transparent",borderRadius:14,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"8px 4px",color:isActive?"#ff6b35":"#4a3e5a",transition:"all 0.2s"}}>
              <span style={{fontSize:18}}>{t.icon}</span>
              <span style={{fontSize:9,fontWeight:800,fontFamily:"'DM Sans'"}}>{t.label}</span>
            </button>
          );
        })}
      </div>
      <style>{"@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}} @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} *{box-sizing:border-box}"}</style>
    </div>
  );
}

export default function StreamFinder(){
  const [profile,setProfile]=useState(()=>sGet("sf_profile"));
  function handleComplete(p){sSet("sf_profile",p);setProfile(p);}
  function handleReset(){sDel("sf_profile");setProfile(null);}
  if(!profile)return<Onboarding onComplete={handleComplete}/>;
  return<MainApp profile={profile} onReset={handleReset}/>;
}
