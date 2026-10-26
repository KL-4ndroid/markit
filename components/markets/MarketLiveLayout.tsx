import { Fragment, type ReactNode } from 'react';
import { getMarketLiveSectionOrder, type MarketLiveStage } from '@/lib/markets/market-live-presentation';

interface MarketLiveLayoutProps {
  stage: MarketLiveStage;
  activity?: ReactNode;
  timeline: ReactNode;
  fieldwork: ReactNode;
  cash: ReactNode;
}

/** Use real DOM order for reading and keyboard navigation; stable keys retain drafts. */
export function MarketLiveLayout({ stage, ...sections }: MarketLiveLayoutProps) {
  return <>{getMarketLiveSectionOrder(stage).map(section => (
    <Fragment key={section}>{sections[section]}</Fragment>
  ))}</>;
}
