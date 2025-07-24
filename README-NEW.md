# Financial AI Dashboard

An AI-powered financial dashboard that provides real-time stock data through web scraping, news sentiment analysis, and intelligent fund recommendations.

## 🚀 Features

- **Real-time Stock Data**: Live pricing and market data via Google Finance web scraping
- **AI-Powered Chat**: Conversational interface for stock queries using Groq AI
- **News Sentiment Analysis**: Automated sentiment scoring of financial news using Hugging Face
- **Fund Analysis**: Comprehensive fund performance tracking and analysis
- **Real-time Updates**: Background sync process for continuous data updates
- **Modern UI**: Built with Next.js 15, React 19, TypeScript, and Tailwind CSS
- **No API Dependencies**: Fully self-contained with web scraping (no Polygon.io required)

## 🏗️ Tech Stack

### Frontend
- **Framework**: Next.js 15 with App Router
- **UI Library**: React 19
- **Styling**: Tailwind CSS + shadcn/ui components
- **Language**: TypeScript
- **Charts**: Recharts for data visualization

### Backend
- **API**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Web Scraping**: Puppeteer + Cheerio for Google Finance
- **Real-time Sync**: Background API endpoints

### AI/ML Services
- **LLM**: Groq AI (for chat interface)
- **Sentiment Analysis**: Hugging Face Transformers
- **News Processing**: Custom scrapers with AI sentiment scoring

## 🔧 Environment Variables

Create a `.env.local` file with the following variables:

```env
# Supabase Database
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# AI Services
GROQ_API_KEY=your_groq_api_key
HUGGINGFACE_API_KEY=your_huggingface_api_key

# Scraping Configuration (Optional)
SCRAPING_DELAY_MS=2000
SCRAPING_MAX_RETRIES=3
SCRAPING_TIMEOUT=30000
NEWS_UPDATE_INTERVAL=300000
STOCK_UPDATE_INTERVAL=60000
```

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd news_sense
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Copy `.env.example` to `.env.local`
   - Fill in your API keys

