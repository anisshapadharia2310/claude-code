'use client';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

/** One palette across every chart, kept accessible on a white card. */
const COLORS = {
  navy: '#0f1f3d',
  blue: '#2563eb',
  lightBlue: '#60a5fa',
  emerald: '#047857',
  amber: '#d97706',
  red: '#b91c1c',
  purple: '#7c3aed',
  grid: '#e2e8f0',
};

const PRIORITY_COLORS: Record<string, string> = {
  P1: COLORS.emerald,
  P2: COLORS.blue,
  P3: COLORS.amber,
  REJECT: COLORS.red,
  'COMPLIANCE HOLD': COLORS.purple,
  COMPLIANCE_HOLD: COLORS.purple,
};

const axisProps = {
  tick: { fontSize: 11, fill: '#475569' },
  stroke: '#cbd5e1',
} as const;

const tooltipStyle = {
  contentStyle: {
    fontSize: 12,
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    boxShadow: '0 4px 12px rgba(15,31,61,0.12)',
  },
} as const;

export function PriorityBarChart({ data }: { data: Array<{ priority: string; count: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey="priority" {...axisProps} />
        <YAxis allowDecimals={false} {...axisProps} />
        <Tooltip {...tooltipStyle} />
        <Bar dataKey="count" name="Contacts" radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.priority} fill={PRIORITY_COLORS[entry.priority] ?? COLORS.navy} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function FunnelChart({ data }: { data: Array<{ stage: string; count: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, left: 100, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} horizontal={false} />
        <XAxis type="number" allowDecimals={false} {...axisProps} />
        <YAxis type="category" dataKey="stage" width={140} {...axisProps} />
        <Tooltip {...tooltipStyle} />
        <Bar dataKey="count" name="Contacts" fill={COLORS.blue} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ScoreDistributionChart({ data }: { data: Array<{ band: string; count: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey="band" {...axisProps} />
        <YAxis allowDecimals={false} {...axisProps} />
        <Tooltip {...tooltipStyle} />
        <Bar dataKey="count" name="Contacts" fill={COLORS.navy} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RegistrationByPriorityChart({
  data,
}: {
  data: Array<{ priority: string; registered: number; attended: number; total: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey="priority" {...axisProps} />
        <YAxis allowDecimals={false} {...axisProps} />
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="total" name="In list" fill={COLORS.grid} radius={[4, 4, 0, 0]} />
        <Bar dataKey="registered" name="Registered" fill={COLORS.blue} radius={[4, 4, 0, 0]} />
        <Bar dataKey="attended" name="Attended" fill={COLORS.emerald} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function EventsOverTimeChart({
  data,
}: {
  data: Array<{ date: string; events: number; positive: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
        <XAxis dataKey="date" {...axisProps} />
        <YAxis allowDecimals={false} {...axisProps} />
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line type="monotone" dataKey="events" name="All events" stroke={COLORS.navy} strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="positive" name="Positive intent" stroke={COLORS.emerald} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function MethodComparisonChart({
  data,
}: {
  data: Array<{ metric: string; oldMethod: number; signal: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey="metric" {...axisProps} />
        <YAxis {...axisProps} unit="%" />
        <Tooltip {...tooltipStyle} formatter={(value: number) => `${value}%`} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="oldMethod" name="Surface-level list" fill={COLORS.amber} radius={[4, 4, 0, 0]} />
        <Bar dataKey="signal" name="SIGNAL-scored list" fill={COLORS.emerald} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AccountEngagementChart({
  data,
}: {
  data: Array<{ company: string; engaged: number; registered: number; attended: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 100, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} horizontal={false} />
        <XAxis type="number" allowDecimals={false} {...axisProps} />
        <YAxis type="category" dataKey="company" width={150} {...axisProps} />
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="engaged" name="Engaged stakeholders" fill={COLORS.blue} radius={[0, 4, 4, 0]} />
        <Bar dataKey="attended" name="Attended" fill={COLORS.emerald} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
