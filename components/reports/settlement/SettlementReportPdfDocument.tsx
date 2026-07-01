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

const PDF_FONT_FAMILY = 'BoothBook Noto Sans TC';
const registeredFontSources = new Set<string>();

export function registerSettlementReportPdfFont(fontSource: string): void {
  if (registeredFontSources.has(fontSource)) return;

  Font.register({
    family: PDF_FONT_FAMILY,
    src: fontSource,
    fontWeight: 400,
  });
  registeredFontSources.add(fontSource);
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingRight: 32,
    paddingBottom: 28,
    paddingLeft: 32,
    fontFamily: PDF_FONT_FAMILY,
    color: '#22313f',
    backgroundColor: '#fbfaf7',
  },
  pageHeader: {
    marginBottom: 18,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#d8d2c6',
  },
  pageMeta: {
    fontSize: 8,
    color: '#7a6f63',
    marginBottom: 5,
  },
  pageTitle: {
    fontSize: 22,
    color: '#17212b',
  },
  pagePurpose: {
    marginTop: 5,
    fontSize: 9,
    color: '#6b6258',
    lineHeight: 1.5,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    color: '#7a4f2f',
    marginBottom: 6,
  },
  coverBrand: {
    fontSize: 16,
    color: '#7a4f2f',
    marginBottom: 8,
  },
  conclusion: {
    padding: 12,
    backgroundColor: '#f0e7da',
    borderRadius: 4,
    marginBottom: 12,
  },
  conclusionLabel: {
    fontSize: 18,
    color: '#17212b',
    marginBottom: 4,
  },
  bodyText: {
    fontSize: 10,
    lineHeight: 1.55,
    color: '#334250',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 2,
  },
  metricCard: {
    width: '48%',
    marginRight: '2%',
    marginBottom: 8,
    padding: 10,
    backgroundColor: '#ffffff',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ece5da',
  },
  metricLabel: {
    fontSize: 8,
    color: '#7a6f63',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 15,
    color: '#17212b',
  },
  row: {
    flexDirection: 'row',
    paddingTop: 7,
    paddingBottom: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#ece5da',
  },
  rowHeader: {
    backgroundColor: '#efe8dd',
    borderBottomColor: '#d8d2c6',
  },
  cellWide: {
    width: '38%',
    paddingRight: 8,
  },
  cell: {
    width: '20%',
    paddingRight: 8,
  },
  cellSmall: {
    width: '11%',
    paddingRight: 8,
  },
  cellText: {
    fontSize: 8,
    lineHeight: 1.35,
    color: '#334250',
  },
  headerText: {
    fontSize: 8,
    color: '#6b4c35',
  },
  warningBox: {
    padding: 8,
    marginBottom: 6,
    backgroundColor: '#fff7e6',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#edd8a6',
  },
  warningMessage: {
    fontSize: 9,
    lineHeight: 1.4,
    color: '#4a3b28',
  },
  actionBox: {
    padding: 10,
    marginBottom: 8,
    backgroundColor: '#ffffff',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ece5da',
  },
  footer: {
    position: 'absolute',
    left: 32,
    right: 32,
    bottom: 18,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#ded6ca',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 8,
    color: '#887d72',
  },
});

function metricCards(metrics: SettlementReportPdfMetric[]): React.ReactNode {
  return (
    <View style={styles.metricGrid}>
      {metrics.map(metric => (
        <View key={`${metric.label}-${metric.value}`} style={styles.metricCard}>
          <Text style={styles.metricLabel}>{metric.label}</Text>
          <Text style={styles.metricValue}>{metric.value}</Text>
          {metric.note ? <Text style={styles.bodyText}>{metric.note}</Text> : null}
        </View>
      ))}
    </View>
  );
}

function warningList(warnings: SettlementReportPdfWarning[]): React.ReactNode {
  if (warnings.length === 0) {
    return <Text style={styles.bodyText}>目前沒有需要優先提醒的資料限制。</Text>;
  }

  return warnings.map(warning => (
    <View key={`${warning.code}-${warning.severity}`} style={styles.warningBox}>
      <Text style={styles.warningMessage}>{warning.message}</Text>
      <Text style={styles.bodyText}>{warning.recommendation}</Text>
    </View>
  ));
}

function renderCoverPage(page: SettlementReportPdfCoverPage): React.ReactNode {
  return (
    <>
      <Text style={styles.coverBrand}>{page.brandName}</Text>
      <View style={styles.conclusion}>
        <Text style={styles.conclusionLabel}>{page.recommendationLabel}</Text>
        <Text style={styles.bodyText}>{page.recommendationSummary}</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>關鍵摘要</Text>
        {metricCards(page.metrics)}
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>評分與資料狀態</Text>
        <Text style={styles.bodyText}>
          {page.scoreLabel} / {page.gradeLabel} / {page.confidenceLabel} / {page.readinessLabel}
        </Text>
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
          {page.confidenceLabel}，警示 {page.warningCount} 項，提醒 {page.infoCount} 項。
        </Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>資料限制</Text>
        {warningList(page.limitations)}
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>評分組成</Text>
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
      {page.omittedRowCount > 0 ? (
        <Text style={styles.bodyText}>另有 {page.omittedRowCount} 場市集未列入本頁。</Text>
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
        <View style={[styles.row, styles.rowHeader]}>
          <Text style={[styles.headerText, styles.cellWide]}>商品</Text>
          <Text style={[styles.headerText, styles.cell]}>數量</Text>
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
      {page.omittedRowCount > 0 ? (
        <Text style={styles.bodyText}>另有 {page.omittedRowCount} 項商品未列入本頁。</Text>
      ) : null}
    </>
  );
}

function renderActionGroup(group: SettlementReportPdfActionGroup): React.ReactNode {
  return (
    <View key={group.title} style={styles.actionBox}>
      <Text style={styles.sectionTitle}>{group.title}</Text>
      {group.actions.map(action => (
        <Text key={action} style={styles.bodyText}>
          - {action}
        </Text>
      ))}
    </View>
  );
}

function renderCostProfitPage(page: SettlementReportPdfCostProfitPage): React.ReactNode {
  return (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>成本與利潤</Text>
        {metricCards(page.metrics)}
        <Text style={styles.bodyText}>
          成本覆蓋率：{page.costCoverageLabel}，利潤可信度：{page.profitReliabilityLabel}
        </Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>下次行動建議</Text>
        {page.actionGroups.length > 0
          ? page.actionGroups.map(renderActionGroup)
          : <Text style={styles.bodyText}>目前沒有額外行動建議。</Text>}
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
      author="BoothBook"
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
            <Text style={styles.pageMeta}>
              {viewModel.meta.reportTypeLabel} / {viewModel.meta.periodLabel} / Page {page.pageNumber} of {viewModel.totalPages}
            </Text>
            <Text style={styles.pageTitle}>{page.title}</Text>
            <Text style={styles.pagePurpose}>{page.purpose}</Text>
          </View>
          {renderPageBody(page)}
          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>{viewModel.meta.brandName}</Text>
            <Text style={styles.footerText}>{page.pageNumber} / {viewModel.totalPages}</Text>
          </View>
        </Page>
      ))}
    </Document>
  );
}
