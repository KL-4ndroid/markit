# 登入、帳號、團隊與權限：提示與介面文字

> 自動產生；請勿手動修改。重新產生：`node scripts/generate-ui-copy-inventory.mjs`。
> [總索引](../APP_UI_COPY_INDEX.md) · [完整 JSON](inventory.json) · [逐檔覆蓋](coverage.md)

共 678 筆來源位置；同字不同出處分開記錄。這是來源盤點，候選與未啟用分支不算已上線功能。

## app/api/account-deletion/route.ts

API 回應／伺服器來源（須確認客戶端是否顯示）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-70b10130c779<br>[app/api/account-deletion/route.ts:53:58](../../app/api/account-deletion/route.ts#L53) | Account deletion is not enabled. | **來源候選** · 候選，非已證實提示<br>disabledResponse 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | disabledResponse<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a0d1d3c36706<br>[app/api/account-deletion/route.ts:78:61](../../app/api/account-deletion/route.ts#L78) | Authentication is temporarily unavailable. | **來源候選** · 候選，非已證實提示<br>resolveRequiredActor 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | resolveRequiredActor<br>actor === 'unavailable' |
| UI-d3ff14409f9d<br>[app/api/account-deletion/route.ts:81:58](../../app/api/account-deletion/route.ts#L81) | Account deletion requires authentication. | **來源候選** · 候選，非已證實提示<br>resolveRequiredActor 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | resolveRequiredActor<br>!actor &#124;&#124; !UUID_PATTERN.test(actor.actorId) |
| UI-0e76d9742c30<br>[app/api/account-deletion/route.ts:94:67](../../app/api/account-deletion/route.ts#L94) | Account deletion is temporarily unavailable. | **來源候選** · 候選，非已證實提示<br>GET 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | GET<br>!repository |
| UI-ac91c5011861<br>[app/api/account-deletion/route.ts:99:67](../../app/api/account-deletion/route.ts#L99) | No account deletion request was found. | **來源候選** · 候選，非已證實提示<br>GET 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | GET<br>raw === null |
| UI-d65472d6c463<br>[app/api/account-deletion/route.ts:104:64](../../app/api/account-deletion/route.ts#L104) | Account deletion status is unavailable. | **來源候選** · 候選，非已證實提示<br>GET 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | GET<br>否則 status |
| UI-3bdaaa704a55<br>[app/api/account-deletion/route.ts:106:67](../../app/api/account-deletion/route.ts#L106) | Account deletion status is unavailable. | **來源候選** · 候選，非已證實提示<br>GET 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | GET<br>catch：操作拋出例外 |
| UI-3581b16ebba3<br>[app/api/account-deletion/route.ts:120:48](../../app/api/account-deletion/route.ts#L120) | Recent reauthentication is required. | **來源候選** · 候選，非已證實提示<br>POST 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | POST<br>!reauth.accepted |
| UI-b74589ded15c<br>[app/api/account-deletion/route.ts:124:63](../../app/api/account-deletion/route.ts#L124) | Account deletion request is invalid. | **來源候選** · 候選，非已證實提示<br>POST 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | POST<br>!body |
| UI-5c2a615e9cb9<br>[app/api/account-deletion/route.ts:133:67](../../app/api/account-deletion/route.ts#L133) | Account deletion is temporarily unavailable. | **來源候選** · 候選，非已證實提示<br>POST 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | POST<br>!hashes |
| UI-41c1deaed5be<br>[app/api/account-deletion/route.ts:138:67](../../app/api/account-deletion/route.ts#L138) | Account deletion is temporarily unavailable. | **來源候選** · 候選，非已證實提示<br>POST 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | POST<br>!repository |
| UI-8b5d26be1baa<br>[app/api/account-deletion/route.ts:150:64](../../app/api/account-deletion/route.ts#L150) | Account deletion request was not accepted. | **來源候選** · 候選，非已證實提示<br>POST 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | POST<br>否則 status |
| UI-43d34448d886<br>[app/api/account-deletion/route.ts:152:67](../../app/api/account-deletion/route.ts#L152) | Account deletion request was not accepted. | **來源候選** · 候選，非已證實提示<br>POST 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | POST<br>catch：操作拋出例外 |

## app/join/page.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-83400919d512<br>[app/join/page.tsx:38:16](../../app/join/page.tsx#L38) | 邀請資訊不完整，請確認收到的邀請連結是否完整。 | **狀態設定** · 文案生產端，須查使用端<br>setError：更新畫面訊息；仍須依呼叫端確認是否被渲染 | JoinPageContent<br>!token |
| UI-85dfec38be65<br>[app/join/page.tsx:44:16](../../app/join/page.tsx#L44) | 驗證邀請連結需要網路連線。請恢復連線後再試一次。 | **狀態設定** · 文案生產端，須查使用端<br>setError：更新畫面訊息；仍須依呼叫端確認是否被渲染 | JoinPageContent<br>!isOnline |
| UI-2b364ea9b2b5<br>[app/join/page.tsx:54:18](../../app/join/page.tsx#L54) | ${null} | **動態文字入口** · 執行時綁定入口<br>verifyToken 接收執行時文字；內容需追查所列綁定與生產端 | verifyToken<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c09ee1834f83<br>[app/join/page.tsx:59:20](../../app/join/page.tsx#L59) | 邀請連結已過期或無效，請聯繫邀請人重新發送。 | **狀態設定** · 文案生產端，須查使用端<br>setError：更新畫面訊息；仍須依呼叫端確認是否被渲染 | verifyToken<br>!result.is_valid |
| UI-2c5b82dd1dc4<br>[app/join/page.tsx:68:18](../../app/join/page.tsx#L68) | 驗證邀請連結失敗，請稍後再試。 | **狀態設定** · 文案生產端，須查使用端<br>setError：更新畫面訊息；仍須依呼叫端確認是否被渲染 | verifyToken<br>catch：操作拋出例外 |
| UI-4d374fbb6efe<br>[app/join/page.tsx:92:23](../../app/join/page.tsx#L92) | 已加入團隊，正在載入可存取的市集資料... | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleAcceptInvitation<br>result.success |
| UI-05ce8a539df1<br>[app/join/page.tsx:97:18](../../app/join/page.tsx#L97) | ${result.message} | **動態文字入口** · 執行時綁定入口<br>handleAcceptInvitation 接收執行時文字；內容需追查所列綁定與生產端 | handleAcceptInvitation<br>否則 result.success |
| UI-c3e7919efe77<br>[app/join/page.tsx:102:16](../../app/join/page.tsx#L102) | 加入團隊失敗，請稍後再試或聯繫邀請人。 | **狀態設定** · 文案生產端，須查使用端<br>setError：更新畫面訊息；仍須依呼叫端確認是否被渲染 | handleAcceptInvitation<br>catch：操作拋出例外 |
| UI-c81cac59e47a<br>[app/join/page.tsx:136:13](../../app/join/page.tsx#L136) | 需要網路連線 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | JoinPageContent<br>!isOnline |
| UI-b65e1e5ef1af<br>[app/join/page.tsx:139:13](../../app/join/page.tsx#L139) | 驗證邀請連結需要連線。請恢復網路後重新整理頁面。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | JoinPageContent<br>!isOnline |
| UI-bab97d0c0d08<br>[app/join/page.tsx:145:13](../../app/join/page.tsx#L145) | 重新整理 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | JoinPageContent<br>!isOnline |
| UI-d41655eca5f4<br>[app/join/page.tsx:153:43](../../app/join/page.tsx#L153) | 驗證邀請連結中... | **畫面文字** · 直接呈現定義<br>GlobalLoadingSkeleton：呈現操作說明、資料標籤、狀態或注意事項 | JoinPageContent · message<br>verifying |
| UI-96c23f5cafa6<br>[app/join/page.tsx:162:13](../../app/join/page.tsx#L162) | 邀請連結無效 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | JoinPageContent<br>error &#124;&#124; !verification |
| UI-8f7b0d24603c<br>[app/join/page.tsx:165:23](../../app/join/page.tsx#L165) | 此邀請連結已過期或不存在，請聯繫邀請人重新發送。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | JoinPageContent<br>error &#124;&#124; !verification |
| UI-1a918fd02400<br>[app/join/page.tsx:171:13](../../app/join/page.tsx#L171) | 回到首頁 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | JoinPageContent<br>error &#124;&#124; !verification |
| UI-c03baf48a507<br>[app/join/page.tsx:185:11](../../app/join/page.tsx#L185) | 加入市集團隊 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | JoinPageContent<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2282d26de9f7<br>[app/join/page.tsx:189:16](../../app/join/page.tsx#L189) | 邀請你成為團隊員工，協助記錄市集資料。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | JoinPageContent<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-4e653002ff75<br>[app/join/page.tsx:195:11](../../app/join/page.tsx#L195) | 加入後你可以 | **畫面文字** · 直接呈現定義<br>h3：辨識畫面、區塊或對話框主題 | JoinPageContent<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-504f5b693d14<br>[app/join/page.tsx:198:15](../../app/join/page.tsx#L198) | 查看老闆授權的市集與商品資料 | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | JoinPageContent<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9b1528f64bd6<br>[app/join/page.tsx:199:15](../../app/join/page.tsx#L199) | 協助記錄互動與成交 | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | JoinPageContent<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-48afaf41bd89<br>[app/join/page.tsx:200:15](../../app/join/page.tsx#L200) | 同步你被授權範圍內的資料 | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | JoinPageContent<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-dd2f2558f40b<br>[app/join/page.tsx:207:11](../../app/join/page.tsx#L207) | 請確認帳號 | **畫面文字** · 直接呈現定義<br>h3：辨識畫面、區塊或對話框主題 | JoinPageContent<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0ae5520b4ecc<br>[app/join/page.tsx:212:15](../../app/join/page.tsx#L212) | 你目前登入的帳號是： | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | JoinPageContent<br>user |
| UI-43784f73ce37<br>[app/join/page.tsx:218:15](../../app/join/page.tsx#L218) | 你將用這個帳號加入 ${verification.owner_email} 的團隊。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | JoinPageContent<br>user |
| UI-664cd5b5bfdf<br>[app/join/page.tsx:223:13](../../app/join/page.tsx#L223) | 請建立帳號後加入團隊。已有帳號的人，請先登入後再回到此邀請連結。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | JoinPageContent<br>否則 user |
| UI-6e6ce1208f59<br>[app/join/page.tsx:238:17](../../app/join/page.tsx#L238) | 加入中... | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | JoinPageContent<br>user → isAccepting |
| UI-ce87908a9240<br>[app/join/page.tsx:243:17](../../app/join/page.tsx#L243) | 確認加入團隊 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | JoinPageContent<br>user → 否則 isAccepting |
| UI-43096b87a69f<br>[app/join/page.tsx:253:29](../../app/join/page.tsx#L253) | 登出中... | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | JoinPageContent<br>user → isSigningOut |
| UI-d13fc1afa355<br>[app/join/page.tsx:253:40](../../app/join/page.tsx#L253) | 不是這個帳號？登出切換 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | JoinPageContent<br>user → 否則 isSigningOut |
| UI-db6f6a6d3e4c<br>[app/join/page.tsx:263:13](../../app/join/page.tsx#L263) | 建立帳號並加入團隊 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | JoinPageContent<br>否則 user |
| UI-049475e911d5<br>[app/join/page.tsx:270:13](../../app/join/page.tsx#L270) | 已有帳號？登入後加入團隊 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | JoinPageContent<br>否則 user |
| UI-3cbd5a9f6498<br>[app/join/page.tsx:274:13](../../app/join/page.tsx#L274) | 註冊完成後會自動加入團隊，不需要額外設定。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | JoinPageContent<br>否則 user |
| UI-e812ab72714d<br>[app/join/page.tsx:286:10](../../app/join/page.tsx#L286) | ${children} | **動態文字入口** · 執行時綁定入口<br>div 接收執行時文字；內容需追查所列綁定與生產端 | JoinShell<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e78954bf6793<br>[app/join/page.tsx:294:56](../../app/join/page.tsx#L294) | 載入中... | **畫面文字** · 直接呈現定義<br>GlobalLoadingSkeleton：呈現操作說明、資料標籤、狀態或注意事項 | JoinPage · message<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## app/settings/account/page.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-043cd3d9fef3<br>[app/settings/account/page.tsx:14:13](../../app/settings/account/page.tsx#L14) | 帳號與同步 | **畫面文字** · 直接呈現定義<br>SettingsPageShell：呈現操作說明、資料標籤、狀態或注意事項 | AccountSettingsPage · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c3cfe61f2188<br>[app/settings/account/page.tsx:15:19](../../app/settings/account/page.tsx#L15) | 確認目前登入身分、雲端同步狀態與這台裝置的待同步資料。 | **畫面文字** · 直接呈現定義<br>SettingsPageShell：呈現操作說明、資料標籤、狀態或注意事項 | AccountSettingsPage · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## app/settings/team/page.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-41c07aaedc63<br>[app/settings/team/page.tsx:28:9](../../app/settings/team/page.tsx#L28) | 正在載入團隊成員... | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | loading · loading<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d545f606c370<br>[app/settings/team/page.tsx:92:21](../../app/settings/team/page.tsx#L92) | 正在離開團隊... | **確認／通知** · 直接呈現定義<br>toast.loading：提示操作結果、進度或要求使用者確認 | confirmLeaveTeam<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2bc38a4376b1<br>[app/settings/team/page.tsx:92:40](../../app/settings/team/page.tsx#L92) | leave-team | **確認／通知** · 直接呈現定義<br>toast.loading：提示操作結果、進度或要求使用者確認 | confirmLeaveTeam · id<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-3b3e1c6d206a<br>[app/settings/team/page.tsx:98:21](../../app/settings/team/page.tsx#L98) | 團隊關係已解除，正在清除本地快取... | **確認／通知** · 直接呈現定義<br>toast.loading：提示操作結果、進度或要求使用者確認 | confirmLeaveTeam<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-3d91a545ad64<br>[app/settings/team/page.tsx:98:50](../../app/settings/team/page.tsx#L98) | leave-team | **確認／通知** · 直接呈現定義<br>toast.loading：提示操作結果、進度或要求使用者確認 | confirmLeaveTeam · id<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f6c3986d2c89<br>[app/settings/team/page.tsx:101:21](../../app/settings/team/page.tsx#L101) | 已離開團隊，即將重新載入 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | confirmLeaveTeam<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-caa3a72df89b<br>[app/settings/team/page.tsx:101:43](../../app/settings/team/page.tsx#L101) | leave-team | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | confirmLeaveTeam · id<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c530f023a254<br>[app/settings/team/page.tsx:104:74](../../app/settings/team/page.tsx#L104) | 請稍後再試 | **來源候選** · 候選，非已證實提示<br>message 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | message<br>catch：操作拋出例外 → 否則 leaveError instanceof Error |
| UI-9b351f4f6d6f<br>[app/settings/team/page.tsx:105:19](../../app/settings/team/page.tsx#L105) | 離開失敗：${message} | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | confirmLeaveTeam<br>catch：操作拋出例外 |
| UI-f23978127194<br>[app/settings/team/page.tsx:105:44](../../app/settings/team/page.tsx#L105) | leave-team | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | confirmLeaveTeam · id<br>catch：操作拋出例外 |
| UI-9bcbaa955a02<br>[app/settings/team/page.tsx:111:13](../../app/settings/team/page.tsx#L111) | 團隊與權限 | **畫面文字** · 直接呈現定義<br>SettingsPageShell：呈現操作說明、資料標籤、狀態或注意事項 | TeamSettingsPage · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c361dc90c04e<br>[app/settings/team/page.tsx:113:11](../../app/settings/team/page.tsx#L113) | 查看目前所屬團隊、角色與可執行的工作。 | **畫面文字** · 直接呈現定義<br>SettingsPageShell：呈現操作說明、資料標籤、狀態或注意事項 | TeamSettingsPage · description<br>isStaff |
| UI-a48a1863ee1f<br>[app/settings/team/page.tsx:114:11](../../app/settings/team/page.tsx#L114) | 邀請員工、調整角色，並確認每個角色可存取的功能。 | **畫面文字** · 直接呈現定義<br>SettingsPageShell：呈現操作說明、資料標籤、狀態或注意事項 | TeamSettingsPage · description<br>否則 isStaff |
| UI-459ae8b0f49a<br>[app/settings/team/page.tsx:120:26](../../app/settings/team/page.tsx#L120) | 正在確認團隊身分 | **畫面文字** · 直接呈現定義<br>StateView：呈現操作說明、資料標籤、狀態或注意事項 | TeamSettingsPage · title<br>isLoading |
| UI-c315de97056e<br>[app/settings/team/page.tsx:120:49](../../app/settings/team/page.tsx#L120) | 完成後會顯示目前可使用的團隊功能。 | **畫面文字** · 直接呈現定義<br>StateView：呈現操作說明、資料標籤、狀態或注意事項 | TeamSettingsPage · description<br>isLoading |
| UI-a479648f21ce<br>[app/settings/team/page.tsx:131:91](../../app/settings/team/page.tsx#L131) | 離開目前團隊 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | TeamSettingsPage<br>否則 isLoading → isStaff |
| UI-f0c43ef6cf75<br>[app/settings/team/page.tsx:133:15](../../app/settings/team/page.tsx#L133) | 離開後將無法再查看這個團隊的市集，這台裝置上的團隊資料也會清除。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | TeamSettingsPage<br>否則 isLoading → isStaff |
| UI-6e68ae1c41a7<br>[app/settings/team/page.tsx:141:15](../../app/settings/team/page.tsx#L141) | 離開團隊 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | TeamSettingsPage<br>否則 isLoading → isStaff |
| UI-527f16f861aa<br>[app/settings/team/page.tsx:149:23](../../app/settings/team/page.tsx#L149) | ${staffCollaborationAccess.reason} | **動態文字入口** · 執行時綁定入口<br>UpgradePrompt 接收執行時文字；內容需追查所列綁定與生產端 | TeamSettingsPage · reason<br>否則 isLoading → 否則 isStaff → !capabilityQuery.isLoading &amp;&amp; !staffCollaborationAccess.allowed |
| UI-da93ab96c3e7<br>[app/settings/team/page.tsx:157:15](../../app/settings/team/page.tsx#L157) | 目前為本機訂閱模擬。可檢查 Team 控制項是否正確顯示，但所有團隊資料寫入仍由伺服器拒絕，不會修改雲端資料。 | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | TeamSettingsPage<br>否則 isLoading → 否則 isStaff → simulationActive |
| UI-94112548460c<br>[app/settings/team/page.tsx:173:15](../../app/settings/team/page.tsx#L173) | 離開目前團隊？ | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | TeamSettingsPage · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-baade6e7b0e4<br>[app/settings/team/page.tsx:174:21](../../app/settings/team/page.tsx#L174) | 離開後將無法再存取老闆的市集，這台裝置上的團隊資料也會清除，帳號會恢復為一般使用者。 | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | TeamSettingsPage · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0d90231c1c33<br>[app/settings/team/page.tsx:175:22](../../app/settings/team/page.tsx#L175) | 離開團隊 | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | TeamSettingsPage · confirmLabel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## app/staff/page.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-8a48ff76a81e<br>[app/staff/page.tsx:26:11](../../app/staff/page.tsx#L26) | 員工管理已移至團隊與權限 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | StaffPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-6051e49f4451<br>[app/staff/page.tsx:29:11](../../app/staff/page.tsx#L29) | 正在為您導向... | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | StaffPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## components/account/AccountSwitcher.tsx

未追到正式頁面引用（待核對動態接線／保留碼）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-9ec0627720f2<br>[components/account/AccountSwitcher.tsx:67:19](../../components/account/AccountSwitcher.tsx#L67) | 載入帳號列表失敗 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | loadAccounts<br>catch：操作拋出例外 |
| UI-7b0ce015ebce<br>[components/account/AccountSwitcher.tsx:82:18](../../components/account/AccountSwitcher.tsx#L82) | 已經是當前帳號 | **確認／通知** · 直接呈現定義<br>toast.info：提示操作結果、進度或要求使用者確認 | handleSwitchAccount<br>account.isCurrent |
| UI-7b188aa9f834<br>[components/account/AccountSwitcher.tsx:87:21](../../components/account/AccountSwitcher.tsx#L87) | 正在切換帳號... | **確認／通知** · 直接呈現定義<br>toast.loading：提示操作結果、進度或要求使用者確認 | handleSwitchAccount<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-da5bd13d1d6f<br>[components/account/AccountSwitcher.tsx:87:40](../../components/account/AccountSwitcher.tsx#L87) | switch-account | **確認／通知** · 直接呈現定義<br>toast.loading：提示操作結果、進度或要求使用者確認 | handleSwitchAccount · id<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9f2fe0982b2e<br>[components/account/AccountSwitcher.tsx:91:25](../../components/account/AccountSwitcher.tsx#L91) | 無效的資料庫名稱 | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | handleSwitchAccount<br>!dbInfo |
| UI-6e8eb934676e<br>[components/account/AccountSwitcher.tsx:100:21](../../components/account/AccountSwitcher.tsx#L100) | 帳號已切換 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleSwitchAccount<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-fe8593ccf037<br>[components/account/AccountSwitcher.tsx:100:36](../../components/account/AccountSwitcher.tsx#L100) | switch-account | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleSwitchAccount · id<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f915780364a2<br>[components/account/AccountSwitcher.tsx:108:19](../../components/account/AccountSwitcher.tsx#L108) | 切換帳號失敗 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleSwitchAccount<br>catch：操作拋出例外 |
| UI-3f6b887d965b<br>[components/account/AccountSwitcher.tsx:108:35](../../components/account/AccountSwitcher.tsx#L108) | switch-account | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleSwitchAccount · id<br>catch：操作拋出例外 |
| UI-d64e9ce9a6aa<br>[components/account/AccountSwitcher.tsx:117:19](../../components/account/AccountSwitcher.tsx#L117) | 無法刪除當前使用的帳號 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleDeleteAccount<br>accountToDelete.isCurrent |
| UI-901bedfd349f<br>[components/account/AccountSwitcher.tsx:122:21](../../components/account/AccountSwitcher.tsx#L122) | 正在刪除... | **確認／通知** · 直接呈現定義<br>toast.loading：提示操作結果、進度或要求使用者確認 | handleDeleteAccount<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f3e31647dac8<br>[components/account/AccountSwitcher.tsx:122:38](../../components/account/AccountSwitcher.tsx#L122) | delete-account | **確認／通知** · 直接呈現定義<br>toast.loading：提示操作結果、進度或要求使用者確認 | handleDeleteAccount · id<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-3dd73ede4841<br>[components/account/AccountSwitcher.tsx:126:21](../../components/account/AccountSwitcher.tsx#L126) | 帳號數據已刪除 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleDeleteAccount<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-20912c0be239<br>[components/account/AccountSwitcher.tsx:126:38](../../components/account/AccountSwitcher.tsx#L126) | delete-account | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleDeleteAccount · id<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d1b26a91e1dd<br>[components/account/AccountSwitcher.tsx:135:19](../../components/account/AccountSwitcher.tsx#L135) | 刪除失敗 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleDeleteAccount<br>catch：操作拋出例外 |
| UI-7ccb9acf09ce<br>[components/account/AccountSwitcher.tsx:135:33](../../components/account/AccountSwitcher.tsx#L135) | delete-account | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleDeleteAccount · id<br>catch：操作拋出例外 |
| UI-cd0ef9b5deb5<br>[components/account/AccountSwitcher.tsx:192:25](../../components/account/AccountSwitcher.tsx#L192) | 切換帳號 | **畫面文字** · 直接呈現定義<br>Dialog.Title：辨識畫面、區塊或對話框主題 | AccountSwitcher<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0f96d30173ae<br>[components/account/AccountSwitcher.tsx:195:25](../../components/account/AccountSwitcher.tsx#L195) | 選擇要使用的帳號模式 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | AccountSwitcher<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-1d5600d6e3c3<br>[components/account/AccountSwitcher.tsx:206:35](../../components/account/AccountSwitcher.tsx#L206) | 老闆模式： | **畫面文字** · 直接呈現定義<br>strong：呈現操作說明、資料標籤、狀態或注意事項 | AccountSwitcher<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2c17c363ce5f<br>[components/account/AccountSwitcher.tsx:206:49](../../components/account/AccountSwitcher.tsx#L206) | 管理自己的市集和商品 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | AccountSwitcher<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c102dc74909c<br>[components/account/AccountSwitcher.tsx:209:35](../../components/account/AccountSwitcher.tsx#L209) | 員工模式： | **畫面文字** · 直接呈現定義<br>strong：呈現操作說明、資料標籤、狀態或注意事項 | AccountSwitcher<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ccbdd2bad43d<br>[components/account/AccountSwitcher.tsx:209:49](../../components/account/AccountSwitcher.tsx#L209) | 協助老闆記錄互動和成交 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | AccountSwitcher<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2f3ec1bfbd5d<br>[components/account/AccountSwitcher.tsx:218:23](../../components/account/AccountSwitcher.tsx#L218) | 載入中... | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | AccountSwitcher<br>isLoading |
| UI-889978362295<br>[components/account/AccountSwitcher.tsx:224:25](../../components/account/AccountSwitcher.tsx#L224) | 沒有可用的帳號 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | AccountSwitcher<br>否則 isLoading → accounts.length === 0 |
| UI-1a85e284f619<br>[components/account/AccountSwitcher.tsx:252:36](../../components/account/AccountSwitcher.tsx#L252) | ${account.label} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | AccountSwitcher<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f425a4af7088<br>[components/account/AccountSwitcher.tsx:257:37](../../components/account/AccountSwitcher.tsx#L257) | 使用中 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | AccountSwitcher<br>account.isCurrent |
| UI-0e92e2c25058<br>[components/account/AccountSwitcher.tsx:262:53](../../components/account/AccountSwitcher.tsx#L262) | ${account.dataCount} 筆數據 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | AccountSwitcher<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d8682e9a19c7<br>[components/account/AccountSwitcher.tsx:281:37](../../components/account/AccountSwitcher.tsx#L281) | 刪除此帳號數據 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | AccountSwitcher · title<br>!account.isCurrent |
| UI-aa8659758b9e<br>[components/account/AccountSwitcher.tsx:296:21](../../components/account/AccountSwitcher.tsx#L296) | 關閉 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | AccountSwitcher<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-edf4f4583677<br>[components/account/AccountSwitcher.tsx:341:23](../../components/account/AccountSwitcher.tsx#L341) | 確認刪除帳號數據？ | **畫面文字** · 直接呈現定義<br>Dialog.Title：辨識畫面、區塊或對話框主題 | AccountSwitcher<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e2461fe31baa<br>[components/account/AccountSwitcher.tsx:344:23](../../components/account/AccountSwitcher.tsx#L344) | 將刪除「${accountToDelete?.label}」的所有本地數據 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | AccountSwitcher<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a8e786e449a1<br>[components/account/AccountSwitcher.tsx:350:58](../../components/account/AccountSwitcher.tsx#L350) | ⚠️ 注意： | **畫面文字** · 直接呈現定義<br>strong：呈現操作說明、資料標籤、狀態或注意事項 | AccountSwitcher<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-74f1e34ff989<br>[components/account/AccountSwitcher.tsx:351:23](../../components/account/AccountSwitcher.tsx#L351) | 此操作無法復原，但雲端數據不受影響。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | AccountSwitcher<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-bfd79a2811a7<br>[components/account/AccountSwitcher.tsx:363:23](../../components/account/AccountSwitcher.tsx#L363) | 取消 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | AccountSwitcher<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-67f11db598ca<br>[components/account/AccountSwitcher.tsx:369:23](../../components/account/AccountSwitcher.tsx#L369) | 確認刪除 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | AccountSwitcher<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## components/auth/AuthCacheBlockedDialog.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-58091643a66f<br>[components/auth/AuthCacheBlockedDialog.tsx:14:47](../../components/auth/AuthCacheBlockedDialog.tsx#L14) | Local changes need attention | **來源候選** · 候選，非已證實提示<br>getTitle 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getTitle<br>action === 'staff_status_reset' |
| UI-128bbfe94b73<br>[components/auth/AuthCacheBlockedDialog.tsx:15:44](../../components/auth/AuthCacheBlockedDialog.tsx#L15) | Account switch paused | **來源候選** · 候選，非已證實提示<br>getTitle 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getTitle<br>action === 'identity_switch' |
| UI-232d1c10be0c<br>[components/auth/AuthCacheBlockedDialog.tsx:16:10](../../components/auth/AuthCacheBlockedDialog.tsx#L16) | Sign-out paused | **來源候選** · 候選，非已證實提示<br>getTitle 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getTitle<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ce10a22cdd67<br>[components/auth/AuthCacheBlockedDialog.tsx:43:21](../../components/auth/AuthCacheBlockedDialog.tsx#L43) | Local changes discarded | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleDiscard<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-3099aa851ab2<br>[components/auth/AuthCacheBlockedDialog.tsx:45:37](../../components/auth/AuthCacheBlockedDialog.tsx#L45) | Failed to discard local changes | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleDiscard<br>catch：操作拋出例外 |
| UI-c6d0dc6a1565<br>[components/auth/AuthCacheBlockedDialog.tsx:64:49](../../components/auth/AuthCacheBlockedDialog.tsx#L64) | Local changes need attention | **畫面文字** · 直接呈現定義<br>DialogTitle：辨識畫面、區塊或對話框主題 | AuthCacheBlockedDialog<br>否則 detail |
| UI-e61b99d6f397<br>[components/auth/AuthCacheBlockedDialog.tsx:68:17](../../components/auth/AuthCacheBlockedDialog.tsx#L68) | ${detail?.message} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | AuthCacheBlockedDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-caab57e8d876<br>[components/auth/AuthCacheBlockedDialog.tsx:70:51](../../components/auth/AuthCacheBlockedDialog.tsx#L70) | ${detail?.pendingEventCount ?? 0} unsynced local event(s) | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | AuthCacheBlockedDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-749c9f3937b9<br>[components/auth/AuthCacheBlockedDialog.tsx:71:58](../../components/auth/AuthCacheBlockedDialog.tsx#L71) | ${detail?.unfinishedSyncQueueCount ?? 0} unfinished sync queue item(s) | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | AuthCacheBlockedDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-431648c075e7<br>[components/auth/AuthCacheBlockedDialog.tsx:72:72](../../components/auth/AuthCacheBlockedDialog.tsx#L72) | ${detail?.pendingSalesPhotoEvidenceCreationCount ?? 0} pending sales photo evidence item(s) | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | AuthCacheBlockedDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-38832575ecbc<br>[components/auth/AuthCacheBlockedDialog.tsx:73:71](../../components/auth/AuthCacheBlockedDialog.tsx#L73) | ${detail?.pendingSalesPhotoEvidencePayloadCount ?? 0} pending local photo payload(s) | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | AuthCacheBlockedDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-07354b61a5dd<br>[components/auth/AuthCacheBlockedDialog.tsx:74:113](../../components/auth/AuthCacheBlockedDialog.tsx#L74) | ${detail?.pendingMarketJournalDraftCount} 篇私人心得草稿。請回到出攤心得儲存；一般同步不會送出草稿。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | AuthCacheBlockedDialog<br>(detail?.pendingMarketJournalDraftCount ?? 0) &gt; 0 |
| UI-51f5c70e90c5<br>[components/auth/AuthCacheBlockedDialog.tsx:75:107](../../components/auth/AuthCacheBlockedDialog.tsx#L75) | ${detail?.pendingMarketCashDraftCount} 份現金草稿。請回市集的開／收攤現金儲存，或到帳號同步設定處理；一般同步不會送出草稿。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | AuthCacheBlockedDialog<br>(detail?.pendingMarketCashDraftCount ?? 0) &gt; 0 |
| UI-1e69cf9df4be<br>[components/auth/AuthCacheBlockedDialog.tsx:78:15](../../components/auth/AuthCacheBlockedDialog.tsx#L78) | Sign in with the original account to let the app sync these changes, or discard them only if you are sure they should not be kept. | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | AuthCacheBlockedDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-daff734486a5<br>[components/auth/AuthCacheBlockedDialog.tsx:89:15](../../components/auth/AuthCacheBlockedDialog.tsx#L89) | Sign in to sync | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | AuthCacheBlockedDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-835d746111aa<br>[components/auth/AuthCacheBlockedDialog.tsx:99:31](../../components/auth/AuthCacheBlockedDialog.tsx#L99) | Discarding... | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | AuthCacheBlockedDialog<br>isDiscarding |
| UI-bd70e3b21455<br>[components/auth/AuthCacheBlockedDialog.tsx:99:49](../../components/auth/AuthCacheBlockedDialog.tsx#L99) | Discard local changes | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | AuthCacheBlockedDialog<br>否則 isDiscarding |

## components/auth/AuthGuard.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-0435757696d2<br>[components/auth/AuthGuard.tsx:125:72](../../components/auth/AuthGuard.tsx#L125) | 正在確認登入狀態… | **畫面文字** · 直接呈現定義<br>GlobalLoadingSkeleton：呈現操作說明、資料標籤、狀態或注意事項 | AuthGuard · message<br>!isInitialized &#124;&#124; loading &#124;&#124; isCheckingOfflineData → loading &#124;&#124; !isInitialized |
| UI-0ef0dbf75d58<br>[components/auth/AuthGuard.tsx:125:86](../../components/auth/AuthGuard.tsx#L125) | 正在確認這台裝置的資料… | **畫面文字** · 直接呈現定義<br>GlobalLoadingSkeleton：呈現操作說明、資料標籤、狀態或注意事項 | AuthGuard · message<br>!isInitialized &#124;&#124; loading &#124;&#124; isCheckingOfflineData → 否則 loading &#124;&#124; !isInitialized |
| UI-106f74a0a7d3<br>[components/auth/AuthGuard.tsx:130:15](../../components/auth/AuthGuard.tsx#L130) | ${children} | **動態文字入口** · 執行時綁定入口<br>AuthGuard 接收執行時文字；內容需追查所列綁定與生產端 | AuthGuard<br>isPublicRoute |
| UI-752260c87ef1<br>[components/auth/AuthGuard.tsx:140:10](../../components/auth/AuthGuard.tsx#L140) | ${children} | **動態文字入口** · 執行時綁定入口<br>AuthGuard 接收執行時文字；內容需追查所列綁定與生產端 | AuthGuard<br>user |
| UI-717dd5ac34c0<br>[components/auth/AuthGuard.tsx:154:10](../../components/auth/AuthGuard.tsx#L154) | ${children} | **動態文字入口** · 執行時綁定入口<br>AuthGuard 接收執行時文字；內容需追查所列綁定與生產端 | AuthGuard<br>!getNetworkPort().getCurrentStatus().connected &amp;&amp; hasOfflineData |

## components/auth/GlobalLoadingSkeleton.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-af3663c5bf97<br>[components/auth/GlobalLoadingSkeleton.tsx:17:101](../../components/auth/GlobalLoadingSkeleton.tsx#L17) | ${message} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | GlobalLoadingSkeleton<br>message |

## components/auth/LoginModal.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-64529c0855f1<br>[components/auth/LoginModal.tsx:25:12](../../components/auth/LoginModal.tsx#L25) | 目前無法安全讀寫登入資料，請解鎖裝置並重新開啟 App 後再試。 | **來源候選** · 候選，非已證實提示<br>getFriendlyAuthError 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getFriendlyAuthError<br>lowerMessage.startsWith('native_auth_') |
| UI-03bce96ad6ee<br>[components/auth/LoginModal.tsx:29:12](../../components/auth/LoginModal.tsx#L29) | 暫時無法連上登入服務，請確認網路後重試。 | **來源候選** · 候選，非已證實提示<br>getFriendlyAuthError 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getFriendlyAuthError<br>lowerMessage.includes('failed to fetch') &#124;&#124; lowerMessage.includes('network') &#124;&#124; lowerMessage.includes('timeout') |
| UI-a176233c8fae<br>[components/auth/LoginModal.tsx:32:24](../../components/auth/LoginModal.tsx#L32) | Invalid login credentials | **來源候選** · 候選，非已證實提示<br>getFriendlyAuthError 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getFriendlyAuthError<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-57ee582168f4<br>[components/auth/LoginModal.tsx:33:12](../../components/auth/LoginModal.tsx#L33) | Email 或密碼不正確，請確認後再試一次。 | **來源候選** · 候選，非已證實提示<br>getFriendlyAuthError 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getFriendlyAuthError<br>message.includes('Invalid login credentials') |
| UI-060eea63e934<br>[components/auth/LoginModal.tsx:36:24](../../components/auth/LoginModal.tsx#L36) | User already registered | **來源候選** · 候選，非已證實提示<br>getFriendlyAuthError 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getFriendlyAuthError<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c8a24018cf47<br>[components/auth/LoginModal.tsx:37:12](../../components/auth/LoginModal.tsx#L37) | 此 Email 已註冊，請改用登入。 | **來源候選** · 候選，非已證實提示<br>getFriendlyAuthError 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getFriendlyAuthError<br>message.includes('User already registered') &#124;&#124; lowerMessage.includes('already registered') |
| UI-6fad48e5c314<br>[components/auth/LoginModal.tsx:41:12](../../components/auth/LoginModal.tsx#L41) | 密碼至少需要 6 位字元。 | **來源候選** · 候選，非已證實提示<br>getFriendlyAuthError 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getFriendlyAuthError<br>lowerMessage.includes('password') &amp;&amp; (lowerMessage.includes('6') &#124;&#124; lowerMessage.includes('short')) |
| UI-31e4244e6295<br>[components/auth/LoginModal.tsx:45:12](../../components/auth/LoginModal.tsx#L45) | 請輸入有效的 Email。 | **來源候選** · 候選，非已證實提示<br>getFriendlyAuthError 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getFriendlyAuthError<br>lowerMessage.includes('email') |
| UI-31830463d399<br>[components/auth/LoginModal.tsx:48:10](../../components/auth/LoginModal.tsx#L48) | ${mode === 'login' ? '登入' : '註冊'}失敗：${message &#124;&#124; '請稍後再試。'} | **來源候選** · 候選，非已證實提示<br>getFriendlyAuthError 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getFriendlyAuthError<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-174962020316<br>[components/auth/LoginModal.tsx:48:32](../../components/auth/LoginModal.tsx#L48) | 登入 | **來源候選** · 候選，非已證實提示<br>getFriendlyAuthError 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getFriendlyAuthError<br>mode === 'login' |
| UI-48167288918e<br>[components/auth/LoginModal.tsx:48:39](../../components/auth/LoginModal.tsx#L48) | 註冊 | **來源候選** · 候選，非已證實提示<br>getFriendlyAuthError 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getFriendlyAuthError<br>否則 mode === 'login' |
| UI-048e13dd12a7<br>[components/auth/LoginModal.tsx:48:60](../../components/auth/LoginModal.tsx#L48) | 請稍後再試。 | **來源候選** · 候選，非已證實提示<br>getFriendlyAuthError 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getFriendlyAuthError<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-acb2fa1b2370<br>[components/auth/LoginModal.tsx:95:23](../../components/auth/LoginModal.tsx#L95) | 請輸入 Email 和密碼。 | **來源候選** · 候選，非已證實提示<br>message 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | message<br>!normalizedEmail &#124;&#124; !password |
| UI-66618ad13f74<br>[components/auth/LoginModal.tsx:101:23](../../components/auth/LoginModal.tsx#L101) | 密碼至少需要 6 位字元。 | **來源候選** · 候選，非已證實提示<br>message 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | message<br>isSignup &amp;&amp; password.length &lt; 6 |
| UI-f05e0614779e<br>[components/auth/LoginModal.tsx:128:25](../../components/auth/LoginModal.tsx#L128) | 登入成功。 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleSubmit<br>mode === 'login' → data.user |
| UI-cfd3cba784a4<br>[components/auth/LoginModal.tsx:135:27](../../components/auth/LoginModal.tsx#L135) | 登入失敗，請確認 Email 和密碼後再試一次。 | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | handleSubmit<br>mode === 'login' → 否則 data.user |
| UI-34c86469078e<br>[components/auth/LoginModal.tsx:163:31](../../components/auth/LoginModal.tsx#L163) | 帳號已建立，並已加入團隊。 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleSubmit<br>否則 mode === 'login' → data.user → invitationToken → result.success |
| UI-39dff8c1273e<br>[components/auth/LoginModal.tsx:166:31](../../components/auth/LoginModal.tsx#L166) | 帳號已建立，但加入團隊失敗。 | **確認／通知** · 直接呈現定義<br>toast.warning：提示操作結果、進度或要求使用者確認 | handleSubmit<br>否則 mode === 'login' → data.user → invitationToken → 否則 result.success |
| UI-4bb7cf3f5e3c<br>[components/auth/LoginModal.tsx:172:29](../../components/auth/LoginModal.tsx#L172) | 帳號已建立，但加入團隊失敗。 | **確認／通知** · 直接呈現定義<br>toast.warning：提示操作結果、進度或要求使用者確認 | handleSubmit<br>否則 mode === 'login' → data.user → invitationToken → catch：操作拋出例外 |
| UI-49ca9efd7ed3<br>[components/auth/LoginModal.tsx:173:30](../../components/auth/LoginModal.tsx#L173) | 請聯繫邀請人重新發送邀請連結。 | **確認／通知** · 直接呈現定義<br>toast.warning：提示操作結果、進度或要求使用者確認 | handleSubmit · description<br>否則 mode === 'login' → data.user → invitationToken → catch：操作拋出例外 |
| UI-0fbc51ef6bbe<br>[components/auth/LoginModal.tsx:177:27](../../components/auth/LoginModal.tsx#L177) | 帳號建立成功。 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleSubmit<br>否則 mode === 'login' → data.user → 否則 invitationToken |
| UI-52fc96526899<br>[components/auth/LoginModal.tsx:182:27](../../components/auth/LoginModal.tsx#L182) | 帳號建立失敗，請稍後再試。 | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | handleSubmit<br>否則 mode === 'login' → 否則 data.user |
| UI-818deca7061e<br>[components/auth/LoginModal.tsx:206:29](../../components/auth/LoginModal.tsx#L206) | 建立 Féria 帳號 | **畫面文字** · 直接呈現定義<br>DialogTitle：辨識畫面、區塊或對話框主題 | LoginModal<br>isSignup |
| UI-4cf2e02fe0cf<br>[components/auth/LoginModal.tsx:206:45](../../components/auth/LoginModal.tsx#L206) | 登入 Féria | **畫面文字** · 直接呈現定義<br>DialogTitle：辨識畫面、區塊或對話框主題 | LoginModal<br>否則 isSignup |
| UI-48cc30ba5862<br>[components/auth/LoginModal.tsx:208:89](../../components/auth/LoginModal.tsx#L208) | 建立帳號後即可同步資料。若你是透過邀請連結加入團隊，註冊後會自動加入。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | LoginModal<br>isSignup |
| UI-82ab42d0d828<br>[components/auth/LoginModal.tsx:214:26](../../components/auth/LoginModal.tsx#L214) | 關閉 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | LoginModal · aria-label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f6c005bd8238<br>[components/auth/LoginModal.tsx:224:17](../../components/auth/LoginModal.tsx#L224) | Email | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | LoginModal<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f93ac5b8d4d8<br>[components/auth/LoginModal.tsx:250:19](../../components/auth/LoginModal.tsx#L250) | 密碼 | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | LoginModal<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e5e91e383b32<br>[components/auth/LoginModal.tsx:253:98](../../components/auth/LoginModal.tsx#L253) | 至少 6 位字元 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | LoginModal<br>isSignup |
| UI-0ad306fba234<br>[components/auth/LoginModal.tsx:276:46](../../components/auth/LoginModal.tsx#L276) | 隱藏密碼 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | LoginModal · aria-label<br>showPassword |
| UI-6f51b32100ac<br>[components/auth/LoginModal.tsx:276:55](../../components/auth/LoginModal.tsx#L276) | 顯示密碼 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | LoginModal · aria-label<br>否則 showPassword |
| UI-2e05818b2883<br>[components/auth/LoginModal.tsx:298:19](../../components/auth/LoginModal.tsx#L298) | 記住 Email | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | LoginModal<br>!isSignup |
| UI-a91363609e6c<br>[components/auth/LoginModal.tsx:309:18](../../components/auth/LoginModal.tsx#L309) | ${authError} | **動態文字入口** · 執行時綁定入口<br>div 接收執行時文字；內容需追查所列綁定與生產端 | LoginModal<br>authError |
| UI-91fa6576b42a<br>[components/auth/LoginModal.tsx:315:17](../../components/auth/LoginModal.tsx#L315) | 正在等待登入服務回應，尚未開始載入市集資料。請稍候，避免重複送出。 | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | LoginModal<br>isSlowAuth &amp;&amp; !authError |
| UI-06e967cf269d<br>[components/auth/LoginModal.tsx:327:31](../../components/auth/LoginModal.tsx#L327) | 建立帳號中... | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | LoginModal<br>isLoading → isSignup |
| UI-ac12ab9df749<br>[components/auth/LoginModal.tsx:327:44](../../components/auth/LoginModal.tsx#L327) | 登入中... | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | LoginModal<br>isLoading → 否則 isSignup |
| UI-1cf4335234e1<br>[components/auth/LoginModal.tsx:330:28](../../components/auth/LoginModal.tsx#L330) | 建立帳號 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | LoginModal<br>否則 isLoading → isSignup |
| UI-33b2bf43e416<br>[components/auth/LoginModal.tsx:330:37](../../components/auth/LoginModal.tsx#L330) | 登入 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | LoginModal<br>否則 isLoading → 否則 isSignup |
| UI-50374ee90ff5<br>[components/auth/LoginModal.tsx:345:27](../../components/auth/LoginModal.tsx#L345) | 已有帳號？登入 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | LoginModal<br>isSignup |
| UI-4416e2c183b1<br>[components/auth/LoginModal.tsx:345:39](../../components/auth/LoginModal.tsx#L345) | 還沒有帳號？建立帳號 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | LoginModal<br>否則 isSignup |
| UI-9b90cb0fc02c<br>[components/auth/LoginModal.tsx:352:19](../../components/auth/LoginModal.tsx#L352) | 註冊後，資料會綁定到此 Email 帳號。請使用你之後會固定登入的信箱。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | LoginModal<br>isSignup |
| UI-d4e685f2b01b<br>[components/auth/LoginModal.tsx:353:19](../../components/auth/LoginModal.tsx#L353) | 登入成功後會讀取雲端紀錄；若有需要處理的本機資料，會另外提示。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | LoginModal<br>否則 isSignup |

## components/auth/MigrationModal.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-7492827bdd2c<br>[components/auth/MigrationModal.tsx:44:74](../../components/auth/MigrationModal.tsx#L44) | 清除 | **來源候選** · 候選，非已證實提示<br>handleMigration 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | handleMigration<br>option === MigrationOption.CLEAR |
| UI-56b262bab1aa<br>[components/auth/MigrationModal.tsx:45:19](../../components/auth/MigrationModal.tsx#L45) | 請先輸入「清除」以確認此操作。 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleMigration<br>option === MigrationOption.CLEAR &amp;&amp; clearConfirmation.trim() !== '清除' |
| UI-542e0522a6a9<br>[components/auth/MigrationModal.tsx:60:23](../../components/auth/MigrationModal.tsx#L60) | 本機資料已準備同步到雲端。 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleMigration<br>option === MigrationOption.SYNC |
| UI-7db2bf279fa4<br>[components/auth/MigrationModal.tsx:62:23](../../components/auth/MigrationModal.tsx#L62) | 此裝置的本機資料已清除，將使用雲端帳號資料。 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleMigration<br>否則 option === MigrationOption.SYNC → option === MigrationOption.CLEAR |
| UI-92518b75bc15<br>[components/auth/MigrationModal.tsx:64:20](../../components/auth/MigrationModal.tsx#L64) | 已取消登入。 | **確認／通知** · 直接呈現定義<br>toast.info：提示操作結果、進度或要求使用者確認 | handleMigration<br>否則 option === MigrationOption.SYNC → 否則 option === MigrationOption.CLEAR |
| UI-efddc0e9c339<br>[components/auth/MigrationModal.tsx:73:64](../../components/auth/MigrationModal.tsx#L73) | 請稍後再試。 | **來源候選** · 候選，非已證實提示<br>message 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | message<br>catch：操作拋出例外 → 否則 error instanceof Error |
| UI-635dee2916ca<br>[components/auth/MigrationModal.tsx:75:23](../../components/auth/MigrationModal.tsx#L75) | ${message} | **動態文字入口** · 執行時綁定入口<br>handleMigration 接收執行時文字；內容需追查所列綁定與生產端 | handleMigration<br>catch：操作拋出例外 |
| UI-6a13a2a2459c<br>[components/auth/MigrationModal.tsx:76:19](../../components/auth/MigrationModal.tsx#L76) | 資料處理失敗：${message} | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleMigration<br>catch：操作拋出例外 |
| UI-ccf1f664f7ba<br>[components/auth/MigrationModal.tsx:93:21](../../components/auth/MigrationModal.tsx#L93) | 處理中... | **畫面文字** · 直接呈現定義<br>h3：辨識畫面、區塊或對話框主題 | MigrationModal<br>status === 'processing' &#124;&#124; status === 'success' &#124;&#124; status === 'error' → status === 'processing' |
| UI-d0d210ec3807<br>[components/auth/MigrationModal.tsx:96:65](../../components/auth/MigrationModal.tsx#L96) | 正在將本機資料標記為可同步。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | MigrationModal<br>status === 'processing' &#124;&#124; status === 'success' &#124;&#124; status === 'error' → status === 'processing' → selectedOption === MigrationOption.SYNC |
| UI-a964935f96e3<br>[components/auth/MigrationModal.tsx:97:66](../../components/auth/MigrationModal.tsx#L97) | 正在清除此裝置的本機資料。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | MigrationModal<br>status === 'processing' &#124;&#124; status === 'success' &#124;&#124; status === 'error' → status === 'processing' → selectedOption === MigrationOption.CLEAR |
| UI-75147ae1c112<br>[components/auth/MigrationModal.tsx:98:67](../../components/auth/MigrationModal.tsx#L98) | 正在取消登入。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | MigrationModal<br>status === 'processing' &#124;&#124; status === 'success' &#124;&#124; status === 'error' → status === 'processing' → selectedOption === MigrationOption.CANCEL |
| UI-a612268e6285<br>[components/auth/MigrationModal.tsx:107:21](../../components/auth/MigrationModal.tsx#L107) | 已完成 | **畫面文字** · 直接呈現定義<br>h3：辨識畫面、區塊或對話框主題 | MigrationModal<br>status === 'processing' &#124;&#124; status === 'success' &#124;&#124; status === 'error' → status === 'success' |
| UI-2494a89e5214<br>[components/auth/MigrationModal.tsx:110:65](../../components/auth/MigrationModal.tsx#L110) | 本機資料會在同步時上傳到雲端。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | MigrationModal<br>status === 'processing' &#124;&#124; status === 'success' &#124;&#124; status === 'error' → status === 'success' → selectedOption === MigrationOption.SYNC |
| UI-b8ffbe479937<br>[components/auth/MigrationModal.tsx:111:66](../../components/auth/MigrationModal.tsx#L111) | 此裝置將改用雲端帳號資料。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | MigrationModal<br>status === 'processing' &#124;&#124; status === 'success' &#124;&#124; status === 'error' → status === 'success' → selectedOption === MigrationOption.CLEAR |
| UI-c02d2a67de84<br>[components/auth/MigrationModal.tsx:112:67](../../components/auth/MigrationModal.tsx#L112) | 已取消登入，資料未變更。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | MigrationModal<br>status === 'processing' &#124;&#124; status === 'success' &#124;&#124; status === 'error' → status === 'success' → selectedOption === MigrationOption.CANCEL |
| UI-2e4f08d7df8b<br>[components/auth/MigrationModal.tsx:121:21](../../components/auth/MigrationModal.tsx#L121) | 處理失敗 | **畫面文字** · 直接呈現定義<br>h3：辨識畫面、區塊或對話框主題 | MigrationModal<br>status === 'processing' &#124;&#124; status === 'success' &#124;&#124; status === 'error' → status === 'error' |
| UI-41756918a9be<br>[components/auth/MigrationModal.tsx:124:22](../../components/auth/MigrationModal.tsx#L124) | ${errorMessage} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | MigrationModal<br>status === 'processing' &#124;&#124; status === 'success' &#124;&#124; status === 'error' → status === 'error' |
| UI-550e4155fbd3<br>[components/auth/MigrationModal.tsx:133:21](../../components/auth/MigrationModal.tsx#L133) | 重新選擇 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | MigrationModal<br>status === 'processing' &#124;&#124; status === 'success' &#124;&#124; status === 'error' → status === 'error' |
| UI-17875158089c<br>[components/auth/MigrationModal.tsx:153:17](../../components/auth/MigrationModal.tsx#L153) | 此裝置已有本機資料 | **畫面文字** · 直接呈現定義<br>DialogTitle：辨識畫面、區塊或對話框主題 | MigrationModal<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-4700657bec1a<br>[components/auth/MigrationModal.tsx:156:17](../../components/auth/MigrationModal.tsx#L156) | 你正在登入 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | MigrationModal<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9d28020c9ad6<br>[components/auth/MigrationModal.tsx:156:84](../../components/auth/MigrationModal.tsx#L156) | 。 系統偵測到此裝置已有尚未綁定到這個帳號的資料，請選擇如何處理。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | MigrationModal<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c6c9bbded71a<br>[components/auth/MigrationModal.tsx:164:26](../../components/auth/MigrationModal.tsx#L164) | 關閉 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | MigrationModal · aria-label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-dd41484b8d05<br>[components/auth/MigrationModal.tsx:173:59](../../components/auth/MigrationModal.tsx#L173) | 本機資料摘要 | **畫面文字** · 直接呈現定義<br>h3：辨識畫面、區塊或對話框主題 | MigrationModal<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-fa6070d64d4d<br>[components/auth/MigrationModal.tsx:179:67](../../components/auth/MigrationModal.tsx#L179) | 市集 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | MigrationModal<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-edea052bbf79<br>[components/auth/MigrationModal.tsx:188:67](../../components/auth/MigrationModal.tsx#L188) | 事件紀錄 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | MigrationModal<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-8c42f33a09e4<br>[components/auth/MigrationModal.tsx:209:21](../../components/auth/MigrationModal.tsx#L209) | 保留本機資料並同步到雲端 | **畫面文字** · 直接呈現定義<br>h3：辨識畫面、區塊或對話框主題 | MigrationModal<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-316525f9a057<br>[components/auth/MigrationModal.tsx:212:21](../../components/auth/MigrationModal.tsx#L212) | 建議選項。保留此裝置上的市集與紀錄，並綁定到目前登入的帳號。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | MigrationModal<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-7ab7825cb072<br>[components/auth/MigrationModal.tsx:225:21](../../components/auth/MigrationModal.tsx#L225) | 清除此裝置的本機資料，使用雲端帳號 | **畫面文字** · 直接呈現定義<br>h3：辨識畫面、區塊或對話框主題 | MigrationModal<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a701fc8c1ef5<br>[components/auth/MigrationModal.tsx:228:21](../../components/auth/MigrationModal.tsx#L228) | 只清除此裝置上的本機資料，不會刪除雲端資料。若不確定，請選擇保留並同步。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | MigrationModal<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9a0f91ef12e4<br>[components/auth/MigrationModal.tsx:231:21](../../components/auth/MigrationModal.tsx#L231) | 若要使用此選項，請輸入「清除」 | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | MigrationModal<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c0433db55c5b<br>[components/auth/MigrationModal.tsx:237:33](../../components/auth/MigrationModal.tsx#L237) | 清除 | **輸入提示** · 直接呈現定義<br>在 input 提供輸入格式、範例或選擇提示 | MigrationModal · placeholder<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9d61ec558e2c<br>[components/auth/MigrationModal.tsx:243:73](../../components/auth/MigrationModal.tsx#L243) | 清除 | **來源候選** · 候選，非已證實提示<br>MigrationModal 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | MigrationModal · disabled<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-369d5f81d54f<br>[components/auth/MigrationModal.tsx:246:21](../../components/auth/MigrationModal.tsx#L246) | 清除此裝置的本機資料 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | MigrationModal<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-09af6511cbae<br>[components/auth/MigrationModal.tsx:263:21](../../components/auth/MigrationModal.tsx#L263) | 先不要登入 | **畫面文字** · 直接呈現定義<br>h3：辨識畫面、區塊或對話框主題 | MigrationModal<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c3eb29237721<br>[components/auth/MigrationModal.tsx:266:21](../../components/auth/MigrationModal.tsx#L266) | 取消登入並保留目前本機資料。你可以稍後再登入。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | MigrationModal<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-bcb62e6e810e<br>[components/auth/MigrationModal.tsx:275:15](../../components/auth/MigrationModal.tsx#L275) | 注意：這裡處理的是「此裝置上的本機資料」。若你已經有雲端資料，系統會在登入後重新同步。 不確定時，請優先選擇「保留本機資料並同步到雲端」。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | MigrationModal<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## components/auth/OfflineBanner.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-0eb5b960c217<br>[components/auth/OfflineBanner.tsx:36:25](../../components/auth/OfflineBanner.tsx#L36) | 離線唯讀模式 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | OfflineBanner<br>readOnly |
| UI-e2818a3905fe<br>[components/auth/OfflineBanner.tsx:36:36](../../components/auth/OfflineBanner.tsx#L36) | 離線，雲端同步已暫停 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | OfflineBanner<br>否則 readOnly |
| UI-88c5f8839aba<br>[components/auth/OfflineBanner.tsx:40:17](../../components/auth/OfflineBanner.tsx#L40) | 尚未登入，目前僅能查看這台裝置的資料，無法編輯或同步。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | OfflineBanner<br>readOnly |
| UI-68e5ca479cd5<br>[components/auth/OfflineBanner.tsx:41:17](../../components/auth/OfflineBanner.tsx#L41) | 尚未同步的紀錄只保存在這台裝置；連線恢復後請確認同步狀態。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | OfflineBanner<br>否則 readOnly |

## components/auth/RoleAccessNotice.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-cbb3e9af996b<br>[components/auth/RoleAccessNotice.tsx:8:43](../../components/auth/RoleAccessNotice.tsx#L8) | 已登入，尚無法確認使用權限 | **畫面文字** · 直接呈現定義<br>h1：辨識畫面、區塊或對話框主題 | RoleAccessNotice<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-77e2a8725a5c<br>[components/auth/RoleAccessNotice.tsx:9:75](../../components/auth/RoleAccessNotice.tsx#L9) | 請確認連線後重試。目前尚未開放資料頁面，這不表示帳號或雲端紀錄已遺失。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | RoleAccessNotice<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-735acefc96c8<br>[components/auth/RoleAccessNotice.tsx:10:229](../../components/auth/RoleAccessNotice.tsx#L10) | 重新確認權限 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | RoleAccessNotice<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## components/auth/RoleGuard.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-75c856b99446<br>[components/auth/RoleGuard.tsx:26:8](../../components/auth/RoleGuard.tsx#L26) | ${children} | **動態文字入口** · 執行時綁定入口<br>div 接收執行時文字；內容需追查所列綁定與生產端 | ProtectedRoleGuard<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-8d02d005c84d<br>[components/auth/RoleGuard.tsx:36:15](../../components/auth/RoleGuard.tsx#L36) | ${children} | **動態文字入口** · 執行時綁定入口<br>RoleGuard 接收執行時文字；內容需追查所列綁定與生產端 | RoleGuard<br>isPublicRoute |
| UI-5ea2ed764680<br>[components/auth/RoleGuard.tsx:39:31](../../components/auth/RoleGuard.tsx#L39) | ${children} | **動態文字入口** · 執行時綁定入口<br>ProtectedRoleGuard 接收執行時文字；內容需追查所列綁定與生產端 | RoleGuard<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## components/auth/RoleLoadingFallback.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-4a1f8688149b<br>[components/auth/RoleLoadingFallback.tsx:28:100](../../components/auth/RoleLoadingFallback.tsx#L28) | 已登入，正在確認使用權限… | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | RoleLoadingFallback<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## components/auth/RoleStatusBanner.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-d878dbe117b1<br>[components/auth/RoleStatusBanner.tsx:54:20](../../components/auth/RoleStatusBanner.tsx#L54) | 暫時無法確認最新權限。敏感操作與同步已暫停，請重試。 | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | activeDetail · message<br>roleRefreshState.stage === 'background_refresh_failed' |
| UI-cfff8b77b141<br>[components/auth/RoleStatusBanner.tsx:59:20](../../components/auth/RoleStatusBanner.tsx#L59) | 正在確認你的員工權限，寫入操作會暫時鎖住。 | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | activeDetail · message<br>否則 roleRefreshState.stage === 'background_refresh_failed' → showRefreshNotice |
| UI-b243ff4a574f<br>[components/auth/RoleStatusBanner.tsx:79:26](../../components/auth/RoleStatusBanner.tsx#L79) | 權限狀態已更新 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | RoleStatusBanner<br>isWarning |
| UI-63c385171f20<br>[components/auth/RoleStatusBanner.tsx:79:38](../../components/auth/RoleStatusBanner.tsx#L79) | 權限確認中 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | RoleStatusBanner<br>否則 isWarning |
| UI-feb91f7ddeba<br>[components/auth/RoleStatusBanner.tsx:82:14](../../components/auth/RoleStatusBanner.tsx#L82) | ${activeDetail.message} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | RoleStatusBanner<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-6cc6d20fe9e1<br>[components/auth/RoleStatusBanner.tsx:91:13](../../components/auth/RoleStatusBanner.tsx#L91) | 重試 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | RoleStatusBanner<br>roleRefreshState.needsRetry |

## components/auth/SessionExpiredHandler.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-fb58f70bbdd7<br>[components/auth/SessionExpiredHandler.tsx:134:13](../../components/auth/SessionExpiredHandler.tsx#L134) | 登入已過期 | **畫面文字** · 直接呈現定義<br>DialogTitle：辨識畫面、區塊或對話框主題 | SessionExpiredHandler<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ed93b73d77a3<br>[components/auth/SessionExpiredHandler.tsx:140:15](../../components/auth/SessionExpiredHandler.tsx#L140) | 您的登入狀態已過期，請重新登入以繼續使用。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SessionExpiredHandler<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f0f13473550b<br>[components/auth/SessionExpiredHandler.tsx:146:19](../../components/auth/SessionExpiredHandler.tsx#L146) | 這台裝置有 ${savedFormsCount} 份暫存表單 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SessionExpiredHandler<br>savedFormsCount &gt; 0 |
| UI-10166487b027<br>[components/auth/SessionExpiredHandler.tsx:149:19](../../components/auth/SessionExpiredHandler.tsx#L149) | 暫存尚未送到雲端。請在此裝置重新登入後，回原表單確認內容並儲存。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SessionExpiredHandler<br>savedFormsCount &gt; 0 |
| UI-65b9b7ad2ea3<br>[components/auth/SessionExpiredHandler.tsx:161:13](../../components/auth/SessionExpiredHandler.tsx#L161) | 重新登入 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | SessionExpiredHandler<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## components/auth/WelcomeScreen.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-92f92727dfd8<br>[components/auth/WelcomeScreen.tsx:24:19](../../components/auth/WelcomeScreen.tsx#L24) | Féria - 出攤筆記 | **輔助辨識** · 直接呈現定義<br>提供 img 的讀屏名稱、圖片替代文字或滑入說明 | WelcomeScreen · alt<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-6b02e16f3fbc<br>[components/auth/WelcomeScreen.tsx:30:13](../../components/auth/WelcomeScreen.tsx#L30) | Féria | **畫面文字** · 直接呈現定義<br>h1：辨識畫面、區塊或對話框主題 | WelcomeScreen<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-bca79ef01b45<br>[components/auth/WelcomeScreen.tsx:34:13](../../components/auth/WelcomeScreen.tsx#L34) | 出攤筆記 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | WelcomeScreen<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-49b88c816224<br>[components/auth/WelcomeScreen.tsx:41:19](../../components/auth/WelcomeScreen.tsx#L41) | 快速記錄市集收入 | **畫面文字** · 直接呈現定義<br>FeatureItem：呈現操作說明、資料標籤、狀態或注意事項 | WelcomeScreen · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-6452a4f5b5a4<br>[components/auth/WelcomeScreen.tsx:42:25](../../components/auth/WelcomeScreen.tsx#L42) | 忙碌現場可以先快速記錄，收攤後再補齊細節。 | **畫面文字** · 直接呈現定義<br>FeatureItem：呈現操作說明、資料標籤、狀態或注意事項 | WelcomeScreen · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e7dcb8dac69b<br>[components/auth/WelcomeScreen.tsx:46:19](../../components/auth/WelcomeScreen.tsx#L46) | 離線也能使用 | **畫面文字** · 直接呈現定義<br>FeatureItem：呈現操作說明、資料標籤、狀態或注意事項 | WelcomeScreen · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-5c4858daa268<br>[components/auth/WelcomeScreen.tsx:47:25](../../components/auth/WelcomeScreen.tsx#L47) | 本機資料會先保存在裝置中，登入後可同步到雲端。 | **畫面文字** · 直接呈現定義<br>FeatureItem：呈現操作說明、資料標籤、狀態或注意事項 | WelcomeScreen · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e54c131d8d3a<br>[components/auth/WelcomeScreen.tsx:51:19](../../components/auth/WelcomeScreen.tsx#L51) | 可邀請員工協助 | **畫面文字** · 直接呈現定義<br>FeatureItem：呈現操作說明、資料標籤、狀態或注意事項 | WelcomeScreen · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-6c768c386f0f<br>[components/auth/WelcomeScreen.tsx:52:25](../../components/auth/WelcomeScreen.tsx#L52) | 老闆可邀請員工一起記錄市集互動與成交。 | **畫面文字** · 直接呈現定義<br>FeatureItem：呈現操作說明、資料標籤、狀態或注意事項 | WelcomeScreen · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ecb4a334b678<br>[components/auth/WelcomeScreen.tsx:60:11](../../components/auth/WelcomeScreen.tsx#L60) | 開始使用 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | WelcomeScreen<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b12f5eb8ed08<br>[components/auth/WelcomeScreen.tsx:64:11](../../components/auth/WelcomeScreen.tsx#L64) | 登入或註冊後，可在不同裝置同步資料。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | WelcomeScreen<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-45bb2afaf59c<br>[components/auth/WelcomeScreen.tsx:70:15](../../components/auth/WelcomeScreen.tsx#L70) | 關於 | **畫面文字** · 直接呈現定義<br>Link：辨識可點擊操作、導覽或展開入口 | WelcomeScreen<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-4c2746caccd5<br>[components/auth/WelcomeScreen.tsx:72:19](../../components/auth/WelcomeScreen.tsx#L72) | / | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | WelcomeScreen<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f5e289db9440<br>[components/auth/WelcomeScreen.tsx:74:15](../../components/auth/WelcomeScreen.tsx#L74) | 隱私 | **畫面文字** · 直接呈現定義<br>Link：辨識可點擊操作、導覽或展開入口 | WelcomeScreen<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-516ed1010ca5<br>[components/auth/WelcomeScreen.tsx:76:19](../../components/auth/WelcomeScreen.tsx#L76) | / | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | WelcomeScreen<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-8e402aadf2dc<br>[components/auth/WelcomeScreen.tsx:78:15](../../components/auth/WelcomeScreen.tsx#L78) | 條款 | **畫面文字** · 直接呈現定義<br>Link：辨識可點擊操作、導覽或展開入口 | WelcomeScreen<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-54936fe6e058<br>[components/auth/WelcomeScreen.tsx:105:14](../../components/auth/WelcomeScreen.tsx#L105) | ${title} | **動態文字入口** · 執行時綁定入口<br>h3 接收執行時文字；內容需追查所列綁定與生產端 | FeatureItem<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-078cb638211a<br>[components/auth/WelcomeScreen.tsx:109:14](../../components/auth/WelcomeScreen.tsx#L109) | ${description} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | FeatureItem<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## components/markets/StaffMarketDetailView.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-4d0d2082eed3<br>[components/markets/StaffMarketDetailView.tsx:165:21](../../components/markets/StaffMarketDetailView.tsx#L165) | 已提前開始今日營業 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleStartEarlyOperation<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-8ef663bbbdce<br>[components/markets/StaffMarketDetailView.tsx:168:19](../../components/markets/StaffMarketDetailView.tsx#L168) | 無法提前開始營業，請稍後再試 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleStartEarlyOperation<br>catch：操作拋出例外 |
| UI-30e083e4cd34<br>[components/markets/StaffMarketDetailView.tsx:274:68](../../components/markets/StaffMarketDetailView.tsx#L274) | 今天一起把現場顧好 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | StaffMarketDetailView<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-94d14c084725<br>[components/markets/StaffMarketDetailView.tsx:275:99](../../components/markets/StaffMarketDetailView.tsx#L275) | ${market.name} | **動態文字入口** · 執行時綁定入口<br>h1 接收執行時文字；內容需追查所列綁定與生產端 | StaffMarketDetailView<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2bd60dcbd80c<br>[components/markets/StaffMarketDetailView.tsx:290:87](../../components/markets/StaffMarketDetailView.tsx#L290) | ${marketRegionLabel(market.regionCode)} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | StaffMarketDetailView<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-699596fb9531<br>[components/markets/StaffMarketDetailView.tsx:294:69](../../components/markets/StaffMarketDetailView.tsx#L294) | 交易、照片與待辦，都在熟悉的位置等你。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | StaffMarketDetailView<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c145ba7a2af4<br>[components/markets/StaffMarketDetailView.tsx:307:19](../../components/markets/StaffMarketDetailView.tsx#L307) | 編輯 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | StaffMarketDetailView<br>canEditMarketBasic |
| UI-9d76319f86b1<br>[components/markets/StaffMarketDetailView.tsx:320:21](../../components/markets/StaffMarketDetailView.tsx#L320) | 員工市集工作台 | **畫面文字** · 直接呈現定義<br>MarketWorkspaceNavigation：呈現操作說明、資料標籤、狀態或注意事項 | StaffMarketDetailView · ariaLabel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a90a6d6d459b<br>[components/markets/StaffMarketDetailView.tsx:322:34](../../components/markets/StaffMarketDetailView.tsx#L322) | 現場 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | StaffMarketDetailView · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-628223e120c9<br>[components/markets/StaffMarketDetailView.tsx:323:37](../../components/markets/StaffMarketDetailView.tsx#L323) | 紀錄 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | StaffMarketDetailView · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c4c11a97d3b1<br>[components/markets/StaffMarketDetailView.tsx:324:35](../../components/markets/StaffMarketDetailView.tsx#L324) | 任務 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | StaffMarketDetailView · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-4dfbdd369db3<br>[components/markets/StaffMarketDetailView.tsx:330:23](../../components/markets/StaffMarketDetailView.tsx#L330) | ${operatingSession.label} | **動態文字入口** · 執行時綁定入口<br>MarketWorkspaceSummary 接收執行時文字；內容需追查所列綁定與生產端 | StaffMarketDetailView · phaseLabel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-5b2e8ae46d30<br>[components/markets/StaffMarketDetailView.tsx:335:26](../../components/markets/StaffMarketDetailView.tsx#L335) | 開始 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | StaffMarketDetailView · label<br>workspaceView === 'tasks' |
| UI-c68ade16ffaf<br>[components/markets/StaffMarketDetailView.tsx:336:26](../../components/markets/StaffMarketDetailView.tsx#L336) | 結束 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | StaffMarketDetailView · label<br>workspaceView === 'tasks' |
| UI-6ee979a8ca5a<br>[components/markets/StaffMarketDetailView.tsx:337:26](../../components/markets/StaffMarketDetailView.tsx#L337) | 待補照片 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | StaffMarketDetailView · label<br>workspaceView === 'tasks' |
| UI-22d12e00ce9c<br>[components/markets/StaffMarketDetailView.tsx:340:26](../../components/markets/StaffMarketDetailView.tsx#L340) | 收入 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | StaffMarketDetailView · label<br>否則 workspaceView === 'tasks' |
| UI-cea1b490d9d1<br>[components/markets/StaffMarketDetailView.tsx:341:26](../../components/markets/StaffMarketDetailView.tsx#L341) | 成交 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | StaffMarketDetailView · label<br>否則 workspaceView === 'tasks' |
| UI-092c653f6ba7<br>[components/markets/StaffMarketDetailView.tsx:343:26](../../components/markets/StaffMarketDetailView.tsx#L343) | 待補照片 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | StaffMarketDetailView · label<br>否則 workspaceView === 'tasks' |
| UI-448081c8fed4<br>[components/markets/StaffMarketDetailView.tsx:345:23](../../components/markets/StaffMarketDetailView.tsx#L345) | ${salesPhotoEvidenceFlow.pendingCount} 筆 | **來源候選** · 候選，非已證實提示<br>StaffMarketDetailView 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | StaffMarketDetailView · value<br>否則 workspaceView === 'tasks' → salesPhotoEvidenceFlow.pendingCount &gt; 0 |
| UI-0bfe139790fc<br>[components/markets/StaffMarketDetailView.tsx:346:23](../../components/markets/StaffMarketDetailView.tsx#L346) | 照片已齊 | **來源候選** · 候選，非已證實提示<br>StaffMarketDetailView 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | StaffMarketDetailView · value<br>否則 workspaceView === 'tasks' → 否則 salesPhotoEvidenceFlow.pendingCount &gt; 0 |
| UI-9f0ca1ebb7b0<br>[components/markets/StaffMarketDetailView.tsx:350:32](../../components/markets/StaffMarketDetailView.tsx#L350) | 處理 ${salesPhotoEvidenceFlow.pendingCount} 筆待補照片 | **共用文案值** · 文案生產端，須查使用端<br>actionLabel：供畫面或訊息組裝使用的標籤／說明值 | StaffMarketDetailView · actionLabel<br>否則 workspaceView === 'tasks' |
| UI-c1c9d7d3a544<br>[components/markets/StaffMarketDetailView.tsx:370:20](../../components/markets/StaffMarketDetailView.tsx#L370) | ${operatingSession.message} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | StaffMarketDetailView<br>workspaceView === 'live' &amp;&amp; !isOperating &amp;&amp; ![ 'early-window', 'closed', ].includes(operatingSession.phase) |
| UI-cf37f1be791c<br>[components/markets/StaffMarketDetailView.tsx:394:42](../../components/markets/StaffMarketDetailView.tsx#L394) | ${addRevenueSalesPhotoEvidenceContext} | **動態文字入口** · 執行時綁定入口<br>OperatingMarketWorkbench 接收執行時文字；內容需追查所列綁定與生產端 | StaffMarketDetailView · salesPhotoEvidenceContext<br>workspaceView === 'live' &amp;&amp; isOperating |
| UI-10cd24f51da8<br>[components/markets/StaffMarketDetailView.tsx:408:23](../../components/markets/StaffMarketDetailView.tsx#L408) | 最近紀錄 | **畫面文字** · 直接呈現定義<br>DailyTransactionLog：呈現操作說明、資料標籤、狀態或注意事項 | StaffMarketDetailView · title<br>workspaceView === 'live' &amp;&amp; isOperating |
| UI-a15292aadd95<br>[components/markets/StaffMarketDetailView.tsx:432:44](../../components/markets/StaffMarketDetailView.tsx#L432) | ${addRevenueSalesPhotoEvidenceContext} | **動態文字入口** · 執行時綁定入口<br>TransactionWorkspace 接收執行時文字；內容需追查所列綁定與生產端 | StaffMarketDetailView · salesPhotoEvidenceContext<br>workspaceView === 'live' &amp;&amp; isOperating → canRecordDeal |
| UI-0872b9a1131d<br>[components/markets/StaffMarketDetailView.tsx:443:19](../../components/markets/StaffMarketDetailView.tsx#L443) | 記錄互動 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | StaffMarketDetailView<br>workspaceView === 'live' &amp;&amp; isOperating → canRecordInteraction |
| UI-2ed8bb1e0e4d<br>[components/markets/StaffMarketDetailView.tsx:464:23](../../components/markets/StaffMarketDetailView.tsx#L464) | 最近紀錄 | **畫面文字** · 直接呈現定義<br>DailyTransactionLog：呈現操作說明、資料標籤、狀態或注意事項 | StaffMarketDetailView · title<br>workspaceView === 'live' &amp;&amp; isOperating |
| UI-e8becab75e74<br>[components/markets/StaffMarketDetailView.tsx:481:19](../../components/markets/StaffMarketDetailView.tsx#L481) | 交易紀錄 | **畫面文字** · 直接呈現定義<br>DailyTransactionLog：呈現操作說明、資料標籤、狀態或注意事項 | StaffMarketDetailView · title<br>workspaceView === 'records' |
| UI-0571e7003c75<br>[components/markets/StaffMarketDetailView.tsx:502:65](../../components/markets/StaffMarketDetailView.tsx#L502) | 營業狀態 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | StaffMarketDetailView<br>workspaceView === 'tasks' |
| UI-2eb28defb096<br>[components/markets/StaffMarketDetailView.tsx:511:22](../../components/markets/StaffMarketDetailView.tsx#L511) | ${operatingStatus.label} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | StaffMarketDetailView<br>workspaceView === 'tasks' |
| UI-e1eea03a1a2c<br>[components/markets/StaffMarketDetailView.tsx:526:70](../../components/markets/StaffMarketDetailView.tsx#L526) | 提前進場 | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | StaffMarketDetailView<br>workspaceView === 'tasks' → (market.checkInTime &#124;&#124; market.operatingStartTime &#124;&#124; market.operatingEndTime &#124;&#124; (market.earlyEntryEnabled &amp;&amp; market.earlyEntryTime)) → market.earlyEntryEnabled &amp;&amp; market.earlyEntryTime |
| UI-480f7727abbf<br>[components/markets/StaffMarketDetailView.tsx:542:70](../../components/markets/StaffMarketDetailView.tsx#L542) | 報到 | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | StaffMarketDetailView<br>workspaceView === 'tasks' → (market.checkInTime &#124;&#124; market.operatingStartTime &#124;&#124; market.operatingEndTime &#124;&#124; (market.earlyEntryEnabled &amp;&amp; market.earlyEntryTime)) → market.checkInTime |
| UI-0059091e5bdd<br>[components/markets/StaffMarketDetailView.tsx:558:70](../../components/markets/StaffMarketDetailView.tsx#L558) | 營業中 | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | StaffMarketDetailView<br>workspaceView === 'tasks' → (market.checkInTime &#124;&#124; market.operatingStartTime &#124;&#124; market.operatingEndTime &#124;&#124; (market.earlyEntryEnabled &amp;&amp; market.earlyEntryTime)) → market.operatingStartTime &amp;&amp; market.operatingEndTime |
| UI-0b6a6298721c<br>[components/markets/StaffMarketDetailView.tsx:576:70](../../components/markets/StaffMarketDetailView.tsx#L576) | 營業結束 | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | StaffMarketDetailView<br>workspaceView === 'tasks' → (market.checkInTime &#124;&#124; market.operatingStartTime &#124;&#124; market.operatingEndTime &#124;&#124; (market.earlyEntryEnabled &amp;&amp; market.earlyEntryTime)) → market.operatingEndTime |
| UI-a84e5fded2ec<br>[components/markets/StaffMarketDetailView.tsx:588:17](../../components/markets/StaffMarketDetailView.tsx#L588) | 尚未設定時間資訊 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | StaffMarketDetailView<br>workspaceView === 'tasks' → 否則 (market.checkInTime &#124;&#124; market.operatingStartTime &#124;&#124; market.operatingEndTime &#124;&#124; (market.earlyEntryEnabled &amp;&amp; market.earlyEntryTime)) |
| UI-382a3326ddf2<br>[components/markets/StaffMarketDetailView.tsx:591:17](../../components/markets/StaffMarketDetailView.tsx#L591) | 請聯繫老闆設定市集時間 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | StaffMarketDetailView<br>workspaceView === 'tasks' → 否則 (market.checkInTime &#124;&#124; market.operatingStartTime &#124;&#124; market.operatingEndTime &#124;&#124; (market.earlyEntryEnabled &amp;&amp; market.earlyEntryTime)) |
| UI-2d798691c3b0<br>[components/markets/StaffMarketDetailView.tsx:616:70](../../components/markets/StaffMarketDetailView.tsx#L616) | 承租設備 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | StaffMarketDetailView<br>workspaceView === 'tasks' |
| UI-d4d6ad7f94c6<br>[components/markets/StaffMarketDetailView.tsx:624:55](../../components/markets/StaffMarketDetailView.tsx#L624) | 保證金 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | StaffMarketDetailView<br>workspaceView === 'tasks' → market.deposit &amp;&amp; market.deposit &gt; 0 |
| UI-98b5ba4c648a<br>[components/markets/StaffMarketDetailView.tsx:625:67](../../components/markets/StaffMarketDetailView.tsx#L625) | (需退款) | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | StaffMarketDetailView<br>workspaceView === 'tasks' → market.deposit &amp;&amp; market.deposit &gt; 0 |
| UI-62eceab626e6<br>[components/markets/StaffMarketDetailView.tsx:638:51](../../components/markets/StaffMarketDetailView.tsx#L638) | 桌子 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | StaffMarketDetailView<br>workspaceView === 'tasks' |
| UI-bd0639b8f188<br>[components/markets/StaffMarketDetailView.tsx:642:50](../../components/markets/StaffMarketDetailView.tsx#L642) | 免費提供 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | StaffMarketDetailView<br>workspaceView === 'tasks' → market.tableFree |
| UI-70b6baf655f7<br>[components/markets/StaffMarketDetailView.tsx:644:50](../../components/markets/StaffMarketDetailView.tsx#L644) | 已承租 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | StaffMarketDetailView<br>workspaceView === 'tasks' → 否則 market.tableFree → market.tableRental &amp;&amp; market.tableRental &gt; 0 |
| UI-6eeb62694e17<br>[components/markets/StaffMarketDetailView.tsx:646:59](../../components/markets/StaffMarketDetailView.tsx#L646) | 自備 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | StaffMarketDetailView<br>workspaceView === 'tasks' → 否則 market.tableFree → 否則 market.tableRental &amp;&amp; market.tableRental &gt; 0 |
| UI-0c210b0d9e3e<br>[components/markets/StaffMarketDetailView.tsx:655:51](../../components/markets/StaffMarketDetailView.tsx#L655) | 椅子 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | StaffMarketDetailView<br>workspaceView === 'tasks' |
| UI-c32593f2735b<br>[components/markets/StaffMarketDetailView.tsx:659:50](../../components/markets/StaffMarketDetailView.tsx#L659) | 免費提供 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | StaffMarketDetailView<br>workspaceView === 'tasks' → market.chairFree |
| UI-ac894232e2ae<br>[components/markets/StaffMarketDetailView.tsx:661:50](../../components/markets/StaffMarketDetailView.tsx#L661) | 已承租 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | StaffMarketDetailView<br>workspaceView === 'tasks' → 否則 market.chairFree → market.chairRental &amp;&amp; market.chairRental &gt; 0 |
| UI-bfbf5dbd3737<br>[components/markets/StaffMarketDetailView.tsx:663:59](../../components/markets/StaffMarketDetailView.tsx#L663) | 自備 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | StaffMarketDetailView<br>workspaceView === 'tasks' → 否則 market.chairFree → 否則 market.chairRental &amp;&amp; market.chairRental &gt; 0 |
| UI-c7a02cd915a0<br>[components/markets/StaffMarketDetailView.tsx:672:51](../../components/markets/StaffMarketDetailView.tsx#L672) | 傘架 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | StaffMarketDetailView<br>workspaceView === 'tasks' |
| UI-e001d2a28bbb<br>[components/markets/StaffMarketDetailView.tsx:676:50](../../components/markets/StaffMarketDetailView.tsx#L676) | 免費提供 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | StaffMarketDetailView<br>workspaceView === 'tasks' → market.umbrellaFree |
| UI-ea37792b505e<br>[components/markets/StaffMarketDetailView.tsx:678:50](../../components/markets/StaffMarketDetailView.tsx#L678) | 已承租 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | StaffMarketDetailView<br>workspaceView === 'tasks' → 否則 market.umbrellaFree → market.umbrellaRental &amp;&amp; market.umbrellaRental &gt; 0 |
| UI-da5840fee0ff<br>[components/markets/StaffMarketDetailView.tsx:680:59](../../components/markets/StaffMarketDetailView.tsx#L680) | 自備 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | StaffMarketDetailView<br>workspaceView === 'tasks' → 否則 market.umbrellaFree → 否則 market.umbrellaRental &amp;&amp; market.umbrellaRental &gt; 0 |
| UI-351a8e910534<br>[components/markets/StaffMarketDetailView.tsx:695:36](../../components/markets/StaffMarketDetailView.tsx#L695) | ${addRevenueSalesPhotoEvidenceContext} | **動態文字入口** · 執行時綁定入口<br>AddRevenueDialog 接收執行時文字；內容需追查所列綁定與生產端 | StaffMarketDetailView · salesPhotoEvidenceContext<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-91f62ed7e44b<br>[components/markets/StaffMarketDetailView.tsx:704:30](../../components/markets/StaffMarketDetailView.tsx#L704) | ${salesPhotoEvidenceFlow.pendingScopeMessage} | **動態文字入口** · 執行時綁定入口<br>SalesPhotoEvidenceFlowDialog 接收執行時文字；內容需追查所列綁定與生產端 | StaffMarketDetailView · pendingScopeMessage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## components/settings/AccountSyncPanel.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-91dbd33e7336<br>[components/settings/AccountSyncPanel.tsx:59:21](../../components/settings/AccountSyncPanel.tsx#L59) | 已登出 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleSignOut<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c292d2c17000<br>[components/settings/AccountSyncPanel.tsx:64:80](../../components/settings/AccountSyncPanel.tsx#L64) | 請稍後再試 | **來源候選** · 候選，非已證實提示<br>message 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | message<br>catch：操作拋出例外 → 否則 isSignOutBlockedByLocalChanges(signOutError) → 否則 signOutError instanceof Error |
| UI-72b2e2683ac4<br>[components/settings/AccountSyncPanel.tsx:65:21](../../components/settings/AccountSyncPanel.tsx#L65) | 登出失敗：${message} | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleSignOut<br>catch：操作拋出例外 → 否則 isSignOutBlockedByLocalChanges(signOutError) |
| UI-bdeba5c06d97<br>[components/settings/AccountSyncPanel.tsx:77:21](../../components/settings/AccountSyncPanel.tsx#L77) | 已登出 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | confirmForceSignOut<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e0f95307e860<br>[components/settings/AccountSyncPanel.tsx:79:78](../../components/settings/AccountSyncPanel.tsx#L79) | 請稍後再試 | **來源候選** · 候選，非已證實提示<br>message 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | message<br>catch：操作拋出例外 → 否則 signOutError instanceof Error |
| UI-fe081e95f788<br>[components/settings/AccountSyncPanel.tsx:80:19](../../components/settings/AccountSyncPanel.tsx#L80) | 登出失敗：${message} | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | confirmForceSignOut<br>catch：操作拋出例外 |
| UI-f33082bb1a68<br>[components/settings/AccountSyncPanel.tsx:98:69](../../components/settings/AccountSyncPanel.tsx#L98) | 尚未登入 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | AccountSyncPanel<br>!isConfigured &#124;&#124; !user |
| UI-da88f0e75339<br>[components/settings/AccountSyncPanel.tsx:99:73](../../components/settings/AccountSyncPanel.tsx#L99) | 登入後可在不同裝置同步市集與商品資料。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | AccountSyncPanel<br>!isConfigured &#124;&#124; !user |
| UI-0efbf649c762<br>[components/settings/AccountSyncPanel.tsx:104:13](../../components/settings/AccountSyncPanel.tsx#L104) | 登入或註冊 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | AccountSyncPanel<br>!isConfigured &#124;&#124; !user → isConfigured |
| UI-b86a32a961ab<br>[components/settings/AccountSyncPanel.tsx:119:69](../../components/settings/AccountSyncPanel.tsx#L119) | 登入帳號 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | AccountSyncPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-33c0ca9519f1<br>[components/settings/AccountSyncPanel.tsx:122:26](../../components/settings/AccountSyncPanel.tsx#L122) | 團隊身分：${userRole.staffRole ?? 'viewer'} | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | AccountSyncPanel<br>isStaff |
| UI-e32508183741<br>[components/settings/AccountSyncPanel.tsx:122:56](../../components/settings/AccountSyncPanel.tsx#L122) | viewer | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | AccountSyncPanel<br>isStaff |
| UI-6a62e40ddf20<br>[components/settings/AccountSyncPanel.tsx:122:69](../../components/settings/AccountSyncPanel.tsx#L122) | 帳號身分：老闆 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | AccountSyncPanel<br>否則 isStaff |
| UI-0e885691f88c<br>[components/settings/AccountSyncPanel.tsx:131:97](../../components/settings/AccountSyncPanel.tsx#L131) | 查看方案 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | AccountSyncPanel<br>!isStaff |
| UI-af2550a461a9<br>[components/settings/AccountSyncPanel.tsx:132:62](../../components/settings/AccountSyncPanel.tsx#L132) | ${SUBSCRIPTION_PRESENTATION.accountLabel} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | AccountSyncPanel<br>!isStaff |
| UI-313044f04fbf<br>[components/settings/AccountSyncPanel.tsx:140:92](../../components/settings/AccountSyncPanel.tsx#L140) | 紀錄同步 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | AccountSyncPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-8b3f77e352b3<br>[components/settings/AccountSyncPanel.tsx:145:14](../../components/settings/AccountSyncPanel.tsx#L145) | ${syncPresentation.label} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | AccountSyncPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0292ba96c8ce<br>[components/settings/AccountSyncPanel.tsx:151:51](../../components/settings/AccountSyncPanel.tsx#L151) | 上次完成同步 | **畫面文字** · 直接呈現定義<br>dt：呈現操作說明、資料標籤、狀態或注意事項 | AccountSyncPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a9418d2c44b5<br>[components/settings/AccountSyncPanel.tsx:152:58](../../components/settings/AccountSyncPanel.tsx#L152) | ${syncPresentation.lastSyncLabel} | **動態文字入口** · 執行時綁定入口<br>dd 接收執行時文字；內容需追查所列綁定與生產端 | AccountSyncPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e49d77e06a5f<br>[components/settings/AccountSyncPanel.tsx:155:51](../../components/settings/AccountSyncPanel.tsx#L155) | 待同步紀錄 | **畫面文字** · 直接呈現定義<br>dt：呈現操作說明、資料標籤、狀態或注意事項 | AccountSyncPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a51794d35a55<br>[components/settings/AccountSyncPanel.tsx:156:72](../../components/settings/AccountSyncPanel.tsx#L156) | ${pendingCount} 筆 | **畫面文字** · 直接呈現定義<br>dd：呈現操作說明、資料標籤、狀態或注意事項 | AccountSyncPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0a57675183ce<br>[components/settings/AccountSyncPanel.tsx:159:51](../../components/settings/AccountSyncPanel.tsx#L159) | 網路 | **畫面文字** · 直接呈現定義<br>dt：呈現操作說明、資料標籤、狀態或注意事項 | AccountSyncPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e09b0d34c50e<br>[components/settings/AccountSyncPanel.tsx:160:69](../../components/settings/AccountSyncPanel.tsx#L160) | 已連線 | **畫面文字** · 直接呈現定義<br>dd：呈現操作說明、資料標籤、狀態或注意事項 | AccountSyncPanel<br>isOnline |
| UI-c3a32538e473<br>[components/settings/AccountSyncPanel.tsx:160:77](../../components/settings/AccountSyncPanel.tsx#L160) | 離線 | **畫面文字** · 直接呈現定義<br>dd：呈現操作說明、資料標籤、狀態或注意事項 | AccountSyncPanel<br>否則 isOnline |
| UI-1cccd7d888ac<br>[components/settings/AccountSyncPanel.tsx:164:73](../../components/settings/AccountSyncPanel.tsx#L164) | ${error} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | AccountSyncPanel<br>error |
| UI-96f7100c577c<br>[components/settings/AccountSyncPanel.tsx:173:12](../../components/settings/AccountSyncPanel.tsx#L173) | ${syncPresentation.actionLabel} | **動態文字入口** · 執行時綁定入口<br>Button 接收執行時文字；內容需追查所列綁定與生產端 | AccountSyncPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-7faf1e99548c<br>[components/settings/AccountSyncPanel.tsx:175:69](../../components/settings/AccountSyncPanel.tsx#L175) | 心得與現金草稿需回原功能儲存；照片是否送達請查看照片狀態，不包含在上述待同步筆數。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | AccountSyncPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c7fb88ae7200<br>[components/settings/AccountSyncPanel.tsx:180:65](../../components/settings/AccountSyncPanel.tsx#L180) | 結束這次使用 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | AccountSyncPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a53873a56279<br>[components/settings/AccountSyncPanel.tsx:181:59](../../components/settings/AccountSyncPanel.tsx#L181) | 登出前會先檢查尚未送達雲端的資料。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | AccountSyncPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-7fcf828922b1<br>[components/settings/AccountSyncPanel.tsx:189:11](../../components/settings/AccountSyncPanel.tsx#L189) | 登出 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | AccountSyncPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-8c0b796d0f55<br>[components/settings/AccountSyncPanel.tsx:197:15](../../components/settings/AccountSyncPanel.tsx#L197) | 仍有資料尚未同步 | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | AccountSyncPanel · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-5e060ad79104<br>[components/settings/AccountSyncPanel.tsx:199:13](../../components/settings/AccountSyncPanel.tsx#L199) | 目前有 ${blockedReport.pendingEventCount} 筆事件、${blockedReport.unfinishedSyncQueueCount} 筆同步工作、${blockedReport.pendingSalesPhotoEvidenceCreationCount + blockedReport.pendingSalesPhotoEvidencePayloadCount} 筆照片資料、${blockedReport.pendingMarketJournalDraftCount ?? 0} 篇心得草稿，以及 ${blockedReport.pendingMarketCashDraftCount ?? 0} 份現金草稿尚未送達雲端。心得與現金草稿請回原功能儲存；強制登出會捨棄這些本機內容。 | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | AccountSyncPanel · description<br>blockedReport |
| UI-6f1099e0c6e5<br>[components/settings/AccountSyncPanel.tsx:201:22](../../components/settings/AccountSyncPanel.tsx#L201) | 捨棄並登出 | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | AccountSyncPanel · confirmLabel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b6ade5d5e489<br>[components/settings/AccountSyncPanel.tsx:203:26](../../components/settings/AccountSyncPanel.tsx#L203) | 登出 | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | AccountSyncPanel · confirmationText<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## components/settings/StaffManagement.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-719b0914192f<br>[components/settings/StaffManagement.tsx:53:11](../../components/settings/StaffManagement.tsx#L53) | 查看者 | **來源候選** · 候選，非已證實提示<br>ROLE_LABEL 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | ROLE_LABEL · viewer<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-3abd98c62eb8<br>[components/settings/StaffManagement.tsx:54:13](../../components/settings/StaffManagement.tsx#L54) | 出攤助手 | **來源候選** · 候選，非已證實提示<br>ROLE_LABEL 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | ROLE_LABEL · operator<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-167ddd2579b7<br>[components/settings/StaffManagement.tsx:55:12](../../components/settings/StaffManagement.tsx#L55) | 管理員 | **來源候選** · 候選，非已證實提示<br>ROLE_LABEL 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | ROLE_LABEL · manager<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-eaaa3e1edbbc<br>[components/settings/StaffManagement.tsx:59:11](../../components/settings/StaffManagement.tsx#L59) | 僅可查看必要資訊，適合一般協助查看。 | **來源候選** · 候選，非已證實提示<br>ROLE_DIALOG_COPY 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | ROLE_DIALOG_COPY · viewer<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-276646c535d1<br>[components/settings/StaffManagement.tsx:60:13](../../components/settings/StaffManagement.tsx#L60) | 適合現場協助記錄與查看較完整的市集資訊。 | **來源候選** · 候選，非已證實提示<br>ROLE_DIALOG_COPY 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | ROLE_DIALOG_COPY · operator<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ee1e5157cc7a<br>[components/settings/StaffManagement.tsx:61:12](../../components/settings/StaffManagement.tsx#L61) | 適合協助管理基本資料；敏感財務資料仍不開放。 | **來源候選** · 候選，非已證實提示<br>ROLE_DIALOG_COPY 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | ROLE_DIALOG_COPY · manager<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-66fbde504582<br>[components/settings/StaffManagement.tsx:115:19](../../components/settings/StaffManagement.tsx#L115) | 載入失敗： | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | loadStaffList<br>catch：操作拋出例外 |
| UI-f50ef162dc1e<br>[components/settings/StaffManagement.tsx:125:38](../../components/settings/StaffManagement.tsx#L125) | 訂閱模擬不會執行雲端寫入 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleInvite<br>!canCreateTeamData → simulationActive |
| UI-6e014578138e<br>[components/settings/StaffManagement.tsx:125:55](../../components/settings/StaffManagement.tsx#L125) | 邀請員工需要有效的 Team 方案 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleInvite<br>!canCreateTeamData → 否則 simulationActive |
| UI-2bd4060a48d8<br>[components/settings/StaffManagement.tsx:129:19](../../components/settings/StaffManagement.tsx#L129) | 請輸入員工的 email | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleInvite<br>!inviteEmail.trim() |
| UI-5ca6c08c48c5<br>[components/settings/StaffManagement.tsx:135:19](../../components/settings/StaffManagement.tsx#L135) | 此用戶已經是您的員工 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleInvite<br>staffList.some(s =&gt; s.email.toLowerCase() === inviteEmail.trim().toLowerCase()) |
| UI-21f0a1f5866c<br>[components/settings/StaffManagement.tsx:144:21](../../components/settings/StaffManagement.tsx#L144) | ✅ 已發送邀請給 ${inviteEmail}，等待對方接受 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleInvite<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-15ea08003b4e<br>[components/settings/StaffManagement.tsx:155:35](../../components/settings/StaffManagement.tsx#L155) | 已經 | **來源候選** · 候選，非已證實提示<br>handleInvite 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | handleInvite<br>catch：操作拋出例外 |
| UI-398e8117cd1d<br>[components/settings/StaffManagement.tsx:156:21](../../components/settings/StaffManagement.tsx#L156) | 此用戶已經是您的員工 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleInvite<br>catch：操作拋出例外 → error.message?.includes('已經') |
| UI-8510a4c103fa<br>[components/settings/StaffManagement.tsx:158:21](../../components/settings/StaffManagement.tsx#L158) | 邀請失敗： | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleInvite<br>catch：操作拋出例外 → 否則 error.message?.includes('已經') |
| UI-08e37d797712<br>[components/settings/StaffManagement.tsx:188:38](../../components/settings/StaffManagement.tsx#L188) | 訂閱模擬不會建立雲端邀請 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleCreateInvitation<br>!canCreateTeamData → simulationActive |
| UI-c75a1fa7370f<br>[components/settings/StaffManagement.tsx:188:55](../../components/settings/StaffManagement.tsx#L188) | 建立邀請連結需要有效的 Team 方案 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleCreateInvitation<br>!canCreateTeamData → 否則 simulationActive |
| UI-f5d6ef315a89<br>[components/settings/StaffManagement.tsx:194:21](../../components/settings/StaffManagement.tsx#L194) | 邀請連結已建立！ | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleCreateInvitation<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-908df1362faf<br>[components/settings/StaffManagement.tsx:195:22](../../components/settings/StaffManagement.tsx#L195) | 有效期限為 3 天 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleCreateInvitation · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-52d44538bf75<br>[components/settings/StaffManagement.tsx:200:19](../../components/settings/StaffManagement.tsx#L200) | 建立失敗 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleCreateInvitation<br>catch：操作拋出例外 |
| UI-8e4360873002<br>[components/settings/StaffManagement.tsx:212:19](../../components/settings/StaffManagement.tsx#L212) | 訂閱模擬不會刪除雲端邀請 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | confirmDeleteInvitation<br>!canRunCleanup |
| UI-e199ef101e7d<br>[components/settings/StaffManagement.tsx:218:21](../../components/settings/StaffManagement.tsx#L218) | 已刪除邀請連結 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | confirmDeleteInvitation<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b05a8a0fe857<br>[components/settings/StaffManagement.tsx:222:19](../../components/settings/StaffManagement.tsx#L222) | 刪除失敗 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | confirmDeleteInvitation<br>catch：操作拋出例外 |
| UI-e492bb73d58b<br>[components/settings/StaffManagement.tsx:233:21](../../components/settings/StaffManagement.tsx#L233) | 已複製連結！ | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleCopyLink<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-8d3e6dc108da<br>[components/settings/StaffManagement.tsx:233:46](../../components/settings/StaffManagement.tsx#L233) | 可以分享給員工了 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleCopyLink · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b2d9d55a3a31<br>[components/settings/StaffManagement.tsx:234:27](../../components/settings/StaffManagement.tsx#L234) | 目前無法複製連結，請稍後再試。 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleCopyLink<br>catch：操作拋出例外 |
| UI-d73e25e6fbdb<br>[components/settings/StaffManagement.tsx:246:19](../../components/settings/StaffManagement.tsx#L246) | 訂閱模擬不會移除雲端員工關係 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | confirmRemoveStaff<br>!canRunCleanup |
| UI-748cefcfc02c<br>[components/settings/StaffManagement.tsx:252:21](../../components/settings/StaffManagement.tsx#L252) | 已移除員工 ${confirmation.email} | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | confirmRemoveStaff<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a23269b495b8<br>[components/settings/StaffManagement.tsx:259:19](../../components/settings/StaffManagement.tsx#L259) | 移除失敗： | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | confirmRemoveStaff<br>catch：操作拋出例外 |
| UI-a35388f0087b<br>[components/settings/StaffManagement.tsx:266:38](../../components/settings/StaffManagement.tsx#L266) | 訂閱模擬不會恢復雲端權限 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | confirmRestoreStaff<br>!canCreateTeamData → simulationActive |
| UI-6199e11283e5<br>[components/settings/StaffManagement.tsx:266:55](../../components/settings/StaffManagement.tsx#L266) | 恢復員工需要有效的 Team 方案 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | confirmRestoreStaff<br>!canCreateTeamData → 否則 simulationActive |
| UI-863caedfaaa5<br>[components/settings/StaffManagement.tsx:273:21](../../components/settings/StaffManagement.tsx#L273) | 已恢復員工 ${confirmation.email} | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | confirmRestoreStaff<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-87f875cd3409<br>[components/settings/StaffManagement.tsx:277:19](../../components/settings/StaffManagement.tsx#L277) | 恢復失敗： | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | confirmRestoreStaff<br>catch：操作拋出例外 |
| UI-aed7182b4127<br>[components/settings/StaffManagement.tsx:284:38](../../components/settings/StaffManagement.tsx#L284) | 訂閱模擬不會變更雲端角色 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | openRoleDialog<br>!canChangeStaffRole → simulationActive |
| UI-54b4f9b315f6<br>[components/settings/StaffManagement.tsx:284:55](../../components/settings/StaffManagement.tsx#L284) | 修改員工角色需要有效的 Team 方案 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | openRoleDialog<br>!canChangeStaffRole → 否則 simulationActive |
| UI-3b8e19c4fc28<br>[components/settings/StaffManagement.tsx:305:38](../../components/settings/StaffManagement.tsx#L305) | 訂閱模擬不會變更雲端角色 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleUpdateRole<br>!canChangeStaffRole → simulationActive |
| UI-7249ea809f3e<br>[components/settings/StaffManagement.tsx:305:55](../../components/settings/StaffManagement.tsx#L305) | 修改員工角色需要有效的 Team 方案 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleUpdateRole<br>!canChangeStaffRole → 否則 simulationActive |
| UI-9acaa152d547<br>[components/settings/StaffManagement.tsx:310:19](../../components/settings/StaffManagement.tsx#L310) | 缺少員工關係識別碼，請重新整理後再試 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleUpdateRole<br>!editingStaff.relationship_id |
| UI-20d001521f37<br>[components/settings/StaffManagement.tsx:323:21](../../components/settings/StaffManagement.tsx#L323) | 已更新員工角色 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleUpdateRole<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-85cfe4b4af05<br>[components/settings/StaffManagement.tsx:324:22](../../components/settings/StaffManagement.tsx#L324) | ${editingStaff.email} 已設定為 ${ROLE_LABEL[selectedRole]} | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleUpdateRole · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-43cdb123bba4<br>[components/settings/StaffManagement.tsx:336:19](../../components/settings/StaffManagement.tsx#L336) | 修改角色失敗 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleUpdateRole<br>catch：操作拋出例外 |
| UI-7eacf294fb3a<br>[components/settings/StaffManagement.tsx:337:40](../../components/settings/StaffManagement.tsx#L337) | 修改角色失敗，請稍後再試 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleUpdateRole · description<br>catch：操作拋出例外 |
| UI-80b8db070bbe<br>[components/settings/StaffManagement.tsx:350:63](../../components/settings/StaffManagement.tsx#L350) | 員工管理 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | StaffManagement<br>!user |
| UI-41cee879ac1f<br>[components/settings/StaffManagement.tsx:353:9](../../components/settings/StaffManagement.tsx#L353) | 邀請員工協助管理市集，員工可以訪問您所有進行中的市集 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | StaffManagement<br>!user |
| UI-8b2c2ff7013f<br>[components/settings/StaffManagement.tsx:357:13](../../components/settings/StaffManagement.tsx#L357) | 請先登入 Supabase 帳號才能使用此功能 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | StaffManagement<br>!user |
| UI-7800add8c16b<br>[components/settings/StaffManagement.tsx:374:17](../../components/settings/StaffManagement.tsx#L374) | 依角色分工，依存取狀態啟用 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | StaffManagement<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e7758d150886<br>[components/settings/StaffManagement.tsx:376:70](../../components/settings/StaffManagement.tsx#L376) | 查看者僅供閱讀；出攤助手可做現場紀錄；管理員可協助基本管理。每位成員的目前狀態與工作範圍列在下方。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | StaffManagement<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-7244eafd16cf<br>[components/settings/StaffManagement.tsx:384:13](../../components/settings/StaffManagement.tsx#L384) | 載入中... | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | StaffManagement<br>isLoading |
| UI-268d5acc1353<br>[components/settings/StaffManagement.tsx:388:44](../../components/settings/StaffManagement.tsx#L388) | 👥 | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | StaffManagement<br>否則 isLoading → staffList.length === 0 |
| UI-320a86b9e335<br>[components/settings/StaffManagement.tsx:390:15](../../components/settings/StaffManagement.tsx#L390) | 尚未邀請任何員工 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | StaffManagement<br>否則 isLoading → staffList.length === 0 |
| UI-5ca24412a90d<br>[components/settings/StaffManagement.tsx:393:15](../../components/settings/StaffManagement.tsx#L393) | 點擊下方按鈕邀請您的第一位員工 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | StaffManagement<br>否則 isLoading → staffList.length === 0 |
| UI-17a851b2f1be<br>[components/settings/StaffManagement.tsx:413:25](../../components/settings/StaffManagement.tsx#L413) | 待接受 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | StaffManagement<br>staff.status === 'pending' |
| UI-2a41657faa23<br>[components/settings/StaffManagement.tsx:418:25](../../components/settings/StaffManagement.tsx#L418) | 方案暫停 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | StaffManagement<br>staff.status === 'suspended_by_plan' |
| UI-0e70c26bf75c<br>[components/settings/StaffManagement.tsx:423:135](../../components/settings/StaffManagement.tsx#L423) | ${teamAccessReason} | **動態文字入口** · 執行時綁定入口<br>StaffAccessSummary 接收執行時文字；內容需追查所列綁定與生產端 | StaffManagement · blockReason<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d65b8384cb63<br>[components/settings/StaffManagement.tsx:424:99](../../components/settings/StaffManagement.tsx#L424) | 邀請於 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | StaffManagement<br>staff.status === 'pending' |
| UI-44d78ca84852<br>[components/settings/StaffManagement.tsx:424:107](../../components/settings/StaffManagement.tsx#L424) | 加入於 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | StaffManagement<br>否則 staff.status === 'pending' |
| UI-90fe436a5f84<br>[components/settings/StaffManagement.tsx:436:27](../../components/settings/StaffManagement.tsx#L436) | 訂閱模擬不會恢復雲端權限 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | StaffManagement · title<br>staff.status === 'suspended_by_plan' → simulationActive |
| UI-733559caec66<br>[components/settings/StaffManagement.tsx:438:27](../../components/settings/StaffManagement.tsx#L438) | 升級 Team 後可恢復 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | StaffManagement · title<br>staff.status === 'suspended_by_plan' → 否則 simulationActive → !teamFeatureAllowed |
| UI-c01d28d2724a<br>[components/settings/StaffManagement.tsx:439:27](../../components/settings/StaffManagement.tsx#L439) | 恢復員工存取權 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | StaffManagement · title<br>staff.status === 'suspended_by_plan' → 否則 simulationActive → 否則 !teamFeatureAllowed |
| UI-366a7adba6c4<br>[components/settings/StaffManagement.tsx:440:34](../../components/settings/StaffManagement.tsx#L440) | 恢復員工存取權 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | StaffManagement · aria-label<br>staff.status === 'suspended_by_plan' |
| UI-d271b144db34<br>[components/settings/StaffManagement.tsx:451:27](../../components/settings/StaffManagement.tsx#L451) | 員工接受邀請後才能修改角色 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | StaffManagement · title<br>staff.status === 'pending' |
| UI-6dc1b777803c<br>[components/settings/StaffManagement.tsx:453:27](../../components/settings/StaffManagement.tsx#L453) | 先恢復成員存取，再修改角色 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | StaffManagement · title<br>否則 staff.status === 'pending' → staff.status !== 'active' |
| UI-4d7824f7c8fd<br>[components/settings/StaffManagement.tsx:455:27](../../components/settings/StaffManagement.tsx#L455) | 資料異常，請重新整理 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | StaffManagement · title<br>否則 staff.status === 'pending' → 否則 staff.status !== 'active' → !staff.relationship_id |
| UI-073bbe32921d<br>[components/settings/StaffManagement.tsx:457:27](../../components/settings/StaffManagement.tsx#L457) | 訂閱模擬不會變更雲端角色 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | StaffManagement · title<br>否則 staff.status === 'pending' → 否則 staff.status !== 'active' → 否則 !staff.relationship_id → simulationActive |
| UI-db799e5b841a<br>[components/settings/StaffManagement.tsx:459:27](../../components/settings/StaffManagement.tsx#L459) | 修改角色需要 Team 方案 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | StaffManagement · title<br>否則 staff.status === 'pending' → 否則 staff.status !== 'active' → 否則 !staff.relationship_id → 否則 simulationActive → !managerWorkflowAllowed |
| UI-9efac5da03c2<br>[components/settings/StaffManagement.tsx:460:27](../../components/settings/StaffManagement.tsx#L460) | 修改員工角色 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | StaffManagement · title<br>否則 staff.status === 'pending' → 否則 staff.status !== 'active' → 否則 !staff.relationship_id → 否則 simulationActive → 否則 !managerWorkflowAllowed |
| UI-d72c543ee610<br>[components/settings/StaffManagement.tsx:462:33](../../components/settings/StaffManagement.tsx#L462) | 修改 ${staff.email} 的角色 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | StaffManagement · aria-label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c61302c39955<br>[components/settings/StaffManagement.tsx:475:25](../../components/settings/StaffManagement.tsx#L475) | 訂閱模擬不會修改雲端資料 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | StaffManagement · title<br>simulationActive |
| UI-586c7502bca3<br>[components/settings/StaffManagement.tsx:476:54](../../components/settings/StaffManagement.tsx#L476) | 取消邀請 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | StaffManagement · title<br>否則 simulationActive → staff.status === 'pending' |
| UI-acf8db1a4a58<br>[components/settings/StaffManagement.tsx:476:63](../../components/settings/StaffManagement.tsx#L476) | 移除員工 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | StaffManagement · title<br>否則 simulationActive → 否則 staff.status === 'pending' |
| UI-aae3c327b60c<br>[components/settings/StaffManagement.tsx:477:33](../../components/settings/StaffManagement.tsx#L477) | ${staff.status === 'pending' ? '取消邀請' : '移除員工'} ${staff.email} | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | StaffManagement · aria-label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ae2b41509971<br>[components/settings/StaffManagement.tsx:477:65](../../components/settings/StaffManagement.tsx#L477) | 取消邀請 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | StaffManagement · aria-label<br>staff.status === 'pending' |
| UI-f3d3a3579cb0<br>[components/settings/StaffManagement.tsx:477:74](../../components/settings/StaffManagement.tsx#L477) | 移除員工 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | StaffManagement · aria-label<br>否則 staff.status === 'pending' |
| UI-cba99198fc10<br>[components/settings/StaffManagement.tsx:493:39](../../components/settings/StaffManagement.tsx#L493) | 訂閱模擬不會建立雲端邀請 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | StaffManagement · title<br>simulationActive |
| UI-e40e3c715c6d<br>[components/settings/StaffManagement.tsx:493:78](../../components/settings/StaffManagement.tsx#L493) | 需要 Team 方案 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | StaffManagement · title<br>否則 simulationActive → !teamFeatureAllowed |
| UI-0176141ab1c5<br>[components/settings/StaffManagement.tsx:493:93](../../components/settings/StaffManagement.tsx#L493) | Email 邀請 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | StaffManagement · title<br>否則 simulationActive → 否則 !teamFeatureAllowed |
| UI-90d8c09b37c9<br>[components/settings/StaffManagement.tsx:497:13](../../components/settings/StaffManagement.tsx#L497) | Email 邀請 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | StaffManagement<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a48d25b38377<br>[components/settings/StaffManagement.tsx:504:13](../../components/settings/StaffManagement.tsx#L504) | 邀請連結 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | StaffManagement<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-879467f87185<br>[components/settings/StaffManagement.tsx:514:17](../../components/settings/StaffManagement.tsx#L514) | 邀請連結管理 | **畫面文字** · 直接呈現定義<br>h3：辨識畫面、區塊或對話框主題 | StaffManagement<br>showInvitationsSection |
| UI-5c07bde3d2a2<br>[components/settings/StaffManagement.tsx:519:43](../../components/settings/StaffManagement.tsx#L519) | 訂閱模擬不會建立雲端邀請 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | StaffManagement · title<br>showInvitationsSection → simulationActive |
| UI-d39f71c13e34<br>[components/settings/StaffManagement.tsx:519:82](../../components/settings/StaffManagement.tsx#L519) | 需要 Team 方案 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | StaffManagement · title<br>showInvitationsSection → 否則 simulationActive → !teamFeatureAllowed |
| UI-6e93580fe032<br>[components/settings/StaffManagement.tsx:519:97](../../components/settings/StaffManagement.tsx#L519) | 產生新連結 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | StaffManagement · title<br>showInvitationsSection → 否則 simulationActive → 否則 !teamFeatureAllowed |
| UI-d0d63398f22a<br>[components/settings/StaffManagement.tsx:522:39](../../components/settings/StaffManagement.tsx#L522) | 建立中... | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | StaffManagement<br>showInvitationsSection → creatingInvitation |
| UI-10987e988478<br>[components/settings/StaffManagement.tsx:522:50](../../components/settings/StaffManagement.tsx#L522) | 產生新連結 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | StaffManagement<br>showInvitationsSection → 否則 creatingInvitation |
| UI-0cb79300f5df<br>[components/settings/StaffManagement.tsx:527:15](../../components/settings/StaffManagement.tsx#L527) | 產生邀請連結後，新用戶可透過連結註冊並自動加入您的團隊。每個連結有效期為 3 天，可重複使用。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | StaffManagement<br>showInvitationsSection |
| UI-b0c94f9e76dd<br>[components/settings/StaffManagement.tsx:532:17](../../components/settings/StaffManagement.tsx#L532) | 載入中... | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | StaffManagement<br>showInvitationsSection → loadingInvitations |
| UI-f421a57b0fd3<br>[components/settings/StaffManagement.tsx:538:19](../../components/settings/StaffManagement.tsx#L538) | 尚未建立邀請連結 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | StaffManagement<br>showInvitationsSection → 否則 loadingInvitations → invitations.length === 0 |
| UI-337802805a86<br>[components/settings/StaffManagement.tsx:561:33](../../components/settings/StaffManagement.tsx#L561) | 方案暫停 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | StaffManagement<br>unavailableByPlan |
| UI-9009d0637eb8<br>[components/settings/StaffManagement.tsx:565:33](../../components/settings/StaffManagement.tsx#L565) | 已過期 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | StaffManagement<br>否則 unavailableByPlan → expired |
| UI-d281758eb1d2<br>[components/settings/StaffManagement.tsx:569:33](../../components/settings/StaffManagement.tsx#L569) | 有效 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | StaffManagement<br>否則 unavailableByPlan → 否則 expired |
| UI-ae07f26fd67f<br>[components/settings/StaffManagement.tsx:575:35](../../components/settings/StaffManagement.tsx#L575) | 目前無法使用 | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | StaffManagement<br>unavailableByPlan |
| UI-5948a88b86fa<br>[components/settings/StaffManagement.tsx:576:45](../../components/settings/StaffManagement.tsx#L576) | 已過期 | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | StaffManagement<br>否則 unavailableByPlan → expired |
| UI-e0f59c609bd0<br>[components/settings/StaffManagement.tsx:576:53](../../components/settings/StaffManagement.tsx#L576) | 剩餘 ${formatRemainingTime(invitation.expires_at)} | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | StaffManagement<br>否則 unavailableByPlan → 否則 expired |
| UI-27515e2e78be<br>[components/settings/StaffManagement.tsx:592:54](../../components/settings/StaffManagement.tsx#L592) | 需要有效的 Team 方案 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | StaffManagement · title<br>unavailableByPlan |
| UI-093e50b11cd3<br>[components/settings/StaffManagement.tsx:592:72](../../components/settings/StaffManagement.tsx#L592) | 複製邀請連結 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | StaffManagement · title<br>否則 unavailableByPlan |
| UI-950e34a7c6fb<br>[components/settings/StaffManagement.tsx:596:27](../../components/settings/StaffManagement.tsx#L596) | 複製 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | StaffManagement<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-536bbcccc25e<br>[components/settings/StaffManagement.tsx:601:54](../../components/settings/StaffManagement.tsx#L601) | 需要有效的 Team 方案 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | StaffManagement · title<br>unavailableByPlan |
| UI-8165d940c836<br>[components/settings/StaffManagement.tsx:601:72](../../components/settings/StaffManagement.tsx#L601) | 顯示 QR Code | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | StaffManagement · title<br>否則 unavailableByPlan |
| UI-3c0c99524f76<br>[components/settings/StaffManagement.tsx:605:27](../../components/settings/StaffManagement.tsx#L605) | QR | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | StaffManagement<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-bba7b0397f28<br>[components/settings/StaffManagement.tsx:613:53](../../components/settings/StaffManagement.tsx#L613) | 訂閱模擬不會刪除雲端邀請 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | StaffManagement · title<br>simulationActive |
| UI-25621c6e2999<br>[components/settings/StaffManagement.tsx:613:70](../../components/settings/StaffManagement.tsx#L613) | 刪除邀請連結 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | StaffManagement · title<br>否則 simulationActive |
| UI-83037f9c529f<br>[components/settings/StaffManagement.tsx:625:31](../../components/settings/StaffManagement.tsx#L625) | 掃描 QR Code 加入團隊 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | StaffManagement<br>showQRCode === invitation.token &amp;&amp; !expired &amp;&amp; !unavailableByPlan |
| UI-de448c64df74<br>[components/settings/StaffManagement.tsx:634:31](../../components/settings/StaffManagement.tsx#L634) | 員工可使用手機掃描此 QR Code 快速註冊 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | StaffManagement<br>showQRCode === invitation.token &amp;&amp; !expired &amp;&amp; !unavailableByPlan |
| UI-1166c5f80454<br>[components/settings/StaffManagement.tsx:679:23](../../components/settings/StaffManagement.tsx#L679) | 邀請員工 | **畫面文字** · 直接呈現定義<br>Dialog.Title：辨識畫面、區塊或對話框主題 | StaffManagement<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-df1d9f2ffc85<br>[components/settings/StaffManagement.tsx:693:25](../../components/settings/StaffManagement.tsx#L693) | 員工 Email | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | StaffManagement<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-cd9fd13d22fa<br>[components/settings/StaffManagement.tsx:699:37](../../components/settings/StaffManagement.tsx#L699) | example@email.com | **輸入提示** · 直接呈現定義<br>在 input 提供輸入格式、範例或選擇提示 | StaffManagement · placeholder<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c0fbaf8406a5<br>[components/settings/StaffManagement.tsx:703:25](../../components/settings/StaffManagement.tsx#L703) | 請輸入已註冊用戶的 email | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | StaffManagement<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a2851865ab8d<br>[components/settings/StaffManagement.tsx:710:25](../../components/settings/StaffManagement.tsx#L710) | 員工權限 | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | StaffManagement<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2050e6af37e5<br>[components/settings/StaffManagement.tsx:715:81](../../components/settings/StaffManagement.tsx#L715) | 固定權限 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | StaffManagement<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e8c6039ea305<br>[components/settings/StaffManagement.tsx:718:31](../../components/settings/StaffManagement.tsx#L718) | ✅ 可以查看市集和商品 | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | StaffManagement<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ac25836d5cd7<br>[components/settings/StaffManagement.tsx:719:31](../../components/settings/StaffManagement.tsx#L719) | ✅ 可以記錄互動、成交 | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | StaffManagement<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-21ca5d99dc90<br>[components/settings/StaffManagement.tsx:720:31](../../components/settings/StaffManagement.tsx#L720) | ❌ 不能編輯商品 | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | StaffManagement<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-7f554a3ed308<br>[components/settings/StaffManagement.tsx:721:31](../../components/settings/StaffManagement.tsx#L721) | ❌ 不能編輯市集 | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | StaffManagement<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-95ea1821c3cb<br>[components/settings/StaffManagement.tsx:722:31](../../components/settings/StaffManagement.tsx#L722) | ❌ 不能新增商品、市集 | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | StaffManagement<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-731382943d63<br>[components/settings/StaffManagement.tsx:723:31](../../components/settings/StaffManagement.tsx#L723) | ❌ 不能查看成本、利潤 | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | StaffManagement<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c8e9e9b68bd2<br>[components/settings/StaffManagement.tsx:734:25](../../components/settings/StaffManagement.tsx#L734) | 取消 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | StaffManagement<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-99f052f8628c<br>[components/settings/StaffManagement.tsx:741:39](../../components/settings/StaffManagement.tsx#L741) | 邀請中... | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | StaffManagement<br>isInviting |
| UI-98d70b8f2b0e<br>[components/settings/StaffManagement.tsx:741:50](../../components/settings/StaffManagement.tsx#L741) | 確認邀請 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | StaffManagement<br>否則 isInviting |
| UI-9a4a0d7685e7<br>[components/settings/StaffManagement.tsx:783:23](../../components/settings/StaffManagement.tsx#L783) | 修改員工角色 | **畫面文字** · 直接呈現定義<br>Dialog.Title：辨識畫面、區塊或對話框主題 | StaffManagement<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-cb7f7d82ae2a<br>[components/settings/StaffManagement.tsx:806:27](../../components/settings/StaffManagement.tsx#L806) | 角色會影響員工可查看的資料範圍，儲存後會在員工下次重新整理或登入時生效。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | StaffManagement<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-be828efdb104<br>[components/settings/StaffManagement.tsx:814:25](../../components/settings/StaffManagement.tsx#L814) | 選擇角色 | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | StaffManagement<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-5c932f54e8d5<br>[components/settings/StaffManagement.tsx:817:28](../../components/settings/StaffManagement.tsx#L817) | viewer | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | StaffManagement<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-3ccf761b4e65<br>[components/settings/StaffManagement.tsx:817:38](../../components/settings/StaffManagement.tsx#L817) | operator | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | StaffManagement<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-6ae67334d497<br>[components/settings/StaffManagement.tsx:817:50](../../components/settings/StaffManagement.tsx#L817) | manager | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | StaffManagement<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-02427f78e029<br>[components/settings/StaffManagement.tsx:834:36](../../components/settings/StaffManagement.tsx#L834) | ${ROLE_LABEL[role]} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | StaffManagement<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d57008a8b08a<br>[components/settings/StaffManagement.tsx:854:25](../../components/settings/StaffManagement.tsx#L854) | 取消 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | StaffManagement<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a557d834063e<br>[components/settings/StaffManagement.tsx:866:43](../../components/settings/StaffManagement.tsx#L866) | 儲存中... | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | StaffManagement<br>isUpdatingRole |
| UI-a6fb404ed421<br>[components/settings/StaffManagement.tsx:866:54](../../components/settings/StaffManagement.tsx#L866) | 儲存角色 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | StaffManagement<br>否則 isUpdatingRole |
| UI-b0bea1daaa62<br>[components/settings/StaffManagement.tsx:881:15](../../components/settings/StaffManagement.tsx#L881) | 刪除這組邀請連結？ | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | StaffManagement · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2fe6843066cd<br>[components/settings/StaffManagement.tsx:882:21](../../components/settings/StaffManagement.tsx#L882) | 刪除後，尚未使用這組連結的人將無法再加入團隊；已加入的員工不受影響。 | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | StaffManagement · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-6898a54c9250<br>[components/settings/StaffManagement.tsx:883:22](../../components/settings/StaffManagement.tsx#L883) | 刪除連結 | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | StaffManagement · confirmLabel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ccd975e46b0e<br>[components/settings/StaffManagement.tsx:891:15](../../components/settings/StaffManagement.tsx#L891) | 移除這位員工？ | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | StaffManagement · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0618657b2d06<br>[components/settings/StaffManagement.tsx:893:13](../../components/settings/StaffManagement.tsx#L893) | 移除「${confirmation.email}」後，對方將無法再存取你的市集。 | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | StaffManagement · description<br>confirmation?.type === 'remove-staff' |
| UI-975011b30482<br>[components/settings/StaffManagement.tsx:895:22](../../components/settings/StaffManagement.tsx#L895) | 移除員工 | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | StaffManagement · confirmLabel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0ad1a2641afa<br>[components/settings/StaffManagement.tsx:903:15](../../components/settings/StaffManagement.tsx#L903) | 恢復這位員工的存取權？ | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | StaffManagement · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-bb107cfb36bf<br>[components/settings/StaffManagement.tsx:905:13](../../components/settings/StaffManagement.tsx#L905) | 恢復「${confirmation.email}」後，對方會再次取得目前進行中市集的團隊權限。 | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | StaffManagement · description<br>confirmation?.type === 'restore-staff' |
| UI-a95e454aa7fa<br>[components/settings/StaffManagement.tsx:907:22](../../components/settings/StaffManagement.tsx#L907) | 恢復員工 | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | StaffManagement · confirmLabel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-029f8b776cce<br>[components/settings/StaffManagement.tsx:918:41](../../components/settings/StaffManagement.tsx#L918) | ${access.title} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | StaffAccessSummary<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-57009263f892<br>[components/settings/StaffManagement.tsx:919:66](../../components/settings/StaffManagement.tsx#L919) | ${access.summary} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | StaffAccessSummary<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-83fa505e8fce<br>[components/settings/StaffManagement.tsx:920:24](../../components/settings/StaffManagement.tsx#L920) | 角色工作範圍 | **畫面文字** · 直接呈現定義<br>ContextHelp：呈現操作說明、資料標籤、狀態或注意事項 | StaffAccessSummary · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-4df826a81285<br>[components/settings/StaffManagement.tsx:921:57](../../components/settings/StaffManagement.tsx#L921) | 角色規則；存取啟用且場次開放時適用。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | StaffAccessSummary<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-906be2cfa312<br>[components/settings/StaffManagement.tsx:922:128](../../components/settings/StaffManagement.tsx#L922) | ${text} | **動態文字入口** · 執行時綁定入口<br>li 接收執行時文字；內容需追查所列綁定與生產端 | StaffAccessSummary<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## components/staff/OwnerInfoCard.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-376ced929f7b<br>[components/staff/OwnerInfoCard.tsx:23:56](../../components/staff/OwnerInfoCard.tsx#L23) | 為以下老闆工作 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | OwnerInfoCard<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## components/staff/RoleBadge.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-8c31dc75aa44<br>[components/staff/RoleBadge.tsx:26:12](../../components/staff/RoleBadge.tsx#L26) | 查看者 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | ROLE_META · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-517c57d35b6c<br>[components/staff/RoleBadge.tsx:30:12](../../components/staff/RoleBadge.tsx#L30) | 出攤助手 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | ROLE_META · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-dae9a4cb9610<br>[components/staff/RoleBadge.tsx:34:12](../../components/staff/RoleBadge.tsx#L34) | 管理員 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | ROLE_META · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-244a2a196088<br>[components/staff/RoleBadge.tsx:44:15](../../components/staff/RoleBadge.tsx#L44) | 未設定角色（DB 回傳為空） | **輔助辨識** · 直接呈現定義<br>提供 span 的讀屏名稱、圖片替代文字或滑入說明 | RoleBadge · title<br>!role |
| UI-dec46324ff8e<br>[components/staff/RoleBadge.tsx:46:9](../../components/staff/RoleBadge.tsx#L46) | 未設定 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | RoleBadge<br>!role |
| UI-01a376a8e25d<br>[components/staff/RoleBadge.tsx:55:14](../../components/staff/RoleBadge.tsx#L55) | 角色：${meta.label} | **輔助辨識** · 直接呈現定義<br>提供 span 的讀屏名稱、圖片替代文字或滑入說明 | RoleBadge · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-402bc1c2c703<br>[components/staff/RoleBadge.tsx:57:8](../../components/staff/RoleBadge.tsx#L57) | ${meta.label} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | RoleBadge<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## components/staff/SensitiveDataMask.tsx

未追到正式頁面引用（待核對動態接線／保留碼）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-a6bca9ba33e4<br>[components/staff/SensitiveDataMask.tsx:48:12](../../components/staff/SensitiveDataMask.tsx#L48) | ${label} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | SensitiveDataMask<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## components/staff/StaffBadge.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-c8d3d6e3d52e<br>[components/staff/StaffBadge.tsx:23:45](../../components/staff/StaffBadge.tsx#L23) | 員工模式 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | StaffBadge<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## components/staff/StaffInvitationDialog.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-704c5a79f9b1<br>[components/staff/StaffInvitationDialog.tsx:85:47](../../components/staff/StaffInvitationDialog.tsx#L85) | 未知 | **來源候選** · 候選，非已證實提示<br>checkPendingInvitation 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkPendingInvitation · owner_email<br>data &amp;&amp; data.length &gt; 0 |
| UI-723fd296e02d<br>[components/staff/StaffInvitationDialog.tsx:107:21](../../components/staff/StaffInvitationDialog.tsx#L107) | 正在接受邀請... | **確認／通知** · 直接呈現定義<br>toast.loading：提示操作結果、進度或要求使用者確認 | handleAccept<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-79b5081dba56<br>[components/staff/StaffInvitationDialog.tsx:107:40](../../components/staff/StaffInvitationDialog.tsx#L107) | accept-invitation | **確認／通知** · 直接呈現定義<br>toast.loading：提示操作結果、進度或要求使用者確認 | handleAccept · id<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-02c1dd872cc3<br>[components/staff/StaffInvitationDialog.tsx:119:21](../../components/staff/StaffInvitationDialog.tsx#L119) | 已接受邀請，正在重新載入資料... | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleAccept<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-6ef8d8b560f7<br>[components/staff/StaffInvitationDialog.tsx:119:48](../../components/staff/StaffInvitationDialog.tsx#L119) | accept-invitation | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleAccept · id<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b57d97fb310b<br>[components/staff/StaffInvitationDialog.tsx:126:19](../../components/staff/StaffInvitationDialog.tsx#L126) | 接受邀請失敗： | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleAccept<br>catch：操作拋出例外 |
| UI-af911146e031<br>[components/staff/StaffInvitationDialog.tsx:126:49](../../components/staff/StaffInvitationDialog.tsx#L126) | 未知錯誤 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleAccept<br>catch：操作拋出例外 |
| UI-c6e289eeba08<br>[components/staff/StaffInvitationDialog.tsx:126:64](../../components/staff/StaffInvitationDialog.tsx#L126) | accept-invitation | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleAccept · id<br>catch：操作拋出例外 |
| UI-ed2222f77cca<br>[components/staff/StaffInvitationDialog.tsx:138:21](../../components/staff/StaffInvitationDialog.tsx#L138) | 正在處理... | **確認／通知** · 直接呈現定義<br>toast.loading：提示操作結果、進度或要求使用者確認 | handleReject<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-57384c1dca37<br>[components/staff/StaffInvitationDialog.tsx:138:38](../../components/staff/StaffInvitationDialog.tsx#L138) | reject-invitation | **確認／通知** · 直接呈現定義<br>toast.loading：提示操作結果、進度或要求使用者確認 | handleReject · id<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-7a825fdf0299<br>[components/staff/StaffInvitationDialog.tsx:142:21](../../components/staff/StaffInvitationDialog.tsx#L142) | ✅ 已拒絕邀請 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleReject<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c97c8675bece<br>[components/staff/StaffInvitationDialog.tsx:142:38](../../components/staff/StaffInvitationDialog.tsx#L142) | reject-invitation | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleReject · id<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f829d362c768<br>[components/staff/StaffInvitationDialog.tsx:151:19](../../components/staff/StaffInvitationDialog.tsx#L151) | 拒絕邀請失敗： | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleReject<br>catch：操作拋出例外 |
| UI-95270e574433<br>[components/staff/StaffInvitationDialog.tsx:151:52](../../components/staff/StaffInvitationDialog.tsx#L151) | reject-invitation | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleReject · id<br>catch：操作拋出例外 |
| UI-ec5142d165ac<br>[components/staff/StaffInvitationDialog.tsx:199:19](../../components/staff/StaffInvitationDialog.tsx#L199) | 員工邀請 | **畫面文字** · 直接呈現定義<br>Dialog.Title：辨識畫面、區塊或對話框主題 | StaffInvitationDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-592b79f11b4f<br>[components/staff/StaffInvitationDialog.tsx:204:61](../../components/staff/StaffInvitationDialog.tsx#L204) | 邀請您成為員工 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | StaffInvitationDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-7d650e12ba78<br>[components/staff/StaffInvitationDialog.tsx:212:23](../../components/staff/StaffInvitationDialog.tsx#L212) | 您將獲得的權限 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | StaffInvitationDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-4ac12e7f5919<br>[components/staff/StaffInvitationDialog.tsx:216:25](../../components/staff/StaffInvitationDialog.tsx#L216) | ✅ 可以查看老闆的市集和商品 | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | StaffInvitationDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-6269c83901b5<br>[components/staff/StaffInvitationDialog.tsx:217:25](../../components/staff/StaffInvitationDialog.tsx#L217) | ✅ 可以記錄互動、成交 | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | StaffInvitationDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c6b0a1038e9d<br>[components/staff/StaffInvitationDialog.tsx:218:25](../../components/staff/StaffInvitationDialog.tsx#L218) | ❌ 不能編輯商品、市集 | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | StaffInvitationDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2ceff16d3362<br>[components/staff/StaffInvitationDialog.tsx:219:25](../../components/staff/StaffInvitationDialog.tsx#L219) | ❌ 不能新增商品、市集 | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | StaffInvitationDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-1e2a36bcdfc8<br>[components/staff/StaffInvitationDialog.tsx:220:25](../../components/staff/StaffInvitationDialog.tsx#L220) | ❌ 無法查看成本、利潤等敏感數據 | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | StaffInvitationDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-331dbb638aea<br>[components/staff/StaffInvitationDialog.tsx:230:25](../../components/staff/StaffInvitationDialog.tsx#L230) | ⚠️ 重要提醒 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | StaffInvitationDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c6b19ce1250d<br>[components/staff/StaffInvitationDialog.tsx:233:29](../../components/staff/StaffInvitationDialog.tsx#L233) | • | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | StaffInvitationDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-19a85f76684c<br>[components/staff/StaffInvitationDialog.tsx:233:39](../../components/staff/StaffInvitationDialog.tsx#L233) | 您的本機快取資料將被清除 | **畫面文字** · 直接呈現定義<br>strong：呈現操作說明、資料標籤、狀態或注意事項 | StaffInvitationDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a7f11a678b18<br>[components/staff/StaffInvitationDialog.tsx:234:29](../../components/staff/StaffInvitationDialog.tsx#L234) | • | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | StaffInvitationDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-75b59bab6ff4<br>[components/staff/StaffInvitationDialog.tsx:234:39](../../components/staff/StaffInvitationDialog.tsx#L234) | 您的雲端個人資料不會在此流程中刪除 | **畫面文字** · 直接呈現定義<br>strong：呈現操作說明、資料標籤、狀態或注意事項 | StaffInvitationDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2b33b45b7b1c<br>[components/staff/StaffInvitationDialog.tsx:235:29](../../components/staff/StaffInvitationDialog.tsx#L235) | • 您將無法再訪問自己原有的市集和商品 | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | StaffInvitationDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-4da7a5e47207<br>[components/staff/StaffInvitationDialog.tsx:236:29](../../components/staff/StaffInvitationDialog.tsx#L236) | • 您只能訪問老闆的市集和商品 | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | StaffInvitationDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-aae73b6b58c9<br>[components/staff/StaffInvitationDialog.tsx:237:29](../../components/staff/StaffInvitationDialog.tsx#L237) | • | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | StaffInvitationDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9783d9755ba2<br>[components/staff/StaffInvitationDialog.tsx:237:63](../../components/staff/StaffInvitationDialog.tsx#L237) | 接受後會切換為員工模式 | **畫面文字** · 直接呈現定義<br>strong：呈現操作說明、資料標籤、狀態或注意事項 | StaffInvitationDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-43e07771af7e<br>[components/staff/StaffInvitationDialog.tsx:246:21](../../components/staff/StaffInvitationDialog.tsx#L246) | 💡 建議 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | StaffInvitationDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e535d222d5ca<br>[components/staff/StaffInvitationDialog.tsx:249:25](../../components/staff/StaffInvitationDialog.tsx#L249) | • 如果您有重要數據，請先備份 | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | StaffInvitationDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-60dabf15baf2<br>[components/staff/StaffInvitationDialog.tsx:250:25](../../components/staff/StaffInvitationDialog.tsx#L250) | • 如果您想保留自己的市集，請拒絕邀請 | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | StaffInvitationDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-efb8e15c3f3c<br>[components/staff/StaffInvitationDialog.tsx:251:25](../../components/staff/StaffInvitationDialog.tsx#L251) | • 如果您只是想協助老闆，接受邀請是最佳選擇 | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | StaffInvitationDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-5982be3227f2<br>[components/staff/StaffInvitationDialog.tsx:263:21](../../components/staff/StaffInvitationDialog.tsx#L263) | 拒絕邀請 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | StaffInvitationDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-1346b534db4e<br>[components/staff/StaffInvitationDialog.tsx:271:21](../../components/staff/StaffInvitationDialog.tsx#L271) | 接受邀請 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | StaffInvitationDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-247a2a31f971<br>[components/staff/StaffInvitationDialog.tsx:277:19](../../components/staff/StaffInvitationDialog.tsx#L277) | 請仔細閱讀上述說明後再做決定 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | StaffInvitationDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-16daf33acb1b<br>[components/staff/StaffInvitationDialog.tsx:290:15](../../components/staff/StaffInvitationDialog.tsx#L290) | 接受員工邀請 | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | StaffInvitationDialog · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-edf4b74f221a<br>[components/staff/StaffInvitationDialog.tsx:291:21](../../components/staff/StaffInvitationDialog.tsx#L291) | 接受後會切換為員工模式並清除這台裝置上的本機快取；雲端個人資料不會在此流程中刪除。 | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | StaffInvitationDialog · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-90e8cf808b26<br>[components/staff/StaffInvitationDialog.tsx:292:22](../../components/staff/StaffInvitationDialog.tsx#L292) | 接受並切換 | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | StaffInvitationDialog · confirmLabel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-07ee35c2d530<br>[components/staff/StaffInvitationDialog.tsx:300:15](../../components/staff/StaffInvitationDialog.tsx#L300) | 拒絕員工邀請 | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | StaffInvitationDialog · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-159272c410ff<br>[components/staff/StaffInvitationDialog.tsx:301:21](../../components/staff/StaffInvitationDialog.tsx#L301) | 拒絕後會刪除此邀請紀錄，您會繼續使用目前身分，老闆之後仍可再次邀請。 | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | StaffInvitationDialog · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-97942f54f7aa<br>[components/staff/StaffInvitationDialog.tsx:302:22](../../components/staff/StaffInvitationDialog.tsx#L302) | 拒絕邀請 | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | StaffInvitationDialog · confirmLabel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## components/staff/StaffModeNotice.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-937ac9abb8dc<br>[components/staff/StaffModeNotice.tsx:23:64](../../components/staff/StaffModeNotice.tsx#L23) | 員工模式 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | StaffModeNotice<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-4295e4aa2543<br>[components/staff/StaffModeNotice.tsx:26:17](../../components/staff/StaffModeNotice.tsx#L26) | 你只能查看授權市集與商品。成本、利潤、員工管理與資料修復功能僅老闆可用。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | StaffModeNotice<br>compact |
| UI-2a4cf6e60d29<br>[components/staff/StaffModeNotice.tsx:27:17](../../components/staff/StaffModeNotice.tsx#L27) | 你正在以員工身分使用。畫面只會顯示老闆授權的市集與商品；成本、利潤、員工管理、分析與資料修復功能會被隱藏或限制。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | StaffModeNotice<br>否則 compact |
| UI-52cb0e3626d0<br>[components/staff/StaffModeNotice.tsx:31:15](../../components/staff/StaffModeNotice.tsx#L31) | 老闆帳號：${userRole.ownerEmail} | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | StaffModeNotice<br>userRole.ownerEmail |

## components/staff/StaffPermissionCard.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-78ba6dedaba4<br>[components/staff/StaffPermissionCard.tsx:17:31](../../components/staff/StaffPermissionCard.tsx#L17) | 查看者 | **來源候選** · 候選，非已證實提示<br>ROLE_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | ROLE_LABELS · viewer<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ae7bcf64b55c<br>[components/staff/StaffPermissionCard.tsx:17:48](../../components/staff/StaffPermissionCard.tsx#L17) | 出攤助手 | **來源候選** · 候選，非已證實提示<br>ROLE_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | ROLE_LABELS · operator<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-383c004fff97<br>[components/staff/StaffPermissionCard.tsx:17:65](../../components/staff/StaffPermissionCard.tsx#L17) | 管理員 | **來源候選** · 候選，非已證實提示<br>ROLE_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | ROLE_LABELS · manager<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2673f28060e8<br>[components/staff/StaffPermissionCard.tsx:21:99](../../components/staff/StaffPermissionCard.tsx#L21) | 目前角色與工作範圍 | **輔助辨識** · 直接呈現定義<br>提供 section 的讀屏名稱、圖片替代文字或滑入說明 | StaffPermissionCard · aria-label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-eb71c5b719ab<br>[components/staff/StaffPermissionCard.tsx:25:58](../../components/staff/StaffPermissionCard.tsx#L25) | 老闆 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | StaffPermissionCard<br>isOwner |
| UI-f9e9c85af654<br>[components/staff/StaffPermissionCard.tsx:25:102](../../components/staff/StaffPermissionCard.tsx#L25) | 角色確認中 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | StaffPermissionCard<br>否則 isOwner → 否則 staffRole |
| UI-3763620473b0<br>[components/staff/StaffPermissionCard.tsx:26:84](../../components/staff/StaffPermissionCard.tsx#L26) | 所屬老闆：${ownerEmail} | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | StaffPermissionCard<br>ownerEmail |
| UI-596147f5c25d<br>[components/staff/StaffPermissionCard.tsx:27:52](../../components/staff/StaffPermissionCard.tsx#L27) | 管理品牌工作區 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | StaffPermissionCard<br>isOwner |
| UI-7ef2041ecdab<br>[components/staff/StaffPermissionCard.tsx:28:80](../../components/staff/StaffPermissionCard.tsx#L28) | 管理市集、商品、營運紀錄與團隊。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | StaffPermissionCard<br>isOwner |
| UI-181fbfcb0475<br>[components/staff/StaffPermissionCard.tsx:29:28](../../components/staff/StaffPermissionCard.tsx#L29) | 角色工作範圍 | **畫面文字** · 直接呈現定義<br>ContextHelp：呈現操作說明、資料標籤、狀態或注意事項 | StaffPermissionCard · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-930051c89397<br>[components/staff/StaffPermissionCard.tsx:30:71](../../components/staff/StaffPermissionCard.tsx#L30) | 以下為角色規則；實際操作仍需團隊資格有效、成員存取已啟用，且場次開放。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | StaffPermissionCard<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a4fe4c1f18d2<br>[components/staff/StaffPermissionCard.tsx:32:26](../../components/staff/StaffPermissionCard.tsx#L32) | 管理品牌資料與營運紀錄 | **畫面文字** · 直接呈現定義<br>ul：呈現操作說明、資料標籤、狀態或注意事項 | StaffPermissionCard<br>isOwner |
| UI-7c1df2abe69f<br>[components/staff/StaffPermissionCard.tsx:32:41](../../components/staff/StaffPermissionCard.tsx#L32) | 查看成本、利潤與報表 | **畫面文字** · 直接呈現定義<br>ul：呈現操作說明、資料標籤、狀態或注意事項 | StaffPermissionCard<br>isOwner |
| UI-cba10cc1d1c3<br>[components/staff/StaffPermissionCard.tsx:32:55](../../components/staff/StaffPermissionCard.tsx#L32) | 依方案管理團隊 | **畫面文字** · 直接呈現定義<br>ul：呈現操作說明、資料標籤、狀態或注意事項 | StaffPermissionCard<br>isOwner |
| UI-86c3dc0bc2de<br>[components/staff/StaffPermissionCard.tsx:32:143](../../components/staff/StaffPermissionCard.tsx#L32) | ${text} | **動態文字入口** · 執行時綁定入口<br>li 接收執行時文字；內容需追查所列綁定與生產端 | StaffPermissionCard<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## hooks/useStaffPermissions.ts

未追到正式頁面引用（待核對動態接線／保留碼）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-00ac20f4018a<br>[hooks/useStaffPermissions.ts:79:25](../../hooks/useStaffPermissions.ts#L79) | 無權限 | **來源候選** · 候選，非已證實提示<br>getPermissionLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getPermissionLabel<br>!item |
| UI-60704b4aae2c<br>[hooks/useStaffPermissions.ts:82:16](../../hooks/useStaffPermissions.ts#L82) | 老闆 | **來源候選** · 候選，非已證實提示<br>getPermissionLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getPermissionLabel<br>isOwner(item) |
| UI-a3782989b3d9<br>[hooks/useStaffPermissions.ts:87:36](../../hooks/useStaffPermissions.ts#L87) | 員工（可編輯） | **來源候選** · 候選，非已證實提示<br>getPermissionLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getPermissionLabel<br>isStaff(item) → perms.can_edit |
| UI-beb4f0b21fe5<br>[hooks/useStaffPermissions.ts:88:36](../../hooks/useStaffPermissions.ts#L88) | 員工（僅查看） | **來源候選** · 候選，非已證實提示<br>getPermissionLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getPermissionLabel<br>isStaff(item) → perms.can_view |
| UI-01a352341662<br>[hooks/useStaffPermissions.ts:89:16](../../hooks/useStaffPermissions.ts#L89) | 員工 | **來源候選** · 候選，非已證實提示<br>getPermissionLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getPermissionLabel<br>isStaff(item) |
| UI-d78f48b2bfca<br>[hooks/useStaffPermissions.ts:92:14](../../hooks/useStaffPermissions.ts#L92) | 未知 | **來源候選** · 候選，非已證實提示<br>getPermissionLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getPermissionLabel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## hooks/useStaffStatusMonitor.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-7b3422db14d2<br>[hooks/useStaffStatusMonitor.ts:381:18](../../hooks/useStaffStatusMonitor.ts#L381) | 你的員工關係已被解除，系統正在清除本機資料並重新載入。 | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | handleRevoked · message<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-61ff36cb9475<br>[hooks/useStaffStatusMonitor.ts:393:19](../../hooks/useStaffStatusMonitor.ts#L393) | staff_status_reset | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | resetResult · reason<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d99014916b1c<br>[hooks/useStaffStatusMonitor.ts:403:13](../../hooks/useStaffStatusMonitor.ts#L403) | Staff access changed, but local changes have not reached Cloud yet. The app kept local data and paused cleanup. | **來源候選** · 候選，非已證實提示<br>handleRevoked 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | handleRevoked<br>resetResult.decision === 'blocked' |
| UI-eb7ca4250d9c<br>[hooks/useStaffStatusMonitor.ts:407:22](../../hooks/useStaffStatusMonitor.ts#L407) | Local pending writes must be resolved before clearing staff cache. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | handleRevoked · message<br>resetResult.decision === 'blocked' |
| UI-3eb93317818c<br>[hooks/useStaffStatusMonitor.ts:456:20](../../hooks/useStaffStatusMonitor.ts#L456) | 權限變更後的本機清理失敗，系統會嘗試重新載入以避免資料殘留。 | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | handleRevoked · message<br>catch：操作拋出例外 |
| UI-427a1e0db6df<br>[hooks/useStaffStatusMonitor.ts:486:20](../../hooks/useStaffStatusMonitor.ts#L486) | 你的角色已從 ${from} 變更為 ${to}，正在清理超出權限的本機資料。 | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | handleDowngrade · message<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-dcd386e9d221<br>[hooks/useStaffStatusMonitor.ts:502:20](../../hooks/useStaffStatusMonitor.ts#L502) | 角色變更後的本機資料清理已完成，系統會重新同步目前可見資料。 | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | handleDowngrade · message<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f46c0efc0033<br>[hooks/useStaffStatusMonitor.ts:513:20](../../hooks/useStaffStatusMonitor.ts#L513) | 角色變更後的本機資料清理失敗，請重新整理後再操作。 | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | handleDowngrade · message<br>catch：操作拋出例外 |

## hooks/useUserRole.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-2fa05070119e<br>[hooks/useUserRole.ts:276:46](../../hooks/useUserRole.ts#L276) | 未知 | **來源候選** · 候選，非已證實提示<br>role 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | role · ownerEmail<br>data &amp;&amp; data.length &gt; 0 |

## lib/auth/signout-confirmation.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-3c6e4cac93a2<br>[lib/auth/signout-confirmation.ts:18:5](../../lib/auth/signout-confirmation.ts#L18) | ${[ [ &#96;There are ${pendingCount} unsynced local event(s)&#96;, &#96;${queueCount} unfinished sync queue item(s)&#96;, &#96;${pendingPhotoEvidenceCount} pending sales photo evidence item(s)&#96;, &#96;and ${pendingPhotoPayloadCount} pending local photo payload(s).&#96;, ].join(', '), &#96;${report.pendingMarketJournalDraftCount ?? 0} 篇出攤心得草稿尚未送達雲端。請回到出攤心得儲存；一般同步不會代為送出草稿。&#96;, &#96;${report.pendingMarketCashDraftCount ?? 0} 份現金草稿尚未送達雲端，請回市集的開／收攤現金儲存；也可在帳號同步設定處理。&#96;, 'Signing out now will discard local changes that have not reached Cloud.', 'Press OK only if you want to force sign out and discard these local changes.', ].join('\n')} | **動態文字入口** · 執行時綁定入口<br>confirmDiscardLocalChangesForSignOut 接收執行時文字；內容需追查所列綁定與生產端 | confirmDiscardLocalChangesForSignOut<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0ad9c6f3b653<br>[lib/auth/signout-confirmation.ts:20:9](../../lib/auth/signout-confirmation.ts#L20) | There are ${pendingCount} unsynced local event(s) | **確認／通知** · 直接呈現定義<br>window.confirm：提示操作結果、進度或要求使用者確認 | confirmDiscardLocalChangesForSignOut<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-96d0e9cc0c49<br>[lib/auth/signout-confirmation.ts:21:9](../../lib/auth/signout-confirmation.ts#L21) | ${queueCount} unfinished sync queue item(s) | **確認／通知** · 直接呈現定義<br>window.confirm：提示操作結果、進度或要求使用者確認 | confirmDiscardLocalChangesForSignOut<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-845ac8d5bf5f<br>[lib/auth/signout-confirmation.ts:22:9](../../lib/auth/signout-confirmation.ts#L22) | ${pendingPhotoEvidenceCount} pending sales photo evidence item(s) | **確認／通知** · 直接呈現定義<br>window.confirm：提示操作結果、進度或要求使用者確認 | confirmDiscardLocalChangesForSignOut<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2079d349deb9<br>[lib/auth/signout-confirmation.ts:23:9](../../lib/auth/signout-confirmation.ts#L23) | and ${pendingPhotoPayloadCount} pending local photo payload(s). | **確認／通知** · 直接呈現定義<br>window.confirm：提示操作結果、進度或要求使用者確認 | confirmDiscardLocalChangesForSignOut<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-4a2c890a16fd<br>[lib/auth/signout-confirmation.ts:24:14](../../lib/auth/signout-confirmation.ts#L24) | , | **確認／通知** · 直接呈現定義<br>window.confirm：提示操作結果、進度或要求使用者確認 | confirmDiscardLocalChangesForSignOut<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b753b502d28b<br>[lib/auth/signout-confirmation.ts:25:7](../../lib/auth/signout-confirmation.ts#L25) | ${report.pendingMarketJournalDraftCount ?? 0} 篇出攤心得草稿尚未送達雲端。請回到出攤心得儲存；一般同步不會代為送出草稿。 | **確認／通知** · 直接呈現定義<br>window.confirm：提示操作結果、進度或要求使用者確認 | confirmDiscardLocalChangesForSignOut<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b99e9a05c39d<br>[lib/auth/signout-confirmation.ts:26:7](../../lib/auth/signout-confirmation.ts#L26) | ${report.pendingMarketCashDraftCount ?? 0} 份現金草稿尚未送達雲端，請回市集的開／收攤現金儲存；也可在帳號同步設定處理。 | **確認／通知** · 直接呈現定義<br>window.confirm：提示操作結果、進度或要求使用者確認 | confirmDiscardLocalChangesForSignOut<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d8b27598fab4<br>[lib/auth/signout-confirmation.ts:27:7](../../lib/auth/signout-confirmation.ts#L27) | Signing out now will discard local changes that have not reached Cloud. | **確認／通知** · 直接呈現定義<br>window.confirm：提示操作結果、進度或要求使用者確認 | confirmDiscardLocalChangesForSignOut<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d5cffa310bde<br>[lib/auth/signout-confirmation.ts:28:7](../../lib/auth/signout-confirmation.ts#L28) | Press OK only if you want to force sign out and discard these local changes. | **確認／通知** · 直接呈現定義<br>window.confirm：提示操作結果、進度或要求使用者確認 | confirmDiscardLocalChangesForSignOut<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## lib/db/multi-account.ts

未追到正式頁面引用（待核對動態接線／保留碼）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-123ac4a4632a<br>[lib/db/multi-account.ts:327:15](../../lib/db/multi-account.ts#L327) | 老闆模式 | **來源候選** · 候選，非已證實提示<br>getAvailableAccounts 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getAvailableAccounts<br>db.type === 'owner' |
| UI-c8af793fb32f<br>[lib/db/multi-account.ts:330:15](../../lib/db/multi-account.ts#L330) | 員工模式 (為老闆 ${db.ownerId.substring(0, 8)}... 工作) | **來源候選** · 候選，非已證實提示<br>getAvailableAccounts 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getAvailableAccounts<br>否則 db.type === 'owner' → db.type === 'staff' &amp;&amp; db.ownerId |

## lib/deployment/native-external-account-readiness.ts

未追到正式頁面引用（待核對動態接線／保留碼）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-056ca3e1fe52<br>[lib/deployment/native-external-account-readiness.ts:132:63](../../lib/deployment/native-external-account-readiness.ts#L132) | document_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>NativeExternalAccountReadinessValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseNativeExternalAccountReadiness<br>!isRecord(value) &#124;&#124; !Array.isArray(value.checks) &#124;&#124; !hasExactKeys(value, [ 'schemaVersion', 'sourceDocument', 'updatedAt', 'environment', 'activationStatus', 'evidencePolicy', 'checks', ]) |
| UI-8b38735a628c<br>[lib/deployment/native-external-account-readiness.ts:134:61](../../lib/deployment/native-external-account-readiness.ts#L134) | schema_version_unsupported | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>NativeExternalAccountReadinessValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseNativeExternalAccountReadiness<br>value.schemaVersion !== NATIVE_EXTERNAL_ACCOUNT_READINESS_SCHEMA_VERSION |
| UI-cd2b5922c55e<br>[lib/deployment/native-external-account-readiness.ts:137:61](../../lib/deployment/native-external-account-readiness.ts#L137) | source_document_mismatch | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>NativeExternalAccountReadinessValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseNativeExternalAccountReadiness<br>value.sourceDocument !== NATIVE_EXTERNAL_ACCOUNT_READINESS_SOURCE_DOCUMENT |
| UI-31fc5901270f<br>[lib/deployment/native-external-account-readiness.ts:140:61](../../lib/deployment/native-external-account-readiness.ts#L140) | updated_date_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>NativeExternalAccountReadinessValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseNativeExternalAccountReadiness<br>!isValidDateOnly(value.updatedAt) |
| UI-b9c338b34940<br>[lib/deployment/native-external-account-readiness.ts:143:61](../../lib/deployment/native-external-account-readiness.ts#L143) | environment_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>NativeExternalAccountReadinessValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseNativeExternalAccountReadiness<br>value.environment !== 'external_account_handoff' |
| UI-2584bf619f85<br>[lib/deployment/native-external-account-readiness.ts:146:61](../../lib/deployment/native-external-account-readiness.ts#L146) | activation_status_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>NativeExternalAccountReadinessValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseNativeExternalAccountReadiness<br>value.activationStatus !== 'disabled' |
| UI-e353796fca2c<br>[lib/deployment/native-external-account-readiness.ts:149:61](../../lib/deployment/native-external-account-readiness.ts#L149) | evidence_policy_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>NativeExternalAccountReadinessValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseNativeExternalAccountReadiness<br>value.evidencePolicy !== 'status_only_no_secrets' |
| UI-d9ab55bddde1<br>[lib/deployment/native-external-account-readiness.ts:152:61](../../lib/deployment/native-external-account-readiness.ts#L152) | check_count_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>NativeExternalAccountReadinessValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseNativeExternalAccountReadiness<br>value.checks.length !== NATIVE_EXTERNAL_ACCOUNT_CHECK_IDS.length |
| UI-1b2ba2a199cb<br>[lib/deployment/native-external-account-readiness.ts:158:63](../../lib/deployment/native-external-account-readiness.ts#L158) | document_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>NativeExternalAccountReadinessValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseNativeExternalAccountReadiness<br>!isRecord(candidate) &#124;&#124; !hasExactKeys(candidate, ['id', 'status']) |
| UI-0e0c040aff96<br>[lib/deployment/native-external-account-readiness.ts:161:63](../../lib/deployment/native-external-account-readiness.ts#L161) | check_id_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>NativeExternalAccountReadinessValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseNativeExternalAccountReadiness<br>!isCheckId(candidate.id) |
| UI-67d7856f008a<br>[lib/deployment/native-external-account-readiness.ts:164:63](../../lib/deployment/native-external-account-readiness.ts#L164) | check_status_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>NativeExternalAccountReadinessValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseNativeExternalAccountReadiness<br>!isCheckStatus(candidate.status) |
| UI-da6e80aebe8f<br>[lib/deployment/native-external-account-readiness.ts:167:63](../../lib/deployment/native-external-account-readiness.ts#L167) | not_applicable_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>NativeExternalAccountReadinessValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseNativeExternalAccountReadiness<br>candidate.status === 'not_applicable' &amp;&amp; !CONDITIONAL_CHECK_IDS.has(candidate.id) |
| UI-3c73588d2509<br>[lib/deployment/native-external-account-readiness.ts:170:63](../../lib/deployment/native-external-account-readiness.ts#L170) | check_duplicate | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>NativeExternalAccountReadinessValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseNativeExternalAccountReadiness<br>byId.has(candidate.id) |
| UI-bfe236a6e394<br>[lib/deployment/native-external-account-readiness.ts:177:73](../../lib/deployment/native-external-account-readiness.ts#L177) | check_id_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>NativeExternalAccountReadinessValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | checks<br>!check |

## lib/permissions/role-freshness.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-05d3278e86d8<br>[lib/permissions/role-freshness.ts:155:5](../../lib/permissions/role-freshness.ts#L155) | staff_write_field_denied | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>RoleFreshnessError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | assertAllowedUpdateFields<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9b8307a7476e<br>[lib/permissions/role-freshness.ts:156:5](../../lib/permissions/role-freshness.ts#L156) | Staff write blocked because ${args.eventType} cannot update: ${deniedFields.join(', ')}. | **錯誤來源** · 文案生產端，須查使用端<br>RoleFreshnessError：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | assertAllowedUpdateFields<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e88b536ae926<br>[lib/permissions/role-freshness.ts:156:87](../../lib/permissions/role-freshness.ts#L156) | , | **錯誤來源** · 文案生產端，須查使用端<br>RoleFreshnessError：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | assertAllowedUpdateFields<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-964dc5771713<br>[lib/permissions/role-freshness.ts:230:7](../../lib/permissions/role-freshness.ts#L230) | staff_role_capability_denied | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>RoleFreshnessError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | assertFreshStaffCapability<br>isStaffOwnerOnlyEvent |
| UI-051f30f1f8ed<br>[lib/permissions/role-freshness.ts:231:7](../../lib/permissions/role-freshness.ts#L231) | Staff write blocked because ${eventType} is owner-only. | **錯誤來源** · 文案生產端，須查使用端<br>RoleFreshnessError：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | assertFreshStaffCapability<br>isStaffOwnerOnlyEvent |
| UI-45a366f78962<br>[lib/permissions/role-freshness.ts:238:7](../../lib/permissions/role-freshness.ts#L238) | staff_role_cache_stale | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>RoleFreshnessError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | assertFreshStaffCapability<br>age &lt; 0 &#124;&#124; age &gt; maxAgeMs |
| UI-06889ec43869<br>[lib/permissions/role-freshness.ts:239:7](../../lib/permissions/role-freshness.ts#L239) | Staff write blocked because role cache is stale. | **錯誤來源** · 文案生產端，須查使用端<br>RoleFreshnessError：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | assertFreshStaffCapability<br>age &lt; 0 &#124;&#124; age &gt; maxAgeMs |
| UI-a5d167099ff0<br>[lib/permissions/role-freshness.ts:250:7](../../lib/permissions/role-freshness.ts#L250) | staff_role_capability_denied | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>RoleFreshnessError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | assertFreshStaffCapability<br>effectiveRequiredCapability &amp;&amp; !capabilities[effectiveRequiredCapability] |
| UI-921fc2d5733b<br>[lib/permissions/role-freshness.ts:251:7](../../lib/permissions/role-freshness.ts#L251) | Staff write blocked because ${String(snapshot.staffRole)} cannot ${effectiveRequiredCapability}. | **錯誤來源** · 文案生產端，須查使用端<br>RoleFreshnessError：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | assertFreshStaffCapability<br>effectiveRequiredCapability &amp;&amp; !capabilities[effectiveRequiredCapability] |

## lib/permissions/staff-access-presentation.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-3d2ebc71a989<br>[lib/permissions/staff-access-presentation.ts:6:96](../../lib/permissions/staff-access-presentation.ts#L6) | 角色尚未確認，請重新整理後再確認工作範圍。 | **來源候選** · 候選，非已證實提示<br>staffRoleWorkDetails 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | staffRoleWorkDetails<br>!capabilities &amp;&amp; role !== 'viewer' &amp;&amp; role !== 'operator' &amp;&amp; role !== 'manager' |
| UI-2ae5799a032e<br>[lib/permissions/staff-access-presentation.ts:8:20](../../lib/permissions/staff-access-presentation.ts#L8) | 查看目前可存取場次的市集與商品資訊 | **來源候選** · 候選，非已證實提示<br>details 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | details<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e74524d0bb56<br>[lib/permissions/staff-access-presentation.ts:9:69](../../lib/permissions/staff-access-presentation.ts#L9) | 營業開放時記錄成交與現場互動 | **來源候選** · 候選，非已證實提示<br>staffRoleWorkDetails 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | staffRoleWorkDetails<br>caps.canRecordDeal &#124;&#124; caps.canRecordInteraction |
| UI-7f827b665f45<br>[lib/permissions/staff-access-presentation.ts:10:49](../../lib/permissions/staff-access-presentation.ts#L10) | 勾選出攤待辦 | **來源候選** · 候選，非已證實提示<br>staffRoleWorkDetails 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | staffRoleWorkDetails<br>caps.canToggleChecklistItem |
| UI-eb9f6e776cf0<br>[lib/permissions/staff-access-presentation.ts:11:73](../../lib/permissions/staff-access-presentation.ts#L11) | 編輯既有市集／商品的開放欄位，不含名稱、地點、分類、成本或狀態 | **來源候選** · 候選，非已證實提示<br>staffRoleWorkDetails 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | staffRoleWorkDetails<br>caps.canEditMarketBasic &#124;&#124; caps.canEditProductBasic |
| UI-a433f581f984<br>[lib/permissions/staff-access-presentation.ts:12:72](../../lib/permissions/staff-access-presentation.ts#L12) | 管理現場交接筆記與出攤待辦 | **來源候選** · 候選，非已證實提示<br>staffRoleWorkDetails 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | staffRoleWorkDetails<br>caps.canCreateFieldNote &#124;&#124; caps.canManageChecklist |
| UI-cb621535d038<br>[lib/permissions/staff-access-presentation.ts:13:84](../../lib/permissions/staff-access-presentation.ts#L13) | 在允許的時段內修改或刪除自己當日建立的紀錄 | **來源候選** · 候選，非已證實提示<br>staffRoleWorkDetails 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | staffRoleWorkDetails<br>caps.canEditOwnSameDayRecord &#124;&#124; caps.canDeleteOwnSameDayRecord |
| UI-32246594485c<br>[lib/permissions/staff-access-presentation.ts:14:71](../../lib/permissions/staff-access-presentation.ts#L14) | 僅供查看，不能記錄成交、互動或變更資料 | **來源候選** · 候選，非已證實提示<br>staffRoleWorkDetails 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | staffRoleWorkDetails<br>!caps.canRecordDeal &amp;&amp; !caps.canRecordInteraction |
| UI-14bbfa98859d<br>[lib/permissions/staff-access-presentation.ts:15:47](../../lib/permissions/staff-access-presentation.ts#L15) | 成本與利潤僅由老闆查看 | **來源候選** · 候選，非已證實提示<br>staffRoleWorkDetails 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | staffRoleWorkDetails<br>!caps.canViewOwnerFinance |
| UI-8710173c6331<br>[lib/permissions/staff-access-presentation.ts:16:42](../../lib/permissions/staff-access-presentation.ts#L16) | 新增市集／商品及管理員工由老闆處理 | **來源候選** · 候選，非已證實提示<br>staffRoleWorkDetails 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | staffRoleWorkDetails<br>!caps.canManageStaff |
| UI-efbed26dc000<br>[lib/permissions/staff-access-presentation.ts:29:51](../../lib/permissions/staff-access-presentation.ts#L29) | 等待接受邀請 | **共用文案值** · 文案生產端，須查使用端<br>title：供畫面或訊息組裝使用的標籤／說明值 | staffAccessPresentation · title<br>input.status === 'pending' |
| UI-0618d8159668<br>[lib/permissions/staff-access-presentation.ts:29:70](../../lib/permissions/staff-access-presentation.ts#L29) | 接受邀請並確認團隊資格後，才會開放工作區。 | **共用文案值** · 文案生產端，須查使用端<br>summary：供畫面或訊息組裝使用的標籤／說明值 | staffAccessPresentation · summary<br>input.status === 'pending' |
| UI-99924d588dd0<br>[lib/permissions/staff-access-presentation.ts:30:61](../../lib/permissions/staff-access-presentation.ts#L30) | 存取已暫停 | **共用文案值** · 文案生產端，須查使用端<br>title：供畫面或訊息組裝使用的標籤／說明值 | staffAccessPresentation · title<br>input.status === 'suspended_by_plan' |
| UI-3c1f73f37dc4<br>[lib/permissions/staff-access-presentation.ts:30:99](../../lib/permissions/staff-access-presentation.ts#L30) | 目前方案符合；此成員仍暫停，需由老闆確認後恢復存取。 | **共用文案值** · 文案生產端，須查使用端<br>summary：供畫面或訊息組裝使用的標籤／說明值 | staffAccessPresentation · summary<br>input.status === 'suspended_by_plan' → input.teamAllowed |
| UI-238d91e42276<br>[lib/permissions/staff-access-presentation.ts:30:130](../../lib/permissions/staff-access-presentation.ts#L30) | 關係與歷史已保留，需有效的高階版資格，再由老闆恢復成員存取。 | **共用文案值** · 文案生產端，須查使用端<br>summary：供畫面或訊息組裝使用的標籤／說明值 | staffAccessPresentation · summary<br>input.status === 'suspended_by_plan' → 否則 input.teamAllowed |
| UI-da1f30d6370a<br>[lib/permissions/staff-access-presentation.ts:31:51](../../lib/permissions/staff-access-presentation.ts#L31) | 已移除存取權 | **共用文案值** · 文案生產端，須查使用端<br>title：供畫面或訊息組裝使用的標籤／說明值 | staffAccessPresentation · title<br>input.status === 'revoked' |
| UI-df1de71411ca<br>[lib/permissions/staff-access-presentation.ts:31:70](../../lib/permissions/staff-access-presentation.ts#L31) | 目前不能進入這個品牌的工作區。 | **共用文案值** · 文案生產端，須查使用端<br>summary：供畫面或訊息組裝使用的標籤／說明值 | staffAccessPresentation · summary<br>input.status === 'revoked' |
| UI-fa5f1c95b0ea<br>[lib/permissions/staff-access-presentation.ts:32:47](../../lib/permissions/staff-access-presentation.ts#L32) | 目前為模擬顯示 | **共用文案值** · 文案生產端，須查使用端<br>title：供畫面或訊息組裝使用的標籤／說明值 | staffAccessPresentation · title<br>input.simulationActive |
| UI-084198968b3e<br>[lib/permissions/staff-access-presentation.ts:32:67](../../lib/permissions/staff-access-presentation.ts#L32) | 角色僅供預覽，沒有開放實際團隊操作。 | **共用文案值** · 文案生產端，須查使用端<br>summary：供畫面或訊息組裝使用的標籤／說明值 | staffAccessPresentation · summary<br>input.simulationActive |
| UI-052172556ab8<br>[lib/permissions/staff-access-presentation.ts:34:112](../../lib/permissions/staff-access-presentation.ts#L34) | 團隊存取未開放 | **共用文案值** · 文案生產端，須查使用端<br>title：供畫面或訊息組裝使用的標籤／說明值 | staffAccessPresentation · title<br>!input.teamAllowed → input.blockReason === 'plan_required' &#124;&#124; input.blockReason === 'entitlement_inactive' |
| UI-55506d2a4d8f<br>[lib/permissions/staff-access-presentation.ts:34:132](../../lib/permissions/staff-access-presentation.ts#L34) | 需要有效的高階版資格；啟用後仍需確認成員存取狀態。 | **共用文案值** · 文案生產端，須查使用端<br>summary：供畫面或訊息組裝使用的標籤／說明值 | staffAccessPresentation · summary<br>!input.teamAllowed → input.blockReason === 'plan_required' &#124;&#124; input.blockReason === 'entitlement_inactive' |
| UI-822a09d6d057<br>[lib/permissions/staff-access-presentation.ts:35:21](../../lib/permissions/staff-access-presentation.ts#L35) | 存取資格尚未確認 | **共用文案值** · 文案生產端，須查使用端<br>title：供畫面或訊息組裝使用的標籤／說明值 | staffAccessPresentation · title<br>!input.teamAllowed |
| UI-27846ce366ee<br>[lib/permissions/staff-access-presentation.ts:35:42](../../lib/permissions/staff-access-presentation.ts#L35) | 請連線重新整理，確認完成前不能保證此成員可操作。 | **共用文案值** · 文案生產端，須查使用端<br>summary：供畫面或訊息組裝使用的標籤／說明值 | staffAccessPresentation · summary<br>!input.teamAllowed |
| UI-a04c23e1bff0<br>[lib/permissions/staff-access-presentation.ts:37:104](../../lib/permissions/staff-access-presentation.ts#L37) | 權限需要確認 | **共用文案值** · 文案生產端，須查使用端<br>title：供畫面或訊息組裝使用的標籤／說明值 | staffAccessPresentation · title<br>!input.canView &#124;&#124; !['viewer', 'operator', 'manager'].includes(input.role ?? '') |
| UI-9f0fab501099<br>[lib/permissions/staff-access-presentation.ts:37:123](../../lib/permissions/staff-access-presentation.ts#L37) | 目前無法確認可查看的工作範圍，請重新整理。 | **共用文案值** · 文案生產端，須查使用端<br>summary：供畫面或訊息組裝使用的標籤／說明值 | staffAccessPresentation · summary<br>!input.canView &#124;&#124; !['viewer', 'operator', 'manager'].includes(input.role ?? '') |
| UI-9f23b845949b<br>[lib/permissions/staff-access-presentation.ts:38:48](../../lib/permissions/staff-access-presentation.ts#L38) | 僅供查看 | **共用文案值** · 文案生產端，須查使用端<br>title：供畫面或訊息組裝使用的標籤／說明值 | staffAccessPresentation · title<br>input.role === 'viewer' |
| UI-712d1526a404<br>[lib/permissions/staff-access-presentation.ts:38:65](../../lib/permissions/staff-access-presentation.ts#L38) | 可查看開放場次與商品資訊，不能記錄或修改資料。 | **共用文案值** · 文案生產端，須查使用端<br>summary：供畫面或訊息組裝使用的標籤／說明值 | staffAccessPresentation · summary<br>input.role === 'viewer' |
| UI-c66f20118bea<br>[lib/permissions/staff-access-presentation.ts:39:50](../../lib/permissions/staff-access-presentation.ts#L39) | 現場紀錄 | **共用文案值** · 文案生產端，須查使用端<br>title：供畫面或訊息組裝使用的標籤／說明值 | staffAccessPresentation · title<br>input.role === 'operator' |
| UI-aaa187d57082<br>[lib/permissions/staff-access-presentation.ts:39:67](../../lib/permissions/staff-access-presentation.ts#L39) | 營業開放時可記錄成交、互動，並勾選待辦。 | **共用文案值** · 文案生產端，須查使用端<br>summary：供畫面或訊息組裝使用的標籤／說明值 | staffAccessPresentation · summary<br>input.role === 'operator' |
| UI-f988463160b7<br>[lib/permissions/staff-access-presentation.ts:40:19](../../lib/permissions/staff-access-presentation.ts#L40) | 現場紀錄與基本管理 | **共用文案值** · 文案生產端，須查使用端<br>title：供畫面或訊息組裝使用的標籤／說明值 | staffAccessPresentation · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d577bfe8989f<br>[lib/permissions/staff-access-presentation.ts:40:41](../../lib/permissions/staff-access-presentation.ts#L40) | 可協助現場紀錄、交接筆記、待辦及既有資料的開放欄位。 | **共用文案值** · 文案生產端，須查使用端<br>summary：供畫面或訊息組裝使用的標籤／說明值 | staffAccessPresentation · summary<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## lib/platform/auth-storage-resolver.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-414450ce6845<br>[lib/platform/auth-storage-resolver.ts:16:44](../../lib/platform/auth-storage-resolver.ts#L16) | native_auth_storage_unavailable | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>Error：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | createAuthStorageResolver<br>runtime !== 'ios' |
| UI-08ff0aad4963<br>[lib/platform/auth-storage-resolver.ts:27:26](../../lib/platform/auth-storage-resolver.ts#L27) | native_auth_storage_unavailable | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>Error：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | createAuthStorageResolver<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ea658f2993b9<br>[lib/platform/auth-storage-resolver.ts:34:52](../../lib/platform/auth-storage-resolver.ts#L34) | native_auth_storage_unavailable | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>Error：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | createAuthStorageResolver<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## lib/platform/capacitor/auth-storage-bootstrap.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-cb56ab1ee860<br>[lib/platform/capacitor/auth-storage-bootstrap.ts:17:23](../../lib/platform/capacitor/auth-storage-bootstrap.ts#L17) | native_auth_storage_unavailable | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>Error：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | loadIosStorage<br>!Capacitor.isPluginAvailable('FeriaAuthStorage') |

## lib/role-context.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-8ddbc0cfd277<br>[lib/role-context.tsx:91:8](../../lib/role-context.tsx#L91) | ${children} | **動態文字入口** · 執行時綁定入口<br>RoleContext.Provider 接收執行時文字；內容需追查所列綁定與生產端 | RoleProvider<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0319e118d9f6<br>[lib/role-context.tsx:99:21](../../lib/role-context.tsx#L99) | useRoleContext must be used within RoleProvider | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | useRoleContext<br>!context |

## lib/supabase/auth-context.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-3729c8336d79<br>[lib/supabase/auth-context.tsx:34:11](../../lib/supabase/auth-context.tsx#L34) | Local changes are not synced yet. | **來源候選** · 候選，非已證實提示<br>AuthenticatedCacheResetBlockedError 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | AuthenticatedCacheResetBlockedError<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-91ec28ad0074<br>[lib/supabase/auth-context.tsx:209:19](../../lib/supabase/auth-context.tsx#L209) | passive_signout | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | { ↵       data: { subscription }, ↵     } · reason<br>event === 'SIGNED_OUT' |
| UI-0d65f277c5c3<br>[lib/supabase/auth-context.tsx:219:15](../../lib/supabase/auth-context.tsx#L219) | The session ended, but local changes have not reached Cloud yet. Local data was kept on this device. | **來源候選** · 候選，非已證實提示<br>{ ↵       data: { subscription }, ↵     } 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | { ↵       data: { subscription }, ↵     }<br>result.decision === 'blocked' |
| UI-72e923da2003<br>[lib/supabase/auth-context.tsx:289:23](../../lib/supabase/auth-context.tsx#L289) | identity_switch | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | resetResult · reason<br>event === 'SIGNED_IN' → previousUserId &amp;&amp; newUserId &amp;&amp; previousUserId !== newUserId |
| UI-e20dab7924c0<br>[lib/supabase/auth-context.tsx:300:17](../../lib/supabase/auth-context.tsx#L300) | Account switching was paused because the previous account still has local changes that have not reached Cloud. | **來源候選** · 候選，非已證實提示<br>{ ↵       data: { subscription }, ↵     } 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | { ↵       data: { subscription }, ↵     }<br>event === 'SIGNED_IN' → previousUserId &amp;&amp; newUserId &amp;&amp; previousUserId !== newUserId → resetResult.decision === 'blocked' |
| UI-6cde9c7b791c<br>[lib/supabase/auth-context.tsx:381:15](../../lib/supabase/auth-context.tsx#L381) | passive_signout | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | resetResult · reason<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f93545693369<br>[lib/supabase/auth-context.tsx:409:50](../../lib/supabase/auth-context.tsx#L409) | force_discard | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | resetResult · reason<br>options.forceDiscardLocalChanges |
| UI-fe3db5c0871a<br>[lib/supabase/auth-context.tsx:409:68](../../lib/supabase/auth-context.tsx#L409) | manual_signout | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | resetResult · reason<br>否則 options.forceDiscardLocalChanges |
| UI-4286266448e6<br>[lib/supabase/auth-context.tsx:468:8](../../lib/supabase/auth-context.tsx#L468) | ${children} | **動態文字入口** · 執行時綁定入口<br>AuthContext.Provider 接收執行時文字；內容需追查所列綁定與生產端 | AuthProvider<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0ce90dfa31d9<br>[lib/supabase/auth-context.tsx:480:21](../../lib/supabase/auth-context.tsx#L480) | useAuth 必須在 AuthProvider 內使用 | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | useAuth<br>context === undefined |

## lib/supabase/staff-invitations.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-d5f5799f4c57<br>[lib/supabase/staff-invitations.ts:46:21](../../lib/supabase/staff-invitations.ts#L46) | 伺服器未回傳有效的邀請資料 | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | createInvitation<br>!invitation &#124;&#124; typeof invitation !== 'object' |
| UI-5b490daa1e68<br>[lib/supabase/staff-invitations.ts:61:21](../../lib/supabase/staff-invitations.ts#L61) | 未登入，無法查詢邀請列表 | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | getMyInvitations<br>!user |
| UI-bb5975d997e8<br>[lib/supabase/staff-invitations.ts:187:12](../../lib/supabase/staff-invitations.ts#L187) | 已過期 | **來源候選** · 候選，非已證實提示<br>formatRemainingTime 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | formatRemainingTime<br>diff &lt;= 0 |
| UI-ee8f162b06af<br>[lib/supabase/staff-invitations.ts:195:12](../../lib/supabase/staff-invitations.ts#L195) | ${days} 天 ${hours} 小時 | **來源候選** · 候選，非已證實提示<br>formatRemainingTime 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | formatRemainingTime<br>days &gt; 0 |
| UI-a213f67e6f94<br>[lib/supabase/staff-invitations.ts:197:12](../../lib/supabase/staff-invitations.ts#L197) | ${hours} 小時 ${minutes} 分鐘 | **來源候選** · 候選，非已證實提示<br>formatRemainingTime 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | formatRemainingTime<br>否則 days &gt; 0 → hours &gt; 0 |
| UI-230c4af6d01c<br>[lib/supabase/staff-invitations.ts:199:12](../../lib/supabase/staff-invitations.ts#L199) | ${minutes} 分鐘 | **來源候選** · 候選，非已證實提示<br>formatRemainingTime 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | formatRemainingTime<br>否則 days &gt; 0 → 否則 hours &gt; 0 |

## lib/supabase/staff.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-4bab7d83d505<br>[lib/supabase/staff.ts:36:21](../../lib/supabase/staff.ts#L36) | 伺服器未回傳有效的員工關係資料 | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | unwrapStaffRelationshipRpc<br>!row &#124;&#124; typeof row !== 'object' |
| UI-b1a711b61f10<br>[lib/supabase/staff.ts:135:29](../../lib/supabase/staff.ts#L135) | 未知 | **來源候選** · 候選，非已證實提示<br>getMyStaffMembers 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getMyStaffMembers · email<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9793f0a7f9c1<br>[lib/supabase/staff.ts:201:23](../../lib/supabase/staff.ts#L201) | 此用戶已經是你的員工 | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | inviteStaff<br>error → error.code === '23505' &#124;&#124; error.message?.includes('already') |
| UI-e4f1ef892f33<br>[lib/supabase/staff.ts:204:23](../../lib/supabase/staff.ts#L204) | 找不到此用戶，請確認 Email 是否正確 | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | inviteStaff<br>error → error.code === 'P0002' |
| UI-93c41a073ef7<br>[lib/supabase/staff.ts:421:22](../../lib/supabase/staff.ts#L421) | 修改角色失敗，請稍後再試 | **來源候選** · 候選，非已證實提示<br>mapStaffRoleUpdateError 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | mapStaffRoleUpdateError<br>!error |
| UI-32c9c37496af<br>[lib/supabase/staff.ts:425:14](../../lib/supabase/staff.ts#L425) | 角色類型無效，請重新整理後再試 | **來源候選** · 候選，非已證實提示<br>mapStaffRoleUpdateError 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | mapStaffRoleUpdateError<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-de955262ecb3<br>[lib/supabase/staff.ts:427:14](../../lib/supabase/staff.ts#L427) | 無法修改此員工的角色 | **來源候選** · 候選，非已證實提示<br>mapStaffRoleUpdateError 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | mapStaffRoleUpdateError<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-788648950d31<br>[lib/supabase/staff.ts:429:14](../../lib/supabase/staff.ts#L429) | 此員工關係已不存在，請重新整理 | **來源候選** · 候選，非已證實提示<br>mapStaffRoleUpdateError 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | mapStaffRoleUpdateError<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9beeda558610<br>[lib/supabase/staff.ts:431:14](../../lib/supabase/staff.ts#L431) | 僅可修改已接受邀請的員工角色 | **來源候選** · 候選，非已證實提示<br>mapStaffRoleUpdateError 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | mapStaffRoleUpdateError<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-cf3b18a5caa6<br>[lib/supabase/staff.ts:433:14](../../lib/supabase/staff.ts#L433) | 修改角色失敗，請稍後再試 | **來源候選** · 候選，非已證實提示<br>mapStaffRoleUpdateError 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | mapStaffRoleUpdateError<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-486201c7aa45<br>[lib/supabase/staff.ts:459:21](../../lib/supabase/staff.ts#L459) | 缺少員工關係識別碼，請重新整理後再試 | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | updateStaffRole<br>!relationshipId |

## lib/sync/staff-event-preflight.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-450715d1c7cc<br>[lib/sync/staff-event-preflight.ts:62:45](../../lib/sync/staff-event-preflight.ts#L62) | missing_market_id | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | preflightStaffEventImport · reason<br>MARKET_SCOPED_EVENT_TYPES.has(String(event.type)) → !marketId |
| UI-f5fec913a7f7<br>[lib/sync/staff-event-preflight.ts:66:45](../../lib/sync/staff-event-preflight.ts#L66) | market_not_available | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | preflightStaffEventImport · reason<br>MARKET_SCOPED_EVENT_TYPES.has(String(event.type)) → !await context.hasMarket(marketId) |
| UI-61265bd757d1<br>[lib/sync/staff-event-preflight.ts:73:45](../../lib/sync/staff-event-preflight.ts#L73) | missing_product_id | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | preflightStaffEventImport · reason<br>PRODUCT_SCOPED_EVENT_TYPES.has(String(event.type)) → !productId |
| UI-69579eeed1c0<br>[lib/sync/staff-event-preflight.ts:77:45](../../lib/sync/staff-event-preflight.ts#L77) | product_not_available | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | preflightStaffEventImport · reason<br>PRODUCT_SCOPED_EVENT_TYPES.has(String(event.type)) → !await context.hasProduct(productId) |

## lib/sync/staff-pull-service.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-2fd056e79739<br>[lib/sync/staff-pull-service.ts:23:24](../../lib/sync/staff-pull-service.ts#L23) | 拉取市集數據... | **來源候選** · 候選，非已證實提示<br>pullEventsFromViews 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | pullEventsFromViews<br>onProgress |
| UI-8acf554a06cd<br>[lib/sync/staff-pull-service.ts:38:24](../../lib/sync/staff-pull-service.ts#L38) | 拉取商品數據... | **來源候選** · 候選，非已證實提示<br>pullEventsFromViews 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | pullEventsFromViews<br>onProgress |
| UI-e9185033be13<br>[lib/sync/staff-pull-service.ts:53:24](../../lib/sync/staff-pull-service.ts#L53) | 拉取事件數據... | **來源候選** · 候選，非已證實提示<br>pullEventsFromViews 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | pullEventsFromViews<br>onProgress |
| UI-bdbac791e610<br>[lib/sync/staff-pull-service.ts:69:24](../../lib/sync/staff-pull-service.ts#L69) | 同步到本地數據庫... | **來源候選** · 候選，非已證實提示<br>pullEventsFromViews 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | pullEventsFromViews<br>onProgress |
| UI-c0fa8636dbe0<br>[lib/sync/staff-pull-service.ts:92:24](../../lib/sync/staff-pull-service.ts#L92) | 完成同步... | **來源候選** · 候選，非已證實提示<br>pullEventsFromViews 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | pullEventsFromViews<br>onProgress |

## lib/sync/sync-permission-pause-service.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-956db5cfe712<br>[lib/sync/sync-permission-pause-service.ts:30:13](../../lib/sync/sync-permission-pause-service.ts#L30) | 403_forbidden_or_policy_violation | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | sanitizePermissionErrorLog · reason<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-61d1fc13eca2<br>[lib/sync/sync-permission-pause-service.ts:88:13](../../lib/sync/sync-permission-pause-service.ts#L88) | 403_forbidden_or_policy_violation | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | permissionErrorLog · reason<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
