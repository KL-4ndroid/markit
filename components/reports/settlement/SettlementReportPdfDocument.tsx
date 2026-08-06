import React from 'react';
import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';

import type {
  SettlementReportPdfActionGroup,
  SettlementReportPdfCostProfitPage,
  SettlementReportPdfCoverPage,
  SettlementReportPdfDataConfidencePage,
  SettlementReportPdfMarketPage,
  SettlementReportPdfMetric,
  SettlementReportPdfPage,
  SettlementReportPdfProductPage,
  SettlementReportPdfViewModel,
  SettlementReportPdfWarning,
} from '@/lib/reporting/settlement-report-pdf-view-model';

export type SettlementReportPdfDocumentProps = {
  viewModel: SettlementReportPdfViewModel;
  fontSource?: string;
};

const PDF_FONT_FAMILY = 'Féria Noto Sans TC';
const registeredFontSources = new Set<string>();
const WARNING_DISPLAY_LIMIT = 5;

export function registerSettlementReportPdfFont(fontSource: string): void {
  if (registeredFontSources.has(fontSource)) return;

  for (const fontWeight of [400, 500, 700]) {
    Font.register({
      family: PDF_FONT_FAMILY,
      src: fontSource,
      fontWeight,
    });
  }

  registeredFontSources.add(fontSource);
}

const colors = {
  ink: '#17212B',
  body: '#334250',
  muted: '#746A60',
  paper: '#FBFAF7',
  surface: '#FFFFFF',
  surfaceWarm: '#F4EFE6',
  line: '#DED6CA',
  softLine: '#ECE5DA',
  brand: '#26392F',
  brandMid: '#446354',
  brandSoft: '#E7EFE4',
  accent: '#9A6A42',
  accentSoft: '#F2E8DB',
  warningBg: '#FFF7E6',
  warningLine: '#EDD8A6',
  warningText: '#4A3B28',
};

