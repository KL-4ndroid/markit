import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export type MarketTextImportGoldRound = 'A' | 'B' | 'C';

export type MarketTextImportPasteScenario =
  | 'focused_block'
  | 'focused_with_context'
  | 'full_message_stress';

export type MarketTextImportSourceTextMode =
  | 'deidentified_verbatim_excerpt'
  | 'structure_preserving_synthetic';

export interface MarketTextImportGoldInputFixture {
  schemaVersion: 1;
  fixtureId: string;
  sourceSampleId: string;
  split: 'design_gold';
  round: MarketTextImportGoldRound;
  referenceDate: string;
  pasteScenario: MarketTextImportPasteScenario;
  sourceTextMode: MarketTextImportSourceTextMode;
  inputText: string;
}

interface ParsedFixtureSection {
  fixtureId: string;
  referenceDate?: string;
  pasteScenario?: string;
  sourceTextMode?: string;
  inputText: string;
}

interface GoldRoundDocumentSet {
  round: MarketTextImportGoldRound;
  expectedCount: number;
  answerPath: string;
  blindPackPath: string;
  adjudicationPath: string;
  reviewerResultPaths: string[];
}

export const MARKET_TEXT_IMPORT_GOLD_DOCUMENT_SETS: readonly GoldRoundDocumentSet[] = [
  {
    round: 'A',
    expectedCount: 23,
    answerPath: 'docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_CALIBRATION_V1_2026_09_15.md',
    blindPackPath: 'docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_PACK_V1_2026_09_15.md',
    adjudicationPath: 'docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_ADJUDICATION_V1_2026_09_15.md',
    reviewerResultPaths: [
      'docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_RESULT_B_V1_2026_09_15.md',
    ],
  },
  {
    round: 'B',
    expectedCount: 30,
    answerPath: 'docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_ROUND_B_V1_2026_09_15.md',
    blindPackPath: 'docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_PACK_ROUND_B_V1_2026_09_15.md',
    adjudicationPath: 'docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_ADJUDICATION_ROUND_B_V1_2026_09_15.md',
    reviewerResultPaths: [
      'docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_RESULT_C_ROUND_B_V1_2026_09_15.md',
      'docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_RESULT_D_ROUND_B_REMAINDER_V1_2026_09_16.md',
    ],
  },
  {
    round: 'C',
    expectedCount: 30,
    answerPath: 'docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_ROUND_C_V1_2026_09_16.md',
    blindPackPath: 'docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_PACK_ROUND_C_V1_2026_09_16.md',
    adjudicationPath: 'docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_ADJUDICATION_ROUND_C_V1_2026_09_16.md',
    reviewerResultPaths: [
      'docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_RESULT_E_ROUND_C_V1_2026_09_16.md',
    ],
  },
] as const;

const FIXTURE_HEADING = /^### (MTI-REP-\d{4}-P\d{2})\r?$/gm;

const normalizeLineEndings = (value: string): string => value.replace(/\r\n/g, '\n');

export const readMarketTextImportGoldDocument = (
  projectRoot: string,
  relativePath: string,
): string => readFileSync(join(projectRoot, relativePath), 'utf8');

export const parseMarketTextImportFixtureDocument = (
  markdown: string,
  documentPath: string,
): ParsedFixtureSection[] => {
  const headings = [...markdown.matchAll(FIXTURE_HEADING)];

  return headings.map((heading, index) => {
    const fixtureId = heading[1];
    const sectionStart = heading.index ?? 0;
    const sectionEnd = headings[index + 1]?.index ?? markdown.length;
    const section = markdown.slice(sectionStart, sectionEnd);
    const inputMatch = section.match(/```text\r?\n([\s\S]*?)\r?\n```/);

    if (!inputMatch) {
      throw new Error(`${documentPath}: ${fixtureId} is missing its text input block`);
    }

    return {
      fixtureId,
      referenceDate: section.match(/- `referenceDate`: `(\d{4}-\d{2}-\d{2})`/)?.[1],
      pasteScenario: section.match(/- `pasteScenario`: `([^`]+)`/)?.[1],
      sourceTextMode: section.match(/- `sourceTextMode`: `([^`]+)`/)?.[1],
      inputText: normalizeLineEndings(inputMatch[1]),
    };
  });
};

