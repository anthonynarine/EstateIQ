# Response Conventions

## Base rules

- Base path: `/api/v1/`
- JSON only
- Use one pagination strategy early and keep it consistent
- Include a request identifier header for traceability

## Recommended error envelope

```json
{
  "error": {
    "code": "validation_error",
    "message": "Rent amount must be positive",
    "details": {}
  }
}
```

## Contract philosophy

- Serializers define stable response shapes.
- Frontend components should depend on explicit contracts, not ad hoc field grabbing.
- Reporting endpoints should return chart-ready JSON, not raw database-shaped payloads.