const styles = StyleSheet.create({
  page: {
    minHeight: 841.89,
    paddingTop: 34,
    paddingRight: 36,
    paddingBottom: 36,
    paddingLeft: 36,
    fontFamily: PDF_FONT_FAMILY,
    color: colors.ink,
    backgroundColor: colors.paper,
  },
  topRule: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: colors.brand,
  },
  pageHeader: {
    marginBottom: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  pageHeaderText: {
    width: '78%',
  },
  pageMeta: {
    fontSize: 7.5,
    color: colors.accent,
    marginBottom: 6,
    fontWeight: 500,
  },
  pageTitle: {
    fontSize: 20,
    lineHeight: 1.25,
    color: colors.ink,
    fontWeight: 700,
  },
  pagePurpose: {
    marginTop: 6,
    fontSize: 8.5,
    color: colors.muted,
    lineHeight: 1.45,
  },
  pageBadge: {
    minWidth: 48,
    height: 24,
    paddingTop: 5,
    paddingRight: 8,
    paddingLeft: 8,
    backgroundColor: colors.brand,
  },
  pageBadgeText: {
    fontSize: 9,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 10.5,
    color: colors.accent,
    marginBottom: 8,
    paddingLeft: 7,
    borderLeftWidth: 2,
    borderLeftColor: colors.accent,
    fontWeight: 700,
  },
  coverHero: {
    paddingTop: 22,
    paddingRight: 22,
    paddingBottom: 20,
    paddingLeft: 22,
    backgroundColor: colors.brand,
    marginBottom: 16,
  },
  coverBrand: {
    fontSize: 13,
    color: '#D9E7D7',
    marginBottom: 14,
  },
  coverRecommendation: {
    fontSize: 27,
    lineHeight: 1.25,
    color: '#FFFFFF',
    fontWeight: 700,
  },
  coverSummary: {
    marginTop: 8,
    fontSize: 10,
    lineHeight: 1.55,
    color: '#ECF3EA',
  },
  coverStatusRow: {
    marginTop: 14,
    flexDirection: 'row',
  },
  coverStatusPill: {
    marginRight: 7,
    paddingTop: 5,
    paddingRight: 8,
    paddingBottom: 5,
    paddingLeft: 8,
    backgroundColor: colors.surfaceWarm,
  },
  coverStatusText: {
    fontSize: 8,
    color: colors.brand,
  },
  bodyText: {
    fontSize: 9,
    lineHeight: 1.5,
    color: colors.body,
  },
  bodyTextSmall: {
    fontSize: 8,
    lineHeight: 1.4,
    color: colors.muted,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metricCard: {
    width: '48.5%',
    marginRight: '1.5%',
    marginBottom: 8,
    paddingTop: 10,
    paddingRight: 10,
    paddingBottom: 9,
    paddingLeft: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.softLine,
    borderTopWidth: 2,
    borderTopColor: colors.accent,
  },
  metricLabel: {
    fontSize: 8,
    color: colors.muted,
    marginBottom: 5,
  },
  metricValue: {
    fontSize: 15,
    color: colors.ink,
    fontWeight: 700,
  },
  table: {
    borderWidth: 1,
    borderColor: colors.softLine,
    backgroundColor: colors.surface,
  },
  row: {
    flexDirection: 'row',
    paddingTop: 7,
    paddingRight: 8,
    paddingBottom: 7,
    paddingLeft: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.softLine,
  },
  rowHeader: {
    backgroundColor: colors.surfaceWarm,
    borderBottomColor: colors.line,
  },
  rowHighlight: {
    backgroundColor: colors.brandSoft,
  },
  rankCell: {
    width: '8%',
    paddingRight: 6,
  },
  marketNameCell: {
    width: '29%',
    paddingRight: 7,
  },
  marketMoneyCell: {
    width: '17%',
    paddingRight: 7,
  },
  marketScoreCell: {
    width: '12%',
    paddingRight: 6,
  },
  marketDecisionCell: {
    width: '17%',
  },
  productNameCell: {
    width: '38%',
    paddingRight: 7,
  },
  productQuantityCell: {
    width: '17%',
    paddingRight: 7,
  },
  productMoneyCell: {
    width: '18.5%',
    paddingRight: 7,
  },
  cellWide: {
    width: '38%',
    paddingRight: 7,
  },
  cell: {
    width: '20%',
    paddingRight: 7,
  },
  cellSmall: {
    width: '11%',
    paddingRight: 6,
  },
  cellText: {
    fontSize: 8,
    lineHeight: 1.35,
    color: colors.body,
  },
  headerText: {
    fontSize: 8,
    color: '#6B4C35',
    fontWeight: 700,
  },
  warningBox: {
    paddingTop: 8,
    paddingRight: 9,
    paddingBottom: 8,
    paddingLeft: 9,
    marginBottom: 6,
    backgroundColor: colors.warningBg,
    borderLeftWidth: 3,
    borderLeftColor: colors.warningLine,
  },
  warningMessage: {
    fontSize: 9,
    lineHeight: 1.4,
    color: colors.warningText,
    fontWeight: 700,
  },
  actionBox: {
    paddingTop: 10,
    paddingRight: 11,
    paddingBottom: 10,
    paddingLeft: 11,
    marginBottom: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.softLine,
  },
  actionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7,
  },
  actionIndex: {
    width: 18,
    height: 18,
    paddingTop: 3,
    marginRight: 7,
    backgroundColor: colors.brand,
  },
  actionIndexText: {
    color: '#FFFFFF',
    fontSize: 7.5,
    textAlign: 'center',
    fontWeight: 700,
  },
  actionTitle: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: 700,
  },
  actionItem: {
    fontSize: 9,
    lineHeight: 1.45,
    color: colors.body,
    marginBottom: 3,
  },
  twoColumn: {
    flexDirection: 'row',
  },
  twoColumnMain: {
    width: '62%',
    paddingRight: 12,
  },
  twoColumnSide: {
    width: '38%',
  },
  scorePanel: {
    paddingTop: 12,
    paddingRight: 12,
    paddingBottom: 12,
    paddingLeft: 12,
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: '#CFE0D1',
  },
  scoreValue: {
    fontSize: 28,
    color: colors.brand,
    fontWeight: 700,
  },
  summaryBand: {
    marginBottom: 12,
    paddingTop: 10,
    paddingRight: 12,
    paddingBottom: 10,
    paddingLeft: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.brandSoft,
    borderLeftWidth: 3,
    borderLeftColor: colors.brandMid,
  },
  summaryBandLabel: {
    fontSize: 8,
    color: colors.muted,
    marginBottom: 3,
  },
  summaryBandValue: {
    fontSize: 11,
    color: colors.brand,
    fontWeight: 700,
  },
  summaryBandSide: {
    maxWidth: '56%',
    textAlign: 'right',
  },
  scoreList: {
    borderTopWidth: 1,
    borderTopColor: colors.softLine,
  },
  scoreRow: {
    paddingTop: 8,
    paddingRight: 10,
    paddingBottom: 8,
    paddingLeft: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.softLine,
  },
  scoreRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  scoreRowLabel: {
    width: '34%',
    fontSize: 9,
    color: colors.ink,
    fontWeight: 700,
  },
  scoreRowMeta: {
    width: '64%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  scoreMetaText: {
    marginLeft: 9,
    fontSize: 7.5,
    color: colors.muted,
  },
  scoreStatusText: {
    marginLeft: 9,
    paddingTop: 2,
    paddingRight: 5,
    paddingBottom: 2,
    paddingLeft: 5,
    fontSize: 7,
    color: colors.brand,
    backgroundColor: colors.brandSoft,
  },
  scoreReason: {
    fontSize: 7.5,
    lineHeight: 1.4,
    color: colors.body,
  },
  footer: {
    position: 'absolute',
    left: 36,
    right: 36,
    bottom: 20,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 8,
    color: '#887D72',
  },
});

