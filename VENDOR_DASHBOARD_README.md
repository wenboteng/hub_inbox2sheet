# Tour Vendor Dashboard

## 🎯 Overview

The **Tour Vendor Dashboard** is a comprehensive market intelligence platform designed specifically for tour vendors in the UK market. It provides real-time insights into local competition, pricing strategies, and market opportunities across major OTAs (Online Travel Agencies).

## ✨ Key Features

### 🏙️ **City-Based Market Analysis**
- **20+ UK Cities**: London, Edinburgh, Liverpool, Manchester, Birmingham, and more
- **Smart City Detection**: Automatically finds activities mentioning your target city
- **Local Market Saturation**: Understand if your market is low, medium, or highly saturated

### 📊 **Competitive Intelligence**
- **Total Competitor Count**: See exactly how many similar activities exist in your city
- **Top 5 Competitors**: Detailed analysis of leading providers in your market
- **Provider Performance**: Average ratings, prices, and review counts for each competitor

### 💰 **Pricing Intelligence**
- **Market Average Price**: Compare your pricing to local market standards
- **Price Range Analysis**: Understand the full spectrum of pricing in your market
- **Pricing Opportunity Detection**: 
  - 🟢 **Undervalued**: Market average < €50 (opportunity to increase prices)
  - 🔵 **Competitive**: Market average €50-150 (good positioning)
  - 🟣 **Premium**: Market average > €150 (high-end market)

### 🏷️ **Category Filtering**
- **12+ Activity Categories**: Walking Tours, Food Tours, Cultural Tours, etc.
- **Smart Tag Matching**: Filter by specific tour types
- **Category-Specific Insights**: Market analysis tailored to your tour type

### 📈 **Real-Time Data**
- **Hourly Updates**: Fresh data from major OTAs
- **Quality Scoring**: High-quality activities highlighted
- **Direct OTA Links**: Visit competitor listings with `rel="nofollow"`

## 🚀 Getting Started

### 1. **Access the Dashboard**
Navigate to `/vendor-dashboard` in your browser or click "Vendor Dashboard" in the main navigation.

### 2. **Select Your Market**
- Choose your target city from the dropdown
- Optionally filter by tour category
- Use the search bar to find specific activities or providers

### 3. **Analyze Your Position**
- Review the **Market Overview** metrics
- Check **Market Intelligence** for saturation and pricing opportunities
- Study **Top 5 Competitors** to understand your competition

### 4. **Explore Activities**
- Browse detailed activity listings
- Click "View on [OTA]" to visit competitor pages
- Analyze pricing, ratings, and review counts

## 📊 Understanding the Metrics

### Market Overview
- **Total Competitors**: Number of similar activities in your city
- **Average Price**: Market standard pricing (use for benchmarking)
- **Average Rating**: Typical customer satisfaction level
- **Price Range**: Min/max pricing to understand market spectrum

### Market Intelligence
- **Market Saturation**:
  - 🟢 **Low**: <50 activities (opportunity for new entrants)
  - 🟡 **Medium**: 50-100 activities (competitive market)
  - 🔴 **High**: >100 activities (saturated market)

- **Pricing Opportunity**:
  - 🟢 **Undervalued**: You can likely increase prices
  - 🔵 **Competitive**: Your pricing aligns with market
  - 🟣 **Premium**: You're in a high-end market segment

### Top Competitors Analysis
- **Activity Count**: How many tours each competitor offers
- **Average Rating**: Their customer satisfaction level
- **Average Price**: Their pricing strategy
- **Total Reviews**: Their market presence and trust

## 🛠️ Technical Implementation

### API Endpoint
```
GET /api/vendor-dashboard?city={city}&category={category}&limit={limit}&offset={offset}
```

### Data Sources
- **GetYourGuide**: Primary data source (80-90% coverage)
- **Viator**: Coming soon
- **Airbnb Experiences**: Coming soon
- **Booking.com**: Coming soon

### Database Schema
The dashboard uses the `ImportedGYGActivity` table with the following key fields:
- `activityName`, `providerName`, `location`
- `priceNumeric`, `ratingNumeric`, `reviewCountNumeric`
- `tags`, `url`, `qualityScore`
- `city`, `country`, `venue`

### Data Quality
- **Quality Scoring**: 0-100 scale for data reliability
- **High Quality Badge**: Activities with score ≥80
- **Data Coverage**: Price and rating availability tracked

## 🎨 UI/UX Features

### Mobile Responsive
- Optimized for tour vendors on mobile devices
- Touch-friendly interface
- Responsive grid layouts

### Modern Design
- Clean, professional interface
- Color-coded insights and metrics
- Intuitive navigation and filtering

### Performance
- Fast loading with pagination
- Efficient database queries
- Optimized for real-time updates

## 🔒 Access Control

### Current Status
- **Open Access**: Available to all users
- **No Authentication Required**: Immediate access to insights

### Future Plans
- **Paid Tier**: $49/month for premium features
- **City-Based Access**: Unlock specific cities
- **Advanced Analytics**: Deeper insights for paid users

## 📈 Business Value

### For Tour Vendors
1. **Market Research**: Understand your competitive landscape
2. **Pricing Strategy**: Set optimal prices based on market data
3. **Opportunity Identification**: Find underserved market segments
4. **Competitive Analysis**: Learn from successful competitors

### Key Questions Answered
- "How many similar tours are there in my city?"
- "Am I underpricing or overpricing my tours?"
- "Who are my main competitors and how do they perform?"
- "Should I launch a new tour type in this market?"

## 🚀 Roadmap

### Phase 1 (Current)
- ✅ Basic city and category filtering
- ✅ Market insights and competitor analysis
- ✅ Activity listings with OTA links

### Phase 2 (Coming Soon)
- 🔄 Multi-OTA data integration (Viator, Airbnb, Booking.com)
- 🔄 Advanced filtering (price range, rating, duration)
- 🔄 Export functionality (CSV, PDF reports)

### Phase 3 (Future)
- 📋 Historical trend analysis
- 📋 Seasonal pricing insights
- 📋 Automated market alerts
- 📋 Integration with vendor booking systems

## 🧪 Testing

Run the vendor dashboard test to verify functionality:

```bash
npm run test:vendor-dashboard
```

This will test:
- Database connectivity
- City filtering logic
- Market insights calculations
- API endpoint functionality

## 📞 Support

For questions or feature requests:
- Check the main documentation
- Review the API endpoint documentation
- Test with the provided test script

---

**Built for tour vendors who want to make data-driven decisions and dominate their local market.** 🎯 