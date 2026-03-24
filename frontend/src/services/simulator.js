/**
 * Progress-based ride simulation: vehicle moves gradually along the polyline A→B
 * (~5s per step). Scenarios align with position along the route. Idle freezes progress.
 */

export const SCENARIO_IDS = {
  RIDE_STARTED: 'RIDE_STARTED',
  CRUISE_NORMAL: 'CRUISE_NORMAL',
  VISIBILITY_MODERATE: 'VISIBILITY_MODERATE',
  VISIBILITY_HIGH: 'VISIBILITY_HIGH',
  TRAFFIC_DELAY: 'TRAFFIC_DELAY',
  SLIGHT_DEVIATION: 'SLIGHT_DEVIATION',
  SUSTAINED_DEVIATION: 'SUSTAINED_DEVIATION',
  SUSTAINED_DEVIATION_HIGH_RISK: 'SUSTAINED_DEVIATION_HIGH_RISK',
  IDLE: 'IDLE',
  LONG_IDLE: 'LONG_IDLE',
  SOS_TRIGGER: 'SOS_TRIGGER',
  RECOVERED_CRUISE: 'RECOVERED_CRUISE',
  DESTINATION_APPROACH: 'DESTINATION_APPROACH',
};

export const MAP_VISUAL = {
  ON_CORRIDOR: 'on_corridor',
  VISIBILITY_MODERATE: 'visibility_moderate',
  VISIBILITY_HIGH: 'visibility_high',
  TRAFFIC: 'traffic',
  SLIGHT_OFF: 'slight_off',
  SUSTAINED_OFF: 'sustained_off',
  SUSTAINED_CRITICAL: 'sustained_critical',
  IDLE: 'idle',
  IDLE_LONG: 'idle_long',
  SOS: 'sos',
  RECOVERING: 'recovering',
  APPROACH: 'approach',
};

/** Wall-clock interval between position updates (ms). */
export const SIMULATOR_TICK_MS = 5000;

const RESAMPLE_POINTS = 120;

function haversineM(a, b) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/**
 * Evenly resample a [lat,lng][] polyline to n points along cumulative distance.
 */
export function resamplePolyline(coords, n = RESAMPLE_POINTS) {
  if (!coords?.length) return [];
  if (coords.length === 1) return Array.from({ length: Math.max(1, n) }, () => [...coords[0]]);
  if (n < 2) return [[...coords[0]], [...coords[coords.length - 1]]];
  const cumulative = [0];
  for (let i = 1; i < coords.length; i++) {
    cumulative.push(cumulative[i - 1] + haversineM(coords[i - 1], coords[i]));
  }
  const total = cumulative[cumulative.length - 1];
  if (total < 1e-6) return [coords[0], coords[coords.length - 1]];
  const out = [];
  for (let k = 0; k < n; k++) {
    const target = (k / (n - 1)) * total;
    let j = 0;
    while (j < cumulative.length - 1 && cumulative[j + 1] < target) j++;
    const segStart = cumulative[j];
    const segEnd = cumulative[j + 1];
    const t = segEnd > segStart ? (target - segStart) / (segEnd - segStart) : 0;
    const tt = Math.max(0, Math.min(1, t));
    out.push([
      coords[j][0] + tt * (coords[j + 1][0] - coords[j][0]),
      coords[j][1] + tt * (coords[j + 1][1] - coords[j][1]),
    ]);
  }
  return out;
}

function bearingDeg(lat1, lng1, lat2, lng2) {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return ((θ * 180) / Math.PI + 360) % 360;
}

/** Heading (0=N) along resampled path at progress p in [0,1]. */
export function headingAlongPath(path, p) {
  if (!path?.length) return 0;
  if (path.length < 2) return 0;
  const n = path.length;
  const x = p * (n - 1);
  const i = Math.min(Math.floor(x), n - 2);
  const j = i + 1;
  return bearingDeg(path[i][0], path[i][1], path[j][0], path[j][1]);
}

function positionOnPath(path, p) {
  const n = path.length;
  if (n < 1) return [0, 0];
  if (n === 1) return [...path[0]];
  const x = Math.max(0, Math.min(1, p)) * (n - 1);
  const i = Math.min(Math.floor(x), n - 2);
  const f = x - i;
  const j = i + 1;
  return [path[i][0] + f * (path[j][0] - path[i][0]), path[i][1] + f * (path[j][1] - path[i][1])];
}

/** Offset point perpendicular to path direction (meters; + = right of forward). */
function offsetPerpendicular(path, p, meters) {
  const h = headingAlongPath(path, p);
  const lat0 = positionOnPath(path, p)[0];
  const rad = ((h + 90) * Math.PI) / 180;
  const dLat = (meters * Math.cos(rad)) / 111320;
  const dLng = (meters * Math.sin(rad)) / (111320 * Math.cos((lat0 * Math.PI) / 180));
  const [lat, lng] = positionOnPath(path, p);
  return [lat + dLat, lng + dLng];
}

/**
 * Build ordered segment defs: progressShare sums to 1. ticks = number of 5s steps in that phase.
 * hold = true → same progress (idle), no advance along route for those ticks.
 */
