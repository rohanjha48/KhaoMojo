import { NextResponse } from 'next/server';
import { fetchOrders, createOrder } from '../../../utils/dataService';

export async function GET() {
  try {
    const orders = await fetchOrders();
    return NextResponse.json(orders);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const newOrder = await createOrder(body);
    return NextResponse.json(newOrder, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
