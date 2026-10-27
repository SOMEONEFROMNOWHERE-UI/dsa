/**
 * stageData.js
 * Stage State Snapshots for IoT Smart Parking System
 * Drives all UI updates across the 5-stage lifecycle
 */

'use strict';

window.STAGES = [
  /* ══════════════════════════════════════════════
     STAGE 1 — IoT Entry & Sensor Detection
  ══════════════════════════════════════════════ */
  {
    id: 1,
    subtitle: 'Stage 1 of 5 · IoT Entry & Sensor Detection',
    heading: 'Vehicle Arrival, RFID Scan & Slot Bitmask Read',
    summary: 'TN-37-AB-1234 arrives at Entry Gate. RFID antenna captures plate in O(1). Ultrasonic sensors sweep all slots and write a 6-bit occupancy bitmask (0b001011) — marking A1, B1, B2 occupied and A2, A3, B3 free. Sensor data feeds the Min-Heap seeder.',
    activeNodeId: 'node-iot',
    nodes: {
      'node-iot':    { status: 'active',   line1: 'Entry: TN-37-AB-1234',    line2: 'RFID + Ultrasonic',         sub: 'Bitmask: 0b001011' },
      'node-heap':   { status: 'idle',     line1: 'extractMin() O(log N)',   line2: 'Or Push O(log N)',          sub: 'Heap: [A2,A3,B3]' },
      'node-dijkstra':{ status: 'idle',   line1: 'O((V+E) log V)',           line2: 'Awaiting slot assignment',  sub: 'Route: pending' },
      'node-queue':  { status: 'idle',     line1: 'Circular Queue O(1)',     line2: 'Queue: Empty (0/5)',         sub: 'enq() standby' },
      'node-billing':{ status: 'idle',     line1: 'Fee + Reallocate',        line2: 'Idle · No active exit',     sub: 'Awaiting departure' },
      'node-hash':   { status: 'idle',     line1: 'Lookup / Del O(1)',       line2: 'Registry: Empty',           sub: 'Buckets: 0/8 used' },
    },
    memory: {
      heap:  { title: 'Min-Heap Array (Distance)', main: '[ A2(d=15), A3(d=23), B3(d=32) ]', sub: 'Seeded from ultrasonic bitmask scan. Root = nearest free slot.' },
      hash:  { title: 'Hash Table Buckets (Plate → Slot)', main: 'All buckets empty. Registry initialised.', sub: 'put() O(1) · Awaiting first vehicle registration.' },
      queue: { title: 'FIFO Waitlist & Sensor Bitmask', main: 'Queue: Empty (0/5)', sub: 'Ultrasonic sweep: A1=1, A2=0, A3=0, B1=1, B2=1, B3=0 · 0b001011' },
    },
    dsInit: (ds) => {
      ds.heap.push('A2', 15);
      ds.heap.push('A3', 23);
      ds.heap.push('B3', 32);
    }
  },

  /* ══════════════════════════════════════════════
     STAGE 2 — Min-Heap Slot Allocation
  ══════════════════════════════════════════════ */
  {
    id: 2,
    subtitle: 'Stage 2 of 5 · Min-Heap Slot Allocation',
    heading: 'Nearest Free Slot Extraction via Min-Heap',
    summary: 'System calls extractMin() on the Min-Heap. Slot A2 (distance=15m) is extracted in O(log N) — heap re-heapifies, promoting A3 to root. Slot A2 is reserved for TN-37-AB-1234. Slot A1 skipped (occupied per bitmask).',
    activeNodeId: 'node-heap',
    nodes: {
      'node-iot':    { status: 'done',    line1: 'Entry: TN-37-AB-1234',    line2: 'RFID + Ultrasonic',         sub: 'Bitmask confirmed ✓' },
      'node-heap':   { status: 'active',  line1: 'extractMin() O(log N)',   line2: 'Extracted: Slot A2 (d=15)', sub: 'Heap: [A3,B3]' },
      'node-dijkstra':{ status: 'idle',  line1: 'O((V+E) log V)',           line2: 'Awaiting slot → src/dst',   sub: 'Route: pending' },
      'node-queue':  { status: 'idle',    line1: 'Circular Queue O(1)',     line2: 'Queue: Empty (0/5)',         sub: 'enq() standby' },
      'node-billing':{ status: 'idle',    line1: 'Fee + Reallocate',        line2: 'Idle · No active exit',     sub: 'Awaiting departure' },
      'node-hash':   { status: 'idle',    line1: 'Lookup / Del O(1)',       line2: 'Registry: Empty',           sub: 'Awaiting put()' },
    },
    memory: {
      heap:  { title: 'Min-Heap Array (Distance)', main: '[ A3(d=23), B3(d=32) ]  ← A2 extracted', sub: 'extractMin() O(log N) · Heap re-heapified · A3 promoted to root.' },
      hash:  { title: 'Hash Table Buckets (Plate → Slot)', main: 'All buckets empty · put() pending', sub: 'Registration deferred until routing complete.' },
      queue: { title: 'FIFO Waitlist & Sensor Bitmask', main: 'Queue: Empty (0/5)', sub: 'No overflow vehicles yet. Ultrasonic A2: 0 → 1 (reserved).' },
    },
    dsInit: (ds) => {
      ds.heap.push('A3', 23);
      ds.heap.push('B3', 32);
      // A2 already extracted — heap starts post-extract
    }
  },

  /* ══════════════════════════════════════════════
     STAGE 3 — Shortest Path Routing (Dijkstra)
  ══════════════════════════════════════════════ */
  {
    id: 3,
    subtitle: 'Stage 3 of 5 · Dijkstra Shortest Path',
    heading: 'Optimal Route Computation: Entry Gate → Slot A2',
    summary: 'Dijkstra\'s algorithm runs on the parking lot graph (7 vertices, 9 edges) in O((V+E) log V). Optimal path: ENTRY → A1 → A2 (cost 15m). Navigation beacon activates on the route. TN-37-AB-1234 is guided to Slot A2.',
    activeNodeId: 'node-dijkstra',
    nodes: {
      'node-iot':    { status: 'done',   line1: 'Entry: TN-37-AB-1234',    line2: 'RFID + Ultrasonic',         sub: 'Bitmask confirmed ✓' },
      'node-heap':   { status: 'done',   line1: 'extractMin() O(log N)',   line2: 'Slot A2 assigned',          sub: 'Heap: [A3, B3]' },
      'node-dijkstra':{ status:'active', line1: 'O((V+E) log V)',          line2: 'Route ENTRY→A1→A2',         sub: 'Cost: 15m · 2 hops' },
      'node-queue':  { status: 'idle',   line1: 'Circular Queue O(1)',     line2: 'Queue: Empty (0/5)',         sub: 'enq() standby' },
      'node-billing':{ status: 'idle',   line1: 'Fee + Reallocate',        line2: 'Idle · No active exit',     sub: 'Awaiting departure' },
      'node-hash':   { status: 'idle',   line1: 'Lookup / Del O(1)',       line2: 'Registry: Empty',           sub: 'Awaiting put()' },
    },
    memory: {
      heap:  { title: 'Min-Heap Array (Distance)', main: '[ A3(d=23), B3(d=32) ]', sub: 'Heap stable. No new extraction during routing phase.' },
      hash:  { title: 'Hash Table Buckets (Plate → Slot)', main: 'Buckets empty · put() pending post-routing', sub: 'Registration fires after Dijkstra resolves path.' },
      queue: { title: 'FIFO Waitlist & Sensor Bitmask', main: 'Queue: Empty (0/5)', sub: 'Dijkstra path: ENTRY(0) → A1(10) → A2(15) · Graph: 7V, 9E' },
    },
    dsInit: (ds) => {
      ds.heap.push('A3', 23);
      ds.heap.push('B3', 32);
    }
  },

  /* ══════════════════════════════════════════════
     STAGE 4 — Hash Table Registration & Waitlist
  ══════════════════════════════════════════════ */
  {
    id: 4,
    subtitle: 'Stage 4 of 5 · Hash Table Registration & Waitlist',
    heading: 'Vehicle Registration & Overflow Queue Management',
    summary: 'TN-37-AB-1234 → Slot A2 registered via put() in O(1), hashed to Bucket B1. Overflow vehicle TN-99-ZZ-0001 arrives but lot is at capacity — enq() pushes it to the circular FIFO waitlist in O(1). Queue: 1/5 occupied.',
    activeNodeId: 'node-hash',
    nodes: {
      'node-iot':    { status: 'done',   line1: 'Entry: TN-37-AB-1234',    line2: 'RFID + Ultrasonic',         sub: 'Bitmask confirmed ✓' },
      'node-heap':   { status: 'done',   line1: 'extractMin() O(log N)',   line2: 'Slot A2 assigned',          sub: 'Heap: [A3, B3]' },
      'node-dijkstra':{ status:'done',  line1: 'O((V+E) log V)',           line2: 'Route ENTRY→A1→A2',         sub: 'Path confirmed ✓' },
      'node-queue':  { status: 'active', line1: 'Circular Queue O(1)',     line2: 'enq → TN-99-ZZ-0001',       sub: 'Queue: 1/5 occupied' },
      'node-billing':{ status: 'idle',   line1: 'Fee + Reallocate',        line2: 'Idle · No active exit',     sub: 'Awaiting departure' },
      'node-hash':   { status: 'active', line1: 'Lookup / Del O(1)',       line2: 'Put B1 · AB-1234→A2',       sub: 'Bucket B1 · 1 entry' },
    },
    memory: {
      heap:  { title: 'Min-Heap Array (Distance)', main: '[ A3(d=23), B3(d=32) ]', sub: 'Heap unchanged. Next extractMin() → A3 for future vehicle.' },
      hash:  { title: 'Hash Table Buckets (Plate → Slot)', main: 'B1: TN-37-AB-1234 → Slot A2', sub: 'put() O(1) · hash(AB-1234) = bucket[1] · Registry: 1 active vehicle.' },
      queue: { title: 'FIFO Waitlist & Sensor Bitmask', main: 'Queue: [TN-99-ZZ-0001] (1/5)', sub: 'enqueue() O(1) · Head=0, Tail=1 · Ultrasonic A2: 0→1 (occupied).' },
    },
    dsInit: (ds) => {
      ds.heap.push('A3', 23);
      ds.heap.push('B3', 32);
      ds.hash.put('TN-37-AB-1234', 'A2');
      ds.hash.put('TN-37-AB-9999', 'B3');
      ds.queue.enqueue('TN-99-ZZ-0001');
    }
  },

  /* ══════════════════════════════════════════════
     STAGE 5 — Check-Out, Billing & Reallocation
  ══════════════════════════════════════════════ */
  {
    id: 5,
    subtitle: 'Stage 5 of 5 · IoT Exit & Auto-Reallocation',
    heading: 'Vehicle Check-Out, Billing & Waitlist Handoff',
    summary: 'TN-37-AB-1234 scans out at Exit Gate. Hash Table locates Slot A3 in O(1), computes billing, deletes record, and passes Slot A3 directly to FIFO Waitlist (or pushes to Min-Heap in O(log N) if empty).',
    activeNodeId: 'node-billing',
    nodes: {
      'node-iot':    { status: 'active',  line1: 'Exit: TN-37-AB-1234',    line2: 'RFID + Ultrasonic',         sub: 'Exit Gate · Check-out' },
      'node-heap':   { status: 'idle',    line1: 'extractMin() O(log N)',   line2: 'Or Push O(log N)',          sub: 'Bypassed → Waitlist' },
      'node-dijkstra':{ status: 'done',  line1: 'O((V+E) log V)',          line2: 'Route ZZ-0001→A3',          sub: 'New route computed ✓' },
      'node-queue':  { status: 'done',   line1: 'Circular Queue O(1)',     line2: 'Deq → Assign A3',           sub: 'Queue: Empty (0/5)' },
      'node-billing':{ status: 'active',  line1: 'Fee + Reallocate',        line2: 'Billed · Freed A3',         sub: '₹45.00 · 90 min' },
      'node-hash':   { status: 'active',  line1: 'Lookup / Del O(1)',       line2: 'Del B1 · Put ZZ-0001',      sub: 'Rebound: ZZ-0001→A3' },
    },
    memory: {
      heap:  { title: 'Min-Heap Array (Distance)', main: '[ ] (Slot A3 bypassed Heap → Waitlist Head)', sub: 'Fallback: push(A3) in O(log N) when Queue is empty.' },
      hash:  { title: 'Hash Table Buckets (Plate → Slot)', main: 'B1: Deleted(AB-1234) → Rebound: TN-99-ZZ-0001 → Slot A3', sub: 'remove() O(1) + put() O(1) · Fee Billed' },
      queue: { title: 'FIFO Waitlist & Sensor Bitmask', main: 'Queue: Empty (0/5)\n(Dequeued TN-99-ZZ-0001 → Slot A3)', sub: 'dequeue() O(1) · Ultrasonic A3: 1→0→1' },
    },
    dsInit: (ds) => {
      ds.hash.put('TN-37-AB-9999', 'B3');
      ds.hash.put('TN-99-ZZ-0001', 'A3');
      // AB-1234 was removed, ZZ-0001 rebound
    }
  }
];

