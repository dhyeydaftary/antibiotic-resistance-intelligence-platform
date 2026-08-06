// Answers the canned questions in constants/questionAnswers.js's question
// bank (rendered by components/explore/QuestionBankPanel.jsx), matched by
// string prefix against the question text.
import { ANTIBIOTIC_AWARE_MAP } from '../constants/exploreContent';

// Every answer here is either computed from the real dataset-stats response
// (organism counts, antibiotic AWaRe tiers) or, where the current API
// genuinely doesn't have the data to answer honestly, says so plainly and
// offers the closest real fact instead of inventing a number. Do not add
// hardcoded percentages/statistics here that aren't derived from `stats`.
export function getAnswer(question, { stats }) {
  if (!stats) return 'Loading dataset stats\u2026';

  const organisms = stats.organismDistribution || [];
  const topOrganism = [...organisms].sort((a, b) => b.count - a.count)[0];

  if (question.startsWith('Which organism has the fewest')) {
    const rarest = [...organisms].sort((a, b) => a.count - b.count)[0];
    if (!rarest) return 'No organism data available yet.';
    const pct = stats.totalRows ? ((rarest.count / stats.totalRows) * 100).toFixed(1) : null;
    return `${rarest.organism}, with ${rarest.count.toLocaleString()} recorded sample${rarest.count === 1 ? '' : 's'}${
      pct ? ` (${pct}% of the dataset)` : ''
    } \u2014 the least represented organism in this dataset.`;
  }

  if (question.startsWith('How many antibiotics fall under the Reserve')) {
    const reserveNames = Object.entries(ANTIBIOTIC_AWARE_MAP)
      .filter(([, category]) => category === 'Reserve')
      .map(([name]) => name);
    return `${reserveNames.length} \u2014 ${reserveNames.join(', ')}. Reserve-tier antibiotics are used only when other options have failed.`;
  }

  if (question.startsWith('What organism shows the highest multi-drug resistance')) {
    return `The dataset-stats API only tracks sample counts per organism, not a resistance rate per organism, so this isn't directly answerable from current data. By sample volume, ${
      topOrganism ? topOrganism.organism : 'no organism'
    } is the most represented in the dataset \u2014 not the same thing as "most resistant."`;
  }

  if (question.startsWith('Which antibiotic class has the steadiest')) {
    return 'Susceptibility trends are only available one antibiotic + organism pair at a time, on the Trends page \u2014 there\u2019s no bulk ranking across all antibiotics yet.';
  }

  if (question.startsWith('How does sample source correlate')) {
    return 'This dataset doesn\u2019t include a "sample source" field, so this can\u2019t be answered from the current data.';
  }

  if (question.startsWith('Which WHO AWaRe category appears most in recent predictions')) {
    return 'That depends on your own prediction history rather than the dataset itself \u2014 check your History page for the AWaRe breakdown of your past predictions.';
  }

  return 'No answer available for this question yet.';
}
