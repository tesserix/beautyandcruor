# The enquiry sidecar. Runs beside nginx in the site's pod, on loopback only.
FROM golang:1.25-alpine AS build
WORKDIR /src
COPY go.mod ./
COPY *.go ./
RUN go test ./... \
    && CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /enquiry .

# scratch, not alpine: the binary is static and the service opens exactly one
# outbound connection, to Resend. It needs CA roots for that and nothing else.
FROM scratch
COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=build /enquiry /enquiry

# Matches the site container: non-root, and nothing writable.
USER 65532:65532
EXPOSE 8081
ENTRYPOINT ["/enquiry"]
