// Fair-matching engine. Specification: 01_SHARED_BRIEF.md section 4.1.
// Every constant here is from the brief. Do not tune them.

const MAX_DISTANCE_KM = 15;
const WEIGHT_PROXIMITY = 0.45;
const WEIGHT_SKILL = 0.30;
const WEIGHT_ROTATION = 0.25;
const TOP_N = 5;
const EARTH_RADIUS_KM = 6371;

function toRadians(deg) { return (deg * Math.PI) / 180; }

/** Great-circle distance between two lat/lon points, in kilometres. */
function haversineKm(lat1, lon1, lat2, lon2) {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function round(value, places) {
  return Number(Number(value).toFixed(places));
}

/**
 * Ranks eligible workers for a service request and rewrites match_candidates.
 * Runs inside the caller's transaction client.
 * Returns the top N candidate objects, already shaped for the API response.
 */
async function computeMatches(client, serviceRequest) {
  const { id: requestId, skill_id, household_latitude, household_longitude } = serviceRequest;

  if (skill_id === null || household_latitude === null || household_longitude === null) {
    return [];
  }

  // Eligibility filter: right role, verified, available, has the skill.
  // Distance is filtered in JS because Haversine is easier to read and debug here.
  const eligible = await client.query(
    `SELECT u.id AS worker_user_id, u.full_name, u.phone,
            u.latitude, u.longitude,
            wp.rating_avg, wp.jobs_completed_this_cycle, wp.last_assigned_at
     FROM users u
     JOIN worker_profiles wp ON wp.user_id = u.id
     JOIN worker_skills ws   ON ws.worker_user_id = u.id
     WHERE u.role = 'worker'
       AND wp.verified = TRUE
       AND wp.is_available = TRUE
       AND ws.skill_id = $1
       AND u.latitude IS NOT NULL
       AND u.longitude IS NOT NULL`,
    [skill_id]
  );

  const withinRange = [];
  for (const w of eligible.rows) {
    const distance = haversineKm(
      Number(household_latitude), Number(household_longitude),
      Number(w.latitude), Number(w.longitude)
    );
    if (distance <= MAX_DISTANCE_KM) {
      withinRange.push({ ...w, distance_km: round(distance, 2) });
    }
  }

  if (withinRange.length === 0) return [];

  // cycle_max is computed over THIS request's eligible pool, so rotation is
  // measured relative to the workers actually competing for this job.
  const cycleMax = Math.max(
    1,
    ...withinRange.map((w) => Number(w.jobs_completed_this_cycle))
  );

  const scored = withinRange.map((w) => {
    const proximity_score = round(Math.max(0, 1 - w.distance_km / MAX_DISTANCE_KM), 3);
    const skill_score = round(Number(w.rating_avg) / 5, 3);
    const rotation_score = round(1 - Number(w.jobs_completed_this_cycle) / cycleMax, 3);
    const total_score = round(
      WEIGHT_PROXIMITY * proximity_score +
      WEIGHT_SKILL * skill_score +
      WEIGHT_ROTATION * rotation_score,
      3
    );
    return {
      worker_user_id: w.worker_user_id,
      full_name: w.full_name,
      phone: w.phone,
      rating_avg: Number(w.rating_avg),
      jobs_completed_this_cycle: Number(w.jobs_completed_this_cycle),
      last_assigned_at: w.last_assigned_at,
      distance_km: w.distance_km,
      proximity_score,
      skill_score,
      rotation_score,
      total_score,
    };
  });

  // Order: total_score DESC, then least-recently-assigned (NULL first), then id ASC.
  scored.sort((a, b) => {
    if (b.total_score !== a.total_score) return b.total_score - a.total_score;
    const at = a.last_assigned_at ? new Date(a.last_assigned_at).getTime() : -Infinity;
    const bt = b.last_assigned_at ? new Date(b.last_assigned_at).getTime() : -Infinity;
    if (at !== bt) return at - bt;
    return a.worker_user_id - b.worker_user_id;
  });

  const top = scored.slice(0, TOP_N).map((c, i) => ({ ...c, rank_position: i + 1 }));

  // Persist for auditability. Rewrite rather than append, so a re-run is clean.
  await client.query('DELETE FROM match_candidates WHERE service_request_id = $1', [requestId]);
  for (const c of top) {
    await client.query(
      `INSERT INTO match_candidates
         (service_request_id, worker_user_id, rank_position, distance_km,
          proximity_score, skill_score, rotation_score, total_score)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [requestId, c.worker_user_id, c.rank_position, c.distance_km,
       c.proximity_score, c.skill_score, c.rotation_score, c.total_score]
    );
  }

  return top.map((c) => ({
    rank_position: c.rank_position,
    worker_user_id: c.worker_user_id,
    full_name: c.full_name,
    phone: c.phone,
    rating_avg: c.rating_avg,
    jobs_completed_this_cycle: c.jobs_completed_this_cycle,
    distance_km: c.distance_km,
    proximity_score: c.proximity_score,
    skill_score: c.skill_score,
    rotation_score: c.rotation_score,
    total_score: c.total_score,
  }));
}

module.exports = { computeMatches, haversineKm };
