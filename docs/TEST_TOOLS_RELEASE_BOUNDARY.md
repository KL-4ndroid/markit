# 測試救援工具與正式版本界線

2026-10-22，對應 BW-09。此設定只控制測試救援頁與測試資料工具，不控制訂閱模擬、debug 或資料同步權限。

## 建置設定

| 設定 | 本機開發 | Web／手機正式建置 |
| --- | --- | --- |
| 未設定 FERIA_RELEASE_CHANNEL | 保留工具 | 關閉工具 |
| FERIA_RELEASE_CHANNEL=test | 保留工具 | 保留工具，僅可作測試版本 |
| FERIA_RELEASE_CHANNEL=production | 關閉工具 | 關閉工具 |
| 其他明確值 | 關閉工具 | 關閉工具 |

版本性質與部署平台的 Production／Preview 無關；目前部署於正式網域的測試版如需保留工具，必須明確設定 `test` 並重新建置。
設定在建置時確定，修改後必須重新啟動開發服務或重新建置部署。`NEXT_PUBLIC_TEST_TOOLS_ENABLED` 由建置設定產生，不能用來繞過版本判定。
正式發布前應明確設為 `production`，不可沿用測試版本產物。

## 實際限制

- 正式版「更多」不顯示測試資料工具。測試版仍沿用老闆限定，員工不取得工具入口。
- `/recovery`、`/settings/data` 的伺服器 layout 在正式版中止顯示；Web proxy 在回應開始前直接回傳 HTTP 404，含子路徑，且不快取。
- 手機靜態主機沒有 proxy。`build:mobile` 在匯出後，僅移除已解析並確認位於 `out/` 內的兩個測試路由目錄，再建立靜態片段別名；遇到符號連結會中止。
- `verify:mobile` 拒絕包含這兩個目錄的產物；`smoke:mobile` 確認網址回應 404。因此明確開啟工具的手機測試版本不能通過正式產物驗證。
- 一般市集／商品的載入錯誤改為重新載入或「取得協助」，不再留下失效的救援連結。

關閉測試工具不刪除使用者資料，不改動同步／復原底層或既有雲端權限。打包資產仍可能包含共用或未啟用的程式片段；本界線不宣稱所有救援字串已從程式庫消失。

## 驗證

`tests/test-tools-release-boundary.test.ts` 驗證版本判定、layout 中止、proxy 狀態與靜態目錄排除；`tests/settings-navigation.test.ts` 驗證正式／測試老闆與員工入口。
此外需執行 Web 建置並實際請求兩個網址，以及 `build:mobile`、`verify:mobile`、`smoke:mobile`，不可僅依測試名稱判定上線成功。
