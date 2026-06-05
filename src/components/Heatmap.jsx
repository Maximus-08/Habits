import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, ChevronDown, ChevronUp, Zap, HelpCircle } from 'lucide-react';
import { useHabits } from '../context/HabitsContext';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Primitives';
import { getLocalDateString } from '../utils/dateUtils';

export default function Heatmap() {
  const { completions } = useHabits();
  const [expanded, setExpanded] = useState(false);

  // Constants
  const DAYS_IN_WEEK = 7;
  const WEEKS_COLLAPSED = 16; // ~4 months
  const WEEKS_EXPANDED = 53;  // 1 year
  const numWeeks = expanded ? WEEKS_EXPANDED : WEEKS_COLLAPSED;

  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => getLocalDateString(today), [today]);

  const { dates, columns } = useMemo(() => {
    const endDate = new Date(today);
    const totalDays = numWeeks * DAYS_IN_WEEK;
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - totalDays + 1);

    const startDayOffset = startDate.getDay();
    startDate.setDate(startDate.getDate() - startDayOffset);

    const datesArr = [];
    const dateCursor = new Date(startDate);
    while (dateCursor <= endDate) {
      datesArr.push(new Date(dateCursor));
      dateCursor.setDate(dateCursor.getDate() + 1);
    }

    const cols = [];
    for (let i = 0; i < datesArr.length; i += DAYS_IN_WEEK) {
      cols.push(datesArr.slice(i, i + DAYS_IN_WEEK));
    }

    return { dates: datesArr, columns: cols };
  }, [numWeeks, today]);

  const completionsByDate = useMemo(() => {
    return completions.reduce((acc, c) => {
      const dStr = c.dateNormalized;
      if (!acc[dStr]) {
        acc[dStr] = { count: 0, hasTwoMin: false };
      }
      acc[dStr].count += 1;
      if (c.isTwoMinVersion) {
        acc[dStr].hasTwoMin = true;
      }
      return acc;
    }, {});
  }, [completions]);

  const { totalVotes, twoMinVotes, standardVotes } = useMemo(() => {
    const total = completions.length;
    const twoMin = completions.filter(c => c.isTwoMinVersion).length;
    return {
      totalVotes: total,
      twoMinVotes: twoMin,
      standardVotes: total - twoMin
    };
  }, [completions]);

  const monthLabels = useMemo(() => {
    const labels = [];
    let prevMonth = -1;
    columns.forEach((week, colIdx) => {
      const firstDateOfWeek = week[0];
      const month = firstDateOfWeek.getMonth();
      if (month !== prevMonth && firstDateOfWeek.getDate() <= 7) {
        labels.push({
          text: firstDateOfWeek.toLocaleString('default', { month: 'short' }),
          colIdx
        });
        prevMonth = month;
      }
    });
    return labels;
  }, [columns]);

  const getCellColor = (count) => {
    if (!count) return 'bg-[#F2ECE4] border-[#E5DDD4]'; // Empty cream cell
    if (count === 1) return 'bg-[#CBE4CD] border-[#B7D7B9]'; // Light sage
    if (count === 2) return 'bg-[#A3C9A8] border-[#8FB795]'; // Success sage
    return 'bg-[#7CAE82] border-[#699E70]'; // Darker sage
  };

  return (
    <Card hoverLift={false} className="border border-border/60">
      <CardHeader className="py-4 flex flex-row items-center justify-between">
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-primary" />
          <CardTitle className="text-sm font-semibold uppercase tracking-wider">Activity Tally</CardTitle>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs font-semibold text-primary hover:bg-hoverBg px-2 py-1 rounded flex items-center gap-1 cursor-pointer transition-colors"
        >
          {expanded ? (
            <>
              Collapse <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              Expand Year <ChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </CardHeader>
      
      <CardContent className="pt-2">
        {/* Heatmap Grid Wrapper */}
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[320px] flex flex-col space-y-1.5 pt-1">
            {/* Month Headers */}
            <div className="relative h-4 text-[9px] font-mono text-muted">
              {monthLabels.map((lbl) => (
                <span
                  key={`${lbl.text}_${lbl.colIdx}`}
                  className="absolute"
                  style={{ left: `${lbl.colIdx * 13 + 18}px` }}
                >
                  {lbl.text}
                </span>
              ))}
            </div>

            <div className="flex">
              {/* Day Labels */}
              <div className="flex flex-col justify-between text-[9px] font-mono text-muted mr-1.5 py-0.5 w-4 shrink-0 select-none">
                <span>Su</span>
                <span>Tu</span>
                <span>Th</span>
                <span>Sa</span>
              </div>

              {/* SVG Grid Grid cells */}
              <div className="flex gap-[3px]">
                {columns.map((week, colIdx) => (
                  <div key={colIdx} className="flex flex-col gap-[3px]">
                    {week.map((date, rowIdx) => {
                      const dStr = getLocalDateString(date);
                      const comp = completionsByDate[dStr] || { count: 0, hasTwoMin: false };
                      const isToday = dStr === todayStr;
                      
                      return (
                        <div
                          key={rowIdx}
                          className={`w-2.5 h-2.5 rounded-[2px] border ${getCellColor(comp.count)} relative group transition-colors duration-150 ${
                            isToday ? 'ring-1 ring-primary' : ''
                          }`}
                          title={`${date.toDateString()}: ${comp.count} vote(s) ${comp.hasTwoMin ? '(including 2-min rule)' : ''}`}
                          aria-label={`${date.toDateString()}: ${comp.count} vote(s) ${comp.hasTwoMin ? '(including 2-min rule)' : ''}`}
                        >
                          {/* 2-Min rule indicator dot */}
                          {comp.hasTwoMin && (
                            <span className="absolute -top-[1.5px] -right-[1.5px] block w-1.5 h-1.5 bg-forgive rounded-full border-[0.5px] border-surface" />
                          )}
                          
                          {/* Rich Tooltip (CSS Hover) */}
                          <div className="absolute z-10 hidden group-hover:block bg-text text-white text-[9px] rounded px-2 py-1 font-sans w-28 -bottom-7 left-1/2 -translate-x-1/2 pointer-events-none shadow-md leading-tight text-center">
                            <span className="font-semibold block">{date.toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
                            <span>{comp.count} Vote(s)</span>
                            {comp.hasTwoMin && <span className="text-forgive block font-mono text-[8px] mt-0.5">⚡ 2-Min rule met</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Legend & Quick Statistics */}
        <div className="flex items-center justify-between mt-4 border-t border-border/20 pt-3 text-[11px] text-muted">
          <div className="flex items-center gap-1.5 font-mono">
            <span>Less</span>
            <span className="w-2.5 h-2.5 rounded-[2px] border border-[#E5DDD4] bg-[#F2ECE4]" />
            <span className="w-2.5 h-2.5 rounded-[2px] border border-[#B7D7B9] bg-[#CBE4CD]" />
            <span className="w-2.5 h-2.5 rounded-[2px] border border-[#8FB795] bg-[#A3C9A8]" />
            <span className="w-2.5 h-2.5 rounded-[2px] border border-[#699E70] bg-[#7CAE82]" />
            <span>More</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center text-text font-semibold font-mono bg-hoverBg px-1.5 py-0.5 rounded border border-border/40 gap-0.5">
              <span>{standardVotes}</span>
              <span className="text-[9px] text-muted font-normal">std</span>
            </span>
            <span className="flex items-center text-text font-semibold font-mono bg-forgive/10 px-1.5 py-0.5 rounded border border-forgive/20 gap-0.5">
              <Zap className="w-2.5 h-2.5 text-forgive fill-forgive" />
              <span>{twoMinVotes}</span>
              <span className="text-[9px] text-muted font-normal">2m</span>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
