/**
 * Supabase 連線測試腳本
 * 
 * 使用方法：
 * node test-supabase.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// 從環境變數讀取配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 檢查環境變數...\n');
console.log('SUPABASE_URL:', supabaseUrl ? '✅ 已設定' : '❌ 未設定');
console.log('SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ 已設定' : '❌ 未設定');
console.log('');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 錯誤：請確保 .env.local 文件存在且包含正確的 Supabase 配置');
  process.exit(1);
}

// 創建 Supabase 客戶端
console.log('🔌 正在連接到 Supabase...\n');
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 測試連線
async function testConnection() {
  try {
    // 測試 1: 檢查連線
    console.log('📡 測試 1: 檢查基本連線...');
    const { data, error } = await supabase.from('markets').select('count', { count: 'exact', head: true });
    
    if (error) {
      console.log('⚠️  警告：無法查詢 markets 表（可能表還不存在）');
      console.log('   錯誤信息:', error.message);
    } else {
      console.log('✅ 連線成功！');
      console.log('   Markets 表記錄數:', data || 0);
    }
    console.log('');

    // 測試 2: 列出所有表
    console.log('📋 測試 2: 列出資料庫中的表...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (tablesError) {
      console.log('⚠️  無法列出表（權限限制）');
    } else if (tables && tables.length > 0) {
      console.log('✅ 找到以下表:');
      tables.forEach(t => console.log('   -', t.table_name));
    } else {
      console.log('ℹ️  資料庫中尚無表');
    }
    console.log('');

    // 測試 3: 測試插入（如果 markets 表存在）
    console.log('📝 測試 3: 測試寫入權限...');
    const testMarket = {
      name: '測試市集',
      location: '測試地點',
      start_date: '2024-01-01',
      end_date: '2024-01-01',
      status: 'registered',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: insertData, error: insertError } = await supabase
      .from('markets')
      .insert([testMarket])
      .select();

    if (insertError) {
      console.log('⚠️  無法插入測試數據（可能表不存在或權限不足）');
      console.log('   錯誤信息:', insertError.message);
    } else {
      console.log('✅ 寫入測試成功！');
      console.log('   插入的記錄 ID:', insertData[0]?.id);
      
      // 清理測試數據
      if (insertData[0]?.id) {
        await supabase.from('markets').delete().eq('id', insertData[0].id);
        console.log('   ✅ 測試數據已清理');
      }
    }
    console.log('');

    // 總結
    console.log('═══════════════════════════════════════');
    console.log('📊 測試總結');
    console.log('═══════════════════════════════════════');
    console.log('✅ Supabase 連線配置正確');
    console.log('✅ 可以訪問 Supabase API');
    console.log('');
    console.log('💡 下一步：');
    console.log('   1. 如果表不存在，請在 Supabase Dashboard 中創建表');
    console.log('   2. 確保 RLS (Row Level Security) 政策配置正確');
    console.log('   3. 在應用中開始使用 Supabase！');
    console.log('');

  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
    console.error('');
    console.error('🔧 故障排除：');
    console.error('   1. 檢查 .env.local 文件是否存在');
    console.error('   2. 確認 Supabase URL 和 API Key 正確');
    console.error('   3. 檢查網路連線');
    console.error('   4. 確認 Supabase 專案狀態正常');
    process.exit(1);
  }
}

// 執行測試
testConnection();
