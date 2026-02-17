# Tenancy Rules Checklist (Buildings Domain)

Use this checklist during code reviews.

## Musts

- [ ] Every Building has `organization` FK
- [ ] Every Unit has `organization` FK and `building` FK
- [ ] Every queryset filters by `organization=request.org`
- [ ] No serializer exposes `organization` for write
- [ ] No view accepts org identifiers from the client
- [ ] Unit creation validates building belongs to request.org
- [ ] Unit model enforces org match via `clean()` and `full_clean()`
- [ ] Cross-tenant access returns 404
- [ ] At least one isolation test exists and passes

## Nice-to-have later

- [ ] Event log emitted on create/update/delete (for AI insights + audit)
- [ ] Cursor pagination for units list
- [ ] Search/order by address, name, type
- [ ] Bulk import + validation reports
