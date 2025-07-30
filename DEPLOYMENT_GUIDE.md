# OTA Answer Hub Deployment Guide

## Quick Reference for Content Updates

**For publishing new reports/content (most common scenario):**
```bash
./deploy-content-only.sh
```
*Takes ~30 seconds, no GitHub push needed*

## Deployment Scripts Overview

### 1. `deploy-content-only.sh` ⚡ (RECOMMENDED for content updates)
**Use when:** Publishing new reports, updating content, adding new data
- Pulls latest changes from main branch
- Only installs dependencies if package.json changed
- Only rebuilds if source code changed
- Restarts PM2 process
- **Time:** ~30 seconds
- **No GitHub push required** - content is already in database

### 2. `deploy-simple.sh` 🔧 (For application updates)
**Use when:** Adding new features, updating application code
- Skips system package installation
- Installs dependencies
- Rebuilds application
- Updates Nginx configuration
- Restarts PM2 process
- **Time:** ~2-3 minutes

### 3. `deploy-current.sh` 🏗️ (For full system setup)
**Use when:** Initial server setup, major system changes
- Installs all system packages (PostgreSQL, Nginx, etc.)
- Full application deployment
- **Time:** ~10-15 minutes
- **Only needed for first-time setup or major system changes**

## Content Publishing Workflow

### For Development Team:
1. **Create content locally** (reports, data, etc.)
2. **Test content** in development environment
3. **Content is automatically available** - no deployment needed!

### For Production Updates:
1. **Content is already live** - it's stored in the database
2. **If you need the latest scripts/tools:**
   ```bash
   ./deploy-content-only.sh
   ```
3. **That's it!** No GitHub push required

## Why This Works Better

### Before (2+ hours):
- Full system redeployment for every content update
- PostgreSQL installation issues
- Package manager lock conflicts
- TypeScript compilation errors blocking deployment
- Unnecessary GitHub pushes

### After (30 seconds):
- Content is already in the database and accessible
- Only updates application if needed
- No system package installation
- No GitHub push required
- Fast and reliable

## Important Notes

### For Content Updates:
- ✅ **Content is immediately available** - stored in database
- ✅ **No deployment needed** for new reports/data
- ✅ **Use `deploy-content-only.sh`** only if you need latest scripts
- ✅ **No GitHub push required**

### For Application Updates:
- 🔧 **Use `deploy-simple.sh`** for new features
- 🔧 **Push to GitHub first** for application changes
- 🔧 **Test in development** before deploying

### For System Setup:
- 🏗️ **Use `deploy-current.sh`** only for initial setup
- 🏗️ **Rarely needed** after initial deployment

## Troubleshooting

### If `deploy-content-only.sh` fails:
1. Check if there are TypeScript errors in new scripts
2. Fix errors and try again
3. If still failing, use `deploy-simple.sh` as fallback

### If application is not responding:
```bash
pm2 status
pm2 logs ota-answer-hub
```

### If you need to restart everything:
```bash
pm2 restart all
systemctl reload nginx
```

## Development Team Guidelines

### Content Publishing:
- **No deployment needed** for content updates
- Content is stored in database and immediately accessible
- Use `deploy-content-only.sh` only if you need latest tools/scripts

### Application Development:
- Test changes locally first
- Push to GitHub for application updates
- Use `deploy-simple.sh` for deployment
- Document any new dependencies or system requirements

### Database Changes:
- Update Prisma schema if needed
- Run migrations locally first
- Use `deploy-simple.sh` for schema changes

## Quick Commands Reference

```bash
# Content updates (most common)
./deploy-content-only.sh

# Application updates
./deploy-simple.sh

# Full system setup (rarely needed)
./deploy-current.sh

# Check application status
pm2 status

# View logs
pm2 logs ota-answer-hub

# Restart application
pm2 restart ota-answer-hub
```

---

**Remember:** Content is already live in the database. You don't need to deploy to publish new reports! 🚀 