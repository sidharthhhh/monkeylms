# ============================================================
# Stage 1: Builder — compile the Go binary
# ============================================================
FROM golang:1.24-alpine AS builder

# Install build dependencies (git needed for some go modules)
RUN apk add --no-cache git ca-certificates tzdata

WORKDIR /app

# GOTOOLCHAIN=local prevents Go from downloading a newer toolchain
# to satisfy the 'go X.Y.Z' directive in go.mod (fixes version mismatch errors)
ENV GOTOOLCHAIN=local

# Copy dependency manifests first to leverage Docker layer caching
COPY go.mod go.sum ./
RUN go mod download && go mod verify

# Copy the rest of the source code
COPY . .

# Build a statically linked binary — no libc needed in the final image
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-w -s" -o /app/api ./cmd/api/main.go

# ============================================================
# Stage 2: Runner — minimal distroless image
# ============================================================
FROM gcr.io/distroless/static-debian12 AS runner

# Copy timezone data & CA certs for TLS connections (e.g., DB over TLS)
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Non-root user (distroless uses uid 65532 "nonroot" by default)
USER nonroot:nonroot

WORKDIR /app

# Copy only the compiled binary
COPY --from=builder /app/api .

EXPOSE 8080

ENTRYPOINT ["/app/api"]
