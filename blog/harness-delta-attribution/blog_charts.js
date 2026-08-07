/* blog_charts.js — clean, dependency-free SVG charts for the harness-evolution blog.
   Reads window.ATTR / window.VIZ from blog_data.js. All colors come from CSS
   variables so light/dark and re-tinting are one-line changes. Charts are
   static-first (readable without JS interaction); the only interaction is a
   hover tooltip. */
(function () {
  const NS = "http://www.w3.org/2000/svg";
  const $ = (id) => document.getElementById(id);
  const cssvar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

  function el(tag, attrs, kids) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (kids) kids.forEach((c) => e.appendChild(c));
    return e;
  }
  function txt(x, y, s, o = {}) {
    const t = el("text", Object.assign({ x, y, "text-anchor": o.anchor || "middle" }, o.attrs || {}));
    t.textContent = s;
    if (o.cls) t.setAttribute("class", o.cls);
    return t;
  }
  function fmtShort(v) {
    if (v == null) return "pending";
    const rounded = Math.abs(v) >= 10 ? Math.round(v).toString() : v.toFixed(1).replace(/\.0$/, "");
    return (v > 0 ? "+" : "") + rounded;
  }

  /* ---- shared tooltip ---- */
  let tip;
  function ensureTip() {
    if (tip) return tip;
    tip = document.createElement("div");
    tip.className = "chart-tip";
    document.body.appendChild(tip);
    return tip;
  }
  function showTip(html, ev) {
    const t = ensureTip();
    t.innerHTML = html;
    t.style.opacity = "1";
    const pad = 14, w = t.offsetWidth, h = t.offsetHeight;
    let x = ev.clientX + pad, y = ev.clientY + pad;
    if (x + w > innerWidth - 8) x = ev.clientX - w - pad;
    if (y + h > innerHeight - 8) y = ev.clientY - h - pad;
    t.style.left = x + "px";
    t.style.top = y + "px";
  }
  function hideTip() { if (tip) tip.style.opacity = "0"; }

  /* =========================================================================
     TEASER SCORECARD — one horizontal stacked bar per task.
     Segments: Genuine | Test-time | Artifact (left→right).
     SWE-bench uses the 4B val-selected attribution bar in the Avg / 4B view.
     ========================================================================= */
  // Executor axis for the combined slider+tabs selector (one control governs the
  // whole figure). The Qwen sizes form the ladder; Haiku is a non-Qwen executor
  // that only ran on CREATE, set off at the end with a divider. Tasks without data
  // at the selected size fall back to their ΔS-weighted bar, faded.
  const SIZE_AXIS = ["weighted", "0.8B", "2B", "4B", "8B", "30B", "35B", "Haiku"];
  const SIZE_LABEL = { weighted: "Avg", "0.8B": "0.8B", "2B": "2B", "4B": "4B", "8B": "8B", "30B": "30B-A3B", "35B": "35B-A3B", "Haiku": "Haiku 4.5" };
  const SIZE_FULL = { weighted: "Avg", "0.8B": "0.8B", "2B": "2B", "4B": "4B", "8B": "8B", "30B": "30B-A3B", "35B": "35B-A3B", "Haiku": "Claude Haiku 4.5" };
  const SIZE_CAP = { weighted: "avg", "0.8B": "Qwen3.5", "2B": "Qwen3.5", "4B": "Qwen", "8B": "Qwen3", "30B": "Qwen3", "35B": "Qwen3.6", "Haiku": "Claude" };
  const SIZE_SPECIAL = new Set(["Haiku"]); // Haiku (CREATE) gets a divider before it
  const SCORECARD_PROPOSER = "Claude Code (Opus 4.8)";
  const AVAILABLE_VIEWS = {
    ALFWorld: "Avg, 0.8B, 2B, 4B, 8B, or 35B-A3B",
    LiveMath: "Avg, 0.8B, 2B, 4B, 8B, or 35B-A3B",
    CREATE: "Avg, 35B-A3B, or Haiku 4.5",
    SWEbench: "Avg, 4B, or 30B-A3B",
  };
  const SCORECARD_DETAILS = {
    ALFWorld: {
      weighted: { executor: "5-executor avg", iters: "30 each", unit: "pct",
        train: { base: 27.6, final: 100.0 }, test: { base: 24.0, final: 83.2 } },
      "0.8B": { executor: "Qwen3.5-0.8B", iters: "30", unit: "pct",
        train: { base: 0.0, final: 100.0 }, test: { base: 0.0, final: 93.3 } },
      "2B": { executor: "Qwen3.5-2B", iters: "30", unit: "pct",
        train: { base: 0.0, final: 100.0 }, test: { base: 2.5, final: 83.3 } },
      "4B": { executor: "Qwen3.5-4B", iters: "30", unit: "pct",
        train: { base: 40.0, final: 100.0 }, test: { base: 33.3, final: 90.0 } },
      "8B": { executor: "Qwen3-8B", iters: "30", unit: "pct",
        train: { base: 36.0, final: 100.0 }, test: { base: 25.0, final: 96.7 } },
      "35B": { executor: "Qwen3.6-35B-A3B", iters: "30", unit: "pct",
        train: { base: 62.0, final: 100.0 }, test: { base: 59.2, final: 52.5 } },
    },
    LiveMath: {
      weighted: { executor: "5-executor avg", iters: "40 each", unit: "pct",
        train: { base: 6.9, final: 50.9 }, test: { base: 16.8, final: 32.3 } },
      "0.8B": { executor: "Qwen3.5-0.8B", iters: "40", unit: "pct",
        train: { base: 5.7, final: 82.9 }, test: { base: 12.9, final: 60.5 } },
      "2B": { executor: "Qwen3.5-2B", iters: "40", unit: "pct",
        train: { base: 8.6, final: 57.1 }, test: { base: 21.8, final: 25.8 } },
      "4B": { executor: "Qwen3.5-4B", iters: "40", unit: "pct",
        train: { base: 0.0, final: 51.4 }, test: { base: 4.0, final: 33.1 } },
      "8B": { executor: "Qwen3-8B", iters: "40", unit: "pct",
        train: { base: 14.3, final: 28.6 }, test: { base: 21.0, final: 21.8 } },
      "35B-A3B": { executor: "Qwen3.6-35B-A3B", iters: "40", unit: "pct",
        train: { base: 5.7, final: 34.3 }, test: { base: 24.2, final: 20.2 } },
    },
    CREATE: {
      weighted: { executor: "2-executor weighted avg", iters: "by 25", unit: "cu",
        train: { base: 4.44, final: 37.29 }, test: { base: 6.57, final: 23.51 } },
      "claude-haiku-4.5": { executor: "Claude Haiku 4.5", iters: "by 25", unit: "cu",
        train: { base: 4.45, final: 42.33 }, test: { base: 6.40, final: 24.88 } },
      "qwen3.6-35b-a3b": { executor: "Qwen3.6-35B-A3B", iters: "by 25", unit: "cu",
        train: { base: 4.39, final: 11.90 }, test: { base: 7.42, final: 16.60 } },
    },
    SWEbench: {
      weighted: { executor: "4-frontier weighted avg", iters: "30 each", unit: "pct",
        train: { base: 31.0, final: 56.4 }, test: { base: 19.2, final: 25.8 } },
      "4B": { executor: "Qwen3-4B-Instruct-2507", iters: "30", unit: "pct",
        train: { base: 12.5, final: 31.2 }, test: { base: 4.0, final: 22.0 } },
      "30B": { executor: "Qwen3-30B-A3B-Instruct-2507", iters: "30", unit: "pct",
        train: { base: 25.0, final: 58.3 }, test: { base: 12.0, final: 26.0 } },
    },
  };
  let SC_SIZE = "weighted";
  let SC_HOST = null, SC_ORDER = null;
  let ctlRow = null; // cached control DOM, built once

  function scorecardDetail(taskKey, key) {
    return SCORECARD_DETAILS[taskKey] && SCORECARD_DETAILS[taskKey][key];
  }

  // Resolve one task at the selected size → {label, tts, genuine, artifact, ...}.
  function scRow(taskKey, size) {
    const A = window.ATTR;
    const sm = A.summary.find((s) => s.key === taskKey) || {};
    const base = { key: taskKey, label: sm.label || taskKey };

    if (taskKey === "SWEbench") {
      // Figure 1 SWE-Bench: the Avg position shows the strict-neutralization ΔS-weighted
      // average over all 4 train-best frontiers; the 4B (val-selected) and 30B-A3B
      // (train-selected) positions show their own full HDA Tier-1 bars.
      const key = { weighted: "weighted", "4B": "4B", "30B": "30B" }[size];
      const d = window.SWE_MODELS && key && window.SWE_MODELS.data[key];
      if (d) {
        const t = d.transfer_pp;
        return Object.assign(base, {
          tts: d.tts, genuine: d.genuine, artifact: d.artifact, note: d.note,
          sizeLabel: d.sel_label || (key + ", selected"),
          detail: scorecardDetail(taskKey, key),
          transfer: t,                          // signed pp on held-out test
        });
      }
      const fallback = window.SWE_MODELS && window.SWE_MODELS.data["4B"];
      if (fallback) {
        const t = fallback.transfer_pp;
        return Object.assign(base, {
          tts: fallback.tts, genuine: fallback.genuine, artifact: fallback.artifact,
          faded: true,
          sizeLabel: fallback.sel_label || "4B, val-selected",
          availableViews: AVAILABLE_VIEWS.SWEbench,
          transfer: t,
        });
      }
      return Object.assign(base, {
        marker: true,
        markerText: size === "weighted"
          ? "SWE-Bench shown as 4B val-selected"
          : "SWE-Bench unavailable at this size",
      });
    }
    if (taskKey === "TextClassification") {
      return Object.assign(base, {
        tts: sm.tts, genuine: sm.genuine, artifact: sm.artifact,
        pending: true, tag: "estimate", note: sm.one_liner,
      });
    }
    const cfg = {
      ALFWorld: { M: window.ALF_MODELS, map: (s) => s },
      LiveMath: { M: window.LM_MODELS, map: (s) => (s === "35B" ? "35B-A3B" : s) },
      CREATE: { M: window.CREATE_MODELS, map: (s) => (s === "weighted" ? "weighted" : s === "35B" ? "qwen3.6-35b-a3b" : s === "Haiku" ? "claude-haiku-4.5" : null) },
    }[taskKey];
    if (!cfg || !cfg.M) {
      return Object.assign(base, { tts: sm.tts, genuine: sm.genuine, artifact: sm.artifact, note: sm.one_liner });
    }
    const k = cfg.map(size);
    const d = k && cfg.M.data[k];
    if (!d) {
      const w = cfg.M.data.weighted;
      return Object.assign(base, {
        tts: w.tts, genuine: w.genuine, artifact: w.artifact,
        faded: true,
        availableViews: AVAILABLE_VIEWS[taskKey],
      });
    }
    return Object.assign(base, {
      tts: d.tts, genuine: d.genuine, artifact: d.artifact, note: d.note,
      sizeLabel: size === "weighted" ? "Avg" : SIZE_FULL[size],
      detail: scorecardDetail(taskKey, k),
    });
  }

  function escHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[ch]));
  }

  function fmtFixed(v, digits) {
    return Number(v).toFixed(digits).replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
  }

  function fmtScore(v, unit) {
    if (v == null) return "--";
    if (typeof v === "string") return escHtml(v);
    if (unit === "cu") return `${fmtFixed(v, 2)} CU`;
    return `${fmtFixed(v, 1)}%`;
  }

  function fmtGain(base, final, unit) {
    if (base == null || final == null || typeof base === "string" || typeof final === "string") return "";
    const gain = final - base;
    const signed = (gain > 0 ? "+" : "") + fmtFixed(gain, unit === "cu" ? 2 : 1);
    return unit === "cu" ? `${signed} CU` : `${signed}%`;
  }

  function scorecardScoreRow(label, row, unit) {
    if (!row) return "";
    if (row.text) {
      return `<div class="tip-row"><span class="split">${label}</span><span class="score">${escHtml(row.text)}</span><span class="gain"></span></div>`;
    }
    return `<div class="tip-row"><span class="split">${label}</span><span class="score">${fmtScore(row.base, unit)} -&gt; ${fmtScore(row.final, unit)}</span><span class="gain">${fmtGain(row.base, row.final, unit)}</span></div>`;
  }

  function scorecardTipHtml(d) {
    const size = SIZE_LABEL[SC_SIZE] || SIZE_FULL[SC_SIZE] || SC_SIZE;
    if (d.faded) {
      return `<div class="tip-card">
        <div class="tip-top"><div class="tip-task">${escHtml(d.label)}</div><div class="tip-size">${escHtml(size)}</div></div>
        <div class="tip-empty"><b>No run with this executor.</b><br>Select ${escHtml(d.availableViews || "Avg")} to view this benchmark.</div>
      </div>`;
    }
    const detail = d.detail || {};
    const unit = detail.unit || "pct";
    return `<div class="tip-card">
      <div class="tip-top"><div class="tip-task">${escHtml(d.label)}</div><div class="tip-size">${escHtml(size)}</div></div>
      <div class="tip-meta">
        <div class="tip-k">Executor</div><div class="tip-v">${escHtml(detail.executor || d.sizeLabel || size)}</div>
        <div class="tip-k">Proposer</div><div class="tip-v">${escHtml(detail.proposer || SCORECARD_PROPOSER)}</div>
        <div class="tip-k">Iters</div><div class="tip-v">${escHtml(detail.iters || "multiple")}</div>
      </div>
      <div class="tip-scores">
        ${scorecardScoreRow("Train", detail.train, unit)}
        ${scorecardScoreRow("Test", detail.test, unit)}
      </div>
      <div class="tip-otg">
        <span><span class="dot o"></span>O ${d.artifact || 0}%</span>
        <span><span class="dot t"></span>T ${d.tts || 0}%</span>
        <span><span class="dot g"></span>G ${d.genuine || 0}%</span>
      </div>
    </div>`;
  }

  /* ---- combined slider + tabs control (drag the handle OR click a label) ---- */
  function ensureControl(host) {
    if (ctlRow && ctlRow.isConnected) return;
    ctlRow = document.createElement("div");
    ctlRow.className = "sizerow";
    ctlRow.innerHTML =
      '<span class="sizectl-label">Executor&nbsp;→</span>' +
      '<div class="sizectl"><div class="labels"></div>' +
      '<div class="rail"><div class="fill"></div><div class="thumb"></div></div></div>';
    // place directly below the chart host, above the caption
    host.parentNode.insertBefore(ctlRow, host.nextSibling);

    const labels = ctlRow.querySelector(".labels");
    SIZE_AXIS.forEach((s) => {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.s = s;
      b.className = SIZE_SPECIAL.has(s) ? "special" : "";
      b.innerHTML = SIZE_LABEL[s] + '<span class="cap">' + SIZE_CAP[s] + "</span>";
      b.addEventListener("click", () => { SC_SIZE = s; renderBars(); syncControl(); });
      labels.appendChild(b);
    });

    // drag on the rail / thumb → snap to nearest label cell
    const sizectl = ctlRow.querySelector(".sizectl");
    const idxFromX = (clientX) => {
      const r = labels.getBoundingClientRect();
      const frac = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
      return Math.max(0, Math.min(SIZE_AXIS.length - 1, Math.round(frac * SIZE_AXIS.length - 0.5)));
    };
    let dragging = false;
    const move = (e) => {
      if (!dragging) return;
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const s = SIZE_AXIS[idxFromX(cx)];
      if (s !== SC_SIZE) { SC_SIZE = s; renderBars(); }
      syncControl();
    };
    const start = (e) => { dragging = true; sizectl.classList.add("dragging"); move(e); e.preventDefault(); };
    const end = () => { dragging = false; sizectl.classList.remove("dragging"); };
    ctlRow.querySelector(".thumb").addEventListener("mousedown", start);
    ctlRow.querySelector(".rail").addEventListener("mousedown", start);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", end);
    ctlRow.querySelector(".thumb").addEventListener("touchstart", start, { passive: false });
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", end);
  }

  function syncControl() {
    if (!ctlRow) return;
    ctlRow.querySelectorAll(".labels button").forEach((b) => b.classList.toggle("active", b.dataset.s === SC_SIZE));
    const i = SIZE_AXIS.indexOf(SC_SIZE), n = SIZE_AXIS.length;
    const pct = ((i + 0.5) / n) * 100;
    ctlRow.querySelector(".thumb").style.left = pct + "%";
    ctlRow.querySelector(".fill").style.width = pct + "%";
  }

  /* ---- the SVG bars ---- */
  function renderBars() {
    const host = SC_HOST;
    if (!host) return;
    const rows = SC_ORDER.map((k) => scRow(k, SC_SIZE));
    const cG = cssvar("--genuine"), cT = cssvar("--tts"), cA = cssvar("--artifact");
    const ink = cssvar("--text-1"), muted = cssvar("--muted"), track = cssvar("--track");

    const W = 760, rowH = 30, gap = 30, mL = 152, mR = 14, mT = 12, MIN_SLIVER = 5;
    const barW = W - mL - mR;
    const H = mT + rows.length * (rowH + gap);
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", role: "img" });
    svg.style.display = "block";
    svg.style.overflow = "visible";

    rows.forEach((d, i) => {
      const y = mT + i * (rowH + gap);
      const cy = y + rowH / 2;

      svg.appendChild(txt(mL - 14, cy + 4, d.label, {
        anchor: "end", attrs: { "font-family": "var(--font-head)", "font-size": 13.5, "font-weight": 650, fill: ink },
      }));

      if (d.marker) {
        svg.appendChild(el("rect", { x: mL, y, width: barW, height: rowH, rx: 7,
          fill: "none", stroke: track, "stroke-dasharray": "4 4" }));
        svg.appendChild(txt(mL + 14, cy + 4, d.markerText || "no attributable gain — ΔS within noise", {
          anchor: "start", attrs: { "font-family": "var(--font-head)", "font-size": 11.5, "font-style": "italic", fill: muted },
        }));
        return;
      }

      // A → T → G order (worst→best: artifact, then bought, then earned; green lands last)
      // 0% segments kept as thin colored slivers (not dropped)
      const clipId = `sc-clip-${i}`;
      const clip = el("clipPath", { id: clipId });
      clip.appendChild(el("rect", { x: mL, y, width: barW, height: rowH, rx: 7 }));
      svg.appendChild(clip);
      const g = el("g", { "clip-path": `url(#${clipId})` });
      if (d.faded) g.setAttribute("opacity", "0.42");

      const segs = [["artifact", cA, "Overfitting"], ["tts", cT, "Test-time scaling"], ["genuine", cG, "Generalizable improvement"]];
      const vals = segs.map(([k]) => d[k] || 0);
      const total = vals.reduce((a, b) => a + b, 0) || 1;
      const zeros = vals.filter((v) => v === 0).length;
      const usable = barW - zeros * MIN_SLIVER;
      let x = mL;
      segs.forEach(([key, col, name]) => {
        const v = d[key] || 0;
        const w = v > 0 ? (v / total) * usable : MIN_SLIVER;
        const r = el("rect", { x, y, width: w, height: rowH, fill: col });
        r.style.cursor = "default";
        const tipHtml = scorecardTipHtml(d);
        r.addEventListener("mousemove", (e) => showTip(tipHtml, e));
        r.addEventListener("mouseleave", hideTip);
        g.appendChild(r);
        if (w > 26) g.appendChild(txt(x + w / 2, cy + 4, v, {
          attrs: { "font-family": "var(--font-head)", "font-size": 11.5, "font-weight": 700, fill: ink,
            "pointer-events": "none" },
        }));
        x += w;
      });
      svg.appendChild(g);

      if (d.pending) svg.appendChild(txt(mL + barW, y - 5, "ESTIMATE", {
        anchor: "end", attrs: { "font-family": "var(--font-head)", "font-size": 9.5, "font-weight": 700,
          "letter-spacing": ".08em", fill: muted },
      }));
    });

    host.innerHTML = "";
    host.appendChild(svg);
  }

  function scorecard(containerId, order) {
    const host = $(containerId);
    if (!host || !window.ATTR) return;
    SC_HOST = host;
    SC_ORDER = order || window.ATTR.scorecardOrder;
    renderBars();
    ensureControl(host);
    syncControl();
  }

  /* =========================================================================
     TRAIN VS HELD-OUT TEST DELTA — vertical small multiples.
     Zero baseline is fixed across panels and across val/train-selected modes.
     ========================================================================= */
  function trainTestDelta(containerId) {
    const host = $(containerId);
    const D = window.TRAIN_TEST_DELTA;
    if (!host || !D) return;

    const modebar = host.closest("figure") && host.closest("figure").querySelector("[data-train-test-delta-mode]");
    const setMode = (mode) => {
      host.dataset.mode = mode;
      if (modebar) {
        modebar.querySelectorAll("button[data-mode]").forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));
      }
      renderTrainTestDelta(host, mode, D);
    };

    if (modebar && !modebar.dataset.bound) {
      modebar.dataset.bound = "1";
      modebar.querySelectorAll("button[data-mode]").forEach((b) => {
        b.addEventListener("click", () => setMode(b.dataset.mode));
      });
    }
    setMode(host.dataset.mode || "val");
  }

  function trainTestPanels(mode, D) {
    const selected = (arr) => arr.map((r) => ({
      task: r.task, model: r.model, train: r.train, test: mode === "val" ? r.testVal : r.testTrain,
    }));
    // Grey bar is always the train-selected harness's train gain (a fixed
    // baseline); only the coloured test bar switches with the mode.
    const liveMath = D.liveMath.map((r) => ({
      task: r.task, model: r.model,
      train: r.trainTrain,
      test: mode === "val" ? r.testVal : r.testTrain,
    }));
    return [
      { name: "ALFWorld", unit: "accuracy pp", key: "alfWorld", rows: selected(D.alfWorld) },
      { name: "LiveMath", unit: "accuracy pp", key: "liveMath", rows: liveMath },
      { name: "CREATE", unit: "Creative Utility", key: "create", rows: selected(D.create) },
      { name: "SWE-bench", unit: "pass-rate pp", key: "swe", rows: selected(D.swe) },
    ];
  }

  function trainTestDomain(panel, D) {
    const source = D[panel.key] || [];
    if (panel.key === "liveMath") {
      return source.flatMap((r) => [r.trainTrain, r.testTrain, r.trainVal, r.testVal]);
    }
    return source.flatMap((r) => [r.train, r.testTrain, r.testVal]);
  }

  function renderTrainTestDelta(host, mode, D) {
    const panels = trainTestPanels(mode, D);
    const barW = 10, barGap = 13, barStep = barW + barGap, modelStep = barStep * 2;
    const panelH = 276, H = 292;
    let xCursor = 0;
    const origins = panels.map((p) => {
      const origin = { x: xCursor, y: 0 };
      xCursor += p.rows.length * modelStep;
      return origin;
    });
    const W = xCursor - barGap;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", role: "img",
      "aria-label": "Train delta versus held-out test delta across benchmarks" });
    svg.style.display = "block";
    svg.style.height = "auto";
    svg.style.overflow = "visible";

    panels.forEach((panel, idx) => {
      drawTrainTestPanel(svg, panel, D, origins[idx], panel.rows.length * modelStep - barGap,
        panelH, barW, barGap, barStep, modelStep, idx > 0);
    });

    host.innerHTML = "";
    host.appendChild(svg);
  }

  function drawTrainTestPanel(svg, panel, D, origin, panelW, panelH, barW, barGap, barStep, modelStep, hasDivider) {
    const margin = { top: 44, right: 0, bottom: 76, left: 0 };
    const values = trainTestDomain(panel, D).filter((v) => v != null);
    const minValue = Math.min(...values, 0);
    const maxValue = Math.max(...values, 0);
    const lo = Math.min(-10, Math.floor(minValue / 10) * 10);
    const hi = Math.max(10, Math.ceil(maxValue / 10) * 10);
    const plotH = panelH - margin.top - margin.bottom;
    const x0 = origin.x + margin.left;
    const y0 = origin.y + margin.top;
    const x1 = origin.x + panelW - margin.right;
    const plotBottom = y0 + plotH;
    const zeroY = y0 + plotH * 0.76;
    const y = (v) => v >= 0
      ? zeroY - (v / hi) * (zeroY - y0)
      : zeroY + (v / lo) * (plotBottom - zeroY);

    if (hasDivider) {
      const dividerX = origin.x - barGap / 2;
      svg.appendChild(el("line", {
        x1: dividerX, y1: origin.y + margin.top - 20,
        x2: dividerX, y2: origin.y + panelH - margin.bottom + 42,
        stroke: cssvar("--rule-2"), "stroke-width": 1, "stroke-dasharray": "2 4",
      }));
    }

    svg.appendChild(txt(origin.x + panelW / 2, origin.y + 17, trainTestScaleHint(panel.unit, lo, hi), {
      attrs: { "font-family": "var(--font-head)", "font-size": 8.5, "font-weight": 700, fill: cssvar("--muted") },
    }));

    trainTestTicks(lo, hi).forEach((t) => {
      svg.appendChild(el("line", {
        x1: x0, y1: y(t), x2: x1, y2: y(t),
        stroke: cssvar("--rule"), "stroke-width": t === 0 ? 1.45 : 1,
        "stroke-dasharray": t === 0 ? "" : "2 3",
      }));
    });

    panel.rows.forEach((r, i) => {
      const trainX = x0 + modelStep * i;
      const testX = trainX + barStep;
      const cx = trainX + barW + barGap / 2;
      trainTestBar(svg, trainX, y, zeroY, barW, r.train, cssvar("--train"), r, "train", panel);
      trainTestBar(svg, testX, y, zeroY, barW, r.test, r.test < 0 ? cssvar("--neg") : cssvar("--test"), r, "held-out test", panel);

      const labelY = origin.y + panelH - margin.bottom + 22;
      const label = txt(cx, labelY, r.model, {
        attrs: { "font-family": "var(--font-head)", "font-size": 8, "font-weight": 600, fill: cssvar("--text-2") },
      });
      label.setAttribute("transform", `rotate(-40 ${cx} ${labelY})`);
      svg.appendChild(label);
    });

    svg.appendChild(txt(origin.x + panelW / 2, origin.y + panelH - 6, panel.name, {
      attrs: { "font-family": "var(--font-head)", "font-size": 12, "font-weight": 750, fill: cssvar("--text-1") },
    }));
  }

  function trainTestBar(svg, x, y, zeroY, width, value, color, row, kind, panel) {
    const yv = y(value);
    const top = Math.min(yv, zeroY);
    const height = Math.max(1.5, Math.abs(zeroY - yv));
    const rect = el("rect", { x, y: top, width, height, rx: 3, fill: color });
    rect.addEventListener("mouseenter", (ev) => showTip(
      `<b>${panel.name} · ${row.model}</b><div class="tv">${kind}: ${fmtShort(value)}</div>`, ev));
    rect.addEventListener("mousemove", (ev) => showTip(
      `<b>${panel.name} · ${row.model}</b><div class="tv">${kind}: ${fmtShort(value)}</div>`, ev));
    rect.addEventListener("mouseleave", hideTip);
    svg.appendChild(rect);
    svg.appendChild(txt(x + width / 2, value >= 0 ? top - 5 : top + height + 13, fmtShort(value), {
      attrs: { "font-family": "var(--font-head)", "font-size": 8, "font-weight": 650,
        fill: value < 0 ? cssvar("--neg") : cssvar("--muted") },
    }));
  }

  function trainTestScaleHint(unit, lo, hi) {
    const suffix = unit === "Creative Utility" ? "CU" : "pp";
    return `${fmtShort(lo)}..${fmtShort(hi)} ${suffix}`;
  }

  function trainTestTicks(lo, hi) {
    if (hi - lo <= 40) return [lo, 0, hi].filter((v, i, a) => a.indexOf(v) === i);
    const ticks = [];
    const start = Math.ceil(lo / 20) * 20;
    for (let t = start; t <= hi; t += 20) ticks.push(t);
    if (!ticks.includes(0)) ticks.push(0);
    return ticks.sort((a, b) => a - b);
  }

  /* =========================================================================
     PER-ITERATION TRAIN CURVES (Appendix) — x = iteration, y = performance.
     Data: window.ITER_CURVES[taskKey] = { unit:"pct"|"cu", ymax?:num,
       yLabel?:str, series:[{model, metric, points:[{iter,value}], note}] }.
     One multi-line chart per task; hover a vertex for the value. Colors cycle
     through a fixed model palette so the same model keeps its hue across tasks.
     ========================================================================= */
  const ITER_PALETTE = ["#6d55a4", "#2563eb", "#49A575", "#EDB646", "#E16652", "#7a7f87", "#c25fb0", "#3aa6a6"];

  function iterCurveChart(host, cfg) {
    if (!host || !cfg || !cfg.series || !cfg.series.length) return;
    const unit = cfg.unit || "pct";
    const allPts = cfg.series.flatMap((s) => s.points || []);
    if (!allPts.length) return;
    const maxIter = Math.max(...allPts.map((p) => p.iter));
    const minIter = Math.min(1, ...allPts.map((p) => p.iter));
    const dataMax = Math.max(...allPts.map((p) => p.value));
    const dataMin = Math.min(0, ...allPts.map((p) => p.value));
    const hi = cfg.ymax != null ? cfg.ymax
      : unit === "cu" ? Math.ceil(dataMax / 5) * 5
      : Math.min(100, Math.max(10, Math.ceil(dataMax / 10) * 10));
    const lo = unit === "cu" ? Math.min(0, Math.floor(dataMin / 5) * 5) : 0;

    const W = 760, H = 300;
    const m = { top: 26, right: 14, bottom: 40, left: 48 };
    const plotW = W - m.left - m.right, plotH = H - m.top - m.bottom;
    const x0 = m.left, y0 = m.top, plotBottom = y0 + plotH;
    // Optional axis fold: draw minIter..foldAfter at full scale, then a short
    // compressed tail foldAfter..maxIter after a break (for long flat plateaus).
    const foldAfter = (cfg.foldAfter && maxIter > cfg.foldAfter) ? cfg.foldAfter : null;
    const FOLD_GAP = 16, FOLD_MAIN = 0.82;
    const foldMainW = plotW * FOLD_MAIN, foldTailW = plotW * (1 - FOLD_MAIN) - FOLD_GAP;
    const foldBreakX = x0 + foldMainW + FOLD_GAP / 2;
    const sx = (it) => {
      if (!foldAfter) return x0 + ((it - minIter) / (maxIter - minIter || 1)) * plotW;
      if (it <= foldAfter) return x0 + ((it - minIter) / (foldAfter - minIter || 1)) * foldMainW;
      return x0 + foldMainW + FOLD_GAP + ((it - foldAfter) / (maxIter - foldAfter || 1)) * foldTailW;
    };
    const sy = (v) => plotBottom - ((v - lo) / (hi - lo || 1)) * plotH;

    const muted = cssvar("--muted"), rule = cssvar("--rule"), ink = cssvar("--text-1"), rule2 = cssvar("--rule-2");
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", role: "img",
      "aria-label": `Per-iteration ${cfg.yLabel || "train performance"} for ${host.dataset.iterChart}` });
    svg.style.overflow = "visible";

    // y gridlines + labels
    const yticks = unit === "cu" ? niceTicks(lo, hi, 5) : niceTicks(lo, hi, hi <= 50 ? 5 : 5);
    yticks.forEach((t) => {
      svg.appendChild(el("line", { x1: x0, y1: sy(t), x2: x0 + plotW, y2: sy(t),
        stroke: rule, "stroke-width": t === 0 ? 1.4 : 1, "stroke-dasharray": t === 0 ? "" : "2 3" }));
      svg.appendChild(txt(x0 - 8, sy(t) + 3.5, unit === "cu" ? fmtFixed(t, 0) : t + "%", {
        anchor: "end", attrs: { "font-family": "var(--font-head)", "font-size": 10, fill: muted } }));
    });
    // x ticks
    const mainMax = foldAfter || maxIter;
    const xstep = mainMax <= 12 ? 2 : mainMax <= 30 ? 5 : 10;
    const xTickVals = [];
    for (let it = Math.ceil(minIter / xstep) * xstep || xstep; it <= mainMax; it += xstep) xTickVals.push(it);
    if (foldAfter) { if (!xTickVals.includes(foldAfter)) xTickVals.push(foldAfter); xTickVals.push(maxIter); }
    xTickVals.forEach((it) => {
      svg.appendChild(txt(sx(it), plotBottom + 16, String(it), {
        attrs: { "font-family": "var(--font-head)", "font-size": 10, fill: muted } }));
    });
    svg.appendChild(txt(x0 + plotW / 2, H - 4, "iteration", {
      attrs: { "font-family": "var(--font-head)", "font-size": 10.5, "font-weight": 600, fill: muted } }));
    // y-axis label sits ABOVE the plot (left-aligned to the axis) so it never
    // overlaps the tick numbers to its right.
    svg.appendChild(txt(x0 - 4, y0 - 11, cfg.yLabel || (unit === "cu" ? "CU" : "train %"), {
      anchor: "start", attrs: { "font-family": "var(--font-head)", "font-size": 10.5, "font-weight": 600, fill: muted } }));
    // axis-break marker (two slashes) when folded
    if (foldAfter) {
      const bx = foldBreakX, by = plotBottom;
      svg.appendChild(el("path", { d: `M${bx-4} ${by+5} l6 -10 M${bx} ${by+5} l6 -10`,
        stroke: muted, "stroke-width": 1.2, fill: "none", opacity: .7 }));
    }

    // lines
    cfg.series.forEach((s, si) => {
      const col = s.color || ITER_PALETTE[si % ITER_PALETTE.length];
      const pts = (s.points || []).slice().sort((a, b) => a.iter - b.iter);
      if (!pts.length) return;
      // Step (best-so-far) line: hold the current value flat, then jump
      // vertically at the iteration where the score improves. Extend the last
      // value flat to maxIter so every series reaches the right edge.
      const stepped = pts.slice();
      if (stepped[stepped.length - 1].iter < maxIter) {
        stepped.push({ iter: maxIter, value: stepped[stepped.length - 1].value });
      }
      let d = `M${fmtFixed(sx(stepped[0].iter), 1)} ${fmtFixed(sy(stepped[0].value), 1)}`;
      for (let i = 1; i < stepped.length; i++) {
        d += ` H${fmtFixed(sx(stepped[i].iter), 1)}`;              // flat run at previous value
        d += ` V${fmtFixed(sy(stepped[i].value), 1)}`;            // vertical jump to new value
      }
      svg.appendChild(el("path", { d, fill: "none", stroke: col, "stroke-width": 2,
        "stroke-linejoin": "miter", "stroke-linecap": "butt", opacity: 0.92 }));
      // hover dots (invisible-ish until hovered; small visible marker)
      pts.forEach((p) => {
        const c = el("circle", { cx: sx(p.iter), cy: sy(p.value), r: 3, fill: col, opacity: 0.0 });
        c.style.cursor = "default";
        const label = SIZE_LABEL[s.model] || s.model;
        const vstr = unit === "cu" ? `${fmtFixed(p.value, 2)} CU` : `${fmtFixed(p.value, 1)}%`;
        const html = `<b>${escHtml(label)}</b><div class="tv">iter ${p.iter}: ${vstr}</div>${s.metric ? `<div class="tt-note">${escHtml(s.metric)}</div>` : ""}`;
        const on = (e) => { c.setAttribute("opacity", "1"); showTip(html, e); };
        c.addEventListener("mouseenter", on);
        c.addEventListener("mousemove", on);
        c.addEventListener("mouseleave", () => { c.setAttribute("opacity", "0"); hideTip(); });
        svg.appendChild(c);
      });
    });

    host.innerHTML = "";
    host.appendChild(svg);

    // legend
    const leg = document.createElement("div");
    leg.className = "iter-legend";
    cfg.series.forEach((s, si) => {
      const col = s.color || ITER_PALETTE[si % ITER_PALETTE.length];
      const it = document.createElement("span");
      it.className = "item";
      it.style.color = col;
      it.innerHTML = `<span class="ln"></span><span style="color:var(--text-2)">${escHtml(SIZE_LABEL[s.model] || s.model)}</span>`;
      leg.appendChild(it);
    });
    if (host.nextSibling && host.nextSibling.classList && host.nextSibling.classList.contains("iter-legend")) {
      host.nextSibling.remove();
    }
    host.parentNode.insertBefore(leg, host.nextSibling);
  }

  function niceTicks(lo, hi, n) {
    const out = [];
    const step = (hi - lo) / n;
    for (let i = 0; i <= n; i++) out.push(Math.round((lo + i * step) * 100) / 100);
    return out.filter((v, i, a) => a.indexOf(v) === i);
  }

  /* =========================================================================
     TOC scroll-spy — highlight the rail link for the section in view.
     ========================================================================= */
  function scrollSpy() {
    const toc = $("toc");
    if (!toc) return;
    const links = [...toc.querySelectorAll('a[href^="#"]')];
    const map = new Map();
    links.forEach((a) => {
      const el = document.getElementById(a.getAttribute("href").slice(1));
      if (el) map.set(el, a);
    });
    if (!map.size) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          links.forEach((l) => l.classList.remove("active"));
          const a = map.get(e.target);
          if (a) a.classList.add("active");
        }
      });
    }, { rootMargin: "0px 0px -70% 0px", threshold: 0 });
    map.forEach((_, el) => io.observe(el));
  }

  /* expose + auto-render anything already in the DOM */
  window.BlogCharts = { scorecard, trainTestDelta, iterCurveChart };
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-scorecard]").forEach((n) => scorecard(n.id));
    document.querySelectorAll("[data-train-test-delta]").forEach((n) => trainTestDelta(n.id));
    document.querySelectorAll("[data-iter-chart]").forEach((n) => {
      const cfg = window.ITER_CURVES && window.ITER_CURVES[n.dataset.iterChart];
      if (cfg) iterCurveChart(n, cfg);
    });
    scrollSpy();
  });
})();
