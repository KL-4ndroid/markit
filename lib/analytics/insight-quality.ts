export type InsightSignalStatus = 'available' | 'limited' | 'unavailable';

export type InsightConfidence = 'high' | 'medium' | 'low';

export type InsightLimitationSeverity = 'info' | 'warning';

export type InsightLimitationCode =
  | 'missing_daily_stats'
  | 'missing_cost_data'
  | 'missing_product_detail'
  | 'missing_interaction_data'
  | 'unsynced_data'
  | 'no_markets_in_period'
  | 'low_sample_size'
  | 'excluded_inactive_market'
  | 'ongoing_or_future_market'
  | 'projection_mismatch'
  | 'possible_duplicate_daily_stats'
  | 'outlier_values'
  | 'manual_entry_dominant'
  | 'zero_or_missing_market_cost'
  | 'cost_basis_estimated'
  | 'partial_period_overlap';

export type InsightAffectedSection =
  | 'overall_score'
  | 'profit'
  | 'market_rejoin'
  | 'product_ranking'
  | 'product_actions'
  | 'conversion'
  | 'data_quality';

export type InsightLimitation = {
  code: InsightLimitationCode;
  severity: InsightLimitationSeverity;
  affectedSections: InsightAffectedSection[];
  message: string;
  recommendation: string;
};
