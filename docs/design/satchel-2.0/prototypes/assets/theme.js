/* Prototype theme switch (design lead). Load it in <head> before the CSS paints:
   <script src="assets/theme.js"></script>
   - ?theme=day|night|system wins, then the prototype's stored choice, then Day (the brief: "Day by default").
   - Every radiogroup whose radios are named "theme…" (one name per control: theme, theme-side, theme-menu) is kept
     in sync and switches the theme.
   The app's real head script is design-system-impl §1.1 (key satchel:theme:v2); this one only imitates it. */
(function () {
  var KEY = "satchel:proto:theme";
  var d = document.documentElement;
  function read() {
    try { var q = new URLSearchParams(location.search).get("theme"); if (q) return q; } catch (e) {}
    try { var s = localStorage.getItem(KEY); if (s) return s; } catch (e) {}
    return "day";
  }
  function apply(t) {
    if (t === "day" || t === "night") d.setAttribute("data-theme", t); else d.removeAttribute("data-theme");
    var inputs = document.querySelectorAll('input[name^="theme"]');
    for (var i = 0; i < inputs.length; i++) inputs[i].checked = inputs[i].value === t;
  }
  var current = read();
  apply(current);
  document.addEventListener("DOMContentLoaded", function () {
    apply(current);
    document.addEventListener("change", function (e) {
      var el = e.target;
      if (el && el.name && el.name.indexOf("theme") === 0 && el.type === "radio") { current = el.value; try { localStorage.setItem(KEY, current); } catch (x) {} apply(current); }
    });
  });
})();
