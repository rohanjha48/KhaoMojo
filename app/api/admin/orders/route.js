import { NextResponse } from 'next/server';
import { verifyAdminSession } from '../../../../utils/adminAuth';
import { getAdminSupabase } from '../../../../utils/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  // 1. Authenticate Admin
  if (!verifyAdminSession(request)) {
    return NextResponse.json({ error: 'Unauthorized. Admin session required.' }, { status: 401 });
  }

  const supabase = getAdminSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase client unavailable' }, { status: 500 });
  }

  try {
    // 2. Try RPC get_admin_orders() first (SECURITY DEFINER)
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_admin_orders');
    if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
      return NextResponse.json(rpcData);
    }

    // 3. Fallback: Direct table query with Service Role (bypasses RLS & selects ALL orders)
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, products(*))')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Admin Orders API GET Error]:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error('[Admin Orders API GET Exception]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  // 1. Authenticate Admin
  if (!verifyAdminSession(request)) {
    return NextResponse.json({ error: 'Unauthorized. Admin session required.' }, { status: 401 });
  }

  const supabase = getAdminSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase client unavailable' }, { status: 500 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { orderId, status } = body;

    if (!orderId || !status) {
      return NextResponse.json({ error: 'Both `orderId` and `status` are required.' }, { status: 400 });
    }

    // 2. Try RPC admin_update_order_status first
    const { data: rpcData, error: rpcError } = await supabase.rpc('admin_update_order_status', {
      p_order_id: orderId,
      p_status: status,
    });

    if (!rpcError && rpcData) {
      return NextResponse.json({ success: true, order: rpcData });
    }

    // 3. Fallback: Direct table update with Service Role
    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)
      .select('*, order_items(*, products(*))')
      .single();

    if (error) {
      console.error('[Admin Orders API PATCH Error]:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, order: data });
  } catch (err) {
    console.error('[Admin Orders API PATCH Exception]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
