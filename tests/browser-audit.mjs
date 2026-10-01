import fs from "node:fs";
const { chromium } = await import("/tmp/auditpw/node_modules/playwright/index.mjs");
const base = "https://fuzzy-heart-project.lovable.app";
const routes = {"/":"home","/catalogo":"catalog","/como-funciona":"how","/regras":"rules","/impacto":"impact","/avaliacao":"feedback","/adm":"adm","/admin/ferramentas":"adm"};
const failed = [];
const results = [];
const browser = await chromium.launch({headless:true,args:["--no-sandbox"]});
fs.mkdirSync("audit-screenshots",{recursive:true});
for (const [path,expected] of Object.entries(routes)) {
  const page = await browser.newPage({viewport:{width:1280,height:800}});
  const consoleErrors=[]; const pageErrors=[];
  page.on("console",msg=>{ if(msg.type()==="error") consoleErrors.push(msg.text()) });
  page.on("pageerror",err=>pageErrors.push(String(err)));
  try {
    const response = await page.goto(base+path,{waitUntil:"domcontentloaded",timeout:30000});
    await page.waitForTimeout(1200);
    const state = await page.evaluate(() => ({
      active: document.querySelector(".screen.active")?.id,
      css: !!document.querySelector('link[href="/brecho-style-ux-v2.css"]'),
      cssLoaded: [...document.styleSheets].some(s=>s.href?.includes("/brecho-style-ux-v2.css")),
      title: document.title,
      width: document.documentElement.scrollWidth,
      pathname: location.pathname,
      readyState: document.readyState,
      activeIds: [...document.querySelectorAll(".screen.active")].map(x=>x.id),
      shellCount: document.querySelectorAll(".screen").length
    }));
    const appJs = await page.evaluate(async()=>{ try{return await (await fetch("/brecho-app-ux-v2.js?audit="+Date.now(),{cache:"no-store"})).text()}catch(e){return "FETCH_ERROR:"+e} });
    state.appHasProductsReady = appJs.includes("productsReady");
    state.appHasImmediateRouteInit = appJs.includes("routeToCurrentLocation({replaceInvalid:false})");
    state.appBytes = appJs.length;
    state.consoleErrors = consoleErrors;
    state.pageErrors = pageErrors;
    const ok = response.status()===200 && state.active===expected && state.cssLoaded;
    results.push({path,ok,http:response.status(),...state});
    if(!ok)failed.push(path);
    await page.screenshot({path:"audit-screenshots/"+path.replaceAll("/","_")+".png",fullPage:true});
  } catch(error) { failed.push(path); results.push({path,error:String(error).slice(0,500)}); }
  await page.close();
}
const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true});
try {
 await page.goto(base+"/",{waitUntil:"domcontentloaded",timeout:30000});
 await page.locator("#menu-toggle").click({timeout:9000});
 const open=await page.locator("#mobile-menu").evaluate(el=>el.classList.contains("open"));
 results.push({path:"mobile-menu",ok:open});
 if(!open)failed.push("mobile-menu");
 await page.screenshot({path:"audit-screenshots/mobile.png",fullPage:true});
} catch(error){failed.push("mobile-menu");results.push({path:"mobile-menu",error:String(error).slice(0,400)})}
await browser.close();
console.log("LIVE_BROWSER_RESULTS",JSON.stringify(results));
console.log("LIVE_BROWSER_FAILED",JSON.stringify(failed));
if(failed.length)process.exitCode=1;
