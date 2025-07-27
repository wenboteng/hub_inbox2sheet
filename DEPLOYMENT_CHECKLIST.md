# OTA Answer Hub - Deployment Checklist

## Pre-Deployment Checklist

- [ ] DigitalOcean droplet created (Ubuntu 22.04 LTS)
- [ ] SSH access to droplet configured
- [ ] Domain name purchased (optional but recommended)
- [ ] OpenAI API key obtained
- [ ] OTA platform credentials ready (optional)

## Deployment Steps

### 1. Initial Setup
- [ ] Connect to droplet: `ssh root@your-droplet-ip`
- [ ] Clone repository: `git clone https://github.com/yourusername/hub_inbox2sheet.git`
- [ ] Navigate to project: `cd hub_inbox2sheet`

### 2. Run Deployment Scripts
- [ ] Make scripts executable: `chmod +x deploy.sh setup-database.sh setup-cron.sh setup-ssl.sh`
- [ ] Run main deployment: `sudo ./deploy.sh`
- [ ] Set up database: `sudo ./setup-database.sh`
- [ ] Configure environment variables: `nano .env`

### 3. Environment Configuration
- [ ] Update `NEXT_PUBLIC_BASE_URL` with your domain
- [ ] Add `OPENAI_API_KEY`
- [ ] Add optional OTA platform credentials
- [ ] Verify all required variables are set

### 4. Database Setup
- [ ] Generate Prisma client: `npx prisma generate`
- [ ] Run migrations: `npx prisma migrate deploy`
- [ ] Test database connection: `npm run test:db`

### 5. Application Setup
- [ ] Restart application: `pm2 restart ota-answer-hub`
- [ ] Check application status: `pm2 status`
- [ ] View application logs: `pm2 logs ota-answer-hub`

### 6. Cron Jobs Setup
- [ ] Set up automated jobs: `sudo ./setup-cron.sh`
- [ ] Verify cron jobs: `crontab -l`
- [ ] Check cron logs: `tail -f /var/log/ota-hub-*.log`

### 7. SSL Setup (if using domain)
- [ ] Point domain DNS to droplet IP
- [ ] Wait for DNS propagation (up to 24 hours)
- [ ] Set up SSL: `sudo ./setup-ssl.sh your-domain.com`
- [ ] Verify SSL certificate: `certbot certificates`

### 8. Final Verification
- [ ] Test application access: `http://your-droplet-ip` or `https://your-domain.com`
- [ ] Check Nginx status: `systemctl status nginx`
- [ ] Verify all services are running
- [ ] Test cron job execution

## Post-Deployment Checklist

### Security
- [ ] Set up firewall: `ufw allow ssh && ufw allow 'Nginx Full' && ufw enable`
- [ ] Configure automatic security updates
- [ ] Change default SSH port (optional)
- [ ] Set up fail2ban (optional)

### Monitoring
- [ ] Set up log monitoring
- [ ] Configure backup strategy
- [ ] Set up monitoring alerts (optional)
- [ ] Test backup and restore procedures

### Performance
- [ ] Monitor system resources: `htop`
- [ ] Check application performance
- [ ] Optimize database queries if needed
- [ ] Set up caching if required

## Troubleshooting Checklist

### If Application Won't Start
- [ ] Check PM2 logs: `pm2 logs ota-answer-hub`
- [ ] Verify environment variables: `cat .env`
- [ ] Check database connection: `npm run test:db`
- [ ] Verify Node.js version: `node --version`

### If Database Issues
- [ ] Check PostgreSQL status: `systemctl status postgresql`
- [ ] Verify database exists: `sudo -u postgres psql -l`
- [ ] Check user permissions: `sudo -u postgres psql -d ota_hub_db -c "\du"`
- [ ] Test connection: `psql -U ota_hub_user -h localhost -d ota_hub_db`

### If Nginx Issues
- [ ] Test configuration: `nginx -t`
- [ ] Check logs: `tail -f /var/log/nginx/error.log`
- [ ] Verify ports are open: `netstat -tlnp`
- [ ] Check firewall settings: `ufw status`

### If Cron Jobs Not Running
- [ ] Check cron service: `systemctl status cron`
- [ ] View cron logs: `tail -f /var/log/ota-hub-*.log`
- [ ] Verify cron jobs: `crontab -l`
- [ ] Test manual execution of scripts

## Maintenance Checklist

### Daily
- [ ] Check application logs for errors
- [ ] Monitor system resources
- [ ] Verify cron jobs are running

### Weekly
- [ ] Review cron job logs
- [ ] Check database performance
- [ ] Monitor disk usage
- [ ] Review security logs

### Monthly
- [ ] Update system packages
- [ ] Review and rotate logs
- [ ] Test backup and restore
- [ ] Review SSL certificate status
- [ ] Update application dependencies

## Emergency Procedures

### Application Down
1. Check PM2 status: `pm2 status`
2. Restart application: `pm2 restart ota-answer-hub`
3. Check logs: `pm2 logs ota-answer-hub`
4. Verify environment variables
5. Check database connection

### Database Issues
1. Check PostgreSQL status: `systemctl status postgresql`
2. Restart PostgreSQL: `systemctl restart postgresql`
3. Check disk space: `df -h`
4. Verify database connectivity
5. Check for corrupted data

### Server Issues
1. Check system resources: `htop`
2. Check disk space: `df -h`
3. Check memory usage: `free -h`
4. Review system logs: `journalctl -xe`
5. Consider server restart if necessary

## Contact Information

- **Server IP**: [Your droplet IP]
- **Domain**: [Your domain]
- **SSH Access**: `ssh root@your-droplet-ip`
- **Application URL**: [Your application URL]
- **Admin Interface**: [Your application URL]/admin

## Notes

- Keep this checklist updated with any custom configurations
- Document any issues and their solutions
- Regular backups are essential
- Monitor system resources regularly
- Keep security patches up to date 