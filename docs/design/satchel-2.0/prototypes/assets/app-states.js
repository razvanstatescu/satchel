/* Prototype state switcher for the app screens (product designer). Not product code.
   - Each page lists its states in <script type="application/json" id="proto-states">[{"id","label","auth"}]</script>.
   - ?state=<id> picks one (default: the first). ?shot hides this bar for screenshots.
   - Any element with data-show="a b c*" is shown only in those states ("c*" = any state starting with "c"; "!a" excludes).
   - <body data-auth="in|out"> follows the state's "auth" so the shell shows the account or the Connect button. */
(function () {
  var q = new URLSearchParams(location.search);
  if (q.has("shot")) document.documentElement.setAttribute("data-shot", "");
  function matches(list, id) {
    var toks = list.trim().split(/\s+/);
    var hit = toks.every(function (t) { return t.charAt(0) === "!"; });   // only exclusions: shown unless excluded
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i], neg = t.charAt(0) === "!";
      if (neg) t = t.slice(1);
      var ok = t.slice(-1) === "*" ? id.indexOf(t.slice(0, -1)) === 0 : t === id;
      if (ok && neg) return false;
      if (ok) hit = true;
    }
    return hit;
  }
  function run() {
    var el = document.getElementById("proto-states");
    var states = el ? JSON.parse(el.textContent) : [{ id: "default", label: "Default" }];
    var want = q.get("state") || (location.hash ? location.hash.slice(1) : null);   // app-misc.html#contract works too
    var cur = states[0];
    for (var i = 0; i < states.length; i++) if (states[i].id === want) cur = states[i];
    document.body.setAttribute("data-state", cur.id);
    document.body.setAttribute("data-signed", cur.auth || "out");
    var nodes = document.querySelectorAll("[data-show]");
    for (var j = 0; j < nodes.length; j++) {
      var show = matches(nodes[j].getAttribute("data-show"), cur.id);
      if (show) nodes[j].removeAttribute("hidden"); else nodes[j].setAttribute("hidden", "");
    }
    if (cur.title) document.title = cur.title;
    if (cur.nav) {   // which side-nav item is current on pages that stand in for several routes
      var NAV = { satchels: "My Satchels", market: "Market", mint: "Mint", contract: "Contract facts" };
      var items = document.querySelectorAll(".nav-item");
      for (var x = 0; x < items.length; x++) {
        if (items[x].textContent.trim() === NAV[cur.nav]) items[x].setAttribute("aria-current", "page");
        else items[x].removeAttribute("aria-current");
      }
    }
    if (cur.account) {   // the connected account for this state (default alice)
      var names = document.querySelectorAll(".account__name, [data-account]");
      for (var n = 0; n < names.length; n++) names[n].textContent = cur.account;
      var avs = document.querySelectorAll(".account .avatar");
      for (var v = 0; v < avs.length; v++) avs[v].textContent = cur.account.charAt(0).toUpperCase();
      var labelled = document.querySelectorAll(".account[aria-label]");
      for (var w = 0; w < labelled.length; w++) labelled[w].setAttribute("aria-label", "Account " + cur.account);
    }
    if (q.has("shot")) return;
    var bar = document.createElement("div");
    bar.className = "state-bar";
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Prototype states (not product UI)");
    var sel = document.createElement("select");
    sel.setAttribute("aria-label", "Prototype state");
    for (var k = 0; k < states.length; k++) {
      var o = document.createElement("option");
      o.value = states[k].id; o.textContent = states[k].label; if (states[k].id === cur.id) o.selected = true;
      sel.appendChild(o);
    }
    sel.addEventListener("change", function () { q.set("state", sel.value); location.search = q.toString(); });
    var lab = document.createElement("span"); lab.textContent = "State";
    bar.appendChild(lab); bar.appendChild(sel);
    ["day", "night"].forEach(function (t) {
      var a = document.createElement("a");
      var p = new URLSearchParams(q.toString()); p.set("theme", t); p.set("state", cur.id);
      a.href = "?" + p.toString(); a.textContent = t === "day" ? "Day" : "Night";
      a.setAttribute("aria-pressed", String((q.get("theme") || "day") === t));
      bar.appendChild(a);
    });
    document.body.appendChild(bar);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
})();
