import { useUser } from '../context/UserContext'

export default function HabitCard({ habit, completed, onComplete, onEdit, onDelete, streak = 0, longestStreak = 0, isLoading = false }) {
  const { id, title, description, category, time, location, stackedHabit, twoMinRule, currentProgress = 0, targetSteps = 1 } = habit
  const { incrementHabitProgress } = useUser();

  // Calculate display progress percentage
  const progressPercentage = targetSteps > 1 ? (currentProgress / targetSteps) * 100 : 0;

  return (
    <div className="group relative overflow-hidden bg-white rounded-2xl shadow-sm border border-zinc-200 hover:shadow-card-hover hover:border-secondary/40 transition-all duration-300">
      <div className="absolute top-4 right-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(habit); }}
          className="bg-white/90 hover:bg-secondary text-zinc-400 hover:text-white p-2 rounded-lg shadow-sm transition-all"
          title="Edit habit"
        >
          <span className="material-symbols-outlined text-[20px]">edit</span>
        </button>
        <button
          onClick={() => {
            if (window.confirm('Are you sure you want to delete this habit?')) {
              onDelete(id);
            }
          }}
          className="bg-white/90 hover:bg-red-500 text-zinc-400 hover:text-white p-2 rounded-lg shadow-sm transition-all"
          title="Delete habit"
        >
          <span className="material-symbols-outlined text-[20px]">delete</span>
        </button>
      </div>
      <div className={`absolute top-0 left-0 w-1 h-full transition-all ${completed ? 'bg-primary w-1.5' : 'bg-zinc-200 group-hover:bg-secondary/50'}`}></div>
      <div className="p-6 flex flex-col justify-between gap-4">
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-1 w-full">
            <div className="flex items-center justify-between w-full mb-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest border border-zinc-100 px-2 py-1 rounded-full">
                  {category}
                </span>
                <div className="bg-secondary/10 border border-secondary/20 px-2 py-1 rounded-md flex items-center gap-1 text-[10px] text-secondary font-bold">
                  <span className="material-symbols-outlined text-[14px]">link</span>
                  After <span>{stackedHabit}</span>
                </div>
              </div>
              {/* Streak Badge */}
              {streak > 0 && (
                <div className="hidden md:flex items-center gap-1 bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-1 rounded font-bold text-xs uppercase tracking-wide">
                  <span className="material-symbols-outlined text-[14px]">local_fire_department</span>
                  {streak}d streak
                </div>
              )}
            </div>

            <h3 className="text-xl font-extrabold text-slate-900 mt-1 group-hover:text-secondary transition-colors">{title}</h3>
            <p className="text-slate-500 text-sm">{description}</p>
          </div>
        </div>

        <div className="bg-slate-50 rounded-lg p-3 flex items-center gap-4 text-sm text-slate-600 border border-slate-100/50">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-slate-400 text-lg">schedule</span>
            <span>At <strong>{time}</strong></span>
          </div>
          <div className="w-px h-4 bg-slate-200"></div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-slate-400 text-lg">location_on</span>
            <span>In <strong>{location}</strong></span>
          </div>
          {/* Mobile Streak Display */}
          {streak > 0 && (
            <>
              <div className="w-px h-4 bg-slate-200 md:hidden"></div>
              <div className="flex items-center gap-1 md:hidden text-emerald-600 font-bold">
                <span className="material-symbols-outlined text-lg">local_fire_department</span>
                <span>{streak}d</span>
              </div>
            </>
          )}
        </div>

        {targetSteps > 1 && (
          <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden border border-zinc-100">
            <div
              className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full transition-all duration-500 shadow-glow"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between mt-2 pt-4 border-t border-zinc-50 gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <label className="relative inline-flex items-center cursor-pointer group/toggle">
              <input className="sr-only peer" type="checkbox" />
              <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              <span className="ml-2 text-xs font-bold text-zinc-400 group-hover/toggle:text-zinc-600 transition-colors">2-Min Rule</span>
            </label>
            <div className="flex flex-col">
              <span className="text-xs text-zinc-400 italic">"{twoMinRule}"</span>
            </div>
          </div>
          <button
            onClick={() => {
              if (isLoading) return;
              if (targetSteps > 1 && !completed) {
                incrementHabitProgress(id);
              } else {
                onComplete(id);
              }
            }}
            disabled={isLoading}
            className={`flex items-center gap-2 px-8 py-2.5 rounded-lg font-bold text-sm shadow-md transition-all transform active:scale-95 w-full sm:w-auto justify-center ${isLoading
              ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
              : completed
                ? 'bg-emerald-400 hover:bg-emerald-500 text-white shadow-md'
                : targetSteps > 1
                  ? 'bg-white border border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-600 text-slate-600'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-600'
              }`}
          >
            {isLoading ? (
              <>
                <span className="material-symbols-outlined icon-sm animate-spin">sync</span>
                Updating...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">
                  {completed ? 'check_circle' : targetSteps > 1 ? 'add' : 'check_circle'}
                </span>
                {completed ? 'Complete' : targetSteps > 1 ? `Track (${currentProgress}/${targetSteps})` : 'Complete'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
