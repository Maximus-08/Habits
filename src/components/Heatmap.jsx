import React from 'react';
import HeatMap from '@uiw/react-heat-map';

export default function Heatmap({ data }) {
    // data is expected to be array of { date, count }

    return (
        <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                <span className="material-symbols-outlined text-9xl text-zinc-900">grid_on</span>
            </div>

            <div className="flex flex-col gap-4 relative z-10 w-full">
                <HeatMap
                    value={data}
                    width="100%"
                    style={{ color: '#a1a1aa' }}
                    startDate={new Date(new Date().setMonth(new Date().getMonth() - 6))}
                    rectSize={14}
                    space={4}
                    legendCellSize={0}
                    rectProps={{
                        rx: 3,
                    }}
                    panelColors={{
                        0: '#f4f4f5',
                        2: '#d1fae5',
                        4: '#6ee7b7',
                        10: '#34d399',
                        20: '#10b981',
                    }}
                />
            </div>
            <div className="flex items-center gap-3 mt-6 text-xs text-slate-400">
                <span>Less</span>
                <div className="flex gap-1">
                    <div className="size-3 rounded-sm bg-slate-100"></div>
                    <div className="size-3 rounded-sm bg-primary/20"></div>
                    <div className="size-3 rounded-sm bg-primary/50"></div>
                    <div className="size-3 rounded-sm bg-primary"></div>
                </div>
                <span>More</span>
            </div>
            <div className="flex flex-col gap-4 relative z-10 w-full"></div>
        </div>
    );
}


