# Talk track — Privilege K8 Kits LAB

Three minutes. A download hub, not a story. Say first (the banner says it too): "SIMULATED, OFFLINE: this page only serves files from its own kits folder — no tenant is contacted and no credentials are involved. The zips are the real deployment kits; every value inside is an example placeholder until you fill in your own."

1. **The gateway card.** "One live check: a `tools/list` through the door and a refusal probe — the gateway's own words, keys scrubbed. In Mock this card still renders; flip the Mode select to Real to make the call live against the configured gateway."
2. **The two kits.** Two cards: single-gateway and multi-gateway HA, each with its `docs/`, `helm/`, `tf/` contents, size and sha256. Click **Download kit (.zip)** to prove it ships.
3. **Which kit?** Walk the decision table. "One gateway for a proof of value or a single-team pilot. Multi-gateway when registrations must survive a gateway restart — that is the shared Redis — when you want node failover, or when you want the integrated load balancer. The cost is Redis plus LB plus N namespaces."
4. **The guide.** Open the 18-page deployment PDF. "Start at §3 Prerequisites, then the Quick Start for the single-node path, or §6–§8 for the HA path: shared Redis, load balancer, second gateway node."
5. **Integrity.** Point at the checksum block. "sha256 on every kit; `./checksums.sh` regenerates it when you swap in your own kit."

## Notes for the presenter

- Host run: `npm start` → http://127.0.0.1:7809. Through the lab proxy: `https://local.ping-devops.com:8443/privilege-k8-kits/`.
- Real mode changes exactly one thing — the gateway check call. The kits are served from disk either way.
