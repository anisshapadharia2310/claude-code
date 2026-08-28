'use client';

import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { ReactNode } from 'react';
import type {
  AccountEngagementRow, EventsOverTime, FunnelStage, MethodComparisonRow,
  PriorityCount, RegistrationByPriority, ScoreBucket,
} from '@/server/services/analytics';

/* ===========================================================================
   CHART SYSTEM
   ---------------------------------------------------------------------------
   One palette, shared with the badges and the score visuals, so a colour means
   the same thing in a chart as it does in a table. Grids are hairlines, axes
   are quiet, and the data is the only thing with weight.
   =========================================================================== */

const C = {
  p1: '#1c44ad',
  p2: '#f59e0b',
  p3: '#7c8ca6',
  reject: '#f43f5e',
  hold: '#d97706',
  unscored: '#c4cfe2',
  primary: '#2456d6',
  secondary: '#0a8bae',
  tertiary: '#059553',
  muted: '#a7b4c8',
  grid: '#e4eaf3',
  axis: '#5a6b87',
  label: '#44536c',
} as const;

const PRIORITY_COLOR: Record<string, string> = {
  P1: C.p1, P2: C.p2, P3: C.p3, Reject: C.reject, Hold: C.hold, Unscored: C.unscored,
};

const axis = {
  stroke: C.axis,
  fontSize: 11,
  tickLine: false,
  axisLine: { stroke: C.grid },
  tick: { fill: C.axis },
} as const;

/** Entrance animation, short enough that it never delays reading the data. */
const anim = { animationDuration: 500, animationEasing: 'ease-out' } as const;

interface TooltipRow { name?: string | number; value?: unknown; color?: string; dataKey?: string | number }

