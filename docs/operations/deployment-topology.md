# Deployment Topology

This page complements the architecture deployment diagram with runtime guidance.

## Environment separation

Each environment should have its own:
- database
- Redis
- storage bucket
- secrets

## Production checklist

- HTTPS enforced
- HSTS enabled
- migrations run on deploy
- automated backups
- private buckets
- signed URL downloads
- centralized logging
- dependency scanning
