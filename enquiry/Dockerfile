# The enquiry sidecar. Runs beside nginx in the site's pod, on loopback only.
FROM golang:1.25-alpine AS build
WORKDIR /src
COPY go.mod ./
COPY *.go ./
# The admin UI is go:embed-ed into the binary, so it has to be in the build
# context. Without this the build fails at compile time rather than shipping a
# service with no page behind /admin.
COPY admin.html ./
# Same reason, and the same failure mode: fonts.go embeds these, so a missing
# directory is a compile error — "pattern fonts/*.woff2: no matching files
# found" — not a silently unstyled invoice. This context is copied file by
# file rather than wholesale, so anything new that is embedded has to be
# added here too.
COPY fonts/ ./fonts/
RUN go test ./... \
    && CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /enquiry .

# scratch, not alpine: the binary is static and the service makes exactly two
# kinds of outbound call — Resend for enquiries, the GitHub contents API for
# credit edits. It needs CA roots for those and nothing else.
FROM scratch
COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=build /enquiry /enquiry

# Matches the site container: non-root, and nothing writable.
USER 65532:65532
EXPOSE 8081
ENTRYPOINT ["/enquiry"]