/* C-Struct definitions for all 6 architecture nodes */
window.NODE_STRUCTS = {
  'node-iot': {
    title: 'IoT Gate & Sensor Engine',
    badge: 'RFID: O(1) · Bitmask: O(N)',
    desc: 'Reads RFID plate on vehicle arrival/departure. Ultrasonic sensors sweep all slots and encode occupancy into a bitmask. Triggers Min-Heap seeding or Hash Table lookup on exit.',
    struct: `struct IoTGateSensor {
  char     plate[16];       /* RFID-captured plate number  */
  uint8_t  gate_id;         /* 0=Entry, 1=Exit             */
  uint8_t  occ_bitmask;     /* 6-bit slot occupancy map    */
  uint32_t ts_unix;         /* UNIX timestamp of scan      */
  float    sensor_range_m;  /* Ultrasonic range (metres)   */
  uint8_t  signal_strength; /* RFID RSSI 0–255             */
};`
  },
  'node-heap': {
    title: 'Min-Heap Slot Allocator',
    badge: 'extractMin: O(log N)',
    desc: 'Maintains a binary min-heap of free parking slots ordered by distance from entry. Extracts the nearest slot in O(log N) and heapifies. Falls back to push() when a freed slot has no waitlist claimant.',
    struct: `struct MinHeapSlot {
  char     slot_id[4];      /* e.g. "A2", "B3"            */
  uint16_t dist_m;          /* Distance from Entry Gate    */
  uint8_t  level;           /* Parking level (0-indexed)   */
  uint8_t  heap_idx;        /* Current position in array   */
  uint8_t  is_reserved;     /* 1 = reserved, 0 = free      */
};`
  },
  'node-dijkstra': {
    title: 'Dijkstra Route Planner',
    badge: 'O((V+E) log V)',
    desc: 'Runs Dijkstra\'s SSSP on the parking lot graph. Vertices are gate and slot nodes; edges are weighted corridors. Returns optimal path array and total distance for navigation beacon activation.',
    struct: `struct DijkstraRoute {
  char     src[8];          /* Source node ID              */
  char     dst[8];          /* Destination slot ID         */
  char     path[64];        /* Serialised path: "A→A1→A2" */
  uint16_t total_dist_m;    /* Summed edge weights (metres)*/
  uint8_t  hop_count;       /* Number of nodes traversed   */
  uint8_t  v_count;         /* Graph vertex count          */
  uint16_t e_count;         /* Graph edge count            */
};`
  },
  'node-queue': {
    title: 'FIFO Circular Waitlist',
    badge: 'enq/deq: O(1)',
    desc: 'Circular buffer of capacity 5 for overflow vehicles. enqueue() on arrival when lot is full; dequeue() when a slot is freed, directly handing the plate to the reallocation engine without touching the Min-Heap.',
    struct: `struct CircularWaitlist {
  char     plates[5][16];   /* Ring buffer of plate IDs   */
  uint8_t  head;            /* Dequeue pointer index       */
  uint8_t  tail;            /* Enqueue pointer index       */
  uint8_t  size;            /* Current occupancy           */
  uint8_t  capacity;        /* Fixed ring capacity (5)     */
  uint32_t enq_ts[5];       /* Enqueue timestamps          */
};`
  },
  'node-billing': {
    title: 'Exit & Billing Engine',
    badge: 'Reallocate: O(1) or O(log N)',
    desc: 'Computes parking fee on departure, deletes Hash Table record, and hands freed slot to Waitlist or pushes back to Min-Heap.',
    struct: `struct BillingReceipt {
  char     plate[16];       /* Departing vehicle plate     */
  char     freed_slot[4];   /* Slot that was vacated       */
  uint16_t duration_min;    /* Parking duration in minutes */
  float    fee;             /* Computed fee in INR         */
  uint8_t  realloc_mode;    /* 0=Heap, 1=Waitlist direct   */
  char     next_plate[16];  /* Plate assigned freed slot   */
};`
  },
  'node-hash': {
    title: 'Hash Table Active Registry',
    badge: 'put/get/del: O(1)',
    desc: '8-bucket hash table with chaining. Maps RFID plate strings to assigned slot IDs. Supports O(1) put(), get(), and remove(). Rehashing not required for demo capacity.',
    struct: `struct HashBucketEntry {
  char     plate[16];       /* Vehicle plate (hash key)    */
  char     slot_id[4];      /* Assigned parking slot       */
  uint32_t checkin_ts;      /* Entry timestamp (UNIX)      */
  uint8_t  bucket_idx;      /* Resolved bucket index 0–7   */
  struct HashBucketEntry *next; /* Chaining pointer        */
};`
  }
};
