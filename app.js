/**
 * app.js
 * UI Controller for IoT Smart Parking & Auto-Reallocation System
 * Manages stage transitions, node interactions, and live memory state
 */

'use strict';

/* ── State ───────────────────────────────────── */
const State = {
  currentStage: 1,
  selectedNode: 'node-billing',
  ds: null,
};

/* ── DS Factory ──────────────────────────────── */
function buildDS(stageId) {
  const { MinHeap, HashTable, CircularQueue, GraphDijkstra } = window.DSLib;
  const ds = {
    heap:   new MinHeap(),
    hash:   new HashTable(8),
    queue:  new CircularQueue(5),
    graph:  new GraphDijkstra(),
  };
  const stage = window.STAGES.find(s => s.id === stageId);
  if (stage && stage.dsInit) stage.dsInit(ds);
  return ds;
}

/* ── Syntax Highlight C struct ───────────────── */
function highlightC(raw) {
  return raw
    .replace(/\/\*.*?\*\//g, m => `<span class="c-comment">${m}</span>`)
    .replace(/\b(struct|char|uint8_t|uint16_t|uint32_t|float|int)\b/g,
             m => `<span class="c-type">${m}</span>`)
    .replace(/\b(return|if|else|while|for|void)\b/g,
             m => `<span class="c-keyword">${m}</span>`)
    .replace(/\b(\d+)\b/g, m => `<span class="c-num">${m}</span>`);
}

/* ── Render Header ───────────────────────────── */
function renderHeader(stage) {
  document.getElementById('stage-subtitle').textContent = stage.subtitle;
  document.getElementById('stage-heading').textContent  = stage.heading;
  document.getElementById('stage-summary').textContent  = stage.summary;

  document.querySelectorAll('.nav-btn.pill-num').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.stage) === stage.id);
  });
}

/* ── Render Nodes ────────────────────────────── */
function renderNodes(stage) {
  const nodeIds = ['node-iot', 'node-heap', 'node-dijkstra', 'node-queue', 'node-billing', 'node-hash'];
  nodeIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const data = stage.nodes[id];
    if (!data) return;

    el.className = `arch-node state-${data.status}`;
    el.querySelector('.node-line1').textContent = data.line1;
    el.querySelector('.node-line2').textContent = data.line2;
    el.querySelector('.node-sub').textContent   = data.sub;

    // Mark selected node
    if (id === State.selectedNode) el.classList.add('node-selected');
  });
}

/* ── Render Memory Cards ─────────────────────── */
function renderMemory(stage) {
  const { heap, hash, queue } = stage.memory;
  setCard('mem-heap-title',  heap.title);
  setCard('mem-heap-main',   heap.main);
  setCard('mem-heap-sub',    heap.sub);
  setCard('mem-hash-title',  hash.title);
  setCard('mem-hash-main',   hash.main);
  setCard('mem-hash-sub',    hash.sub);
  setCard('mem-queue-title', queue.title);
  setCard('mem-queue-main',  queue.main);
  setCard('mem-queue-sub',   queue.sub);
}

function setCard(id, val) {
  const el = document.getElementById(id);
  if (el) { el.textContent = val; }
}

/* ── Render Struct Inspector ─────────────────── */
function renderStruct(nodeId) {
  const data = window.NODE_STRUCTS[nodeId];
  if (!data) return;

  document.getElementById('struct-title').textContent  = data.title;
  document.getElementById('struct-badge').textContent  = data.badge;
  document.getElementById('struct-desc').textContent   = data.desc;
  document.getElementById('struct-code').innerHTML     = highlightC(data.struct);

  // Highlight selected node in diagram
  document.querySelectorAll('.arch-node').forEach(n => n.classList.remove('node-selected'));
  const el = document.getElementById(nodeId);
  if (el) el.classList.add('node-selected');
}

/* ── SVG Arrow System ────────────────────────── */
const EDGES = [
  // [fromId, toId, label, side]  side: 'top'|'right'|'bottom'|'left'
  { from: 'node-iot',     to: 'node-heap',     label: 'O(log N)',    curve: 'h' },
  { from: 'node-heap',    to: 'node-dijkstra', label: 'Slot A1',     curve: 'h' },
  { from: 'node-iot',     to: 'node-queue',    label: 'enq() O(1)',  curve: 'v' },
  { from: 'node-heap',    to: 'node-billing',  label: 'push O(log N)', curve: 'v' },
  { from: 'node-dijkstra',to: 'node-hash',     label: 'put() O(1)',  curve: 'v' },
  { from: 'node-hash',    to: 'node-billing',  label: 'del O(1)',    curve: 'h', reverse: true },
  { from: 'node-billing', to: 'node-queue',    label: 'deq() A3',   curve: 'h', reverse: true },
];

