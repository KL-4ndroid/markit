/**
 * Template 組件
 * 用於在每次路由切換時觸發頁面過渡動畫
 * 
 * 注意：template.tsx 會在每次路由變更時重新掛載
 * 這確保了動畫每次都會觸發
 */

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-transition">
      {children}
    </div>
  );
}