function segmentDefinitions(baseScore) {
  const b = baseScore;
  const raw = [
    { id: SCENARIO_IDS.RIDE_STARTED, progressShare: 0.02, ticks: 2, map_visual: MAP_VISUAL.ON_CORRIDOR, car_blink: false, devM: 0, message: 'Ride started — monitoring armed on planned corridor.', score: b },
    { id: SCENARIO_IDS.CRUISE_NORMAL, progressShare: 0.12, ticks: 8, map_visual: MAP_VISUAL.ON_CORRIDOR, car_blink: false, devM: 0, message: 'On planned route — nominal driving toward destination.', score: b },
    { id: SCENARIO_IDS.VISIBILITY_MODERATE, progressShare: 0.08, ticks: 4, map_visual: MAP_VISUAL.VISIBILITY_MODERATE, car_blink: false, devM: 0, message: 'Visibility reduced — moderate caution; on corridor.', score: Math.max(42, b - 8) },
    { id: SCENARIO_IDS.VISIBILITY_HIGH, progressShare: 0.08, ticks: 4, map_visual: MAP_VISUAL.VISIBILITY_HIGH, car_blink: false, devM: 0, message: 'Low visibility stretch — elevated attention.', score: Math.max(38, b - 12) },
    { id: SCENARIO_IDS.TRAFFIC_DELAY, progressShare: 0.07, ticks: 4, map_visual: MAP_VISUAL.TRAFFIC, car_blink: false, devM: 0, message: 'Slow traffic — reduced pace on planned path.', score: Math.max(40, b - 5) },
    { id: SCENARIO_IDS.SLIGHT_DEVIATION, progressShare: 0.1, ticks: 6, map_visual: MAP_VISUAL.SLIGHT_OFF, car_blink: false, devM: 35, message: 'Slight deviation — vehicle following offset path; monitoring.', score: Math.max(36, b - 12) },
    { id: SCENARIO_IDS.SUSTAINED_DEVIATION, progressShare: 0.1, ticks: 6, map_visual: MAP_VISUAL.SUSTAINED_OFF, car_blink: true, devM: 75, message: 'Sustained deviation — following red path; escalated watch.', score: Math.max(30, b - 18) },
    { id: SCENARIO_IDS.SUSTAINED_DEVIATION_HIGH_RISK, progressShare: 0.08, ticks: 5, map_visual: MAP_VISUAL.SUSTAINED_CRITICAL, car_blink: true, devM: 110, message: 'Sustained deviation — high-risk zone.', score: Math.max(22, b - 28) },
    { id: SCENARIO_IDS.IDLE, progressShare: 0, ticks: 4, hold: true, map_visual: MAP_VISUAL.IDLE, car_blink: false, devM: 0, message: 'Vehicle idle — brief stop (traffic / signal).', score: Math.max(34, b - 14) },
    { id: SCENARIO_IDS.LONG_IDLE, progressShare: 0, ticks: 5, hold: true, map_visual: MAP_VISUAL.IDLE_LONG, car_blink: true, devM: 0, message: 'Extended idle — prolonged stop.', score: Math.max(26, b - 22) },
    { id: SCENARIO_IDS.SOS_TRIGGER, progressShare: 0.06, ticks: 4, map_visual: MAP_VISUAL.SOS, car_blink: true, devM: 95, message: '🚨 SOS threat pattern — alerts active.', score: Math.max(14, b - 38) },
    { id: SCENARIO_IDS.RECOVERED_CRUISE, progressShare: 0.09, ticks: 5, map_visual: MAP_VISUAL.RECOVERING, car_blink: false, devM: 0, message: 'Back on track — rejoined green corridor.', score: Math.max(46, b - 6) },
    { id: SCENARIO_IDS.DESTINATION_APPROACH, progressShare: 0.11, ticks: 6, map_visual: MAP_VISUAL.APPROACH, car_blink: false, devM: 0, message: 'Heading to drop-off — completing trip.', score: Math.max(48, b - 4) },
  ];
  const moveSum = raw.reduce((s, d) => s + (d.hold ? 0 : d.progressShare), 0);
  const scale = moveSum > 0 ? 1 / moveSum : 1;
  raw.forEach((d) => {
    if (!d.hold) d.progressShare *= scale;
  });
  return raw;
}

function buildSchedule(path, baseScore) {
  const defs = segmentDefinitions(baseScore);
  let p0 = 0;
  const schedule = [];

  for (const def of defs) {
    const share = def.progressShare || 0;
    const p1 = p0 + share;
    const ticks = def.ticks || 1;
    const hold = def.hold === true;

    for (let k = 0; k < ticks; k++) {
      let progress;
      if (hold) {
        progress = Math.min(1, p0);
      } else {
        const u = ticks === 1 ? 1 : (k + 1) / ticks;
        progress = p0 + (p1 - p0) * u;
      }
      progress = Math.max(0, Math.min(1, progress));

      schedule.push({
        progress,
        scenario: def.id,
        message: def.message,
        score: def.score,
        map_visual: def.map_visual,
        car_blink: def.car_blink,
        devM: def.devM || 0,
        hold,
        progressEnd: p1,
      });
    }

    if (!hold) p0 = p1;
  }

  return schedule;
}

