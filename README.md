# 📈 News Sense - AI-Powered Financial Intelligence Platform

> **Connecting fund performance with real-world events through AI-powered analysis**

News Sense is a sophisticated financial intelligence platform that solves the critical problem investors face: understanding not just *what* happened to their funds, but *why* it happened. Built with cutting-edge AI technology and modern web frameworks.

![Next.js](https://img.shields.io/badge/Next.js-15.2.4-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Database-green?style=for-the-badge&logo=supabase)
![Groq](https://img.shields.io/badge/Groq-AI-orange?style=for-the-badge)

## 🎯 Problem Statement

Investors constantly ask: *"Why is my mutual fund or ETF down today?"*

Traditional financial platforms only show price movements but fail to explain the underlying causes. News Sense bridges this gap by:
- Connecting fund performance with real-world events
- Providing AI-powered explanations beyond simple price changes
- Analyzing sentiment and market correlations in real-time

## ✨ Key Features

### 🤖 **AI-Powered Analysis**
- **Groq AI Integration**: Lightning-fast natural language processing
- **Sentiment Analysis**: Advanced sentiment scoring using Hugging Face RoBERTa models
- **Entity Recognition**: Financial entity extraction with FinBERT-NER
- **Smart Q&A**: Context-aware responses to complex financial queries

### 📊 **Comprehensive Data Integration**
- **Polygon.io API**: Real-time and historical fund prices
- **Web Scraping**: Custom news crawler for major financial sites
- **Entity Matching**: AI-powered linking of news to specific funds
- **Multi-source Analysis**: Combines price data with news sentiment

### 💬 **Natural Language Interface**
Answer questions like:
- *"Why is VTI down today?"*
- *"What happened to tech ETFs this week?"*
- *"Any macro news affecting Fidelity funds?"*
- *"Which sectors are reacting to regulatory news?"*

### 📈 **Interactive Dashboard**
- **Real-time Charts**: Dynamic fund performance visualization
- **Market Overview**: Top and bottom performers with context
- **News Feed**: Curated financial news with sentiment indicators
- **Fund Search**: Searchable database of ETFs and mutual funds

## 🏗️ Technical Architecture

### **Frontend Stack**
- **Next.js 15** with App Router
- **React 19** with Server Components
- **TypeScript** for type safety
- **Tailwind CSS** + **shadcn/ui** for modern UI
- **Recharts** for data visualization

### **Backend Infrastructure**
- **Next.js API Routes** for serverless functions
- **Supabase/PostgreSQL** for data persistence
- **Groq AI** for natural language processing
- **Hugging Face** for sentiment analysis and NER

### **Data Sources**
- **Polygon.io**: Financial market data
- **Custom Web Scrapers**: Financial news aggregation
- **Real-time Processing**: Automated sentiment analysis pipeline

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- Polygon.io API key
- Groq AI API key
- Hugging Face API key

### Installation

1. **Clone the repository**
   `ash
   git clone https://github.com/yourusername/news-sense.git
   cd news-sense
   `

2. **Install dependencies**
   `ash
   npm install
   # or
   yarn install
   `

3. **Set up environment variables**
   `ash
   cp .env.example .env.local
   `
   
   Configure your API keys in .env.local:
   `env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   POLYGON_API_KEY=your_polygon_api_key
   GROQ_API_KEY=your_groq_api_key
   HUGGINGFACE_API_KEY=your_huggingface_api_key
   `

4. **Set up the database**
   - Go to your Supabase dashboard
   - Navigate to SQL Editor
   - Run scripts/001-create-tables.sql
   - Run scripts/002-seed-sample-data.sql

5. **Start the development server**
   `ash
   npm run dev
   `

6. **Open your browser**
   Navigate to http://localhost:3000

## 📁 Project Structure

`
news-sense/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── chat/          # AI chat endpoint
│   │   ├── funds/         # Fund data endpoints
│   │   └── data-sync/     # Data synchronization
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main dashboard
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── chat-interface.tsx # AI chat component
│   ├── fund-chart.tsx    # Chart visualization
│   └── news-feed.tsx     # News display
├── lib/                   # Utility libraries
│   ├── polygon.ts        # Polygon.io integration
│   ├── news-scraper.ts   # News scraping logic
│   ├── huggingface.ts    # AI model integration
│   ├── supabase.ts       # Database client
│   └── types.ts          # TypeScript definitions
├── scripts/              # Database scripts
│   ├── 001-create-tables.sql
│   └── 002-seed-sample-data.sql
└── public/               # Static assets
`

## 🛠️ API Endpoints

### Fund Management
- GET /api/funds - List all funds
- GET /api/funds/[ticker] - Get fund details with news
- GET /api/funds/[ticker]/historical - Historical price data

### AI & Analysis
- POST /api/chat - Natural language queries
- POST /api/data-sync - Sync fund data and news

### System
- GET /api/market-status - Market status information
- POST /api/setup - Database setup verification

## 🧠 AI Models Used

### **Groq AI**
- **Model**: llama3-70b-8192
- **Purpose**: Natural language understanding and response generation
- **Features**: Ultra-fast inference, context-aware responses

### **Hugging Face Models**
- **Sentiment**: cardiffnlp/twitter-roberta-base-sentiment-latest
- **NER**: ProsusAI/finbert-ner
- **Purpose**: Financial text analysis and entity recognition

## 📊 Database Schema

### Core Tables
- **funds**: Fund metadata, prices, and performance metrics
- **news_articles**: Scraped news with sentiment scores
- **fund_news_links**: Many-to-many relationship with relevance scores
- **user_queries**: Chat history and analytics

### Relationships
`sql
funds 1:N fund_news_links N:1 news_articles
user_queries (standalone analytics table)
`

## 🔄 Data Pipeline

### 1. **Data Collection**
`
Polygon.io → Fund Prices → Database
Web Scrapers → News Articles → Sentiment Analysis → Database
`

### 2. **Entity Resolution**
`
News Content → HuggingFace NER → Fund Matching → Relevance Scoring
`

### 3. **Query Processing**
`
User Question → Groq AI → Context Retrieval → Enhanced Response
`

## 🎨 UI Components

- **Dashboard**: Overview with top/bottom performers
- **Fund Charts**: Interactive price visualization with Recharts
- **News Feed**: Sentiment-coded news articles
- **AI Chat**: Real-time conversational interface
- **Search**: Intelligent fund discovery

## 🔒 Security & Best Practices

- **Environment Variables**: Secure API key management
- **Database Security**: Row-level security with Supabase
- **Rate Limiting**: API call throttling and error handling
- **Type Safety**: Full TypeScript coverage
- **Error Boundaries**: Graceful error handling

## 🚦 Performance Features

- **Server Components**: Optimized rendering with React 19
- **API Caching**: Intelligent caching strategies
- **Lazy Loading**: Component-level code splitting
- **Fallback Data**: Mock data for API failures
- **Rate Limit Handling**: Graceful degradation

## 📈 Sample Queries

The AI assistant can handle complex financial questions:

`
✅ "Why did SPY drop 2% today?"
✅ "What's driving the tech selloff this week?"
✅ "Any regulatory news affecting financial ETFs?"
✅ "How is the energy sector performing?"
✅ "Show me funds with negative sentiment in the news"
`

## 🔮 Future Enhancements

- [ ] **Portfolio Tracking**: Multi-fund analysis and recommendations
- [ ] **Alert System**: Real-time notifications for significant movements
- [ ] **Correlation Analysis**: Visual fund-news correlation charts
- [ ] **Predictive Models**: ML-based price prediction
- [ ] **Mobile App**: React Native companion app
- [ ] **Social Sentiment**: Twitter/Reddit sentiment integration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: git checkout -b feature/amazing-feature
3. Commit changes: git commit -m 'Add amazing feature'
4. Push to branch: git push origin feature/amazing-feature
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Next.js Team** for the incredible React framework
- **Supabase** for seamless database management
- **Groq** for lightning-fast AI inference
- **Hugging Face** for state-of-the-art NLP models
- **Polygon.io** for reliable financial data
- **shadcn/ui** for beautiful UI components

## 📞 Support

For questions and support:
- 📧 Email: your.email@example.com
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/news-sense/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/yourusername/news-sense/discussions)

---

<div align="center">
  <strong>Built with ❤️ for the financial community</strong>
  <br>
  <sub>Making financial data accessible and understandable for everyone</sub>
</div>
