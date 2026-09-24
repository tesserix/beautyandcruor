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

The sidecar serves a password-protected editor at `/admin`: her credits,
including the `role` field none of them have, and the running order — what the
homepage opens on, what each gallery leads with, the discipline plates, the
About portrait. A save is a commit, which CI builds and Kargo promotes, so a
change is live in minutes without anyone being asked.

It is **off unless configured**. A missing `ADMIN_PASSWORD_HASH` logs a line
and leaves `/admin` unrouted, so the enquiry form — the launch-blocking half of
this service — comes up either way.

### Done

- `prod-bac-admin-password-hash` — a PBKDF2-SHA256 verifier, 600k iterations.
  The password itself was never stored: it is in `~/.beautyandcruor-admin-password`
  on the machine that created it, mode 0600, to be passed to Parimiti and then
  deleted. Round-tripped against the stored verifier — correct password 303,
  wrong password 401.
- `prod-bac-admin-session-key` — 32 random bytes. Signs session cookies and is
  never shown to anyone. Supplying it rather than letting the service generate
  one at startup is what keeps her signed in when the pod moves.
- The chart wiring, in `tesserix-k8s` — a separate ExternalSecret for these
  three, so that a typo in one cannot stop `RESEND_API_KEY` being written and
  take the contact form down with it.

### Outstanding

**1. A GitHub token.** Has to be created by hand; there is no API for
fine-grained PATs. Settings → Developer settings → Personal access tokens →
Fine-grained. Repository access: **only `tesserix/beautyandcruor`**.
Permissions: **Contents: read and write**, nothing else. Then:

```
printf '%s' 'github_pat_...' | gcloud secrets create prod-bac-admin-github-token \
  --project=tesseracthub-480811 --replication-policy=automatic --data-file=-
```

**`printf '%s'`, not a paste followed by Enter.** A trailing newline survives
the whole chain: Secret Manager stores the byte, External Secrets copies it
into the Kubernetes Secret verbatim, and the container receives it in the
variable. Go's http client then refuses the Authorization header — a newline
in a header value is how injection works — and every GitHub call fails with
`invalid header field value` while the token itself is perfectly valid. That
is exactly how this went wrong the first time.

It also hides from the obvious check. Shell command substitution strips
trailing newlines, so `TOK=$(gcloud secrets versions access ...)` inspects an
already-cleaned value: the secret passes every test and is still broken in the
cluster. Count bytes instead.

```
gcloud secrets versions access latest --secret=<name> --project=... | wc -c
```

The service trims its credentials on the way in, so this can no longer break
it. The stored value should still be clean.

The narrow scope is the real boundary. The service refuses to write any path
outside its own allowlist — credits, curation, alt text — so a stolen session
cannot reach the workflow that deploys the site; keep the token narrow anyway,
because that half is enforced by GitHub rather than by us.

**2. Flip the switch.** In `tesserix-k8s`, set
`charts/apps/beautyandcruor/values.yaml` → `enquiry.admin.enabled: true`.

That order matters. The deployment mounts the three secrets by reference, and a
`secretKeyRef` to a Secret that does not exist stops the pod starting — so the
secrets go in first and the flag second.

### What she sees

`https://<site>/admin`, one password, two tabs. The running-order pickers offer
only images already in a gallery: the manifest holds 68 more under
`unpublished`, and `scripts/assets-sync.mjs` refuses to upload anything outside
the cleared list, so choosing one would fail the build on the rights gate
rather than publish it.

Optionally `ADMIN_ASSET_BASE_URL`, which must match the site's
`ASSET_BASE_URL` build arg — the pickers load thumbnails from the bucket, since
`public/img` is excluded from the site image. Both default to the same bucket
and both move at the cutover.

## Not wired up yet

- **Image sourcing in CI.** The pipeline emits ~224 MB of derivatives from
  225 MB of originals; neither is committed. A reproducible build needs the
  originals fetched from object storage in the builder stage. See the header
  comment in the `Dockerfile`.
- **The enquiry endpoint.** Resend cannot be called from the browser without
  publishing its API key. `NEXT_PUBLIC_ENQUIRY_ENDPOINT` needs to point at
  something that holds the key — the existing `notification-service` is the
  obvious candidate.
