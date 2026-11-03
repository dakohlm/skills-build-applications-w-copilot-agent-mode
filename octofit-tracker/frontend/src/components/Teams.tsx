import { CapabilityCard } from './CapabilityCard.js';
export default function Teams() {
  return (
    <CapabilityCard
      title="Teams"
      description="Manage teams and members."
      endpoint="/api/teams"
      dataKey="teams"
      emptyText="No teams yet."
      renderItem={(team) => {
        const members = Array.isArray(team.members) ? team.members.map(String).join(', ') : '';
        return <>{String(team.name)} · mascot: {String(team.mascot)} · members: {members || 'none'}</>;
      }}
    />
  );
}
