# Agent Privilege K8 Kits LAB

Download hub for the **Agent Privilege Gateway Kubernetes deployment kits**: two ready-to-ship
zip packages (single-gateway and multi-gateway HA) plus the shared 18-page deployment guide,
served from one local page.

Tier: **Tool** (infrastructure for the family — it serves packaged artifacts; it does not tell a story or score anything).
Repo: https://github.com/curtismu7/privilege-k8-kits-LAB
Port: 7809 (loopback-only host port; the lab-proxy address is `https://local.ping-devops.com:8443/privilege-k8-kits/`).

## What it serves

| Kit | Zip | Contents |
| --- | --- | --- |
| 1 Gateway Privilege K8 | `kits/one-gateway-privilege-k8.zip` | docs/ (guide PDF + generator), helm/ (agent-privilege chart .tgz + source + quickstart-values.yaml), tf/ (single-node Terraform) |
| Multi-Gateway Privilege K8 | `kits/multi-gateway-privilege-k8.zip` | Same shape, plus shared Redis, integrated load balancer and multi-node Terraform |

Both kits carry the same guide: `PingOne-Privilege-AI-Gateway-K8s-Deployment-Guide.pdf`.
The app also serves the guide directly at `/guide`.

Everything is generic: `.example.com` hostnames, placeholder credentials, no tenant or
environment identifiers. Tests assert that (see below).

## Run from a clone

Prerequisites: Node 26 or newer, `unzip` (the tests shell out to it). No npm dependencies.

```sh
git clone https://github.com/curtismu7/privilege-k8-kits-LAB.git
cd privilege-k8-kits-LAB
npm start          # http://127.0.0.1:7809
npm test           # 6 tests
```

Open http://127.0.0.1:7809. The page is read-only: kit cards with download buttons, a
"which kit?" decision table, SHA-256 checksums, and a link to the guide.

## Swapping a kit

The zips are build artifacts, not source. After regenerating either zip:

1. Replace the file in `kits/`.
2. Run `./checksums.sh` — it rewrites `kits/checksums.json`, which `/api/info` serves and
   `test/kits.test.js` verifies.
3. `npm test` — the drift test fails if you skip step 2.

## What is simulated / not

Nothing is simulated: this is a static artifact server. The banner exists because the
rulebook requires one on every page — it states that the app only serves its own files
and that the *kits* are example placeholders until filled in. The app makes zero outbound
calls (no `fetch` outside its own API, no external origins).

## Endpoints

- `GET /` — the kits page
- `GET /api/health` — `demo-health/1`
- `GET /api/info` — kit metadata (bytes, sha256, download URL)
- `GET /api/download/<kitId>` or `GET /kits/<file>` — the zip
- `GET /guide` — the deployment guide PDF (inline)

Safety: loopback + `LAB_ALLOWED_HOSTS` host check (DNS-rebinding guard), GET/HEAD only,
path traversal refused, `/kits/` serves only the two known kit files.