export class FullJourneySimulator {
  constructor(routeCoords, onPing, onComplete, baseScore = 72) {
    this.rawCoords = routeCoords;
    this.path = resamplePolyline(routeCoords, RESAMPLE_POINTS);
    this.onPing = onPing;
    this.onComplete = onComplete;
    this.baseScore = Number(baseScore) || 72;
    this.timerId = null;
    this.tickIndex = 0;
    this.schedule = buildSchedule(this.path, this.baseScore);
  }

  start() {
    this.tickIndex = 0;
    this._tick();
  }

  stop() {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  _tick() {
    if (this.tickIndex >= this.schedule.length) {
      if (this.onComplete) this.onComplete();
      return;
    }

    const step = this.schedule[this.tickIndex];
    const p = step.progress;

    let lat;
    let lng;
    let heading;

    if (step.devM > 0) {
      const o = offsetPerpendicular(this.path, p, step.devM);
      lat = o[0];
      lng = o[1];
      const p2 = Math.min(1, p + 0.003);
      const o2 = offsetPerpendicular(this.path, p2, step.devM);
      heading = bearingDeg(lat, lng, o2[0], o2[1]);
    } else {
      const pos = positionOnPath(this.path, p);
      lat = pos[0];
      lng = pos[1];
      heading = headingAlongPath(this.path, p);
    }

    const prevStep = this.tickIndex > 0 ? this.schedule[this.tickIndex - 1] : null;
    const nextStep = this.tickIndex < this.schedule.length - 1 ? this.schedule[this.tickIndex + 1] : null;
    const isFirst = !prevStep || prevStep.scenario !== step.scenario;
    const isLastInSeg = !nextStep || nextStep.scenario !== step.scenario;

    const ctx = {
      demo_mode: true,
      scenario: step.scenario,
      message: step.message,
      live_score: step.score,
      map_visual: step.map_visual,
      car_blink: step.car_blink,
      heading_deg: heading,
      route_progress: p,
      status: step.score < 45 ? 'High Risk' : step.score < 65 ? 'Moderate Risk' : 'Safe',
      scenario_active: true,
      alert_trigger: isFirst ? 'SCENARIO_START' : isLastInSeg ? 'SCENARIO_RECOVERED' : 'NORMAL',
      progress: { tick: this.tickIndex, total: this.schedule.length },
    };

    if (step.scenario === SCENARIO_IDS.SOS_TRIGGER && isFirst) ctx.sos_new = true;
    if (step.scenario === SCENARIO_IDS.RECOVERED_CRUISE && isFirst) ctx.alert_trigger = 'SCENARIO_RECOVERED';

    if (this.onPing) this.onPing([lat, lng], ctx);

    this.tickIndex += 1;
    this.timerId = setTimeout(() => this._tick(), SIMULATOR_TICK_MS);
  }
}

/**
 * Normal ride: smooth A→B on the green corridor only — minimal scenario churn, no deviation path.
 */
export class CruiseSimulator {
  constructor(routeCoords, onPing, onComplete, baseScore = 72) {
    this.path = resamplePolyline(routeCoords, RESAMPLE_POINTS);
    this.onPing = onPing;
    this.onComplete = onComplete;
    this.baseScore = Number(baseScore) || 72;
    this.timerId = null;
    this.tickIndex = 0;
    /** ~5s per step → ~5 min for 60 steps along the route */
    this.totalTicks = 60;
  }

  start() {
    this.tickIndex = 0;
    this._tick();
  }

  stop() {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  _tick() {
    if (this.tickIndex >= this.totalTicks) {
      if (this.onComplete) this.onComplete();
      return;
    }
    const p = this.totalTicks <= 1 ? 1 : this.tickIndex / (this.totalTicks - 1);
    const pos = positionOnPath(this.path, p);
    const heading = headingAlongPath(this.path, p);

    const ctx = {
      demo_mode: true,
      scenario: SCENARIO_IDS.CRUISE_NORMAL,
      message: 'On planned route — proceeding to destination.',
      live_score: this.baseScore,
      map_visual: MAP_VISUAL.ON_CORRIDOR,
      car_blink: false,
      heading_deg: heading,
      route_progress: p,
      status: 'Safe',
      scenario_active: true,
      alert_trigger: this.tickIndex === 0 ? 'SCENARIO_START' : 'NORMAL',
      progress: { tick: this.tickIndex, total: this.totalTicks },
    };

    if (this.onPing) this.onPing(pos, ctx);
    this.tickIndex += 1;
    this.timerId = setTimeout(() => this._tick(), SIMULATOR_TICK_MS);
  }
}

export function createRideSimulator(routeCoords, onPing, onComplete, options = {}) {
  const { baseScore = 72, fullJourney = true } = options;
  if (fullJourney) {
    return new FullJourneySimulator(routeCoords, onPing, onComplete, baseScore);
  }
  return new CruiseSimulator(routeCoords, onPing, onComplete, baseScore);
}