4. **Database setup**
   - Go to your Supabase dashboard
   - Run `scripts/001-create-tables.sql`
   - Run `scripts/002-seed-sample-data.sql`

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open the application**
   - Visit [http://localhost:3000](http://localhost:3000)
   - The system will verify connections automatically

## 📊 Real-time Data Architecture

### Stock Data Scraping
- **Source**: Google Finance (via Puppeteer web scraping)
- **Frequency**: Every 1 minute (configurable)
- **Fallback**: Cheerio-based scraping if Puppeteer fails
- **Rate Limiting**: Intelligent delays between requests

### News Data Processing
- **Sources**: Yahoo Finance, MarketWatch, Reuters
- **Processing**: AI-powered sentiment analysis
- **Frequency**: Every 5 minutes (configurable)
- **Relevance Scoring**: Automatic fund-to-news matching

### Background Sync
- **Auto-sync**: Runs continuously in the background
- **Batch Processing**: Handles multiple stocks efficiently
- **Error Handling**: Graceful fallbacks and retry logic
- **Status Monitoring**: Real-time sync status tracking

## 🔗 API Endpoints

### Core Data
- `GET /api/funds` - List all funds with latest prices
- `GET /api/funds/[ticker]` - Get specific fund with news
- `GET /api/funds/[ticker]/historical` - Historical price data
- `GET /api/market-status` - Current market status

### Data Synchronization
- `POST /api/data-sync` - Manual full data sync
- `POST /api/sync-background` - Background sync process
- `GET /api/sync-background` - Sync status check

### AI Services
- `POST /api/chat` - AI-powered stock queries
- `POST /api/test-ai` - Test AI services

### System
- `POST /api/setup` - Automatic database setup

## 📁 Project Structure

```
├── app/                    # Next.js 15 App Router
│   ├── api/               # API routes
│   │   ├── chat/          # AI chat endpoint
│   │   ├── data-sync/     # Manual sync
│   │   ├── sync-background/ # Auto sync
│   │   ├── funds/         # Fund data endpoints
│   │   └── market-status/ # Market info
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Dashboard page
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── dashboard-header.tsx # Main header
│   ├── fund-chart.tsx    # Stock charts
│   ├── news-feed.tsx     # News display
│   ├── chat-interface.tsx # AI chat
│   └── real-time-updater.tsx # Background sync
├── lib/                   # Core libraries
│   ├── google-finance-scraper.ts # Stock scraping
│   ├── news-scraper.ts   # News scraping
│   ├── huggingface.ts    # AI services
│   ├── supabase.ts       # Database client
│   ├── config.ts         # Configuration
│   └── types.ts          # TypeScript definitions
├── scripts/              # Database setup
│   ├── 001-create-tables.sql
│   └── 002-seed-sample-data.sql
└── hooks/                # Custom React hooks
```

## 🔍 Key Features Explained

### Web Scraping Architecture
- **Primary Method**: Puppeteer for dynamic content loading
- **Fallback Method**: Cheerio for static HTML parsing
- **Anti-Detection**: Rotating user agents and intelligent delays
- **Error Handling**: Graceful degradation with retry logic

### Real-time Updates
- **Client-side**: `RealTimeUpdater` component manages background sync
- **Server-side**: Background API endpoints handle data processing
- **Database**: Supabase for real-time data storage and retrieval
- **UI Updates**: Automatic refresh when new data is available

### AI Integration
- **Chat Interface**: Natural language queries about stocks
- **Sentiment Analysis**: News articles processed for market sentiment
- **Smart Matching**: AI-powered relevance scoring for news-to-fund relationships

## 🧪 Testing

Run the test script to verify API functionality:
```bash
node test-apis.js
```

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

### Manual Deployment
1. Build the project: `npm run build`
2. Start production server: `npm start`
3. Configure reverse proxy (nginx/Apache)

## 🔧 Configuration

### Scraping Settings
```typescript
// lib/config.ts
scraping: {
  delayMs: 2000,           // Delay between requests
  maxRetries: 3,           // Retry attempts
  timeout: 30000,          // Request timeout
  stockUpdateInterval: 60000,   // 1 minute
  newsUpdateInterval: 300000,   // 5 minutes
}
```

### Database Schema
- **funds**: Stock/fund information
- **news_articles**: Scraped news content
- **fund_news_links**: Relevance mappings
- **user_queries**: Chat history

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm test`
5. Commit changes: `git commit -m 'Add amazing feature'`
6. Push to branch: `git push origin feature/amazing-feature`
7. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details

## 🆘 Support

If you encounter issues:
1. Check the system status in the dashboard
2. Verify environment variables are set correctly
3. Ensure database scripts have been run
4. Check browser console for errors
5. Review server logs for scraping issues

---

## 🎯 What's Been Accomplished

### ✅ Completed Tasks

1. **Removed Polygon.io Dependency**
   - Eliminated all Polygon.io API references
   - Updated configuration to remove Polygon settings
   - Modified all components to reflect Google Finance as data source

2. **Enhanced Web Scraping Architecture**
   - Improved Google Finance scraper with better error handling
   - Added multiple fallback methods (Puppeteer → Cheerio)
   - Implemented intelligent rate limiting and user agent rotation
   - Created comprehensive news scraping from multiple sources

3. **Real-time Data Updates**
   - Built background sync API (`/api/sync-background`)
   - Created `RealTimeUpdater` component for continuous updates
   - Implemented batch processing for multiple stocks
   - Added status monitoring and error handling

4. **Database Integration**
   - Updated all API endpoints to use web scraping
   - Enhanced data sync processes
   - Improved news-to-fund relevance scoring
   - Added comprehensive error handling for database operations

5. **UI/UX Improvements**
   - Updated dashboard header to show Google Finance as data source
   - Enhanced setup verification to test scraping endpoints
   - Added real-time update indicators
   - Improved error messaging and user feedback

6. **Configuration Management**
   - Added scraping-specific configuration options
   - Implemented flexible update intervals
   - Created comprehensive environment variable setup
   - Added Next.js webpack configuration for server-side modules

### 🔧 Technical Improvements

- **Server-Side Rendering**: Proper isolation of server-side scraping code
- **Error Handling**: Comprehensive fallback mechanisms
- **Performance**: Efficient batch processing and rate limiting
- **Monitoring**: Real-time sync status and logging
- **Testing**: API testing framework and verification scripts

**Note**: This application uses web scraping which may be subject to rate limiting or blocking by target websites. The scraping logic includes delays and fallbacks to minimize issues, but occasional failures are expected and handled gracefully.