function metricCards(metrics: SettlementReportPdfMetric[]): React.ReactNode {
  return (
    <View style={styles.metricGrid}>
      {metrics.map(metric => (
        <View key={`${metric.label}-${metric.value}`} style={styles.metricCard}>
          <Text style={styles.metricLabel}>{metric.label}</Text>
          <Text style={styles.metricValue}>{metric.value}</Text>
          {metric.note ? <Text style={styles.bodyTextSmall}>{metric.note}</Text> : null}
        </View>
      ))}
    </View>
  );
}

function warningList(warnings: SettlementReportPdfWarning[]): React.ReactNode {
  if (warnings.length === 0) {
    return <Text style={styles.bodyText}>目前沒有需要優先提醒的資料限制。</Text>;
  }

  const visibleWarnings = warnings.slice(0, WARNING_DISPLAY_LIMIT);
  const omittedCount = Math.max(0, warnings.length - WARNING_DISPLAY_LIMIT);

  return (
    <>
      {visibleWarnings.map(warning => (
        <View key={`${warning.code}-${warning.severity}`} style={styles.warningBox}>
          <Text style={styles.warningMessage}>{warning.message}</Text>
          <Text style={styles.bodyTextSmall}>{warning.recommendation}</Text>
        </View>
      ))}
      {omittedCount > 0 ? (
        <Text style={styles.bodyTextSmall}>另有 {omittedCount} 項資料提醒，請回到 App 預覽頁查看完整內容。</Text>
      ) : null}
    </>
  );
}

function renderCoverPage(page: SettlementReportPdfCoverPage): React.ReactNode {
  return (
    <>
      <View style={styles.coverHero}>
        <Text style={styles.coverBrand}>{page.brandName}</Text>
        <Text style={styles.coverRecommendation}>{page.recommendationLabel}</Text>
        <Text style={styles.coverSummary}>{page.recommendationSummary}</Text>
        <View style={styles.coverStatusRow}>
          <View style={styles.coverStatusPill}>
            <Text style={styles.coverStatusText}>{page.scoreLabel}</Text>
          </View>
          <View style={styles.coverStatusPill}>
            <Text style={styles.coverStatusText}>{page.gradeLabel}</Text>
          </View>
          <View style={styles.coverStatusPill}>
            <Text style={styles.coverStatusText}>{page.confidenceLabel}</Text>
          </View>
        </View>
      </View>

      <View style={styles.twoColumn}>
        <View style={styles.twoColumnMain}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>關鍵摘要</Text>
            {metricCards(page.metrics)}
          </View>
        </View>
        <View style={styles.twoColumnSide}>
          <View style={styles.scorePanel}>
            <Text style={styles.sectionTitle}>評分與資料狀態</Text>
            <Text style={styles.scoreValue}>{page.scoreLabel}</Text>
            <Text style={styles.bodyText}>{page.gradeLabel}</Text>
            <Text style={styles.bodyText}>{page.confidenceLabel}</Text>
            <Text style={styles.bodyTextSmall}>{page.readinessLabel}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>主要提醒</Text>
        {warningList(page.topWarnings)}
      </View>
    </>
  );
}

