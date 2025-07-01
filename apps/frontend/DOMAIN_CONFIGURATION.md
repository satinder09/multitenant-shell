# 🌐 Domain Configuration Guide

## Current Configuration

Your multitenant shell is now configured with:
- **Base Domain**: `lvh.me`
- **Platform URL**: `http://lvh.me:3000`
- **Backend API**: `http://localhost:4000`

## ✅ Why lvh.me?

`lvh.me` is the **recommended choice** for multitenant development because:

1. **Real Subdomains**: Enables proper subdomain testing
   - Platform: `http://lvh.me:3000`
   - Tenant 1: `http://tenant1.lvh.me:3000`
   - Tenant 2: `http://tenant2.lvh.me:3000`

2. **Cookie Isolation**: Each subdomain has separate cookies
3. **Production-Like**: Mimics real subdomain behavior
4. **DNS Magic**: `lvh.me` always resolves to `127.0.0.1`

## 🧪 Testing Your Configuration

### **Step 1: Clear Browser Cache**
- Use **Incognito/Private mode** OR
- Clear all cookies and cache for lvh.me

### **Step 2: Test Platform Access**
1. Navigate to: `http://lvh.me:3000/login`
2. Login with super admin credentials
3. Should redirect to: `http://lvh.me:3000/platform`
4. Should see: **New platform layout** (not old sidebar)

### **Step 3: Check Console Logs**
Open DevTools (F12) and verify these logs appear:

```
[contextUtils] isPlatformHost: exact base domain match, returning true
[Middleware] Platform session detected
[ContextAwareLayout] Platform page detected, skipping UnifiedLayout
```

### **Step 4: Test Tenant Subdomains** (Future)
- `http://demo.lvh.me:3000` - Tenant context
- `http://test.lvh.me:3000` - Another tenant

## 🔧 Environment Variables

Current `.env` configuration:
```env
NEXT_PUBLIC_BASE_DOMAIN=lvh.me
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
NEXT_PUBLIC_DEBUG=true
```

## 🚨 Common Issues & Solutions

### Issue: "Still seeing old layout"
**Solution**: 
1. Clear browser cache completely
2. Use **only** `lvh.me:3000` URLs
3. Check middleware logs for domain detection

### Issue: "Authentication not working"
**Solution**:
1. Ensure backend is running on `localhost:4000`
2. Check CORS settings in backend
3. Verify JWT cookies are set correctly

### Issue: "Subdomain not working"
**Solution**:
1. Check internet connection (lvh.me requires DNS)
2. Use `localhost` configuration as fallback
3. Verify environment variables loaded

## 🔄 Switching to localhost (If Needed)

If you prefer localhost development:

1. Update `.env`:
   ```env
   NEXT_PUBLIC_BASE_DOMAIN=localhost
   ```

2. Restart dev server
3. Use URLs: `http://localhost:3000`

## 📋 Configuration Checklist

- ✅ `.env` file created with `NEXT_PUBLIC_BASE_DOMAIN=lvh.me`
- ✅ Dev server restarted to load new environment
- ✅ Using `http://lvh.me:3000` URLs consistently
- ✅ Browser cache cleared
- ✅ Backend running on `localhost:4000`

## 🎯 Next Steps

1. **Test the login flow** with the new configuration
2. **Create test tenants** using platform admin
3. **Test subdomain access** with tenant URLs
4. **Deploy to staging** with real domain configuration

---

**Your multitenant shell is now properly configured for consistent domain handling!** 