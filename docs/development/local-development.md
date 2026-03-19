# Local Development

## Environments

- `dev`
- `staging`
- `prod`

## Local priorities

- run backend and frontend independently
- use environment-specific secrets
- keep auth, org scoping, and seed data easy to test
- preserve parity with production where possible

## Quality gates

- backend lint + tests
- frontend lint + typecheck
- migration safety
- smoke-test key flows after major refactors
