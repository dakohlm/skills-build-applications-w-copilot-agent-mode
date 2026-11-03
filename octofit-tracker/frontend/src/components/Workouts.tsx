import { CapabilityCard } from './CapabilityCard.js';
export default function Workouts() {
  return (
    <CapabilityCard
      title="Workout suggestions"
      description="Recommend workouts from activity patterns."
      endpoint={`/api/workouts/suggestions/${encodeURIComponent('mona@example.com')}`}
      dataKey="suggestions"
      emptyText="No workout suggestions yet."
      renderItem={(workout) => <>{String(workout.title)} · {String(workout.focus)} · {String(workout.minutes)} minutes · {String(workout.difficulty)}{workout.reason ? ` — ${String(workout.reason)}` : ''}</>}
    />
  );
}
