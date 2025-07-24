# Fixing Reddit OAuth App Configuration

## 🔍 Current Issue
Your Reddit OAuth app is returning a 401 Unauthorized error, which means the app configuration needs to be fixed.

## 🛠️ Step-by-Step Fix

### 1. Go to Reddit App Settings
1. Visit: https://www.reddit.com/prefs/apps
2. Find your app: `_o7FfYbqVD_nNzB0ssDQuA`
3. Click on it to edit

### 2. Check App Type
**IMPORTANT**: Your app must be configured as a **"script"** app, not a "web app".

**Current Issue**: Your app is likely configured as a "web app" which requires a redirect URI and user interaction.

**Fix**: 
- Change the app type to **"script"**
- Remove any redirect URI (script apps don't need one)
- Save the changes

### 3. Check App Status
- Make sure the app is **not** in development mode
- The app should be active and approved

### 4. Verify App Details
Your app should have these settings:
- **Name**: Your app name
- **Type**: **script** (not web app)
- **Description**: Travel content crawler
- **About URL**: Your website URL (optional)
- **Redirect URI**: **Leave empty** (for script apps)

### 5. Check App Permissions
For script apps, you typically need:
- **read** permission (to read public posts)
- **history** permission (to access browsing history)

### 6. Test the Fix
After making these changes, run the debug script again:

```bash
REDDIT_CLIENT_ID=_o7FfYbqVD_nNzB0ssDQuA REDDIT_CLIENT_SECRET=PXQ83_VBCV02-g8LbqM9Sf0jMLARew npx tsx scripts/debug-reddit-oauth.ts
```

## 🔧 Alternative: Create a New Script App

If the above doesn't work, create a new app:

1. Go to https://www.reddit.com/prefs/apps
2. Click "Create App" or "Create Another App"
3. Fill in:
   - **Name**: OTAAnswersCrawler
   - **Type**: **script** (important!)
   - **Description**: Travel content crawler for OTA Answers
   - **About URL**: https://your-website.com
   - **Redirect URI**: **Leave empty**
4. Click "Create App"
5. Copy the new Client ID and Client Secret
6. Update your environment variables

## 🚨 Common Issues

### Issue 1: App Type is "web app"
**Symptoms**: 401 Unauthorized error
**Fix**: Change to "script" app type

### Issue 2: App in Development Mode
**Symptoms**: Limited access, rate limiting
**Fix**: Ensure app is not in development mode

### Issue 3: Wrong Permissions
**Symptoms**: 403 Forbidden errors
**Fix**: Ensure app has "read" permission

### Issue 4: Invalid Credentials
**Symptoms**: 401 Unauthorized
**Fix**: Double-check Client ID and Secret

## 📝 Environment Variables

After fixing the app, update your Render environment variables:

```bash
REDDIT_CLIENT_ID=your_new_client_id
REDDIT_CLIENT_SECRET=your_new_client_secret
```

## 🧪 Testing

Once you've fixed the app configuration, test it:

1. **Local Test**:
   ```bash
   REDDIT_CLIENT_ID=your_id REDDIT_CLIENT_SECRET=your_secret npx tsx scripts/debug-reddit-oauth.ts
   ```

2. **Production Test**:
   - Update Render environment variables
   - Trigger a manual cron job run
   - Check the logs

## ✅ Success Indicators

When working correctly, you should see:
- ✅ Authentication successful!
- ✅ API access successful!
- Posts found: [number]

## 🆘 Still Having Issues?

If you're still getting 401 errors after following these steps:

1. **Check Reddit Status**: Visit https://www.redditstatus.com/
2. **Verify Account**: Make sure your Reddit account is in good standing
3. **Contact Support**: Reddit API support if needed
4. **Alternative**: Use the basic Reddit crawler as temporary fallback 