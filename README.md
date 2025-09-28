# Trend Predictor - Next.js API with Vercel Cron Jobs

AI-powered stock analysis API using Vercel AI SDK with automated cron jobs for daily stock analysis and email reports.

## Features

- 🤖 AI-powered stock analysis using Claude Sonnet 4 via Vercel AI Gateway
- 🔍 Web search capabilities using Exa API
- 📊 Real-time NSE stock data analysis
- 📧 Automated email reports via Gmail
- ⏰ Scheduled cron jobs running on Vercel
- 🚀 Next.js API routes with TypeScript support

## Setup

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Set up environment variables:**
   Create a `.env.local` file in the project root with:
   ```env
   # Vercel AI Gateway API Key
   # Get your API key from: https://vercel.com/ai-gateway
   AI_GATEWAY_API_KEY=your_ai_gateway_api_key_here

   # Stock Market API Key
   STOCK_API_KEY=your_stock_api_key_here

   # Exa API Key for web search
   # Get your API key from: https://exa.ai
   EXA_API_KEY=your_exa_api_key_here

   # Gmail credentials for sending emails
   GMAIL_USER=your_email@gmail.com
   GMAIL_APP_PASSWORD=your_16_char_app_password

   # Cron job secret for security
   CRON_SECRET=your_random_secret_string_here
   ```

3. **Run the development server:**
   ```bash
   pnpm dev
   ```

## Usage

### API Endpoints

#### 1. Health Check
```bash
GET /api/health
```

#### 2. Stock Analysis
```bash
POST /api/analyze-stocks
Content-Type: application/json

{
  "stocks": ["ITBEES", "RELIANCE", "TCS", "HDFC", "INFY"]
}
```

#### 3. Cron Job (Internal)
```bash
POST /api/cron/stock-analysis
Authorization: Bearer YOUR_CRON_SECRET
```

### Manual Stock Analysis
```typescript
const response = await fetch('/api/analyze-stocks', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    stocks: ['ITBEES', 'RELIANCE', 'TCS']
  })
});

const result = await response.json();
console.log(result);
```

### Web Interface
Visit `http://localhost:3000` to use the web interface for manual stock analysis.

## Deployment to Vercel

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Convert to Next.js API with cron jobs"
   git push origin main
   ```

2. **Deploy to Vercel:**
   - Connect your GitHub repository to Vercel
   - Set environment variables in Vercel dashboard
   - Deploy automatically

3. **Configure Environment Variables in Vercel:**
   Go to your Vercel project dashboard → Settings → Environment Variables and add:
   ```
   AI_GATEWAY_API_KEY=your_ai_gateway_api_key_here
   STOCK_API_KEY=your_stock_api_key_here
   EXA_API_KEY=your_exa_api_key_here
   GMAIL_USER=your_email@gmail.com
   GMAIL_APP_PASSWORD=your_16_char_app_password
   CRON_SECRET=your_random_secret_string_here
   ```

4. **Configure Cron Jobs:**
   - Cron jobs are automatically configured via `vercel.json`
   - Runs daily at 2:30 PM IST (9:00 AM UTC)
   - The cron job will automatically trigger with proper authentication

## Cron Schedule

The stock analysis runs automatically:
- **Schedule:** Daily at 2:30 PM IST (`0 9 * * *` in UTC)
- **Endpoint:** `/api/cron/stock-analysis`
- **Stocks:** ITBEES, RELIANCE, TCS, HDFC, INFY (configurable)

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway API key | Yes |
| `STOCK_API_KEY` | Stock market API key | Yes |
| `EXA_API_KEY` | Exa web search API key | Yes |
| `GMAIL_USER` | Gmail email address | Yes |
| `GMAIL_APP_PASSWORD` | Gmail app password | Yes |
| `CRON_SECRET` | Secret for cron job security | Yes |

## Dependencies

- `next` - Next.js framework
- `ai` - Vercel AI SDK
- `@ai-sdk/gateway` - AI Gateway provider
- `exa-js` - Exa web search client
- `nodemailer` - Email sending
- `zod` - Schema validation
- `typescript` - TypeScript support

## License

ISC
