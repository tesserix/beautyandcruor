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

## Not wired up yet

- **Image sourcing in CI.** The pipeline emits ~224 MB of derivatives from
  225 MB of originals; neither is committed. A reproducible build needs the
  originals fetched from object storage in the builder stage. See the header
  comment in the `Dockerfile`.
- **The enquiry endpoint.** Resend cannot be called from the browser without
  publishing its API key. `NEXT_PUBLIC_ENQUIRY_ENDPOINT` needs to point at
  something that holds the key — the existing `notification-service` is the
  obvious candidate.