const indexByFixtureId = (
  fixtures: readonly ParsedFixtureSection[],
  documentPath: string,
): Map<string, ParsedFixtureSection> => {
  const index = new Map<string, ParsedFixtureSection>();

  for (const fixture of fixtures) {
    if (index.has(fixture.fixtureId)) {
      throw new Error(`${documentPath}: duplicate fixture ${fixture.fixtureId}`);
    }
    index.set(fixture.fixtureId, fixture);
  }

  return index;
};

const isPasteScenario = (value: string | undefined): value is MarketTextImportPasteScenario => (
  value === 'focused_block'
  || value === 'focused_with_context'
  || value === 'full_message_stress'
);

const isSourceTextMode = (value: string | undefined): value is MarketTextImportSourceTextMode => (
  value === 'deidentified_verbatim_excerpt'
  || value === 'structure_preserving_synthetic'
);

export const loadMarketTextImportGoldInputs = (
  projectRoot: string,
): MarketTextImportGoldInputFixture[] => {
  const loaded: MarketTextImportGoldInputFixture[] = [];

  for (const documentSet of MARKET_TEXT_IMPORT_GOLD_DOCUMENT_SETS) {
    const answerSections = parseMarketTextImportFixtureDocument(
      readMarketTextImportGoldDocument(projectRoot, documentSet.answerPath),
      documentSet.answerPath,
    );
    const blindSections = parseMarketTextImportFixtureDocument(
      readMarketTextImportGoldDocument(projectRoot, documentSet.blindPackPath),
      documentSet.blindPackPath,
    );
    const answersById = indexByFixtureId(answerSections, documentSet.answerPath);
    const blindById = indexByFixtureId(blindSections, documentSet.blindPackPath);

    if (
      answerSections.length !== documentSet.expectedCount
      || blindSections.length !== documentSet.expectedCount
    ) {
      throw new Error(
        `Round ${documentSet.round}: expected ${documentSet.expectedCount} fixtures, found answer=${answerSections.length}, blind=${blindSections.length}`,
      );
    }

    for (const blindFixture of blindSections) {
      const answerFixture = answersById.get(blindFixture.fixtureId);
      if (!answerFixture) {
        throw new Error(`${documentSet.answerPath}: missing ${blindFixture.fixtureId}`);
      }
      if (answerFixture.inputText !== blindFixture.inputText) {
        throw new Error(`${blindFixture.fixtureId}: answer and blind-pack inputText differ`);
      }
      if (
        answerFixture.referenceDate
        && answerFixture.referenceDate !== blindFixture.referenceDate
      ) {
        throw new Error(`${blindFixture.fixtureId}: answer and blind-pack referenceDate differ`);
      }
      if (!blindFixture.referenceDate) {
        throw new Error(`${blindFixture.fixtureId}: blind pack is missing referenceDate`);
      }

      if (!isPasteScenario(answerFixture.pasteScenario)) {
        throw new Error(
          `${blindFixture.fixtureId}: unsupported or missing pasteScenario ${String(answerFixture.pasteScenario)}`,
        );
      }
      if (!isSourceTextMode(answerFixture.sourceTextMode)) {
        throw new Error(
          `${blindFixture.fixtureId}: unsupported or missing sourceTextMode ${String(answerFixture.sourceTextMode)}`,
        );
      }

      loaded.push({
        schemaVersion: 1,
        fixtureId: blindFixture.fixtureId,
        sourceSampleId: blindFixture.fixtureId.replace(/-P\d{2}$/, ''),
        split: 'design_gold',
        round: documentSet.round,
        referenceDate: blindFixture.referenceDate,
        pasteScenario: answerFixture.pasteScenario,
        sourceTextMode: answerFixture.sourceTextMode,
        inputText: blindFixture.inputText,
      });
    }

    if (blindById.size !== answersById.size) {
      throw new Error(`Round ${documentSet.round}: answer and blind-pack fixture sets differ`);
    }
  }

  return loaded;
};

export const parseFixtureIdsFromReviewerResult = (markdown: string): string[] => (
  [...markdown.matchAll(/^\s*-?\s*fixtureId:\s*(MTI-REP-\d{4}-P\d{2})\s*$/gm)]
    .map((match) => match[1])
);

export const parseFixtureIdsFromAdjudication = (markdown: string): string[] => (
  [...markdown.matchAll(/^\| `(MTI-REP-\d{4}-P\d{2})` \|/gm)]
    .map((match) => match[1])
);
