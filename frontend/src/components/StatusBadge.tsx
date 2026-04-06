import type { StatusLevel } from '../types';

const StatusBadge = ({ status }: { status: StatusLevel }) => {
  const classes = {
    Critical: 'badge-critical',
    Moderate: 'badge-moderate',
    Stable:   'badge-stable',
  };
  return <span className={classes[status]}>{status}</span>;
};

export default StatusBadge;
