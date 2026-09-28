# Secret storage

Use in-cluster OpenBao for BeautyAndCruor application secrets. Prefix identifiers
with `beautyandcruor-`, separate environment paths, and bind least-privilege readers
to their namespace. Update writers and rotation procedures alongside readers.
Never log or commit credential payloads or place them in command arguments.

The three admin credentials use `beautyandcruor/app/beautyandcruor-admin-*` paths,
KV field `value`, via `openbao-beautyandcruor-production` in namespace `tesserix`.
Preserve verifier and signing-key bytes when changing storage. The shared enquiry
key retains its existing fe3dr OpenBao reader. See `deploy/README.md` and
`tesserix/tesserix-k8s#1209`. Do not introduce GCP Secret Manager dependencies.
OpenBao recovery material must be independently recoverable outside OpenBao.
