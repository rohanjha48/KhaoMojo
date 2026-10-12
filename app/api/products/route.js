import { NextResponse } from 'next/server';
import { fetchProducts } from '../../../utils/dataService';

export async function GET() {
  try {
    const products = await fetchProducts();
    return NextResponse.json(products, {
      headers: {
        'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=30',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
