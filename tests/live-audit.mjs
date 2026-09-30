const base = "https://fuzzy-heart-project.lovable.app";
const paths = ["/", "/adm", "/catalogo", "/admin/ferramentas"];
const timeoutMs = 15000;
async function check(path) {
  try {
    const res = await fetch(base + path + "?__audit=" + Date.now(), {signal: AbortSignal.timeout(timeoutMs)});
    const html = await res.text();
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.slice(0,130) ?? "?";
    const srcs = [...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/gi)].map(m=>m[1]).filter(u=>!u.includes("fonts.googleapis"));
    const css = srcs.filter(u=>/css(\?|$)|stylesheet|style\.css/i.test(u));
    const js = srcs.filter(u=>/\.js(\?|$)|\/@vite/i.test(u));
    console.log("ROUTE",JSON.stringify({path,status:res.status,url:res.url,contentType:res.headers.get("content-type"),title,htmlBytes:html.length,hasShell:html.includes('id="desktop-nav"'),hasMain:html.includes('id="home"'),css,js,preview:html.slice(0,260)}));
    for(const u of [...css,...js].filter(x=>x.startsWith("/")).slice(0,8)){
      try {
        const a = await fetch(base+u,{signal:AbortSignal.timeout(timeoutMs)});
        const txt = await a.text();
        console.log("ASSET",JSON.stringify({path:u,status:a.status,contentType:a.headers.get("content-type"),bytes:txt.length,prefix:txt.slice(0,120)}));
      }catch(error){console.log("ASSET_ERR",u,String(error))}
    }
  }catch(error){console.log("ROUTE_ERR",path,String(error))}
}
for(const path of paths)await check(path);
