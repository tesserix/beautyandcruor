# The enquiry sidecar. Runs beside nginx in the site's pod, on loopback only.
FROM golang:1.25-alpine AS build
WORKDIR /src
COPY go.mod ./
COPY *.go ./
# The admin UI is go:embed-ed into the binary, so it has to be in the build
# context. Without this the build fails at compile time rather than shipping a
# service with no page behind /admin.
COPY admin.html ./
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
