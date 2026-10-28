export const animations = [
  ['idle', [280,110,110,140,140,320]],
  ['running-right', [120,120,120,120,120,120,120,220]],
  ['running-left', [120,120,120,120,120,120,120,220]],
  ['waving', [140,140,140,280]],
  ['jumping', [140,140,140,140,280]],
  ['failed', [140,140,140,140,140,140,140,240]],
  ['waiting', [150,150,150,150,150,260]],
  ['running', [120,120,120,120,120,220]],
  ['review', [150,150,150,150,150,280]],
];

export function activityState(type, data = {}) {
  if (type === 'approval/asked') return 'waiting';
  if (type === 'approval/decided') return 'running';
  if (['turn/start','step/start','assistant/chunk','tool/call','tool/result','command/run'].includes(type)) return 'running';
  if (type === 'turn/end') {
    const reason = data.reason?.kind ?? data.reason;
    if (reason === 'blocked') return 'waiting';
    if (reason === 'interrupted' || reason === 'cancelled') return 'failed';
    return reason === 'completed' ? 'review' : 'failed';
  }
  return undefined;
}

export function resolveActivities(states) {
  const values=[...states]; // Map.values() is a one-shot iterator.
  const priority = ['waiting','failed','running','review','idle'];
  return priority.find(state => values.includes(state)) ?? 'idle';
}
