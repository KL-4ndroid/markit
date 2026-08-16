import type {
  InsightAffectedSection,
  InsightConfidence,
  InsightLimitation,
  InsightSignalStatus,
} from './insight-quality';
import { clampInsightNumber } from './insight-quality';

export type InsightConfidenceComponent = {
  key: string;
  label: string;
  weight: number;
  score: number;
  status: InsightSignalStatus;
  reason: string;
};

export type InsightSectionAvailability = Record<InsightAffectedSection, InsightSignalStatus>;

export type InsightQualityModel = {
  confidence: InsightConfidence;
  confidenceScore: number;
  confidenceComponents: InsightConfidenceComponent[];
  limitations: InsightLimitation[];
  sectionAvailability: InsightSectionAvailability;
  warningCount: number;
  infoCount: number;
  nextActions: string[];
  isFinalReady: boolean;
};

export type BuildInsightQualityModelInput = {
  limitations: InsightLimitation[];
  confidenceComponents: InsightConfidenceComponent[];
  sectionDefaults?: Partial<InsightSectionAvailability>;
};

const INSIGHT_SECTIONS: InsightAffectedSection[] = [
  'overall_score',
  'profit',
  'market_rejoin',
  'product_ranking',
  'product_actions',
  'conversion',
  'data_quality',
];

const UNAVAILABLE_LIMITATION_CODES = new Set([
  'no_markets_in_period',
  'missing_product_detail',
]);

function defaultSectionAvailability(): InsightSectionAvailability {
  return {
    overall_score: 'available',
    profit: 'available',
    market_rejoin: 'available',
    product_ranking: 'available',
    product_actions: 'available',
    conversion: 'available',
    data_quality: 'available',
  };
}

function mergeStatus(current: InsightSignalStatus, next: InsightSignalStatus): InsightSignalStatus {
  if (current === 'unavailable' || next === 'unavailable') return 'unavailable';
  if (current === 'limited' || next === 'limited') return 'limited';
  return 'available';
}

function getLimitationStatus(limitation: InsightLimitation): InsightSignalStatus {
  if (UNAVAILABLE_LIMITATION_CODES.has(limitation.code)) {
    return 'unavailable';
  }

  return limitation.severity === 'warning' ? 'limited' : 'limited';
}

function getConfidence(score: number): InsightConfidence {
  if (score >= 0.75) return 'high';
  if (score >= 0.45) return 'medium';
  return 'low';
}

function getWeightedConfidenceScore(components: InsightConfidenceComponent[]): number {
  const weighted = components.filter(component => component.weight > 0);
  const totalWeight = weighted.reduce((sum, component) => sum + component.weight, 0);
  if (totalWeight <= 0) return 0;

  return clampInsightNumber(
    weighted.reduce((sum, component) => (
      sum + clampInsightNumber(component.score, 0, 1) * component.weight
    ), 0) / totalWeight,
    0,
    1
  );
}

export function buildInsightQualityModel({
  limitations,
  confidenceComponents,
  sectionDefaults = {},
}: BuildInsightQualityModelInput): InsightQualityModel {
  const sectionAvailability = {
    ...defaultSectionAvailability(),
    ...sectionDefaults,
  };

  for (const limitation of limitations) {
    const status = getLimitationStatus(limitation);
    for (const section of limitation.affectedSections) {
      sectionAvailability[section] = mergeStatus(sectionAvailability[section], status);
    }
  }

  const confidenceScore = getWeightedConfidenceScore(confidenceComponents);
  const warningCount = limitations.filter(limitation => limitation.severity === 'warning').length;
  const infoCount = limitations.filter(limitation => limitation.severity === 'info').length;
  const nextActions = Array.from(new Set(limitations.map(limitation => limitation.recommendation)));
  const isFinalReady =
    warningCount === 0 &&
    sectionAvailability.overall_score !== 'unavailable' &&
    sectionAvailability.data_quality !== 'unavailable' &&
    confidenceScore >= 0.75;

  for (const section of INSIGHT_SECTIONS) {
    sectionAvailability[section] = sectionAvailability[section] ?? 'available';
  }

  return {
    confidence: getConfidence(confidenceScore),
    confidenceScore,
    confidenceComponents,
    limitations,
    sectionAvailability,
    warningCount,
    infoCount,
    nextActions,
    isFinalReady,
  };
}
