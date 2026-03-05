# Security Assessment — Car Model Skill (OpenClaw)

**Date:** 2026-03-05
**Scope:** Review of configuration files for Docker-hosted OpenClaw deployment (home/personal use)
**Verdict: MIXED — Strong containment design, but OpenClaw itself carries significant platform risk**

---

## Executive Summary

Your Docker setup is **well-architected for containment**. You've clearly thought about isolation, least-privilege, and egress control. However, the underlying platform — OpenClaw — has a serious and growing track record of critical vulnerabilities. The question isn't whether your Docker wrapper is good (it is), but whether the thing inside it can be trusted not to break out.

---

## What You Got Right

### Container Hardening (Strong)
- **Non-root execution** (`user: "1000:1000"`) — good.
- **Read-only root filesystem** with tmpfs for runtime writes — prevents persistent container modification.
- **All Linux capabilities dropped** (`cap_drop: ALL`) — minimises kernel attack surface.
- **`no-new-privileges`** — blocks privilege escalation inside the container.
- **Resource limits** (2 CPU, 4GB RAM, pid limit 256) — prevents resource exhaustion attacks.

### Network Isolation (Strong)
- **`internal: true`** on `openclaw-internal` — this is the key line. Docker won't route traffic from this network to the host or internet.
- **Loopback-only gateway binding** (`127.0.0.1:18789`) — the gateway is not exposed to LAN or internet.
- **All egress funnelled through Squid proxy** — OpenClaw literally cannot make an outbound connection except through your allowlist.

### Egress Proxy (Good)
- **Allowlist-only model** — deny-all default is correct.
- **Explicit blocklist** for known exfiltration domains (pastebin, ngrok, webhook.site) fires before allow rules.
- **No disk cache** — web content doesn't persist in the proxy.

### Secrets Management (Good)
- **API key stored as Docker secret** — not visible via `docker inspect` or in `/proc/<pid>/environ`.
- **Secret file locked to mode 0400**.

### Workspace Isolation
- The **only data bridge** between OpenClaw and the host is the `workspace/` volume mount — files in, files out.
- Skills mounted read-only (`./skills:/home/node/.openclaw/skills:ro`).

---

## Remaining Risk: OpenClaw Platform Vulnerabilities

OpenClaw has a well-documented history of severe security issues:

- **CVE-2026-25253** (CVSS 8.8) — gateway compromise via leaked authentication tokens. Full admin takeover.
- **"ClawJacked" flaw** (Feb 2026) — any website can open a WebSocket to the local gateway, brute-force the password, and take over the agent. Patched in 2026.2.25.
- **9 CVEs disclosed** since January 2026, three with public exploit code. Includes RCE, SSRF, command injection, path traversal, and auth bypass.
- **Malicious skills supply chain** — 1,184 confirmed malicious skills on ClawHub (roughly 1 in 5 packages). Typosquatting attacks confirmed. AMOS macOS infostealer found bundled in skills.
- **135,000 exposed instances** found on the public internet with insecure defaults.

**Your mitigation:** Your config addresses several of these. Loopback binding prevents remote gateway access. Network isolation prevents direct internet access. Images are pinned to `2026.3.2` (latest patched release). But if OpenClaw itself is compromised (e.g., via a malicious skill or a new zero-day), the attacker would have:

- Read/write access to `workspace/` (your job files and output).
- Read access to skills.
- Access to your `ZAI_API_KEY` (via the mounted secret).
- The ability to make requests to any domain on your Squid allowlist.

### `openclaw-config` Volume is Read-Write

The config volume (`openclaw-config:/home/node/.openclaw`) is read-write and stores config and memory. If OpenClaw is compromised, an attacker can modify its own configuration, potentially changing model endpoints or adding new tool permissions.

### Allowlist Scope

The Squid allowlist permits access to 20+ car manufacturer and research sites, plus Wikipedia. Each is a potential vector for prompt injection via web content or data exfiltration via URL parameters. This is an inherent trade-off — the agent needs web access to do its job — but worth monitoring.

---

## Bottom Line

| Area | Rating |
|---|---|
| Docker container hardening | **Strong** |
| Network isolation | **Strong** |
| Egress control | **Good** |
| Secrets management | **Good** |
| Image pinning | **Good** (pinned to 2026.3.2) |
| OpenClaw platform trust | **Significant risk** |
| Supply chain (skills) | **High risk** if using third-party skills |
| Overall | **Safe to build and test**, but treat OpenClaw as untrusted code running in a sandbox |

**Is it safe to build?** Yes — your containment is solid enough for development and testing on a home computer. OpenClaw is sandboxed, network-isolated, and can only talk to a handful of allowlisted domains.

---

## Ongoing Recommendations

1. **Audit any skills** before installing — never pull from ClawHub without vetting.
2. **Keep OpenClaw updated** — patches are shipping frequently. Update the pinned version when new releases land.
3. **Monitor Squid access logs** for unexpected request patterns.
4. **Rotate ZAI_API_KEY** periodically.
