import { NextResponse } from 'next/server';
import { verifyAdminSession } from '../../../../utils/adminAuth';
import { getAdminSupabase } from '../../../../utils/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = getAdminSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase client unavailable' }, { status: 500 });
  }

  try {
    const { data, error } = await supabase
      .from('store_settings')
      .select('id, is_open')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      console.error('[Admin Store API GET Error]:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      id: 1,
      is_open: data && typeof data.is_open === 'boolean' ? data.is_open : false,
    });
  } catch (err) {
    console.error('[Admin Store API GET Exception]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
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
    if (typeof body.is_open !== 'boolean') {
      return NextResponse.json({ error: 'Field `is_open` (boolean) is required.' }, { status: 400 });
    }

    const nextIsOpen = body.is_open;

    // 2. Try RPC first (SECURITY DEFINER)
    const { data: rpcData, error: rpcError } = await supabase.rpc('admin_update_store_status', {
      p_is_open: nextIsOpen,
    });

    if (!rpcError && rpcData) {
      return NextResponse.json({ success: true, id: 1, is_open: Boolean(rpcData.is_open) });
    }

    // 3. Fallback to direct update on store_settings (uses service role bypass)
    let { data, error } = await supabase
      .from('store_settings')
      .update({ is_open: nextIsOpen, updated_at: new Date().toISOString() })
      .eq('id', 1)
      .select();

    // If row 1 did not exist, upsert
    if (!error && (!data || data.length === 0)) {
      const upsertRes = await supabase
        .from('store_settings')
        .upsert([{ id: 1, is_open: nextIsOpen, updated_at: new Date().toISOString() }])
        .select();
      data = upsertRes.data;
      error = upsertRes.error;
    }

    if (error) {
      console.error('[Admin Store API POST Error]:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const updatedRow = data && data[0];
    return NextResponse.json({
      success: true,
      id: 1,
      is_open: updatedRow && typeof updatedRow.is_open === 'boolean' ? updatedRow.is_open : nextIsOpen,
    });
  } catch (err) {
    console.error('[Admin Store API POST Exception]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
