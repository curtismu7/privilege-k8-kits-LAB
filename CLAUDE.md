# privilege-k8-kits-LAB

Download hub for the Agent Privilege Gateway K8 deployment kits: serves two packaged
zips (one-gateway and multi-gateway) + the 18-page guide PDF from one page. Tier: Tool.
Port 7809, loopback-only; lab address `https://local.ping-devops.com:8443/privilege-k8-kits/`.

## Run / test

```sh
npm start        # http://127.0.0.1:7809
npm test         # node --test test/*.test.js (6 tests; needs `unzip` on PATH)
./checksums.sh   # after swapping a kit zip, before npm test
```

## Rules that bite

- The zips in `kits/` are BUILD ARTIFACTS, not source. Swap + `./checksums.sh` + `npm test`
  (the drift test compares sha256 against `kits/checksums.json`).
- Stale-identifier tests scan zip ENTRY lines only — `unzip -l` prints the archive's
  absolute path in an `Archive:` header, which false-positives on usernames.
- Read-only app: GET/HEAD only, host check via `safety.js` (loopback + LAB_ALLOWED_HOSTS),
  `/kits/` whitelists only the two kit files, `docs/build_guide.py` is scanned by tests
  for stale identifiers before it reaches a customer.
- No npm runtime dependencies; tests need `unzip` on PATH.
- No AI attribution in commits or PRs (owner rule 2026-11-07).
