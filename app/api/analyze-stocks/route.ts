import { NextRequest, NextResponse } from 'next/server';
import { analyzeStocks } from '@/lib/utils/stock-analysis';

export async function POST(request: NextRequest) {
  try {
    // Check for required environment variables
    if (!process.env.AI_GATEWAY_API_KEY) {
      return NextResponse.json(
        { error: 'AI_GATEWAY_API_KEY environment variable is required' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { stocks } = body;
    
    if (!stocks || !Array.isArray(stocks)) {
      return NextResponse.json(
        { error: 'stocks array is required' },
        { status: 400 }
      );
    }
    console.log('Analyzing stocks:', stocks);

    const result = await analyzeStocks(stocks);

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Error in stock analysis API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}