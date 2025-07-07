# API Documentation Generation Report

Generated on: 2025-07-07T03:52:46.419Z

## Summary Statistics

- **API Title**: Multitenant Shell - Tenant API
- **Version**: 1.0.0
- **Total API Paths**: 7
- **Total HTTP Methods**: 8
- **API Groups (Tags)**: 4
- **Security Schemes**: 2

## API Groups Generated

### Authentication
Tenant authentication and session management

### Tenants
Tenant management operations

### Tenant Access
Tenant access control and impersonation

### Search
Universal search functionality across tenant data


## Security Configuration

- JWT-auth
- Authentication

## Generated Files

### Backend
- `apps/backend/dist/` - Compiled NestJS application
- `apps/docs/generated/tenant-api-spec.json` - OpenAPI specification

### Documentation
- `apps/docs/content/api/overview.mdx` - API overview page
- `apps/docs/content/api/authentication.mdx` - Authentication endpoints
- `apps/docs/content/api/tenants.mdx` - Tenants endpoints
- `apps/docs/content/api/tenant-access.mdx` - Tenant Access endpoints
- `apps/docs/content/api/search.mdx` - Search endpoints
- `apps/docs/content/api/complete-reference.mdx` - Interactive API reference

## Next Steps

1. **Review Generated Documentation**: Check the generated MDX files for accuracy
2. **Customize Content**: Add examples, tutorials, or additional explanations
3. **Update Authentication Guide**: Ensure auth instructions are up to date
4. **Test Interactive Features**: Verify the OpenAPI integration works correctly
5. **Deploy**: Push changes to your documentation hosting platform

## Automation Commands

To regenerate this documentation:
```bash
# From project root
npm run api:generate

# Or step by step:
cd apps/backend && npm run build
cd apps/backend && npm run api:generate
cd apps/docs && npm run api:sync
```

## Developer Workflow

1. **Add new endpoints**: Create controllers with proper Swagger decorators
2. **Update documentation**: Run `npm run api:generate` from project root
3. **Customize content**: Edit the generated MDX files as needed
4. **Test**: Start both backend and docs servers to verify integration
5. **Deploy**: Commit and push changes

---

*This report was generated automatically by the Multitenant Shell API Documentation Generator*
