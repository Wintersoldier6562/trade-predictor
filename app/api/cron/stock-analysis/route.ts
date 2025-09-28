import { NextRequest, NextResponse } from 'next/server';
import { analyzeStocks } from '@/lib/utils/stock-analysis';

export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get('authorization');
  const vercelCronSecret = process.env.CRON_SECRET;
  
  // Check if it's a Vercel cron request or has the correct secret
  if (authHeader !== `Bearer ${vercelCronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('🕐 Cron job triggered at:', new Date().toISOString());

    // Default stocks to analyze
    const defaultStocks = ['ITBEES', 'RELIANCE', 'TCS', 'HDFC', 'INFY'];
    
    // Use the utility function directly instead of calling the API
    const analysisResult = await analyzeStocks(defaultStocks);

    console.log('✅ Cron job completed successfully');
    
    return NextResponse.json({
      message: 'Cron job executed successfully',
      timestamp: new Date().toISOString(),
      stocksAnalyzed: defaultStocks,
      analysisResult: analysisResult.results?.length || 0
    });

  } catch (error) {
    console.error('❌ Error in cron job:', error);
    return NextResponse.json(
      { 
        error: 'Cron job failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
