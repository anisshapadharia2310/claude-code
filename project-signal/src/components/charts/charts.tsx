'use client';

import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type {
  AccountEngagementRow, EventsOverTime, FunnelStage, MethodComparisonRow,
  PriorityCount, RegistrationByPriority, ScoreBucket,
} from '@/server/services/analytics';

/**
 * Chart palette.
 * One hue per meaning, held constant across every chart so a colour always
 * means the same thing.
 */
const COLORS = {
  p1: '#1d4ed8',
  p2: '#0891b2',
  p3: '#94a3b8',
  reject: '#be123c',
  hold: '#b45309',
  unscored: '#cbd5e1',
  primary: '#2563eb',
  secondary: '#0891b2',
  muted: '#94a3b8',
  grid: '#e3e8ef',
  axis: '#64748b',
};

const PRIORITY_COLOR: Record<string, string> = {
  P1: COLORS.p1, P2: COLORS.p2, P3: COLORS.p3,
  Reject: COLORS.reject, Hold: COLORS.hold, Unscored: COLORS.unscored,
};

const axisProps = {
  stroke: COLORS.axis,
  fontSize: 11,
  tickLine: false,
  axisLine: { stroke: COLORS.grid },
} as const;

const tooltipStyle = {
  contentStyle: {
    borderRadius: 6,
    border: '1px solid #e3e8ef',
    fontSize: 12,
    boxShadow: '0 4px 12px rgb(13 23 40 / 0.08)',
  },
} as const;

export function ContactsByPriorityChart({ data }: { data: PriorityCount[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis {...axisProps} allowDecimals={false} />
        <Tooltip {...tooltipStyle} formatter={(value) => [`${Number(value ?? 0)} contacts`, 'Count']} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Contacts">
          {data.map((entry) => (
            <Cell key={entry.priority} fill={PRIORITY_COLOR[entry.label] ?? COLORS.muted} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function FunnelChart({ data }: { data: FunnelStage[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, bottom: 0, left: 8 }}>
        <CartesianGrid stroke={COLORS.grid} horizontal={false} />
        <XAxis type="number" {...axisProps} allowDecimals={false} />
        <YAxis type="category" dataKey="stage" width={150} {...axisProps} />
        <Tooltip
          {...tooltipStyle}
          formatter={(value) => [`${Number(value ?? 0)} contacts`, 'Count']}
          labelFormatter={(label) => data.find((stage) => stage.stage === String(label))?.description ?? String(label)}
        />
        <Bar dataKey="count" fill={COLORS.primary} radius={[0, 4, 4, 0]} name="Contacts" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RegistrationByPriorityChart({ data }: { data: RegistrationByPriority[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey="priority" {...axisProps} />
        <YAxis {...axisProps} allowDecimals={false} />
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="contacts" name="In campaign" fill={COLORS.muted} radius={[4, 4, 0, 0]} />
        <Bar dataKey="registered" name="Registered" fill={COLORS.secondary} radius={[4, 4, 0, 0]} />
        <Bar dataKey="attended" name="Attended" fill={COLORS.p1} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ScoreDistributionChart({ data }: { data: ScoreBucket[] }) {
  const bucketColor: Record<string, string> = {
    '0-19': COLORS.reject, '20-39': COLORS.reject, '40-59': COLORS.p3,
    '60-79': COLORS.p2, '80-100': COLORS.p1,
  };
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey="bucket" {...axisProps} />
        <YAxis {...axisProps} allowDecimals={false} />
        <Tooltip {...tooltipStyle} formatter={(value) => [`${Number(value ?? 0)} contacts`, 'Count']} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Contacts">
          {data.map((entry) => <Cell key={entry.bucket} fill={bucketColor[entry.bucket] ?? COLORS.muted} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function EventsOverTimeChart({ data }: { data: EventsOverTime[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <defs>
          <linearGradient id="eventsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.35} />
            <stop offset="100%" stopColor={COLORS.primary} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey="date" {...axisProps} minTickGap={24} />
        <YAxis {...axisProps} allowDecimals={false} />
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Area type="monotone" dataKey="events" name="All events" stroke={COLORS.primary} fill="url(#eventsFill)" strokeWidth={2} />
        <Line type="monotone" dataKey="registrations" name="Registrations" stroke={COLORS.secondary} strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="attendance" name="Attendance" stroke={COLORS.p1} strokeWidth={2} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function AccountEngagementChart({ data }: { data: AccountEngagementRow[] }) {
  const top = data.slice(0, 10).map((row) => ({
    name: row.companyName.length > 22 ? `${row.companyName.slice(0, 21)}…` : row.companyName,
    registered: row.registered,
    attended: row.attended,
    engaged: row.engaged,
    meetings: row.meetingsRequested,
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(240, top.length * 34)}>
      <BarChart data={top} layout="vertical" margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
        <CartesianGrid stroke={COLORS.grid} horizontal={false} />
        <XAxis type="number" {...axisProps} allowDecimals={false} />
        <YAxis type="category" dataKey="name" width={150} {...axisProps} />
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="engaged" name="Engaged" fill={COLORS.secondary} radius={[0, 3, 3, 0]} />
        <Bar dataKey="attended" name="Attended" fill={COLORS.p1} radius={[0, 3, 3, 0]} />
        <Bar dataKey="meetings" name="Meetings" fill="#047857" radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MethodComparisonChart({ data }: { data: MethodComparisonRow[] }) {
  const shaped = [
    { metric: 'Registration rate', ...pick(data, 'registrationRate') },
    { metric: 'Attendance rate', ...pick(data, 'attendanceRate') },
    { metric: 'Positive response rate', ...pick(data, 'positiveResponseRate') },
    { metric: 'Meeting rate', ...pick(data, 'meetingRate') },
  ];

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={shaped} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey="metric" {...axisProps} interval={0} tick={{ fontSize: 10 }} />
        <YAxis {...axisProps} unit="%" />
        <Tooltip {...tooltipStyle} formatter={(value) => `${Number(value ?? 0).toFixed(1)}%`} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="Surface-level list" fill={COLORS.muted} radius={[4, 4, 0, 0]} />
        <Bar dataKey="SIGNAL-scored list" fill={COLORS.p1} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function pick(rows: MethodComparisonRow[], key: keyof MethodComparisonRow): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of rows) out[row.method] = Number(row[key] ?? 0);
  return out;
}
