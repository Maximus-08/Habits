
export default function StreakTracker({ streaks }) {
    return (
        <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-sm">
            <div className="flex items-center gap-2 mb-6 border-b border-zinc-100 pb-4">
                <div className="bg-secondary/10 p-2 rounded-lg text-secondary">
                    <span className="material-symbols-outlined icon-sm">link</span>
                </div>
                <h2 className="text-xl font-bold tracking-tight text-zinc-900">Don't Break the Chain</h2>
            </div>
            <div className="flex flex-col gap-0 relative">
                <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-zinc-100 -z-0"></div>
                {streaks.map((streak, index) => (
                    <div key={index}>
                        <div className={`flex items-center justify-between py-3 relative z-10 bg-white group cursor-default rounded-xl hover:bg-zinc-50 transition-colors px-3 -mx-3`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-white ${streak.active
                                        ? 'bg-primary shadow-glow text-white group-hover:scale-110'
                                        : streak.days > 0
                                            ? 'bg-zinc-100 text-zinc-400 group-hover:text-primary group-hover:bg-primary/10'
                                            : 'bg-zinc-50 text-zinc-300 ring-1 ring-zinc-100'
                                    } transition-all`}>
                                    <span className="material-symbols-outlined icon-sm">{streak.icon}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className={`font-bold ${streak.days > 0 ? 'text-zinc-900 group-hover:text-primary' : 'text-zinc-400'} transition-colors`}>
                                        {streak.name}
                                    </span>
                                    <span className="text-xs text-zinc-500 font-medium">{streak.days > 0 ? 'Current Streak' : 'Last Streak'}</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className={`text-2xl font-black ${streak.active ? 'text-primary' : streak.days > 0 ? 'text-zinc-700' : 'text-zinc-300'}`}>
                                    {streak.days}
                                </span>
                                <span className={`text-[10px] font-bold uppercase ${streak.days > 0 ? 'text-zinc-400' : 'text-zinc-300'}`}>Days</span>
                            </div>
                        </div>
                        {index < streaks.length - 1 && <div className="h-4"></div>}
                    </div>
                ))}
            </div>
            <div className="mt-8 p-4 bg-zinc-50 rounded-xl border border-transparent hover:border-secondary/20 transition-colors">
                <p className="text-xs text-zinc-500 leading-relaxed text-center italic font-medium">
                    "You do not rise to the level of your goals. You fall to the level of your systems."
                </p>
            </div>
        </div>
    )
}
