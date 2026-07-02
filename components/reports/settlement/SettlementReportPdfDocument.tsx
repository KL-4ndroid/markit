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
  brandSoft: '#E7EFE4',
  accent: '#9A6A42',
  warningBg: '#FFF7E6',
  warningLine: '#EDD8A6',
  warningText: '#4A3B28',
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingRight: 34,
    paddingBottom: 30,
    paddingLeft: 34,
    fontFamily: PDF_FONT_FAMILY,
    color: colors.ink,
    backgroundColor: colors.paper,
  },
  pageHeader: {
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pageHeaderText: {
    width: '78%',
  },
  pageMeta: {
    fontSize: 8,
    color: colors.muted,
    marginBottom: 5,
  },
  pageTitle: {
    fontSize: 20,
    lineHeight: 1.25,
    color: colors.ink,
    fontWeight: 700,
  },
  pagePurpose: {
    marginTop: 5,
    fontSize: 9,
    color: colors.muted,
    lineHeight: 1.45,
  },
  pageBadge: {
    minWidth: 54,
    height: 26,
    paddingTop: 6,
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
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    color: colors.accent,
    marginBottom: 7,
    fontWeight: 700,
  },
  coverHero: {
    paddingTop: 18,
    paddingRight: 18,
    paddingBottom: 16,
    paddingLeft: 18,
    backgroundColor: colors.brand,
    marginBottom: 14,
  },
  coverBrand: {
    fontSize: 13,
    color: '#D9E7D7',
    marginBottom: 14,
  },
  coverRecommendation: {
    fontSize: 25,
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
    backgroundColor: '#F4EFE6',
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
    borderWidth: 1,
    borderColor: colors.warningLine,
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
  footer: {
    position: 'absolute',
    left: 34,
    right: 34,
    bottom: 18,
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
        <View style={styles.table}>
          <View style={[styles.row, styles.rowHeader]}>
            <Text style={[styles.headerText, styles.cellWide]}>項目</Text>
            <Text style={[styles.headerText, styles.cellSmall]}>權重</Text>
            <Text style={[styles.headerText, styles.cellSmall]}>分數</Text>
            <Text style={[styles.headerText, styles.cell]}>狀態</Text>
            <Text style={[styles.headerText, styles.cell]}>原因</Text>
          </View>
          {page.scoreRows.map(row => (
            <View key={row.key} style={styles.row}>
              <Text style={[styles.cellText, styles.cellWide]}>{row.label}</Text>
              <Text style={[styles.cellText, styles.cellSmall]}>{row.weightLabel}</Text>
              <Text style={[styles.cellText, styles.cellSmall]}>{row.scoreLabel}</Text>
              <Text style={[styles.cellText, styles.cell]}>{row.statusLabel}</Text>
              <Text style={[styles.cellText, styles.cell]}>{row.reason}</Text>
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
      <View style={styles.table}>
        <View style={[styles.row, styles.rowHeader]}>
          <Text style={[styles.headerText, styles.cellWide]}>市集</Text>
          <Text style={[styles.headerText, styles.cell]}>營收</Text>
          <Text style={[styles.headerText, styles.cell]}>淨利</Text>
          <Text style={[styles.headerText, styles.cellSmall]}>分數</Text>
          <Text style={[styles.headerText, styles.cellSmall]}>建議</Text>
        </View>
        {page.rows.map(row => (
          <View key={row.marketId} style={styles.row}>
            <Text style={[styles.cellText, styles.cellWide]}>{row.marketName}</Text>
            <Text style={[styles.cellText, styles.cell]}>{row.revenueLabel}</Text>
            <Text style={[styles.cellText, styles.cell]}>{row.netProfitLabel}</Text>
            <Text style={[styles.cellText, styles.cellSmall]}>{row.scoreLabel}</Text>
            <Text style={[styles.cellText, styles.cellSmall]}>{row.recommendationLabel}</Text>
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
        <View style={styles.table}>
          <View style={[styles.row, styles.rowHeader]}>
            <Text style={[styles.headerText, styles.cellWide]}>商品</Text>
            <Text style={[styles.headerText, styles.cell]}>售出</Text>
            <Text style={[styles.headerText, styles.cell]}>營收</Text>
            <Text style={[styles.headerText, styles.cell]}>毛利</Text>
          </View>
          {page.rows.map(row => (
            <View key={row.productId} style={styles.row}>
              <Text style={[styles.cellText, styles.cellWide]}>{row.productName}</Text>
              <Text style={[styles.cellText, styles.cell]}>{row.quantityLabel}</Text>
              <Text style={[styles.cellText, styles.cell]}>{row.revenueLabel}</Text>
              <Text style={[styles.cellText, styles.cell]}>{row.grossProfitLabel}</Text>
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

function renderActionGroup(group: SettlementReportPdfActionGroup): React.ReactNode {
  return (
    <View key={group.title} style={styles.actionBox}>
      <Text style={styles.sectionTitle}>{group.title}</Text>
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