function getNodeCenter(el, containerRect) {
  if (!el) return { x: 0, y: 0 };
  const r = el.getBoundingClientRect();
  return {
    x: r.left - containerRect.left + r.width  / 2,
    y: r.top  - containerRect.top  + r.height / 2,
    w: r.width,
    h: r.height,
  };
}

function drawArrows() {
  const svg = document.getElementById('arrow-canvas');
  if (!svg) return;

  const container = svg.parentElement;
  const cr = container.getBoundingClientRect();
  svg.setAttribute('viewBox', `0 0 ${cr.width} ${cr.height}`);
  svg.innerHTML = '';

  // Define dotted line marker
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

  const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
  marker.setAttribute('id', 'arrow');
  marker.setAttribute('markerWidth', '8');
  marker.setAttribute('markerHeight', '8');
  marker.setAttribute('refX', '6');
  marker.setAttribute('refY', '3');
  marker.setAttribute('orient', 'auto');
  const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  poly.setAttribute('points', '0 0, 8 3, 0 6');
  poly.setAttribute('fill', '#3d4460');
  marker.appendChild(poly);
  defs.appendChild(marker);
  svg.appendChild(defs);

  EDGES.forEach(edge => {
    const fromEl = document.getElementById(edge.from);
    const toEl   = document.getElementById(edge.to);
    if (!fromEl || !toEl) return;

    const fc = getNodeCenter(fromEl, cr);
    const tc = getNodeCenter(toEl,   cr);

    // Compute edge start/end on node borders
    const dx = tc.x - fc.x;
    const dy = tc.y - fc.y;
    const angle = Math.atan2(dy, dx);

    const startX = fc.x + Math.cos(angle) * (fc.w / 2 + 4);
    const startY = fc.y + Math.sin(angle) * (fc.h / 2 + 4);
    const endX   = tc.x - Math.cos(angle) * (tc.w / 2 + 10);
    const endY   = tc.y - Math.sin(angle) * (tc.h / 2 + 10);

    // Curved path
    const cx = (startX + endX) / 2;
    const cy = (startY + endY) / 2;
    const bend = edge.curve === 'v' ? 0 : 0;
    const pathD = `M ${startX} ${startY} Q ${cx + bend} ${cy + bend} ${endX} ${endY}`;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathD);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#3d4460');
    path.setAttribute('stroke-width', '1.5');
    path.setAttribute('stroke-dasharray', '4 3');
    path.setAttribute('marker-end', 'url(#arrow)');
    svg.appendChild(path);

    // Label pill
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    const labelW = edge.label.length * 6.5 + 10;
    rect.setAttribute('x', midX - labelW / 2);
    rect.setAttribute('y', midY - 9);
    rect.setAttribute('width', labelW);
    rect.setAttribute('height', 16);
    rect.setAttribute('rx', '8');
    rect.setAttribute('fill', '#12141a');
    rect.setAttribute('stroke', '#262936');
    rect.setAttribute('stroke-width', '0.8');
    svg.appendChild(rect);

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', midX);
    text.setAttribute('y', midY + 4);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-family', "'JetBrains Mono', monospace");
    text.setAttribute('font-size', '9.5');
    text.setAttribute('fill', '#8b91a8');
    text.textContent = edge.label;
    svg.appendChild(text);
  });
}

/* ── Stage Transition ────────────────────────── */
function goToStage(n) {
  State.currentStage = Math.max(1, Math.min(5, n));
  State.ds = buildDS(State.currentStage);

  const stage = window.STAGES.find(s => s.id === State.currentStage);
  if (!stage) return;

  renderHeader(stage);
  renderNodes(stage);
  renderMemory(stage);

  // Update selected node to stage's active node
  State.selectedNode = stage.activeNodeId;
  renderStruct(State.selectedNode);

  // Trigger arrow redraw after layout settles
  requestAnimationFrame(() => { setTimeout(drawArrows, 60); });

  // Animate cards
  document.querySelectorAll('.memory-card, .arch-node').forEach(el => {
    el.classList.remove('fade-in');
    void el.offsetWidth;
    el.classList.add('fade-in');
  });
}

