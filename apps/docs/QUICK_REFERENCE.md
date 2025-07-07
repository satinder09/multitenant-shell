# Quick Reference - API Documentation

## Essential Commands

### Development
```bash
# Start docs server (port 3002 to avoid conflicts)
npm run dev -- --port 3002

# Build for production
npm run build

# Type checking
npm run type-check
```

### API Updates
```bash
# 1. Update backend OpenAPI spec
cd apps/backend && npm run generate:openapi

# 2. Sync with docs
cd apps/docs && npm run api:sync

# 3. Restart dev server
npm run dev -- --port 3002
```

## Common Tasks

### Adding New Endpoint Documentation

1. **Update backend controller with Swagger decorators:**
```typescript
@ApiOperation({ summary: 'Description' })
@ApiResponse({ status: 200, type: ResponseDto })
@Post('/endpoint')
```

2. **Regenerate API spec:**
```bash
cd apps/backend && npm run generate:openapi
cd apps/docs && npm run api:sync
```

3. **Create/update MDX file:**
```mdx
---
title: New Endpoint
description: What it does
---

# New Endpoint

Documentation content here...
```

4. **Update navigation in `content/meta.json`**

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 3001 in use | Use `npm run dev -- --port 3002` |
| MDX errors | Check for unescaped `{id}` → `\{id\}` |
| API not loading | Verify `NEXT_PUBLIC_API_BASE_URL` |
| OpenAPI 404 | Ensure backend is running on port 4000 |

### File Structure

```
apps/docs/
├── content/               # MDX files
│   ├── api/users.mdx     # API docs
│   └── meta.json         # Navigation
├── generated/            # Auto-generated
│   └── user-api-spec.json
├── src/
│   ├── app/              # Next.js pages
│   ├── components/       # React components
│   └── lib/source.ts     # Configuration
└── DEVELOPER_GUIDE.md    # Full guide
```

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

### Interactive Components

```mdx
import { CodeExample } from '@/components/CodeExample';
import { ApiPlayground } from '@/components/ApiPlayground';

<CodeExample endpoint="/api/users" method="POST" />
<ApiPlayground endpoint="/api/users" method="POST" />
```

## Phase Implementation Status

- ✅ Phase 1: Foundation & OpenAPI Integration
- 🔄 Phase 2: Rich Interactive Components (Next)
- ⏳ Phase 3: Visual Enhancement & UX
- ⏳ Phase 4: Advanced Features & Production Polish

## Resources

- [Full Developer Guide](./DEVELOPER_GUIDE.md)
- [Fumadocs Documentation](https://fumadocs.vercel.app)
- [OpenAPI Specification](https://swagger.io/specification/)
- [Next.js Documentation](https://nextjs.org/docs)

## Need Help?

1. Check [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)
2. Review server logs: `npm run dev 2>&1 | tee debug.log`
3. Test API: `curl http://localhost:4000/api/health`
4. Create GitHub issue with reproduction steps 