function renderDataConfidencePage(page: SettlementReportPdfDataConfidencePage): React.ReactNode {
  return (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>資料信心度</Text>
        <Text style={styles.bodyText}>
          {page.confidenceLabel}，包含 {page.warningCount} 項警示與 {page.infoCount} 項補充提醒。
        </Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>資料限制</Text>
        {warningList(page.limitations)}
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>評分組成</Text>
        <View style={styles.scoreList}>
          {page.scoreRows.map(row => (
            <View key={row.key} style={styles.scoreRow}>
              <View style={styles.scoreRowTop}>
                <Text style={styles.scoreRowLabel}>{row.label}</Text>
                <View style={styles.scoreRowMeta}>
                  <Text style={styles.scoreMetaText}>權重 {row.weightLabel}</Text>
                  <Text style={styles.scoreMetaText}>分數 {row.scoreLabel}</Text>
                  <Text style={styles.scoreStatusText}>{row.statusLabel}</Text>
                </View>
              </View>
              <Text style={styles.scoreReason}>{row.reason}</Text>
            </View>
          ))}
        </View>
      </View>
    </>
  );
}

function renderMarketPage(page: SettlementReportPdfMarketPage): React.ReactNode {
  if (page.rows.length === 0) {
    return <Text style={styles.bodyText}>{page.emptyMessage}</Text>;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>市集表現排行</Text>
      <View style={styles.summaryBand}>
        <View>
          <Text style={styles.summaryBandLabel}>本期納入排行</Text>
          <Text style={styles.summaryBandValue}>{page.rows.length} 場市集</Text>
        </View>
        <View style={styles.summaryBandSide}>
          <Text style={styles.summaryBandLabel}>排名第一</Text>
          <Text style={styles.summaryBandValue}>
            {page.rows[0].marketName} · {page.rows[0].revenueLabel}
          </Text>
        </View>
      </View>
      <View style={styles.table}>
        <View style={[styles.row, styles.rowHeader]}>
          <Text style={[styles.headerText, styles.rankCell]}>排名</Text>
          <Text style={[styles.headerText, styles.marketNameCell]}>市集</Text>
          <Text style={[styles.headerText, styles.marketMoneyCell]}>營收</Text>
          <Text style={[styles.headerText, styles.marketMoneyCell]}>淨利</Text>
          <Text style={[styles.headerText, styles.marketScoreCell]}>分數</Text>
          <Text style={[styles.headerText, styles.marketDecisionCell]}>建議</Text>
        </View>
        {page.rows.map((row, index) => (
          <View key={row.marketId} style={[styles.row, index === 0 ? styles.rowHighlight : {}]}>
            <Text style={[styles.cellText, styles.rankCell]}>{index + 1}</Text>
            <Text style={[styles.cellText, styles.marketNameCell]}>{row.marketName}</Text>
            <Text style={[styles.cellText, styles.marketMoneyCell]}>{row.revenueLabel}</Text>
            <Text style={[styles.cellText, styles.marketMoneyCell]}>{row.netProfitLabel}</Text>
            <Text style={[styles.cellText, styles.marketScoreCell]}>{row.scoreLabel}</Text>
            <Text style={[styles.cellText, styles.marketDecisionCell]}>{row.recommendationLabel}</Text>
          </View>
        ))}
      </View>
      {page.omittedRowCount > 0 ? (
        <Text style={styles.bodyTextSmall}>另有 {page.omittedRowCount} 場市集未列入此頁，請回到 App 查看完整排行。</Text>
      ) : null}
    </View>
  );
}

