# Optional SQLite utility container; mostly for local debugging/inspection.
FROM alpine:3.19
RUN apk add --no-cache sqlite
WORKDIR /data
VOLUME ["/data"]
# Keep container running for debugging purposes
CMD ["tail", "-f", "/dev/null"]
