import { Types } from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

export async function listActivities() {
  return Activity.find().lean();
}

type InputRecord = Record<string, unknown>;

function isRecord(input: unknown): input is InputRecord {
  return typeof input === 'object' && input !== null && !Array.isArray(input);
}

function badRequest(message: string) {
  return Object.assign(new Error(message), { status: 400 });
}

function requiredText(input: InputRecord, key: string) {
  const value = input[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw badRequest(`${key} is required`);
  }
  return value.trim();
}

function objectId(input: InputRecord, key: string) {
  const value = input[key];
  if (typeof value !== 'string' || !Types.ObjectId.isValid(value)) {
    throw badRequest(`${key} must be a valid ID`);
  }
  return value;
}

export async function createActivity(input: unknown) {
  if (!isRecord(input)) throw badRequest('Activity details are required');

  const userId = objectId(input, 'userId');
  const teamId = objectId(input, 'teamId');
  const type = requiredText(input, 'type');
  const minutes = input.minutes;
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < 1) {
    throw badRequest('minutes must be a positive number');
  }

  const [user, team] = await Promise.all([User.exists({ _id: userId }), Team.exists({ _id: teamId })]);
  if (!user || !team) throw badRequest('userId and teamId must reference existing records');

  return Activity.create({ user: userId, team: teamId, type, minutes, points: minutes, occurredAt: new Date() });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (!isRecord(input)) throw badRequest('Team details are required');

  const name = requiredText(input, 'name');
  const mascot = requiredText(input, 'mascot');
  const membersInput = input.members ?? [];
  if (!Array.isArray(membersInput)) throw badRequest('members must be an array of user IDs');

  const memberIds = membersInput.map((member) => {
    if (typeof member !== 'string' || !Types.ObjectId.isValid(member)) {
      throw badRequest('members must contain valid user IDs');
    }
    return member;
  });
  if (memberIds.length > 0) {
    const memberCount = await User.countDocuments({ _id: { $in: memberIds } });
    if (memberCount !== new Set(memberIds).size) throw badRequest('members must reference existing users');
  }

  return Team.create({ name, mascot, members: memberIds });
}

export async function getLeaderboard() {
  const [teams, pointTotals] = await Promise.all([
    Team.find().lean(),
    Activity.aggregate<{ _id: Types.ObjectId; totalPoints: number }>([
      { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    ]),
  ]);
  const pointsByTeam = new Map(pointTotals.map(({ _id, totalPoints }) => [_id.toString(), totalPoints]));
  return teams
    .map((team) => ({
      teamName: team.name,
      totalPoints: pointsByTeam.get(team._id.toString()) ?? 0,
    }))
    .sort((left, right) => right.totalPoints - left.totalPoints || left.teamName.localeCompare(right.teamName))
    .map((team, index) => ({ ...team, rank: index + 1 }));
}

function focusForActivity(type: string) {
  const normalized = type.toLowerCase();
  if (['run', 'cycle', 'walk', 'swim', 'cardio'].includes(normalized)) return 'endurance';
  return normalized;
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail.toLowerCase() }).lean();
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

  const [activities, workouts] = await Promise.all([
    Activity.find({ user: user._id }).sort({ occurredAt: -1 }).limit(5).lean(),
    Workout.find().lean(),
  ]);
  const focusPriorities = [...new Set([user.fitnessGoal, ...activities.map(({ type }) => focusForActivity(type))])];
  const priorityByFocus = new Map(focusPriorities.map((focus, index) => [focus.toLowerCase(), index]));
  const orderedWorkouts = workouts
    .map((workout, index) => ({ workout, index, priority: priorityByFocus.get(workout.focus.toLowerCase()) ?? focusPriorities.length }))
    .sort((left, right) => left.priority - right.priority || left.index - right.index);

  return orderedWorkouts.map(({ workout, priority }) => {
    const matchingFocus = focusPriorities[priority];
    const reason = matchingFocus === user.fitnessGoal
      ? `Supports your ${user.fitnessGoal} fitness goal.`
      : matchingFocus
        ? `Builds on your recent ${matchingFocus} activity.`
        : `A balanced workout to support your ${user.fitnessGoal} fitness goal.`;
    return { ...workout, reason };
  });
}

export { User };
