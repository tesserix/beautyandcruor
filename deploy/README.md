# Deploy

## Where this belongs

**These manifests are a starting point, not the deployment source of truth.**

The platform convention is that Kubernetes config lives in the separate
`tesserix-k8s` repo as Helm charts synced by ArgoCD — see
`charts/apps/tesserix-home` for the reference implementation. This chart is
written to match that pattern so it can be moved across as
`charts/apps/beautyandcruor` rather than rewritten.

**Never run `kubectl apply`, `patch` or `edit` against the cluster.** ArgoCD
self-heal will overwrite it and the change will be lost. Make it in the chart,
commit, sync.

## What the chart does

A static site, so the pod is deliberately boring: nginx serving files, no app
runtime, no secrets, no database. That buys a strict security posture at no
cost — `runAsNonRoot`, `readOnlyRootFilesystem`, all capabilities dropped,
`automountServiceAccountToken: false`, and `emptyDir` mounts for the two paths
nginx needs to write.

| | |
|---|---|
| Container port | 8080 (unprivileged nginx) |
| Service | ClusterIP :80 → 8080 |
| Ingress | Kong, cert-manager via ingress-shim |
| Health | `/healthz`, served by nginx itself |
| Resources | 20m/32Mi requested — it is a file server |

## TLS: named SANs, not a wildcard

The CAA records permit Let's Encrypt for normal certificates but restrict
`issuewild` to `pki.goog` and `globalsign.com`. **A wildcard certificate will
fail** until `0 issuewild "letsencrypt.org"` is added at Cloudflare.

`beautyandcruor.com` and `www.beautyandcruor.com` are listed as two named SANs,
which works with no DNS change.

## Local verification before the cluster

Build and serve the real container exactly as it will run:

```bash
npm run images        # required: the build fails without the manifest
npm run serve:nginx   # docker build + run on :8080
```

Then check the URL contract holds:

```bash
# every preserved URL resolves
for p in / /about-me/ /sfx-prosthetics/ /film-television/ \
         /casting-sculpting/ /editorial-fashion/ /blogs/ /contact-us/; do
  printf '%-24s %s\n' "$p" "$(curl -so /dev/null -w '%{http_code}' localhost:8080$p)"
done

# dead and demo URLs are gone, not missing
for p in /paritivity/ /location-contact-us/ /main-home/ /portfolio-item/colors/; do
  printf '%-24s %s\n' "$p" "$(curl -so /dev/null -w '%{http_code}' localhost:8080$p)"   # expect 410
done

# slashless form redirects once, permanently
curl -so /dev/null -w '%{http_code} -> %{redirect_url}\n' localhost:8080/about-me
```

## Turning on the credits editor

The sidecar serves a password-protected editor at `/admin` that commits
`src/content/credits.json` and lets her fill in the one field no credit has:
her role. It is **off unless configured** — a missing `ADMIN_PASSWORD_HASH`
logs a line and leaves `/admin` unrouted, so the enquiry form, which is the
launch-blocking half of this service, comes up either way.

Three secrets, and the chart change lives in `tesserix-k8s`, not here.

**1. The password.** Never type it into a file. The binary derives the
verifier, so the password exists only in the terminal that created it:

```
docker run --rm -i ghcr.io/tesserix/beautyandcruor-enquiry:latest -hash
# Password: ...
# pbkdf2-sha256$600000$...$...
```

Store that output as `prod-bac-admin-password-hash` in Secret Manager. Anyone
who reads the secret has a PBKDF2 verifier, not a password.

**2. A session key.** 32 random bytes, `prod-bac-admin-session-key`. Without
one the service generates a key at startup, which works but signs her out
every time the pod moves.

**3. A GitHub token.** Fine-grained, **this repository only**, with
`Contents: read and write` and nothing else. Store as
`prod-bac-admin-github-token`.

The token's scope is the real boundary. The service refuses to write any path
outside `writablePaths` — credits, curation and alt text — so a stolen session
cannot reach the workflow that deploys the site. Keep the token narrow anyway:
belt and braces, and the braces are the part GitHub enforces.

Then in the `tesserix-k8s` chart, add an ExternalSecret for the three and pass
them to the enquiry container as `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_KEY`
and `ADMIN_GITHUB_TOKEN`, plus a plain `ADMIN_GITHUB_REPO:
tesserix/beautyandcruor`. Remember that an ExternalSecret needs both an entry
in the parent kustomization and a `kustomization.yaml` of its own, or
`kustomize build` fails.

**What she sees.** `https://<site>/admin`, one password, one screen. Editing a
credit commits to `main`, which builds, advances `deploy`, and promotes — so a
correction is live in a few minutes without anyone being asked.

## Not wired up yet

- **Image sourcing in CI.** The pipeline emits ~224 MB of derivatives from
  225 MB of originals; neither is committed. A reproducible build needs the
  originals fetched from object storage in the builder stage. See the header
  comment in the `Dockerfile`.
- **The enquiry endpoint.** Resend cannot be called from the browser without
  publishing its API key. `NEXT_PUBLIC_ENQUIRY_ENDPOINT` needs to point at
  something that holds the key — the existing `notification-service` is the
  obvious candidate.