function renderProductPage(page: SettlementReportPdfProductPage): React.ReactNode {
  if (page.rows.length === 0) {
    return <Text style={styles.bodyText}>{page.dataNeededMessage}</Text>;
  }

  return (
    <>
      {page.dataNeededMessage ? (
        <View style={styles.warningBox}>
          <Text style={styles.warningMessage}>{page.dataNeededMessage}</Text>
        </View>
      ) : null}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>商品表現</Text>
        <View style={styles.summaryBand}>
          <View>
            <Text style={styles.summaryBandLabel}>本期納入排行</Text>
            <Text style={styles.summaryBandValue}>{page.rows.length} 項商品</Text>
          </View>
          <View style={styles.summaryBandSide}>
            <Text style={styles.summaryBandLabel}>銷售第一</Text>
            <Text style={styles.summaryBandValue}>
              {page.rows[0].productName} · {page.rows[0].quantityLabel}
            </Text>
          </View>
        </View>
        <View style={styles.table}>
          <View style={[styles.row, styles.rowHeader]}>
            <Text style={[styles.headerText, styles.rankCell]}>排名</Text>
            <Text style={[styles.headerText, styles.productNameCell]}>商品</Text>
            <Text style={[styles.headerText, styles.productQuantityCell]}>售出</Text>
            <Text style={[styles.headerText, styles.productMoneyCell]}>營收</Text>
            <Text style={[styles.headerText, styles.productMoneyCell]}>毛利</Text>
          </View>
          {page.rows.map((row, index) => (
            <View key={row.productId} style={[styles.row, index === 0 ? styles.rowHighlight : {}]}>
              <Text style={[styles.cellText, styles.rankCell]}>{index + 1}</Text>
              <Text style={[styles.cellText, styles.productNameCell]}>{row.productName}</Text>
              <Text style={[styles.cellText, styles.productQuantityCell]}>{row.quantityLabel}</Text>
              <Text style={[styles.cellText, styles.productMoneyCell]}>{row.revenueLabel}</Text>
              <Text style={[styles.cellText, styles.productMoneyCell]}>{row.grossProfitLabel}</Text>
            </View>
          ))}
        </View>
      </View>
      {page.omittedRowCount > 0 ? (
        <Text style={styles.bodyTextSmall}>另有 {page.omittedRowCount} 項商品未列入此頁，請回到 App 查看完整排行。</Text>
      ) : null}
    </>
  );
}

function renderActionGroup(group: SettlementReportPdfActionGroup, index: number): React.ReactNode {
  return (
    <View key={group.title} style={styles.actionBox}>
      <View style={styles.actionTitleRow}>
        <View style={styles.actionIndex}>
          <Text style={styles.actionIndexText}>{index + 1}</Text>
        </View>
        <Text style={styles.actionTitle}>{group.title}</Text>
      </View>
      {group.actions.slice(0, 4).map(action => (
        <Text key={action} style={styles.actionItem}>
          - {action}
        </Text>
      ))}
      {group.actions.length > 4 ? (
        <Text style={styles.bodyTextSmall}>另有 {group.actions.length - 4} 項建議，請回到 App 查看完整內容。</Text>
      ) : null}
    </View>
  );
}

function renderCostProfitPage(page: SettlementReportPdfCostProfitPage): React.ReactNode {
  return (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>成本與利潤摘要</Text>
        {metricCards(page.metrics)}
        <Text style={styles.bodyText}>
          成本資料覆蓋率 {page.costCoverageLabel}，利潤判讀狀態為 {page.profitReliabilityLabel}。
        </Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>下次行動建議</Text>
        {page.actionGroups.length > 0
          ? page.actionGroups.map(renderActionGroup)
          : <Text style={styles.bodyText}>目前沒有額外的行動建議。</Text>}
      </View>
    </>
  );
}

function renderPageBody(page: SettlementReportPdfPage): React.ReactNode {
  switch (page.key) {
    case 'cover_summary':
      return renderCoverPage(page);
    case 'data_confidence_score':
      return renderDataConfidencePage(page);
    case 'market_performance':
      return renderMarketPage(page);
    case 'product_performance':
      return renderProductPage(page);
    case 'cost_profit_actions':
      return renderCostProfitPage(page);
  }
}

export function SettlementReportPdfDocument({
  viewModel,
  fontSource = viewModel.font.assetPath,
}: SettlementReportPdfDocumentProps): React.ReactElement {
  registerSettlementReportPdfFont(fontSource);

  return (
    <Document
      title={viewModel.meta.fileNameBase}
      author="Féria"
      language="zh-TW"
    >
      {viewModel.pages.map(page => (
        <Page
          key={page.key}
          size={viewModel.pageSize}
          orientation={viewModel.orientation}
          style={styles.page}
          wrap={false}
        >
          <View style={styles.topRule} fixed />
          <View style={styles.pageHeader}>
            <View style={styles.pageHeaderText}>
              <Text style={styles.pageMeta}>
                {viewModel.meta.reportTypeLabel} / {viewModel.meta.periodLabel}
              </Text>
              <Text style={styles.pageTitle}>{page.title}</Text>
              <Text style={styles.pagePurpose}>{page.purpose}</Text>
            </View>
            <View style={styles.pageBadge}>
              <Text style={styles.pageBadgeText}>{page.pageNumber} / {viewModel.totalPages}</Text>
            </View>
          </View>
          {renderPageBody(page)}
          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>{viewModel.meta.brandName}</Text>
            <Text style={styles.footerText}>Féria 結算報告</Text>
          </View>
        </Page>
      ))}
    </Document>
  );
}
