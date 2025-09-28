import { streamText, stepCountIs, tool } from 'ai';
import { createGateway } from '@ai-sdk/gateway';
import { z } from 'zod';
import Exa from 'exa-js';
import nodemailer from 'nodemailer';

// Base URL for stock market API
const BASE_URL = "https://stock.indianapi.in";

// Helper function to make API requests
async function makeNWSRequest<T>(url: string): Promise<T | null> {
  const headers = {
    'x-api-key': process.env.STOCK_API_KEY || '',
  };

  try {
    const startTime = Date.now();
    const response = await fetch(url, { headers });
    const duration = Date.now() - startTime;

    if (!response.ok) {
      console.log(`❌ [API] Request failed - Status: ${response.status}, Duration: ${duration}ms`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json() as T;
    return data;
  } catch (error) {
    console.error(`❌ [API] Request failed:`, error);
    return null;
  }
}

// Initialize AI Gateway
const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY ?? '',
});

// Stock market tools using AI SDK v5 stable
const getStockDetails = tool({
  description: "Get details for a specific stock",
  inputSchema: z.object({
    name: z.string().describe("Name of the stock (e.g. 'Tata Steel')")
  }),
  execute: async ({ name }: { name: string }) => {
    console.log(`🔍 [TOOL] getStockDetails called for: ${name}`);
    const stockURL = `${BASE_URL}/stock?name=${encodeURIComponent(name)}`;
    console.log(`🌐 [TOOL] Making API request to: ${stockURL}`);
    const stockDetails = await makeNWSRequest(stockURL);

    if (!stockDetails) {
      console.log(`❌ [TOOL] getStockDetails failed for: ${name}`);
      return "Failed to retrieve stock details";
    }

    console.log(`✅ [TOOL] getStockDetails success for: ${name}`);
    return JSON.stringify(stockDetails, null, 2);
  }
});

const getStockHistory = tool({
  description: "Get historical data for a specific stock",
  inputSchema: z.object({
    name: z.string().describe("Name of the stock (e.g. 'Infosys')"),
    period: z.string().describe("Time period (e.g. '1m', '6m', '1yr', '3yr', '5yr') default is 6m")
  }),
  execute: async ({ name, period }: { name: string; period: string }) => {
    console.log(`📈 [TOOL] getStockHistory called for: ${name}, period: ${period}`);
    const historyURL = `${BASE_URL}/historical_data?stock_name=${encodeURIComponent(name)}&period=${encodeURIComponent(period)}&filter=price`;
    console.log(`🌐 [TOOL] Making API request to: ${historyURL}`);
    const historyData = await makeNWSRequest(historyURL);

    if (!historyData) {
      console.log(`❌ [TOOL] getStockHistory failed for: ${name}, period: ${period}`);
      return "Failed to retrieve historical data";
    }

    console.log(`✅ [TOOL] getStockHistory success for: ${name}, period: ${period}`);
    return JSON.stringify(historyData, null, 2);
  }
});

