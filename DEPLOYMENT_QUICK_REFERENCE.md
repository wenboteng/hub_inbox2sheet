# 🚀 Deployment Quick Reference

## For Content Updates (Most Common)

**You don't need to deploy for new content!** Content is stored in the database and immediately accessible.

### If you need latest scripts/tools:
```bash
./deploy-content-only.sh
```
**Time:** ~30 seconds | **GitHub push:** Not needed

---

## For Application Updates

### 1. Push to GitHub first
```bash
git add .
git commit -m "Your changes"
git push origin main
```

### 2. Deploy
```bash
./deploy-simple.sh
```
**Time:** ~2-3 minutes

---

## For System Setup (Rare)

```bash
./deploy-current.sh
```
**Time:** ~10-15 minutes | **Only for initial setup**

---

## Key Points for Development Team

### ✅ Content Publishing
- **No deployment needed** - content is in database
- Content is immediately live
- Use `deploy-content-only.sh` only for latest tools

### ✅ Application Development
- Test locally first
- Push to GitHub for code changes
- Use `deploy-simple.sh` for deployment

### ✅ Database Changes
- Update Prisma schema locally
- Use `deploy-simple.sh` for migrations

---

## Troubleshooting

```bash
# Check status
pm2 status

# View logs
pm2 logs ota-answer-hub

# Restart
pm2 restart ota-answer-hub
```

---

**Remember:** Content updates don't require deployment! 🎯 