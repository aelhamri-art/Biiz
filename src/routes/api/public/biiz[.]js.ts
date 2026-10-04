import { createFileRoute } from "@tanstack/react-router";

// Snippet to paste on destination sites: keeps first/last touch across pages and sends events.
export const Route = createFileRoute("/api/public/biiz.js")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const js = `(function(){var E="${origin}/api/public/track",L=localStorage,S=sessionStorage;
function id(){return Math.random().toString(36).slice(2)+Date.now().toString(36)}
var q=new URLSearchParams(location.search).get("bz");
if(q){if(!L.getItem("bz_first"))L.setItem("bz_first",q);L.setItem("bz_last",q)}
if(!L.getItem("bz_vid"))L.setItem("bz_vid",id());if(!S.getItem("bz_sid"))S.setItem("bz_sid",id());
function track(n,p){var last=L.getItem("bz_last");if(!last)return;
var b=JSON.stringify({last:last,first:L.getItem("bz_first")||undefined,vid:L.getItem("bz_vid"),sid:S.getItem("bz_sid"),name:n,page:location.pathname,props:p});
if(navigator.sendBeacon){navigator.sendBeacon(E,new Blob([b],{type:"text/plain"}))}else{fetch(E,{method:"POST",body:b,keepalive:true})}}
window.biiz={track:track};track("page_view");
document.addEventListener("click",function(e){var t=e.target.closest&&e.target.closest("[data-biiz]");if(t)track(t.getAttribute("data-biiz")||"cta_click",{label:(t.innerText||"").slice(0,80)})});})();`;
        return new Response(js, { headers: { "content-type": "application/javascript", "cache-control": "public, max-age=300", "Access-Control-Allow-Origin": "*" } });
      },
    },
  },
});
