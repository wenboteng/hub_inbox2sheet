# Quick Start Guide - OTA Answer Hub Droplet Deployment (Dual Database)

## 🚀 Quick Answers to Your Questions

### 1. **Database Connection - Dual Neon DB Setup**

**✅ Your existing dual database setup will work perfectly on the droplet!**

You have:
- **Main Database** (`DATABASE_URL`) - Your existing Neon DB with articles and content
- **GYG Database** (`GYG_DATABASE_URL`) - Your GetYourGuide activities Neon DB

**Setup for Dual Neon DB:**
```bash
# After running deploy.sh, use this for dual database setup
sudo ./setup-neon-db.sh
```
- Enter your main Neon DB connection string when prompted
- Enter your GYG Neon DB connection string when prompted
- Both databases will be tested and configured automatically

**What happens:**
- ✅ Both databases remain in Neon (cloud-hosted)
- ✅ All your existing data stays intact
- ✅ Dual database functionality works exactly as before
- ✅ No data migration needed

### 2. **Environment Variables (.env file) - Dual Database**

**Step 1: Copy the template**
```bash
cp env-template.txt .env
```

**Step 2: Edit the .env file**
```bash
nano .env
```

**Step 3: Fill in required variables**
```env
# REQUIRED - Both database URLs:
DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require"      # Main DB
GYG_DATABASE_URL="postgresql://username:password@host:port/gyg_database?sslmode=require"  # GYG DB

# REQUIRED - Your domain or IP
NEXT_PUBLIC_BASE_URL="https://your-domain.com"  # or "http://your-droplet-ip"

# REQUIRED - Get from https://platform.openai.com/api-keys
OPENAI_API_KEY="sk-your-openai-api-key-here"

# OPTIONAL - OTA platform credentials (leave empty if not using)
EXPEDIA_USERNAME=""
EXPEDIA_PASSWORD=""
# ... other optional variables
```

### 3. **Cron Jobs - How They Work**

**✅ No DigitalOcean Cron Service Needed!**

Our setup uses **system cron** (built into Linux):
- **Free** - No additional cost
- **Automatic** - Runs without manual intervention
- **Logged** - All output saved to log files

**What the cron jobs do:**
- 🕐 **Every Hour**: Scrape Reddit + Airbnb
- 🕑 **Every 2 Hours**: Scrape TripAdvisor + StackOverflow  
- 🕓 **Every 4 Hours**: Scrape Viator, GetYourGuide, Expedia, Booking
- 🌅 **Daily 3 AM**: Discover new content
- 📊 **Monday 6 AM**: Generate analytics reports
- 🔄 **Every 6 Hours**: Recheck existing content
- 🔄 **Daily**: Import GYG data incrementally

**Setup cron jobs:**
```bash
sudo ./setup-cron.sh
```

**View cron jobs:**
```bash
crontab -l
```

**View logs:**
```bash
tail -f /var/log/ota-hub-*.log
```

## 🎯 Complete Deployment Steps (Dual Database)

### Step 1: Deploy to Droplet
```bash
# Connect to your droplet
ssh root@your-droplet-ip

# Clone repository
git clone https://github.com/yourusername/hub_inbox2sheet.git
cd hub_inbox2sheet

# Make scripts executable
chmod +x deploy.sh setup-database.sh setup-cron.sh setup-ssl.sh setup-neon-db.sh

# Run main deployment
sudo ./deploy.sh
```

### Step 2: Set Up Dual Neon DB
```bash
sudo ./setup-neon-db.sh
# Enter your main Neon DB connection string when prompted
# Enter your GYG Neon DB connection string when prompted
```

### Step 3: Configure Environment Variables
```bash
# Copy template
cp env-template.txt .env

# Edit with your values
nano .env
```

**Required variables to fill:**
- `DATABASE_URL` (your main Neon DB)
- `GYG_DATABASE_URL` (your GYG Neon DB)
- `NEXT_PUBLIC_BASE_URL` (your domain or IP)
- `OPENAI_API_KEY` (from OpenAI)