/* ── Build Static HTML Structure ─────────────── */
function buildHTML() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <!-- Header -->
    <header class="app-header">
      <div id="stage-subtitle" class="stage-subtitle"></div>
      <h1 id="stage-heading" class="stage-heading"></h1>

      <nav class="stage-nav" aria-label="Stage navigation">
        <button class="nav-btn pill-text" id="btn-prev">← Prev</button>
        ${[1,2,3,4,5].map(n => `<button class="nav-btn pill-num" data-stage="${n}" id="btn-stage-${n}">${n}</button>`).join('')}
        <button class="nav-btn pill-text" id="btn-restart">↺ Restart</button>
      </nav>

      <p id="stage-summary" class="stage-summary"></p>
    </header>

    <!-- Architecture Diagram -->
    <div class="section-card diagram-wrap" id="diagram-container">
      <svg id="arrow-canvas" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"></svg>

      <div class="diagram-grid">
        <!-- Row 1 -->
        <div class="node-cell">
          ${makeNode('node-iot', 'IoT Gate &amp; Sensors', '', '', '')}
        </div>
        <div class="node-cell">
          ${makeNode('node-heap', 'Min-Heap: Slots', '', '', '')}
        </div>
        <div class="node-cell">
          ${makeNode('node-dijkstra', 'Graph: Dijkstra', '', '', '')}
        </div>

        <!-- Row 2 — spacer row for vertical arrows label visibility -->
        <div style="height:2.2rem;"></div>
        <div style="height:2.2rem;"></div>
        <div style="height:2.2rem;"></div>

        <!-- Row 3 -->
        <div class="node-cell">
          ${makeNode('node-queue', 'FIFO Waitlist', '', '', '')}
        </div>
        <div class="node-cell">
          ${makeNode('node-billing', 'Exit &amp; Billing', '', '', '')}
        </div>
        <div class="node-cell">
          ${makeNode('node-hash', 'Hash Table: Active', '', '', '')}
        </div>
      </div>

      <!-- Legend -->
      <div class="diagram-legend">
        <div class="legend-item">
          <div class="legend-dot dot-active"></div> Active Mutation
        </div>
        <div class="legend-item">
          <div class="legend-dot dot-memory"></div> Memory Store
        </div>
        <div class="legend-item">
          <div class="legend-dot dot-compute"></div> Compute / Gate
        </div>
        <div class="legend-hint">Click a node to inspect struct</div>
      </div>
    </div>

    <!-- Memory State Cards -->
    <div class="section-label">Live Memory State Inspector</div>
    <div class="memory-grid">
      <div class="memory-card">
        <div class="mem-title" id="mem-heap-title"></div>
        <div class="mem-main" id="mem-heap-main"></div>
        <div class="mem-sub"  id="mem-heap-sub"></div>
      </div>
      <div class="memory-card">
        <div class="mem-title" id="mem-hash-title"></div>
        <div class="mem-main" id="mem-hash-main"></div>
        <div class="mem-sub"  id="mem-hash-sub"></div>
      </div>
      <div class="memory-card">
        <div class="mem-title" id="mem-queue-title"></div>
        <div class="mem-main" id="mem-queue-main"></div>
        <div class="mem-sub"  id="mem-queue-sub"></div>
      </div>
    </div>

    <!-- Struct Inspector -->
    <div class="section-label">Selected Module Struct</div>
    <div class="struct-panel">
      <div class="struct-label">Selected Module Struct</div>
      <div class="struct-header">
        <div>
          <h2 id="struct-title" class="struct-title"></h2>
        </div>
        <span id="struct-badge" class="struct-badge"></span>
      </div>
      <p id="struct-desc" class="struct-desc"></p>
      <pre class="code-block" id="struct-code"></pre>
    </div>
  `;
}

function makeNode(id, title, line1, line2, sub) {
  return `
    <div class="arch-node" id="${id}" tabindex="0" role="button" aria-label="${title} node">
      <div class="node-title">${title}</div>
      <div class="node-line1" id="${id}-l1">${line1}</div>
      <div class="node-line2" id="${id}-l2">${line2}</div>
      <div class="node-sub"  id="${id}-sub">${sub}</div>
    </div>`;
}

/* ── Wire Events ─────────────────────────────── */
function wireEvents() {
  document.getElementById('btn-prev').addEventListener('click', () => goToStage(State.currentStage - 1));
  document.getElementById('btn-restart').addEventListener('click', () => goToStage(1));

  [1,2,3,4,5].forEach(n => {
    document.getElementById(`btn-stage-${n}`).addEventListener('click', () => goToStage(n));
  });

  // Node click → struct inspector
  ['node-iot','node-heap','node-dijkstra','node-queue','node-billing','node-hash'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', () => {
      State.selectedNode = id;
      renderStruct(id);
    });
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
    });
  });

  // Redraw arrows on resize
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(drawArrows, 120);
  });
}

/* ── Boot ────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  buildHTML();
  wireEvents();
  goToStage(1);
});
