# Entity-Relationship Diagram for News Sense

```mermaid
erDiagram
    FUND {
        int id PK
        string ticker
        string name
        string isin
        string sector
        decimal last_price
        decimal daily_change
        datetime updated_at
        datetime created_at
    }
    NEWS_ARTICLE {
        int id PK
        string title
        text content
        string source
        text url
        datetime published_at
        decimal sentiment_score
        datetime processed_at
        datetime created_at
    }
    FUND_NEWS_LINK {
        int id PK
        int fund_id FK
        int article_id FK
        decimal relevance_score
        datetime created_at
    }
    USER_QUERY {
        int id PK
        text question
        text response
        int response_time_ms
        datetime created_at
    }

    FUND ||--o{ FUND_NEWS_LINK : relates to
    NEWS_ARTICLE ||--o{ FUND_NEWS_LINK : relates to
    
    %% Indexes
    FUND: index (ticker)
    NEWS_ARTICLE: index (published_at)
    NEWS_ARTICLE: index (sentiment_score)
    FUND_NEWS_LINK: index (relevance_score)
    USER_QUERY: index (created_at)
```

