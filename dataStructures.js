/**
 * dataStructures.js
 * Core Data Structure Implementations for IoT Smart Parking System
 * MinHeap · HashTable · CircularQueue · GraphDijkstra
 */

'use strict';

/* ─────────────────────────────────────────────
   MIN-HEAP — Slot distance management
   extractMin(): O(log N)  push(): O(log N)
───────────────────────────────────────────── */
class MinHeap {
  constructor() {
    this._heap = [];
  }

  get size() { return this._heap.length; }
  get array() { return this._heap.map(e => `${e.slot}(d=${e.dist})`); }

  _parent(i) { return Math.floor((i - 1) / 2); }
  _left(i)   { return 2 * i + 1; }
  _right(i)  { return 2 * i + 2; }

  _swap(a, b) {
    [this._heap[a], this._heap[b]] = [this._heap[b], this._heap[a]];
  }

  push(slot, dist) {
    this._heap.push({ slot, dist });
    this._bubbleUp(this._heap.length - 1);
  }

  _bubbleUp(i) {
    while (i > 0) {
      const p = this._parent(i);
      if (this._heap[p].dist <= this._heap[i].dist) break;
      this._swap(p, i);
      i = p;
    }
  }

  extractMin() {
    if (!this._heap.length) return null;
    const min = this._heap[0];
    const last = this._heap.pop();
    if (this._heap.length) {
      this._heap[0] = last;
      this._siftDown(0);
    }
    return min;
  }

  _siftDown(i) {
    const n = this._heap.length;
    while (true) {
      let smallest = i;
      const l = this._left(i), r = this._right(i);
      if (l < n && this._heap[l].dist < this._heap[smallest].dist) smallest = l;
      if (r < n && this._heap[r].dist < this._heap[smallest].dist) smallest = r;
      if (smallest === i) break;
      this._swap(i, smallest);
      i = smallest;
    }
  }

  peek() { return this._heap[0] || null; }
  isEmpty() { return this._heap.length === 0; }

  snapshot() {
    return this._heap.map(e => ({ ...e }));
  }
}

/* ─────────────────────────────────────────────
   HASH TABLE — Active vehicle registry
   put(): O(1)   get(): O(1)   remove(): O(1)
───────────────────────────────────────────── */
class HashTable {
  constructor(capacity = 8) {
    this._cap = capacity;
    this._buckets = Array.from({ length: capacity }, () => []);
    this._size = 0;
  }

  _hash(key) {
    let h = 5381;
    for (let i = 0; i < key.length; i++) {
      h = ((h << 5) + h) ^ key.charCodeAt(i);
      h = h >>> 0;
    }
    return h % this._cap;
  }

  put(plate, slot) {
    const idx = this._hash(plate);
    const bucket = this._buckets[idx];
    const existing = bucket.find(e => e.plate === plate);
    if (existing) { existing.slot = slot; return; }
    bucket.push({ plate, slot, ts: Date.now() });
    this._size++;
  }

  get(plate) {
    const idx = this._hash(plate);
    const entry = this._buckets[idx].find(e => e.plate === plate);
    return entry ? entry.slot : null;
  }

  remove(plate) {
    const idx = this._hash(plate);
    const bucket = this._buckets[idx];
    const pos = bucket.findIndex(e => e.plate === plate);
    if (pos === -1) return false;
    bucket.splice(pos, 1);
    this._size--;
    return true;
  }

  snapshot() {
    return this._buckets.map((b, i) => ({
      index: i,
      entries: b.map(e => ({ ...e }))
    }));
  }

  get size() { return this._size; }
}

/* ─────────────────────────────────────────────
   CIRCULAR QUEUE — FIFO Waitlist
   enqueue(): O(1)   dequeue(): O(1)
───────────────────────────────────────────── */
class CircularQueue {
  constructor(capacity = 5) {
    this._cap = capacity;
    this._data = new Array(capacity).fill(null);
    this._head = 0;
    this._tail = 0;
    this._size = 0;
  }

  get capacity() { return this._cap; }
  get size()     { return this._size; }
  isFull()       { return this._size === this._cap; }
  isEmpty()      { return this._size === 0; }

  enqueue(plate) {
    if (this.isFull()) throw new Error('Queue overflow');
    this._data[this._tail] = plate;
    this._tail = (this._tail + 1) % this._cap;
    this._size++;
  }

  dequeue() {
    if (this.isEmpty()) return null;
    const item = this._data[this._head];
    this._data[this._head] = null;
    this._head = (this._head + 1) % this._cap;
    this._size--;
    return item;
  }

  peek() {
    if (this.isEmpty()) return null;
    return this._data[this._head];
  }

  snapshot() {
    const arr = [];
    for (let i = 0; i < this._size; i++) {
      arr.push(this._data[(this._head + i) % this._cap]);
    }
    return arr;
  }
}

/* ─────────────────────────────────────────────
   GRAPH DIJKSTRA — Shortest Path Routing
   O((V + E) log V)
───────────────────────────────────────────── */
class GraphDijkstra {
  constructor() {
    this._adj = new Map();
    this._buildParkingGraph();
  }

  _buildParkingGraph() {
    const edges = [
      ['ENTRY', 'A1', 10],
      ['ENTRY', 'A2', 15],
      ['A1',    'A2',  5],
      ['A1',    'B1', 12],
      ['A2',    'A3',  8],
      ['A2',    'B2', 10],
      ['A3',    'EXIT', 6],
      ['B1',    'B2',  7],
      ['B2',    'EXIT', 9],
    ];
    for (const [u, v, w] of edges) {
      if (!this._adj.has(u)) this._adj.set(u, []);
      if (!this._adj.has(v)) this._adj.set(v, []);
      this._adj.get(u).push({ to: v, w });
      this._adj.get(v).push({ to: u, w });
    }
  }

  shortestPath(src, dst) {
    const dist = new Map();
    const prev = new Map();
    const visited = new Set();
    const heap = new MinHeap();

    for (const node of this._adj.keys()) dist.set(node, Infinity);
    dist.set(src, 0);
    heap.push(src, 0);

    while (!heap.isEmpty()) {
      const { slot: u } = heap.extractMin();
      if (visited.has(u)) continue;
      visited.add(u);
      if (u === dst) break;

      for (const { to, w } of (this._adj.get(u) || [])) {
        const nd = dist.get(u) + w;
        if (nd < (dist.get(to) ?? Infinity)) {
          dist.set(to, nd);
          prev.set(to, u);
          heap.push(to, nd);
        }
      }
    }

    const path = [];
    let cur = dst;
    while (cur !== undefined) {
      path.unshift(cur);
      cur = prev.get(cur);
    }
    return { path, dist: dist.get(dst) ?? Infinity };
  }
}

window.DSLib = { MinHeap, HashTable, CircularQueue, GraphDijkstra };
