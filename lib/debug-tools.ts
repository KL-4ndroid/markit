/**
 * 調試工具 - 在瀏覽器 Console 中使用
 * 
 * 使用方法：
 * 1. 在任何頁面打開 Console (F12)
 * 2. 輸入 window.debug.cloudProducts() 查詢商品
 * 3. 輸入 window.debug.diagnose() 完整診斷
 */

'use client';

import { supabase } from './supabase/client';
import { db } from './db';

export const debugTools = {
  /**
   * 查詢雲端商品
   */
  async cloudProducts() {
    const { data, error } = await supabase.from('products').select('*');
    if (error) {
      console.error('❌ 查詢失敗:', error);
      return;
    }
    console.log('☁️ 雲端商品數量:', data?.length || 0);
    console.table(data);
    return data;
  },

  /**
   * 查詢本地商品
   */
  async localProducts() {
    const data = await db.products.toArray();
    console.log('💾 本地商品數量:', data.length);
    console.table(data);
    return data;
  },

  /**
   * 查詢雲端商品事件
   */
  async cloudProductEvents() {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .in('type', ['product_created', 'product_updated', 'product_deleted'])
      .order('timestamp', { ascending: false });
    
    if (error) {
      console.error('❌ 查詢失敗:', error);
      return;
    }
    console.log('☁️ 雲端商品事件數量:', data?.length || 0);
    console.table(data);
    return data;
  },

  /**
   * 查詢本地商品事件
   */
  async localProductEvents() {
    const data = await db.events
      .where('type')
      .anyOf(['product_created', 'product_updated', 'product_deleted'])
      .toArray();
    
    console.log('💾 本地商品事件數量:', data.length);
    console.table(data);
    return data;
  },

  /**
   * 查詢待同步的商品事件
   */
  async pendingProductEvents() {
    const data = await db.events
      .where('sync_status')
      .anyOf(['pending', 'local_only'])
      .and(e => ['product_created', 'product_updated', 'product_deleted'].includes(e.type))
      .toArray();
    
    console.log('⏳ 待同步商品事件數量:', data.length);
    console.table(data);
    return data;
  },

  /**
   * 查詢當前用戶資訊
   */
  async currentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    console.log('👤 當前用戶:');
    console.table([{
      id: user?.id,
      email: user?.email,
      created_at: user?.created_at,
    }]);
    return user;
  },

  /**
   * 查詢團隊成員
   */
  async teamMembers() {
    const { data: { user } } = await supabase.auth.getUser();
    
    // 獲取參與的市集
    const { data: markets } = await supabase
      .from('market_members')
      .select('market_id')
      .eq('user_id', user?.id);
    
    const marketIds = markets?.map(m => m.market_id) || [];
    
    if (marketIds.length === 0) {
      console.log('❌ 沒有參與任何市集');
      return [];
    }
    
    // 獲取團隊成員
    const { data: teamMembers } = await supabase
      .from('market_members')
      .select('user_id, profiles!inner(email, full_name)')
      .in('market_id', marketIds);
    
    const members = teamMembers?.map((m: any) => ({
      user_id: m.user_id,
      email: m.profiles?.email,
      name: m.profiles?.full_name,
    })) || [];
    
    console.log('👥 團隊成員數量:', members.length);
    console.table(members);
    return members;
  },

  /**
   * 比對本地與雲端商品
   */
  async compareProducts() {
    const local = await db.products.toArray();
    const { data: cloud } = await supabase.from('products').select('*');
    
    console.log('📊 商品數量比對:');
    console.table([{
      本地: local.length,
      雲端: cloud?.length || 0,
      差異: Math.abs(local.length - (cloud?.length || 0)),
    }]);
    
    // 找出只在本地的商品
    const cloudIds = new Set(cloud?.map(p => p.id) || []);
    const localOnly = local.filter(p => !cloudIds.has(p.id));
    
    if (localOnly.length > 0) {
      console.log('⚠️ 只在本地的商品:', localOnly.length);
      console.table(localOnly);
    }
    
    // 找出只在雲端的商品
    const localIds = new Set(local.map(p => p.id));
    const cloudOnly = cloud?.filter(p => !localIds.has(p.id)) || [];
    
    if (cloudOnly.length > 0) {
      console.log('⚠️ 只在雲端的商品:', cloudOnly.length);
      console.table(cloudOnly);
    }
    
    return { local, cloud, localOnly, cloudOnly };
  },

  /**
   * 完整診斷
   */
  async diagnose() {
    console.log('🔍 開始診斷...\n');
    
    // 1. 用戶資訊
    await this.currentUser();
    console.log('\n');
    
    // 2. 團隊成員
    await this.teamMembers();
    console.log('\n');
    
    // 3. 商品比對
    await this.compareProducts();
    console.log('\n');
    
    // 4. 待同步事件
    await this.pendingProductEvents();
    console.log('\n');
    
    console.log('✅ 診斷完成');
  },

  /**
   * 測試 RLS 政策
   */
  async testRLS() {
    const { data: { user } } = await supabase.auth.getUser();
    
    console.log('🔒 測試 RLS 政策...\n');
    
    // 測試 1: 查詢自己的商品事件
    const { data: myEvents, error: myError } = await supabase
      .from('events')
      .select('*')
      .eq('type', 'product_created')
      .eq('actor_id', user?.id);
    
    console.log('✅ 我的商品事件:', myEvents?.length || 0);
    if (myError) console.error('❌ 錯誤:', myError);
    
    // 測試 2: 查詢團隊成員的商品事件
    const { data: teamEvents, error: teamError } = await supabase
      .from('events')
      .select('*')
      .eq('type', 'product_created')
      .neq('actor_id', user?.id)
      .is('market_id', null);
    
    console.log('👥 團隊商品事件:', teamEvents?.length || 0);
    if (teamError) {
      console.error('❌ RLS 阻擋（需要更新政策）:', teamError);
    } else {
      console.log('✅ RLS 政策正常');
    }
    
    return { myEvents, teamEvents, myError, teamError };
  },
};
