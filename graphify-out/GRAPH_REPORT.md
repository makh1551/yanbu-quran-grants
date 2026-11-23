# Graph Report - yanbu-quran-grants  (2026-11-23)

## Corpus Check
- 7 files · ~146,415 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 23 file(s) not represented in the graph (top: .woff2 18, .css 3, (none) 1)

## Summary
- 58 nodes · 82 edges · 10 communities (7 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `75531f07`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- app.js
- fursan/worker.js
- alfaqeed/worker.js
- majd/worker.js
- admin
- createRequest
- fetch
- tarshih_73ca1cee.md

## God Nodes (most connected - your core abstractions)
1. `createRequest()` - 8 edges
2. `admin()` - 7 edges
3. `fetch()` - 6 edges
4. `fetch()` - 6 edges
5. `json()` - 5 edges
6. `drawCard()` - 4 edges
7. `publicCampaign()` - 4 edges
8. `authed()` - 4 edges
9. `apiRoute()` - 4 edges
10. `roundRect()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `admin()` --calls--> `json()`  [EXTRACTED]
  alfaqeed/worker.js → alfaqeed/worker.js  _Bridges community 6 → community 4_
- `createRequest()` --calls--> `json()`  [EXTRACTED]
  alfaqeed/worker.js → alfaqeed/worker.js  _Bridges community 6 → community 5_
- `createRequest()` --calls--> `clean()`  [EXTRACTED]
  alfaqeed/worker.js → alfaqeed/worker.js  _Bridges community 4 → community 5_

## Import Cycles
- None detected.

## Communities (10 total, 3 thin omitted)

### Community 0 - "app.js"
Cohesion: 0.19
Nodes (5): drawCard(), drawQR(), loadImg(), PROJECTS, roundRect()

### Community 1 - "fursan/worker.js"
Cohesion: 0.23
Nodes (13): ALIAS, apiRoute(), authed(), DOCS, fetch(), FILES, H, json() (+5 more)

### Community 2 - "alfaqeed/worker.js"
Cohesion: 0.29
Nodes (6): FILES, NOINDEX, PROJECTS, STATUSES, SUFFIXES, TYPES

### Community 3 - "majd/worker.js"
Cohesion: 0.33
Nodes (5): ALIAS, fetch(), FILES, H, TYPES

### Community 4 - "admin"
Cohesion: 0.50
Nodes (4): admin(), clean(), readBody(), validId()

### Community 5 - "createRequest"
Cohesion: 0.50
Nodes (4): createRequest(), digits(), limited(), newId()

### Community 6 - "fetch"
Cohesion: 0.67
Nodes (4): fetch(), json(), publicCampaign(), serveFile()

## Knowledge Gaps
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createRequest()` connect `createRequest` to `alfaqeed/worker.js`, `admin`, `fetch`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Why does `admin()` connect `admin` to `alfaqeed/worker.js`, `createRequest`, `fetch`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._