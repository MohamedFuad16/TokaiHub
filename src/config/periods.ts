/**
 * Class period start/end times. TIPS shows period numbers (1限 / 1st Period) but does not
 * publish the clock times on any page the bridge reads, so they live here, in one place.
 * Source: Tokai University Shinagawa campus timetable used by the original TokaiHub build.
 */
export const PERIOD_TIMES: Record<number, [string, string]> = {
  1: ['09:00', '10:40'], 2: ['10:55', '12:35'], 3: ['13:25', '15:05'],
  4: ['15:20', '17:00'], 5: ['17:15', '18:55'], 6: ['19:05', '20:45'],
};