/** A tooltip that matches the card system rather than Recharts' default. */
function ChartTooltip({
  active, payload, label, format, title,
}: {
  active?: boolean;
  payload?: TooltipRow[];
  label?: unknown;
  format?: (value: number, name: string) => string;
  title?: (label: string) => ReactNode;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const heading = title ? title(String(label ?? '')) : String(label ?? '');

  return (
    <div className="rounded-lg border border-line bg-white/97 px-3 py-2 shadow-md backdrop-blur-sm">
      {heading ? <p className="mb-1.5 text-xs font-semibold text-navy-900">{heading}</p> : null}
      <ul className="space-y-1">
        {payload.map((entry, index) => {
          const value = Number(entry.value ?? 0);
          const name = String(entry.name ?? '');
          return (
            <li key={`${name}-${index}`} className="flex items-center gap-2 text-xs text-navy-600">
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: entry.color ?? C.primary }}
              />
              <span className="min-w-0 flex-1 truncate">{name}</span>
              <span className="tabular font-semibold text-navy-900">
                {format ? format(value, name) : value.toLocaleString('en-GB')}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const legendStyle = { fontSize: 11, paddingTop: 8, color: C.label } as const;
const cursorFill = { fill: 'rgba(36,86,214,0.05)' } as const;

/**
 * A text alternative for every chart. Charts are pictures of numbers the tables
 * elsewhere already carry, but a chart on its own must still be readable by a
 * screen reader.
 */
function ChartFigure({ summary, height, children }: { summary: string; height: number; children: ReactNode }) {
  return (
    <figure className="animate-fade-in">
      <div role="img" aria-label={summary} style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">{summary}</figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------------ charts */

export function ContactsByPriorityChart({ data }: { data: PriorityCount[] }) {
  const summary = `Contacts by priority: ${data.map((row) => `${row.label} ${row.count}`).join(', ')}.`;
  return (
    <ChartFigure summary={summary} height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }} barCategoryGap="28%">
        <CartesianGrid stroke={C.grid} vertical={false} />
        <XAxis dataKey="label" {...axis} />
        <YAxis {...axis} allowDecimals={false} width={44} />
        <Tooltip cursor={cursorFill} content={<ChartTooltip format={(value) => `${value} contacts`} />} />
        <Bar dataKey="count" name="Contacts" radius={[5, 5, 0, 0]} maxBarSize={64} {...anim}>
          {data.map((entry) => (
            <Cell key={entry.priority} fill={PRIORITY_COLOR[entry.label] ?? C.muted} />
          ))}
        </Bar>
      </BarChart>
    </ChartFigure>
  );
}

export function FunnelChart({ data }: { data: FunnelStage[] }) {
  const summary = `Funnel: ${data.map((stage) => `${stage.stage} ${stage.count}`).join(', ')}.`;
  const top = data[0]?.count ?? 1;
  return (
    <ChartFigure summary={summary} height={288}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 40, bottom: 0, left: 8 }} barCategoryGap="22%">
        <CartesianGrid stroke={C.grid} horizontal={false} />
        <XAxis type="number" {...axis} allowDecimals={false} />
        <YAxis type="category" dataKey="stage" width={158} {...axis} tick={{ fill: C.label, fontSize: 11 }} />
        <Tooltip
          cursor={cursorFill}
          content={
            <ChartTooltip
              format={(value) => `${value} contacts`}
              title={(label) => (
                <>
                  <span className="block">{label}</span>
                  <span className="mt-0.5 block text-2xs font-normal text-navy-500">
                    {data.find((stage) => stage.stage === label)?.description}
                  </span>
                </>
              )}
            />
          }
        />
        <Bar dataKey="count" name="Contacts" radius={[0, 5, 5, 0]} maxBarSize={26} {...anim}>
          {data.map((stage, index) => (
            <Cell
              key={stage.stage}
              // Each stage darkens as the funnel narrows, so depth reads as progress.
              fill={index === data.length - 1 ? C.tertiary : C.primary}
              fillOpacity={0.45 + 0.55 * (1 - (stage.count / Math.max(top, 1)) * 0.6)}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartFigure>
  );
}

export function RegistrationByPriorityChart({ data }: { data: RegistrationByPriority[] }) {
  const summary = data
    .map((row) => `${row.priority}: ${row.contacts} in campaign, ${row.registered} registered, ${row.attended} attended`)
    .join('. ');
  return (
    <ChartFigure summary={`Registration and attendance by priority. ${summary}.`} height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }} barCategoryGap="24%">
        <CartesianGrid stroke={C.grid} vertical={false} />
        <XAxis dataKey="priority" {...axis} />
        <YAxis {...axis} allowDecimals={false} width={44} />
        <Tooltip cursor={cursorFill} content={<ChartTooltip />} />
        <Legend wrapperStyle={legendStyle} iconType="circle" iconSize={7} />
        <Bar dataKey="contacts" name="In campaign" fill={C.muted} radius={[4, 4, 0, 0]} maxBarSize={28} {...anim} />
        <Bar dataKey="registered" name="Registered" fill={C.secondary} radius={[4, 4, 0, 0]} maxBarSize={28} {...anim} />
        <Bar dataKey="attended" name="Attended" fill={C.p1} radius={[4, 4, 0, 0]} maxBarSize={28} {...anim} />
      </BarChart>
    </ChartFigure>
  );
}

export function ScoreDistributionChart({ data }: { data: ScoreBucket[] }) {
  // The buckets align with the priority thresholds, so the chart reads as the
  // shape of the priority model rather than an arbitrary histogram.
  const bucketColor: Record<string, string> = {
    '0-19': C.reject, '20-39': C.reject, '40-59': C.p3, '60-79': C.p2, '80-100': C.p1,
  };
  const summary = `Score distribution: ${data.map((row) => `${row.bucket} points, ${row.count} contacts`).join('; ')}.`;

  return (
    <ChartFigure summary={summary} height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }} barCategoryGap="20%">
        <CartesianGrid stroke={C.grid} vertical={false} />
        <XAxis dataKey="bucket" {...axis} />
        <YAxis {...axis} allowDecimals={false} width={44} />
        <Tooltip cursor={cursorFill} content={<ChartTooltip format={(value) => `${value} contacts`} />} />
        <Bar dataKey="count" name="Contacts" radius={[5, 5, 0, 0]} maxBarSize={72} {...anim}>
          {data.map((entry) => <Cell key={entry.bucket} fill={bucketColor[entry.bucket] ?? C.muted} />)}
        </Bar>
      </BarChart>
    </ChartFigure>
  );
}

export function EventsOverTimeChart({ data }: { data: EventsOverTime[] }) {
  const total = data.reduce((sum, row) => sum + row.events, 0);
  return (
    <ChartFigure
      summary={`Engagement events over time: ${total} events across ${data.length} days.`}
      height={252}
    >
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="signalEventsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.primary} stopOpacity={0.28} />
            <stop offset="100%" stopColor={C.primary} stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={C.grid} vertical={false} />
        <XAxis
          dataKey="date"
          {...axis}
          minTickGap={28}
          tickFormatter={(value: string) => value.slice(5)}
        />
        <YAxis {...axis} allowDecimals={false} width={44} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={legendStyle} iconType="circle" iconSize={7} />
        <Area
          type="monotone" dataKey="events" name="All events"
          stroke={C.primary} strokeWidth={2} fill="url(#signalEventsFill)" {...anim}
        />
        <Line type="monotone" dataKey="registrations" name="Registrations" stroke={C.secondary} strokeWidth={2} dot={false} {...anim} />
        <Line type="monotone" dataKey="attendance" name="Attendance" stroke={C.tertiary} strokeWidth={2} dot={false} {...anim} />
      </AreaChart>
    </ChartFigure>
  );
}

export function AccountEngagementChart({ data }: { data: AccountEngagementRow[] }) {
  const top = data.slice(0, 10).map((row) => ({
    name: row.companyName.length > 24 ? `${row.companyName.slice(0, 23)}…` : row.companyName,
    registered: row.registered,
    attended: row.attended,
    engaged: row.engaged,
    meetings: row.meetingsRequested,
  }));
  const summary = `Account-level engagement for the ten most engaged accounts: ${
    top.map((row) => `${row.name}, ${row.engaged} engaged`).join('; ')}.`;

  return (
    <ChartFigure summary={summary} height={Math.max(248, top.length * 36)}>
      <BarChart data={top} layout="vertical" margin={{ top: 4, right: 20, bottom: 0, left: 8 }} barCategoryGap="26%">
        <CartesianGrid stroke={C.grid} horizontal={false} />
        <XAxis type="number" {...axis} allowDecimals={false} />
        <YAxis type="category" dataKey="name" width={150} {...axis} tick={{ fill: C.label, fontSize: 11 }} />
        <Tooltip cursor={cursorFill} content={<ChartTooltip />} />
        <Legend wrapperStyle={legendStyle} iconType="circle" iconSize={7} />
        <Bar dataKey="engaged" name="Engaged" fill={C.secondary} radius={[0, 4, 4, 0]} maxBarSize={9} {...anim} />
        <Bar dataKey="attended" name="Attended" fill={C.p1} radius={[0, 4, 4, 0]} maxBarSize={9} {...anim} />
        <Bar dataKey="meetings" name="Meetings" fill={C.tertiary} radius={[0, 4, 4, 0]} maxBarSize={9} {...anim} />
      </BarChart>
    </ChartFigure>
  );
}

export function MethodComparisonChart({ data }: { data: MethodComparisonRow[] }) {
  const shaped = [
    { metric: 'Registration', ...pick(data, 'registrationRate') },
    { metric: 'Attendance', ...pick(data, 'attendanceRate') },
    { metric: 'Positive reply', ...pick(data, 'positiveResponseRate') },
    { metric: 'Meeting', ...pick(data, 'meetingRate') },
  ];
  const summary = data
    .map((row) => `${row.method}: attendance ${row.attendanceRate.toFixed(1)} percent, meetings ${row.meetingRate.toFixed(1)} percent`)
    .join('. ');

  return (
    <ChartFigure summary={`Old method versus SIGNAL. ${summary}.`} height={272}>
      <BarChart data={shaped} margin={{ top: 8, right: 8, bottom: 0, left: -16 }} barCategoryGap="30%">
        <CartesianGrid stroke={C.grid} vertical={false} />
        <XAxis dataKey="metric" {...axis} interval={0} />
        <YAxis {...axis} unit="%" width={46} />
        <Tooltip cursor={cursorFill} content={<ChartTooltip format={(value) => `${value.toFixed(1)}%`} />} />
        <Legend wrapperStyle={legendStyle} iconType="circle" iconSize={7} />
        <Bar dataKey="Surface-level list" fill={C.muted} radius={[5, 5, 0, 0]} maxBarSize={38} {...anim} />
        <Bar dataKey="SIGNAL-scored list" fill={C.p1} radius={[5, 5, 0, 0]} maxBarSize={38} {...anim} />
      </BarChart>
    </ChartFigure>
  );
}

function pick(rows: MethodComparisonRow[], key: keyof MethodComparisonRow): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of rows) out[row.method] = Number(rows.length > 0 ? row[key] ?? 0 : 0);
  return out;
}