### Step 4: Set Up Cron Jobs
```bash
sudo ./setup-cron.sh
```

### Step 5: Restart Application
```bash
pm2 restart ota-answer-hub
```

### Step 6: Test Everything
```bash
# Check application status
pm2 status

# Test dual database connections
npm run test:dual-db

# Check cron jobs
crontab -l

# Test GYG data import
npm run import:gyg:incremental

# Access your application
curl http://localhost:3000
```

## 🔧 Management Commands (Dual Database)

### Application Management
```bash
pm2 status                    # Check app status
pm2 logs ota-answer-hub       # View app logs
pm2 restart ota-answer-hub    # Restart app
```

### Dual Database Management
```bash
npm run test:dual-db          # Test both database connections
npx prisma studio             # Database GUI (main DB)
npm run test:db              # Test main database only
```

### GYG Data Management
```bash
npm run import:gyg:incremental  # Import new GYG data
npm run extract:gyg            # Extract and analyze GYG data
npm run process:gyg            # Process GYG data for insights
npm run monitor:gyg:quality    # Check GYG data quality
```

### Cron Job Management
```bash
crontab -l                    # View cron jobs
crontab -e                    # Edit cron jobs
tail -f /var/log/ota-hub-*.log # View cron logs
```

### SSL Setup (if using domain)
```bash
sudo ./setup-ssl.sh your-domain.com
```

## 📊 Cost Comparison (Dual Database)

**Current Render Setup:**
- Web Service: $7/month
- Multiple Cron Jobs: $7/month each
- Database: $7/month
- **Total: ~$35-50/month**

**Droplet Setup (with Neon DB):**
- Standard Droplet (4GB RAM): $24/month
- Neon DB (main): $5-10/month
- Neon DB (GYG): $5-10/month
- Domain: $10-15/year
- **Total: ~$34-44/month**

**Benefits:**
- ✅ **Same functionality** as Render
- ✅ **Better performance** with dedicated server
- ✅ **More control** over configuration
- ✅ **Cost savings** for higher traffic

## 🆘 Quick Troubleshooting (Dual Database)

### Application Won't Start
```bash
pm2 logs ota-answer-hub       # Check logs
cat .env                      # Verify environment variables
npm run test:dual-db         # Test both database connections
```

### Database Connection Issues
```bash
npm run test:dual-db         # Test both databases
npx prisma migrate deploy     # Apply migrations to main DB
npx prisma generate          # Regenerate client
```

### GYG Data Issues
```bash
npm run test:dual-db         # Check GYG database connection
npm run import:gyg:incremental # Test GYG data import
npm run monitor:gyg:quality    # Check data quality
```

### Cron Jobs Not Running
```bash
systemctl status cron         # Check cron service
crontab -l                    # Verify cron jobs exist
tail -f /var/log/ota-hub-*.log # Check cron logs
```

## 🔄 Dual Database Workflow

### Daily Operations
```bash
# 1. Import new GYG data
npm run import:gyg:incremental

# 2. Check data quality
npm run monitor:gyg:quality

# 3. View cron job logs
tail -f /var/log/ota-hub-*.log
```

### Weekly Operations
```bash
# 1. Extract and analyze GYG data
npm run extract:gyg

# 2. Generate comprehensive reports
npm run analytics:all

# 3. Test both database connections
npm run test:dual-db
```

## 📞 Need Help?

1. **Check dual database connections**: `npm run test:dual-db`
2. **Review this guide**
3. **Check the detailed documentation**: `DROPLET_DEPLOYMENT.md`
4. **Verify your environment variables**: `cat .env`
5. **Check GYG data management**: `DUAL_DATABASE_GUIDE.md`

## 🎉 You're Ready!

After following these steps, your application will be:
- ✅ Running on your droplet
- ✅ Connected to both Neon databases (main + GYG)
- ✅ All existing data preserved and accessible
- ✅ Automated scraping with cron jobs
- ✅ GYG data import and processing working
- ✅ Ready for production traffic
- ✅ Same functionality as Render, but with more control 