# Render Environment Variables for Google Analytics Integration

## 🔧 **Environment Variables to Add to Render**

You need to add these **5 environment variables** to your Render deployment:

### **Required Variables:**

```bash
# Google Analytics 4 Property ID (from Google Analytics)
GA4_PROPERTY_ID=123456789

# Google Analytics 4 Measurement ID (from Google Analytics)
GA4_MEASUREMENT_ID=G-XXXXXXXXXX

# Google Cloud API Key (from Google Cloud Console)
GA4_API_KEY=AIzaSyC...

# Service Account Email (from JSON file)
GA4_CLIENT_EMAIL=ota-answers-analytics@your-project.iam.gserviceaccount.com

# Service Account Private Key (from JSON file)
GA4_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
-----END PRIVATE KEY-----
```

## 📋 **How to Add These to Render:**

### **Step 1: Go to Render Dashboard**
1. Go to https://dashboard.render.com/
2. Select your OTA Answers project
3. Click on your web service

### **Step 2: Add Environment Variables**
1. Click on **"Environment"** tab
2. Scroll down to **"Environment Variables"** section
3. Click **"Add Environment Variable"** for each variable

### **Step 3: Add Each Variable**

#### **Variable 1: GA4_PROPERTY_ID**
- **Key:** `GA4_PROPERTY_ID`
- **Value:** Your Property ID (e.g., `123456789`)
- **Description:** Google Analytics 4 Property ID

#### **Variable 2: GA4_MEASUREMENT_ID**
- **Key:** `GA4_MEASUREMENT_ID`
- **Value:** Your Measurement ID (e.g., `G-XXXXXXXXXX`)
- **Description:** Google Analytics 4 Measurement ID

#### **Variable 3: GA4_API_KEY**
- **Key:** `GA4_API_KEY`
- **Value:** Your API Key (starts with `AIzaSyC...`)
- **Description:** Google Cloud API Key

#### **Variable 4: GA4_CLIENT_EMAIL**
- **Key:** `GA4_CLIENT_EMAIL`
- **Value:** Your service account email
- **Description:** Google Cloud Service Account Email

#### **Variable 5: GA4_PRIVATE_KEY**
- **Key:** `GA4_PRIVATE_KEY`
- **Value:** Your private key (entire block including BEGIN/END)
- **Description:** Google Cloud Service Account Private Key

## 🔍 **Where to Find These Values:**

### **GA4_PROPERTY_ID & GA4_MEASUREMENT_ID:**
1. Go to https://analytics.google.com/
2. Select your property
3. Click "Admin" → "Property Settings"
4. Copy Property ID
5. Go to "Data Streams" → click web stream
6. Copy Measurement ID

### **GA4_API_KEY:**
1. Go to https://console.cloud.google.com/
2. Select your project
3. Go to "APIs & Services" → "Credentials"
4. Click "Create Credentials" → "API Key"
5. Copy the API key

### **GA4_CLIENT_EMAIL & GA4_PRIVATE_KEY:**
1. Go to https://console.cloud.google.com/
2. Go to "IAM & Admin" → "Service Accounts"
3. Click on your service account
4. Go to "Keys" tab
5. Download JSON file
6. Extract `client_email` and `private_key` from JSON

## ⚠️ **Important Notes:**

### **Security:**
- ✅ These variables are encrypted in Render
- ✅ They're only accessible to your application
- ✅ Never commit them to GitHub

### **Format:**
- **GA4_PRIVATE_KEY** should include the entire block:
```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
-----END PRIVATE KEY-----
```

### **Deployment:**
- After adding variables, click **"Save Changes"**
- Render will automatically redeploy your application
- The new environment variables will be available

## 🧪 **Testing the Setup:**

Once you've added the variables, you can test the connection by running:

```bash
# This will test the Google Analytics connection
npx tsx scripts/google-analytics-integration.ts
```

## 🎯 **Expected Output:**

If everything is set up correctly, you should see:
```
✅ Google Analytics connection successful
✅ Data retrieved successfully
✅ Intelligent analysis completed
```

## 🔧 **Troubleshooting:**

### **If you get "credentials not found":**
- Check that all 5 variables are added
- Verify the values are correct
- Make sure there are no extra spaces

### **If you get "permission denied":**
- Verify the service account has "Viewer" access in Google Analytics
- Check that the API is enabled in Google Cloud Console

### **If you get "invalid key":**
- Make sure the private key includes the BEGIN/END markers
- Check that the API key is correct
- Verify the client email matches the service account

## 🚀 **Next Steps:**

1. Add the environment variables to Render
2. Save and redeploy
3. Test the connection
4. Run the intelligent analysis
5. Review the enhanced insights

The system will then provide you with:
- Real-time traffic monitoring
- Intelligent content insights
- User behavior analysis
- Conversion optimization recommendations
- Predictive analytics 