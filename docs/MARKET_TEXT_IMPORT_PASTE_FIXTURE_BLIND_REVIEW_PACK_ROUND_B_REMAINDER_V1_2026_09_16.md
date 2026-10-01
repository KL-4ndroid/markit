# 市集文字匯入 Paste Fixture Blind Review Pack Round B Remainder v1

- 日期：2026-09-16
- 狀態：Reviewer C 未封存之 5 筆補審包
- 內容：只含 5 個去識別化 `inputText`；不含任何第一位答案或 Reviewer C 結果
- 允許規範：`docs/MARKET_TEXT_IMPORT_BLIND_REVIEWER_GUIDE_ROUND_B_V1_2026_09_15.md`
- 產品實作狀態：未核准、未開始

## 1. 隔離規則

1. 只能讀取本補審包與 Blind Reviewer Guide。
2. 禁止查看完整 Round B answer key、Reviewer C 部分結果、Annotation Pass 1、Discovery Record、Corpus Curation、Round A 文件、Gmail、git diff／status或其他 agent 訊息。
3. 只依各筆 `referenceDate` 與 `inputText` 判斷。
4. 每筆完整標記 privacy、event disposition、draft readiness、events、ignoreSpans、warnings 與 notes。
5. 結果必須另存新檔，不得修改 Reviewer C 檔案。

## 2. 補審輸入

### MTI-REP-0078-P01

- `referenceDate`: `2021-02-22`

```text
四葉市集三月場候補錄取通知
3/27：大帳篷
3/28：小攤車
現場繳費，不提供匯款資料。
請於2/26 24:00前填寫入選回饋表，逾期視同放棄。
```

### MTI-REP-0079-P01

- `referenceDate`: `2021-01-21`

```text
DOTEL SPACE 春漾市集～一起來野餐吧！
日期：2021/03/20（六）
時間：12:00～20:00
地點：新北市板橋區三民路一段156號（室內舉辦）
報名期間：即日起至2021/01/27 24:00止
報名連結：[REGISTRATION_URL]
```

### MTI-REP-0080-P01

- `referenceDate`: `2021-01-14`

```text
2021台中燈會市集牛湳販
已選參加日期：2021/02/24、02/25、02/26、02/27、02/28
攤位型態：一般桌子
攤位費用包含：帳篷、一桌兩椅、供電（僅限LED照明使用）
額外電力：不使用
```

### MTI-REP-0080-P02

- `referenceDate`: `2021-01-14`

```text
2021台中燈會市集牛湳販
報名期間：2021/01/13～2021/01/17
錄取公告：2021/01/19
匯款期間：2021/01/19～2021/01/21
攤位地圖公告：2021/02/17

已選參加日期：2021/02/24～2021/02/28
攤位型態：一般桌子
設備包含：帳篷、一桌兩椅、LED照明用電
```

### MTI-REP-0080-P03

- `referenceDate`: `2021-01-14`

```text
已收到「2021台中燈會市集牛湳販」報名表。

報名期間：2021/01/13～2021/01/17
錄取公告：2021/01/19
匯款期間：2021/01/19～2021/01/21
攤位地圖：2021/02/17

私人姓名：[PRIVATE_PERSON]
Email：[EMAIL]
生日：[PRIVATE_DATE]
性別：[PRIVATE_ANSWER]

報名日期：2021/02/24、02/25、02/26、02/27、02/28
設備：帳篷、一桌兩椅、LED照明用電
額外電力：不使用
攤位型態：一般桌子
```

## 3. 完成條件

- 5 個 fixture 均有完整結構化答案與 evidence。
- 5 個 ID 唯一且與清單一致。
- 隱私檢查、Markdown fences 與敏感資料模式檢查完成。
- 明確聲明未查看 Reviewer C 或其他禁讀資料。
