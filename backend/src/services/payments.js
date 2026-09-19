// Payment split: 01_SHARED_BRIEF.md section 4.3.
// The welfare fund absorbs the rounding remainder so the parts always sum exactly.
const WORKER_SHARE = 0.75;
const COOP_SHARE = 0.15;

function computeSplit(totalInr) {
  const total = Math.trunc(Number(totalInr));
  const worker_payout_inr = Math.floor(total * WORKER_SHARE);
  const coop_overhead_inr = Math.floor(total * COOP_SHARE);
  const welfare_fund_inr = total - worker_payout_inr - coop_overhead_inr;
  return { total_amount_inr: total, worker_payout_inr, coop_overhead_inr, welfare_fund_inr };
}

const SPLIT_PERCENTAGES = { worker: 75, coop_overhead: 15, welfare_fund: 10 };

module.exports = { computeSplit, SPLIT_PERCENTAGES };
