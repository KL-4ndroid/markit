export type HoldoutPasteScenario = 'focused_block' | 'focused_with_context' | 'full_message_stress';

export interface MarketTextImportHoldoutInput {
  fixtureId: string;
  sourceFamily: 'H1' | 'H2' | 'H3' | 'H4' | 'H5';
  pasteScenario: HoldoutPasteScenario;
  referenceDate: string;
  inputText: string;
}

// Gate 8 holdout inputs were opened once after the Gate 7 candidate was frozen.
// Only the minimum structure needed for evaluation is retained. Personal names,
// contact details, account data, private links, and private answers are omitted.
export const MARKET_TEXT_IMPORT_HOLDOUT_INPUTS: readonly MarketTextImportHoldoutInput[] = [
  {
    fixtureId: 'MTI-HO-001', sourceFamily: 'H1', pasteScenario: 'focused_with_context', referenceDate: '2026-08-11',
    inputText: `【彩虹市集・臺北場】友好品牌出攤邀請
地點：國父紀念館－中軸廣場
活動時間：10/24(六)～10/25(日) 14:00～20:00
報名截止日：9/30(三)或額滿為止
場地禁止各種火源；可自備發電機。`,
  },
  {
    fixtureId: 'MTI-HO-002', sourceFamily: 'H2', pasteScenario: 'focused_with_context', referenceDate: '2026-01-19',
    inputText: `｜市集資訊｜
【迷路森林－迷路動物園】
舉辦地點：松山文創園區三號倉庫
日期：2026.8.22(六) 13:00-19:00、2026.8.23(日) 11:00-18:00
報名資訊：1/19開始，3/15一般招商截止。`,
  },
  {
    fixtureId: 'MTI-HO-003', sourceFamily: 'H3', pasteScenario: 'full_message_stress', referenceDate: '2025-12-26',
    inputText: `散步遊者市集｜大義動物園 OUTDOOR 野餐派對｜入選通知
地點｜高雄駁二藝術特區大義倉庫群
日期｜2026/02/27(五)-03/01(日)
時間｜14:00-21:00
錄取日期為2026/02/27-03/01三日
設備｜錄取攤位為露天大攤，1,500元／日，攤位無附設備。
加租：傘組500元／組；120x60cm摺疊桌300元／張；180x60cm摺疊桌400元／張；塑膠椅50元／張。
本次選擇傘1把、180x60cm桌1張、椅1張，發電機無申請。
應匯款金額5,450元。
報到時間：活動開始前一小時。`,
  },
  {
    fixtureId: 'MTI-HO-004', sourceFamily: 'H3', pasteScenario: 'full_message_stress', referenceDate: '2025-07-23',
    inputText: `散步遊者市集｜靜默的一曲｜入選通知
地點｜高雄市立美術館館前廣場＋林蔭區
日期｜2025/09/20(六)-09/21(日)
時間｜14:00-19:00
錄取攤位為散步木架，900元／日（含木架，不含椅）。
所附設備：遮陽傘1張。
加租：傘組400元／組；摺疊桌250元或300元／張；PE椅50元／2張。
本次選擇傘1張、PE椅2張，未申請發電機；應匯款金額2,250元。
報到時間：活動開始前一小時。`,
  },
  {
    fixtureId: 'MTI-HO-005', sourceFamily: 'H1', pasteScenario: 'focused_block', referenceDate: '2025-02-11',
    inputText: `台南彩虹遊行 × 彩虹市集
活動日期：2025/3/15（六）13:00-20:30
活動地點：河樂廣場 × 環河街
攤位費用：一般攤商陽傘攤1,500元、半帳攤1,500元、全帳攤3,500元；NGO半帳1,500元、全帳3,000元；餐車1,000元。
報名截止日期：2025/2/24。`,
  },
  {
    fixtureId: 'MTI-HO-006', sourceFamily: 'H1', pasteScenario: 'focused_block', referenceDate: '2024-08-07',
    inputText: `第三屆基好生活節・彩虹市集攤商招募
活動日期：11/9-11/10
活動地點：台中文化資產園區`,
  },
  {
    fixtureId: 'MTI-HO-007', sourceFamily: 'H1', pasteScenario: 'focused_block', referenceDate: '2024-07-04',
    inputText: `基好事吉・台南場
市集時間：08/10（六）-08/11（日）14:00-20:00
市集地點：西門新天地`,
  },
  {
    fixtureId: 'MTI-HO-008', sourceFamily: 'H3', pasteScenario: 'focused_with_context', referenceDate: '2024-03-23',
    inputText: `散步遊者市集南下行李包車意願登記
本次南下高雄辦理高美館市集，開放外縣市品牌登記行李包車。
登記截止日期為3/27（三）；名額足夠才會開團。`,
  },
  {
    fixtureId: 'MTI-HO-009', sourceFamily: 'H2', pasteScenario: 'focused_with_context', referenceDate: '2024-03-12',
    inputText: `【迷路森林－迷路冰菓室】開始招商
地點：松山文創園區五號倉庫
日期：7/13(六) 13:00-19:00、7/14(日) 11:00-18:00
3/19超早鳥截止；4/19一般招商截止。`,
  },
  {
    fixtureId: 'MTI-HO-010', sourceFamily: 'H1', pasteScenario: 'focused_block', referenceDate: '2024-02-18',
    inputText: `基好事吉・南紡購物中心場次確認
活動日期：03/30-03/31
活動時間：14:00-20:00
活動地點：南紡購物中心（台南市東區中華東路一段366號）`,
  },
  {
    fixtureId: 'MTI-HO-011', sourceFamily: 'H3', pasteScenario: 'focused_with_context', referenceDate: '2024-02-05',
    inputText: `散步遊者市集 3/02-03 南下包車意願登記
因駁二及高美館市集，開放外縣市品牌登記行李包車。
登記截止日期為2/12（一）；名額足夠才會開團。`,
  },
  {
    fixtureId: 'MTI-HO-012', sourceFamily: 'H3', pasteScenario: 'full_message_stress', referenceDate: '2024-01-28',
    inputText: `散步遊者市集・大港城行｜入選通知
地點｜高雄駁二藝術特區大義倉庫群
日期｜2024/03/02(六)-03/03(日)
時間｜14:00-21:00
錄取攤位為露天大攤全傘，850元／日，攤位無附設備。
加租：傘組400元／組、120x60cm桌250元／張、180x60cm桌300元／張、塑膠椅30元／張。
本次選擇傘1把、180x60cm桌1張、椅1張，發電機無；應匯款金額2,430元。
報到時間：活動開始前一小時。`,
  },
  {
    fixtureId: 'MTI-HO-013', sourceFamily: 'H1', pasteScenario: 'focused_with_context', referenceDate: '2024-01-27',
    inputText: `基好事吉・南紡購物中心前廣場｜錄取通知
活動日期：03/30-03/31
活動時間：14:00-20:00
活動地點：南紡購物中心前廣場
提供設備：遮陽設備1組、180x60cm桌1張、椅子2張。
繳費截止日：2024/02/02 23:59。
本場次無開放明火、不提供電。`,
  },
  {
    fixtureId: 'MTI-HO-014', sourceFamily: 'H2', pasteScenario: 'focused_with_context', referenceDate: '2023-05-09',
    inputText: `迷路森林－宇宙迷路中｜品牌宣傳與插畫募集
品牌宣傳資料繳交期限：7/7（五）。
市集資訊：
【迷路森林－宇宙迷路中】
舉辦地點：松山文創園區一樓北向製菸工廠
活動日期：7/15(六) 13:00-19:00、7/16(日) 11:00-18:00`,
  },
  {
    fixtureId: 'MTI-HO-015', sourceFamily: 'H2', pasteScenario: 'full_message_stress', referenceDate: '2023-04-28',
    inputText: `迷路森林－宇宙迷路中｜入選確認
地點：松山文創園區一樓北向製菸工廠
日期：7/15(六) 13:00-19:00、7/16(日) 11:00-18:00
錄取日期：7/15、7/16，大攤一攤。
大攤供電、不含桌椅；一般2,000元／日、早鳥1,700元／日；桌子300元／日、椅子15元／日。
小攤供電、提供一桌一椅；一般1,500元／日、早鳥1,200元／日；加租椅子15元／日。
請於5/5前完成確認與匯款。`,
  },
  {
    fixtureId: 'MTI-HO-016', sourceFamily: 'H4', pasteScenario: 'focused_with_context', referenceDate: '2023-03-10',
    inputText: `愛映岡山－太空漫遊｜線上說明會資料
線上會議時間：3/10（五）10:30
活動日期｜3/19（日）
活動時間｜14:00-20:00
活動地點｜高雄岡山河堤公園 × 筧橋路`,
  },
  {
    fixtureId: 'MTI-HO-017', sourceFamily: 'H4', pasteScenario: 'focused_with_context', referenceDate: '2023-03-09',
    inputText: `愛映岡山－太空漫遊｜線上會議時間修正
會議時間：3/10（五）10:30
活動日期｜3/19（日）
活動時間｜14:00-20:00
活動地點｜高雄岡山河堤公園 × 筧橋路`,
  },
  {
    fixtureId: 'MTI-HO-018', sourceFamily: 'H4', pasteScenario: 'focused_with_context', referenceDate: '2023-03-05',
    inputText: `愛映岡山－太空漫遊｜限定口味回覆與說明會
限定口味資料請於3/7前回覆；線上說明會預計3/10 14:00。
活動日期｜3/19（日）
活動時間｜14:00-20:00
活動地點｜高雄岡山河堤公園 × 筧橋路`,
  },
  {
    fixtureId: 'MTI-HO-019', sourceFamily: 'H4', pasteScenario: 'focused_block', referenceDate: '2023-02-18',
    inputText: `愛映岡山－太空漫遊｜入選通知
活動日期｜3/19（日）
活動時間｜14:00-20:00
活動地點｜高雄岡山河堤公園 × 筧橋路
報到時間：行前通知信公布。`,
  },
  {
    fixtureId: 'MTI-HO-020', sourceFamily: 'H4', pasteScenario: 'focused_with_context', referenceDate: '2022-11-30',
    inputText: `嘉義・開嘉霓虹派對｜入選通知
日期｜2022/12/17-12/18
時間｜14:00-21:00
地點｜嘉義文化創意產業園區
LINE Pay活動：12/17當天消費滿100元可抽紅包。
報到時間：11:00-13:30。`,
  },
  {
    fixtureId: 'MTI-HO-021', sourceFamily: 'H4', pasteScenario: 'focused_with_context', referenceDate: '2022-10-12',
    inputText: `嘉義・開嘉市集｜未繳費品牌與進場通知
日期｜2022/10/15-10/16
時間｜14:00-20:00
地點｜嘉義文化創意產業園區
報到時間：12:00；車輛進場時間：11:00-13:00；退場20:30後。`,
  },
  {
    fixtureId: 'MTI-HO-022', sourceFamily: 'H4', pasteScenario: 'focused_with_context', referenceDate: '2022-10-11',
    inputText: `嘉義・開嘉市集｜進場車號統計
日期｜2022/10/15-10/16
時間｜14:00-20:00
地點｜嘉義文化創意產業園區
報到時間：12:00；車輛進場時間：11:00-13:00。`,
  },
  {
    fixtureId: 'MTI-HO-023', sourceFamily: 'H4', pasteScenario: 'focused_block', referenceDate: '2022-03-22',
    inputText: `屏東菸葉廠・市集入選通知
日期｜2022/03/26-03/27、04/02-04/03
時間｜14:00-19:00
地點｜屏菸1936文化基地・屏東菸葉廠`,
  },
  {
    fixtureId: 'MTI-HO-024', sourceFamily: 'H4', pasteScenario: 'focused_with_context', referenceDate: '2021-12-21',
    inputText: `愛河・霓虹派對 2.0｜繳費提醒
日期｜12/11-12/12、12/18-12/19、12/25-12/26
時間｜14:00-21:00
地點｜高雄愛河・河西路
繳費期限：12/9（四）；報到時間為活動前一小時。`,
  },
  {
    fixtureId: 'MTI-HO-025', sourceFamily: 'H4', pasteScenario: 'focused_with_context', referenceDate: '2021-11-23',
    inputText: `愛河・霓虹派對 2.0｜增加電力費用通知
日期｜12/04-12/05、12/11-12/12、12/18-12/19、12/25-12/26
時間｜14:00-21:00
地點｜高雄愛河・河西路
繳費期限：11/26；報到時間為活動前一小時。
無申請用電者不得接電；申請用電品牌需自備10M動力延長線。`,
  },
  {
    fixtureId: 'MTI-HO-026', sourceFamily: 'H4', pasteScenario: 'focused_block', referenceDate: '2021-11-23',
    inputText: `愛河・霓虹派對 2.0｜入選通知
日期｜12/04-12/05、12/11-12/12、12/18-12/19、12/25-12/26
時間｜14:00-21:00
地點｜高雄愛河・河西路`,
  },
  {
    fixtureId: 'MTI-HO-027', sourceFamily: 'H4', pasteScenario: 'focused_block', referenceDate: '2021-04-29',
    inputText: `愛河・端午嘉年華｜入選通知
日期｜06/12-06/13
時間｜15:00-21:00
地點｜愛河・河西路（五福路－中正路）`,
  },
  {
    fixtureId: 'MTI-HO-028', sourceFamily: 'H4', pasteScenario: 'focused_block', referenceDate: '2021-04-25',
    inputText: `酒癮俱樂部・Join Club｜入選通知
日期｜05/29-05/30
時間｜15:00-21:00
地點｜愛河・河西路（五福路－中正路）`,
  },
  {
    fixtureId: 'MTI-HO-029', sourceFamily: 'H2', pasteScenario: 'full_message_stress', referenceDate: '2021-02-26',
    inputText: `迷路森林－跳跳糖市集｜入選確認
地點：新光三越台南新天地小西門前廣場
活動日期：3/20、3/21、3/27、3/28，時間12:00-18:00
錄取日期：3/21、3/27、3/28
攤位費550元／日；180x60cm桌150元／日；椅子10元／日。
確認與匯款期限：3/4中午12點。`,
  },
  {
    fixtureId: 'MTI-HO-030', sourceFamily: 'H5', pasteScenario: 'focused_with_context', referenceDate: '2020-05-22',
    inputText: `迷路森林－夢遊森林｜入選確認
地點：松山文創園區二號倉庫
活動時間：7/11(六) 13:00-19:00、7/12(日) 11:00-18:00
錄取日期與攤位：與報名相同
大攤一般價格1,200元／日；桌子300元／日；椅子10元／日。`,
  },
] as const;
