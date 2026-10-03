/** Pinned Sentry browser bundle (tracing + replay). */
export const SENTRY_BROWSER_BUNDLE_URL =
  "https://browser.sentry-cdn.com/8.55.0/bundle.tracing.replay.min.js";

export type BootstrapConfig = {
  dsn: string;
  tunnel: string;
  patterns: Array<{ pageType: string; pathnameGlob: string }>;
  tracesSampleRate: number;
  replaysSessionSampleRate: number;
  replaysOnErrorSampleRate: number;
};

export function renderBootstrapScript(config: BootstrapConfig): string {
  const cfg = JSON.stringify(config);
  return `(function(){
var C=${cfg};
function norm(p){if(!p||p.charAt(0)!=="/")p="/"+p;return p.replace(/\\/+$/, "")||"/";}
function globToRe(g){var n=norm(g),o="^",i=0;while(i<n.length){if(n[i]==="*"&&n[i+1]==="*"){o+=".*";i+=2;continue;}if(n[i]==="*"){o+="[^/]+";i+=1;continue;}var c=n[i];if(/[+.^$()|[\\]\\\\]/.test(c))o+="\\\\"+c;else o+=c;i+=1;}return new RegExp(o+"$");}
var rules=C.patterns.map(function(r){return{pageType:r.pageType,re:globToRe(r.pathnameGlob)};});
function matchType(path){var p=norm(path);for(var i=0;i<rules.length;i++){if(rules[i].re.test(p))return rules[i].pageType;}return null;}
function onTrackedPage(){return matchType(window.location.pathname)!==null;}
function currentPageType(){return matchType(window.location.pathname);}
function load(cb){var s=document.createElement("script");s.src=${JSON.stringify(SENTRY_BROWSER_BUNDLE_URL)};s.crossOrigin="anonymous";s.onload=cb;s.onerror=function(){console.warn("[cry-observability] Falha ao carregar Sentry.");};document.head.appendChild(s);}
var sentryReady=false;
function ensureSentry(){if(sentryReady||!window.Sentry)return;if(!onTrackedPage())return;sentryReady=true;window.Sentry.init({dsn:C.dsn,tunnel:C.tunnel,sendDefaultPii:false,tracesSampleRate:C.tracesSampleRate,replaysSessionSampleRate:C.replaysSessionSampleRate,replaysOnErrorSampleRate:C.replaysOnErrorSampleRate,integrations:[window.Sentry.browserTracingIntegration(),window.Sentry.replayIntegration({maskAllText:true,maskAllInputs:true,blockAllMedia:true})],tracesSampler:function(ctx){return onTrackedPage()?C.tracesSampleRate:0;},beforeSend:function(ev){if(!onTrackedPage())return null;var pt=currentPageType();if(pt){ev.tags=ev.tags||{};ev.tags.page_type=pt;}return ev;},beforeSendTransaction:function(ev){if(!onTrackedPage())return null;var pt=currentPageType();if(pt){ev.tags=ev.tags||{};ev.tags.page_type=pt;}return ev;}});}
function onNav(){if(!window.Sentry){ensureSentry();return;}if(onTrackedPage()){if(!sentryReady){sentryReady=true;}try{window.Sentry.getCurrentScope().setTag("page_type",currentPageType()||"");}catch(e){}}else try{var r=window.Sentry.getCurrentScope().getClient();if(r&&r.getIntegrationByName&&r.getIntegrationByName("Replay")){var rep=r.getIntegrationByName("Replay");if(rep&&rep.stop)rep.stop();}}catch(e2){}}
load(function(){ensureSentry();onNav();var ps=history.pushState;history.pushState=function(){ps.apply(this,arguments);onNav();ensureSentry();};var rs=history.replaceState;history.replaceState=function(){rs.apply(this,arguments);onNav();ensureSentry();};window.addEventListener("popstate",function(){onNav();ensureSentry();});});
})();`;
}
