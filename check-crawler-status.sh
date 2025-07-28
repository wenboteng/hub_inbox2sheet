#!/bin/bash

echo "🕐 Crawler Status Check - $(date)"
echo "=================================="

echo ""
echo "📊 Active Crawler Processes:"
echo "----------------------------"
ps aux | grep -E "(collect|scrape|crawl|oxylabs)" | grep -v grep | while read line; do
    echo "  ✅ $line"
done

echo ""
echo "📋 Cron Jobs Status:"
echo "-------------------"
crontab -l | grep -E "(scrape|collect|crawl)" | while read line; do
    echo "  ⏰ $line"
done

echo ""
echo "📝 Recent Log Activity:"
echo "----------------------"
echo "🔍 Oxylabs Crawler (last 5 lines):"
tail -5 /var/log/ota-hub-crawler.log 2>/dev/null || echo "  No log file found"

echo ""
echo "🔍 Main Crawler (last 5 lines):"
tail -5 /var/log/ota-hub-main-crawler.log 2>/dev/null || echo "  No log file found"

echo ""
echo "📈 Database Stats:"
echo "-----------------"
cd /root/projects/hub_inbox2sheet
npm run check:content-stats 2>/dev/null || echo "  Could not check database stats"

echo ""
echo "💡 Quick Commands:"
echo "-----------------"
echo "  • View all logs: tail -f /var/log/ota-hub-*.log"
echo "  • Check specific log: tail -f /var/log/ota-hub-crawler.log"
echo "  • View cron jobs: crontab -l"
echo "  • Kill all crawlers: pkill -f 'collect\|scrape\|crawl'"
echo "  • Restart crawlers: ./setup-cron.sh" 