const extractDomain = (url: string): string => {
  const urlPattern = /^https?:\/\/([^/?#]+)(?:[/?#]|$)/i;
  return url.match(urlPattern)?.[1] || url;
};

const cleanTitle = (title: string): string => {
  return title
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const deduplicateByDomainAndUrl = <T extends { url: string }>(items: T[]): T[] => {
  const seenDomains = new Set<string>();
  const seenUrls = new Set<string>();

  return items.filter((item) => {
    const domain = extractDomain(item.url);
    const isNewUrl = !seenUrls.has(item.url);
    const isNewDomain = !seenDomains.has(domain);

    if (isNewUrl && isNewDomain) {
      seenUrls.add(item.url);
      seenDomains.add(domain);
      return true;
    }
    return false;
  });
};

const exaWebSearch = tool({
  description: 'Search the web for information with 5 queries, max results and search depth.',
  inputSchema: z.object({
    queries: z.array(
      z.string().describe('Array of search queries to look up on the web. Default is 5 to 10 queries.'),
    ),
    maxResults: z.array(
      z.number().describe('Array of maximum number of results to return per query. Default is 5.'),
    ),
    topics: z.array(
      z
        .enum(['news', 'finance'])
        .describe('Array of topic types to search for. Default is general.'),
    ),
    include_domains: z
      .array(z.string())
      .describe('An array of domains to include in all search results. Default is an empty list.'),
    exclude_domains: z
      .array(z.string())
      .describe('An array of domains to exclude from all search results. Default is an empty list.'),
  }),
  execute: async ({
    queries,
    maxResults,
    topics,
    include_domains,
    exclude_domains,
  }) => {
    const exa = new Exa(process.env.EXA_API_KEY);

    console.log('Queries:', queries);
    console.log('Max Results:', maxResults);
    console.log('Topics:', topics);
    console.log('Include Domains:', include_domains);
    console.log('Exclude Domains:', exclude_domains);

    const searchPromises = queries.map(async (query, index) => {
      const currentTopic = topics[index] || topics[0] || 'general';
      const currentMaxResults = maxResults[index] || maxResults[0] || 10;

      try {
        console.log(`Starting search for query: ${query} (${index + 1}/${queries.length})`);

        const searchOptions: any = {
          text: true,
          type: 'auto',
          numResults: currentMaxResults < 10 ? 10 : currentMaxResults,
          livecrawl: 'preferred',
          useAutoprompt: true,
          category: currentTopic === 'finance' ? 'financial report' : currentTopic === 'news' ? 'news' : '',
        };

        // Exa API only allows one of includeDomains or excludeDomains, not both
        if (include_domains && include_domains.length > 0) {
          searchOptions.includeDomains = include_domains.map(domain => extractDomain(domain));
        } else if (exclude_domains && exclude_domains.length > 0) {
          searchOptions.excludeDomains = exclude_domains.map(domain => extractDomain(domain));
        }

        const data = await exa.searchAndContents(query, searchOptions);

        const results = data.results.map((result: any) => {
          return {
            url: result.url,
            title: cleanTitle(result.title || ''),
            content: (result.text || '').substring(0, 1000),
            published_date: currentTopic === 'news' && result.publishedDate ? result.publishedDate : undefined,
            author: result.author || undefined,
          };
        });

        console.log(`Completed search for query: ${query} - Found ${results.length} results`);

        return {
          query,
          results: deduplicateByDomainAndUrl(results),
        };
      } catch (error) {
        console.error(`Exa search error for query "${query}":`, error);
        console.log(`Failed search for query: ${query} (${index + 1}/${queries.length})`);

        return {
          query,
          results: [],
        };
      }
    });

    const searchResults = await Promise.all(searchPromises);

    console.log('Search Results:', searchResults);
    return {
      searches: searchResults,
    };
  },
});

// Get current IST time
export function getCurrentISTTime() {
  const now = new Date();
  const istTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  return istTime.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}

// AI processing function using Gemini 2.5 Pro
export async function processWithAI(prompt: string) {
  try {
    console.log('📊 Starting comprehensive NSE stock analysis for: ', prompt);

    const currentTime = getCurrentISTTime();

    const systemPrompt = `You are an expert NSE (National Stock Exchange of India) stock market analyst and trading advisor with access to real-time Indian market data. Your role is to provide comprehensive analysis of NSE-listed stocks, trading recommendations, and risk management advice specifically for the Indian equity market. Provide the tool calls and results in a structured format to the user.

CURRENT DATE & TIME (IST): ${currentTime}

AVAILABLE TOOLS:
1. getStockDetails - Get stock details: { name: "STOCK_NAME" }
2. getStockHistory - Get price history: { name: "STOCK_NAME", period: "1yr|3yr|5yr" default is 1yr }
3. exaWebSearch - Search the web for information on the ETF stock: { queries: ["QUERY1", "QUERY2", "QUERY3"], maxResults: [5, 5, 5], topics: ["news", "finance"], include_domains: ["DOMAIN1", "DOMAIN2"], exclude_domains: ["DOMAIN3", "DOMAIN4"] }

MANDATORY PROCESS:
1. ALWAYS call getStockDetails first and then
2. ALWAYS call getStockHistory for price data only once for the same stock.
3. ALWAYS call exaWebSearch for web search data.
4. Calculate prices based on ACTUAL data from the tools, not estimates
5. Use current price as base for all calculations
6. Entry price should be within 1-2% of current price
7. Target price should be 2-3x the risk (stop loss distance)
8. Stop loss should be 3-5% below current price for long positions
9. Do not call the tools more than once for the same stock.
10. Do not make up data or information.
11. Wait for 1 seconds before invoking the getStockHistory tool.

EXAMPLE STOCKS: RELIANCE, TCS, HDFC, INFY, ITC, BHARTIARTL, WIPRO, MARUTI, PSUBNKBEES

You MUST use all 3 tools for every stock analysis. Start by calling the tools now.

POSITIONAL/SWING TRADING ANALYSIS FRAMEWORK:
1. **Data Collection**: Use available tools to gather:
   - Current NSE stock prices and details
   - Historical price data (1m, 6m, 1y periods) for NSE stocks
   - Latest Indian market news and sentiment
   - Sector-specific news and developments

2. **Technical Analysis for Swing Trading**: Analyze:
   - **Chart Patterns**: Look for breakouts, pullbacks, flags, triangles, head & shoulders
   - **Support & Resistance**: Identify key levels for entry/exit points
   - **Moving Averages**: 20, 50, 200 EMA for trend confirmation
   - **Volume Analysis**: Volume spikes on breakouts, declining volume on pullbacks
   - **Momentum Indicators**: RSI (14), MACD, Stochastic for overbought/oversold conditions
   - **Time Frames**: Focus on daily charts for swing positions (1-4 weeks)

3. **Swing Trading Setup Identification**:
   - **Breakout Setups**: Price breaking above resistance with volume
   - **Pullback Setups**: Price pulling back to support in uptrend
   - **Reversal Setups**: Signs of trend reversal at key levels
   - **Continuation Setups**: Resumption of trend after consolidation

4. **Positional Trading Recommendations**: Provide:
   - **ENTRY PRICE**: Specific NSE price level to enter position
   - **TARGET PRICE**: Expected profit-taking level (1:2 or 1:3 risk-reward)
   - **STOP LOSS**: Risk management exit level (below support/resistance)
   - **POSITION SIZE**: 2-5% of portfolio per trade
   - **TIME HORIZON**: 1-4 weeks holding period
   - **CONFIDENCE LEVEL**: High/Medium/Low with reasoning
   - **SETUP TYPE**: Breakout/Pullback/Reversal/Continuation

5. **Risk Management for Swing Trading**:
   - Maximum risk per trade: 1-2% of portfolio
   - Risk-reward ratio: Minimum 1:2, preferably 1:3
   - Position sizing based on stop loss distance
   - Trailing stops for profitable positions
   - Maximum 3-5 open positions at once

6. **News & Sentiment Analysis**:
   - Latest news and market sentiment specific to NSE stocks
   - Earnings announcements and corporate actions
   - Sector rotation and institutional flows
   - Market volatility and VIX levels
   - FII/DII activity and derivatives data

SWING TRADING:
- Start with current NSE market overview and volatility assessment
- Identify swing trading opportunities with specific setups
- Provide detailed technical analysis with chart patterns
- Give clear entry/exit recommendations with risk-reward ratios
- Include position sizing and time horizon for each trade
- End with confidence level and setup type identification

IMPORTANT FOR SWING TRADING: 
- ONLY analyze NSE-listed stocks suitable for swing trading
- Focus on stocks with good liquidity and volatility
- Always use the available tools to get real-time NSE data before making recommendations
- Never provide trading advice without current NSE market data
- Consider Indian market timings and trading sessions
- Emphasize risk management and position sizing
- Look for setups with clear entry/exit points and good risk-reward ratios

PRICE CALCULATION RULES:
- Use the current price from getStockDetails as the base
- Entry Price: Current price ± 1-2% (for swing trading)
- Stop Loss: Current price - 3-5% (for long positions)
- Target Price: Entry Price + (2-3x the risk amount)
- Risk Amount = Entry Price - Stop Loss
- All prices should be rounded to 2 decimal places
- Use actual data from tools, not estimates

Response Format:
Response should be in the following format in json and there should be no other text in the response:
STOCK NAME: <STOCK NAME>
ENTRY PRICE: <ENTRY PRICE>
TARGET PRICE: <TARGET PRICE>
STOP LOSS: <STOP LOSS>
TIME HORIZON: <TIME HORIZON>
CONFIDENCE LEVEL: <CONFIDENCE LEVEL>
SETUP TYPE: <SETUP TYPE>
REASONING: <REASONING>
LATEST NEWS: <LATEST NEWS>
`;

    const result = await streamText({
      model: gateway('anthropic/claude-sonnet-4'),
      system: systemPrompt,
      prompt: prompt,
      stopWhen: stepCountIs(5),
      tools: {
        getStockDetails: getStockDetails,
        getStockHistory: getStockHistory,
        exaWebSearch: exaWebSearch,
      },
      activeTools: ['getStockDetails', 'getStockHistory', 'exaWebSearch'],
      temperature: 0.1,
    });

    let fullText = '';
    for await (const textPart of result.textStream) {
      fullText += textPart;
    }
    return fullText;
  } catch (error) {
    console.error('❌ Error processing with AI:', error);
    throw error;
  }
}

// Email sending function using Gmail App Password
export async function sendEmail(results: any[]) {
  try {
    console.log('📧 Preparing to send email with results...');
    
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.error('❌ Missing Gmail credentials in environment variables');
      return;
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    const currentTime = getCurrentISTTime();
    const emailSubject = `Stock Analysis Results - ${currentTime}`;
    
    let emailBody = `
Stock Analysis Results
Generated on: ${currentTime}

========================================

`;

    results.forEach((result, index) => {
      emailBody += `
Stock Analysis #${index + 1}:
----------------------------------------
Stock Name: ${result['STOCK NAME'] || 'N/A'}
Entry Price: ${result['ENTRY PRICE'] || 'N/A'}
Target Price: ${result['TARGET PRICE'] || 'N/A'}
Stop Loss: ${result['STOP LOSS'] || 'N/A'}
Time Horizon: ${result['TIME HORIZON'] || 'N/A'}
Confidence Level: ${result['CONFIDENCE LEVEL'] || 'N/A'}
Setup Type: ${result['SETUP TYPE'] || 'N/A'}
Reasoning: ${result['REASONING'] || 'N/A'}
Latest News: ${result['LATEST NEWS'] || 'N/A'}

========================================

`;
    });

    emailBody += `
---
This analysis was generated automatically by the Trend Predictor system.
Please review all recommendations carefully before making any investment decisions.
`;

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: process.env.GAMIL_SEND_TO_USER,
      subject: emailSubject,
      text: emailBody
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
    
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw error;
  }
}

// Main stock analysis function that processes multiple stocks
export async function analyzeStocks(stocks: string[]) {
  const finalResults = [];
  
  for (const stock of stocks) {
    console.log(`\n=== Analyzing ${stock} ===`);
    const finalResult = await processWithAI(stock);
    
    // Extract JSON from response
    const jsonMatch = finalResult.match(/```json\n(.*)\n```/s);
    const jsonResult = jsonMatch ? JSON.parse(jsonMatch[1]) : {};
    
    console.log('\nFinal Result: ', jsonResult);
    console.log('='.repeat(50));
    
    // Add delay between analyses for consistency
    if (stocks.indexOf(stock) < stocks.length - 1) {
      console.log('Waiting 2 seconds before next analysis...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    finalResults.push(jsonResult);
  }

  // Send email with results
  await sendEmail(finalResults);

  return {
    message: 'Stock analysis completed successfully',
    results: finalResults,
    timestamp: getCurrentISTTime()
  };
}
