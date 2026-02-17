import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import NavBar from '../components/NavBar'
import { useUser } from '../context/UserContext'
import { useAuth } from '../context/AuthContext'
import { isHabitCompletedToday } from '../utils/dateHelpers'
import { validateHabit, sanitizeInput } from '../utils/validation'
import * as firestoreService from '../services/firestoreService'

export default function IdentityManagement() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { identity, setIdentity, habits, allCompletions, addHabit, updateHabit, deleteHabit } = useUser();
  const formRef = useRef(null);

  // Local identity state
  const [localIdentity, setLocalIdentity] = useState(identity);
  const [selectedIdentity, setSelectedIdentity] = useState(identity);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Bad habits state
  const [badHabits, setBadHabits] = useState([]);
  const [selectedBadHabit, setSelectedBadHabit] = useState(null);
  const [newBadHabitName, setNewBadHabitName] = useState('');
  const [isAddingBadHabit, setIsAddingBadHabit] = useState(false);
  const [loading, setLoading] = useState(false);

  // Add/Edit habit form state (moved from Dashboard)
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [newHabit, setNewHabit] = useState({
    title: '',
    description: '',
    category: '',
    time: '',
    location: '',
    stackedHabit: '',
    twoMinRule: '',
    targetSteps: 1
  });

  // Sync local identity
  const prevIdentityRef = useRef(identity);
  const isInitialMount = useRef(true);

  useEffect(() => {
    const identityChangedExternally = prevIdentityRef.current !== identity;
    const localMatchesContext = localIdentity === prevIdentityRef.current;

    if (isInitialMount.current || (identityChangedExternally && localMatchesContext)) {
      setLocalIdentity(identity);
    }

    prevIdentityRef.current = identity;
    isInitialMount.current = false;
  }, [identity]);

  useEffect(() => {
    setHasUnsavedChanges(localIdentity !== identity);
  }, [localIdentity, identity]);

  useEffect(() => {
    if (!selectedIdentity) {
      setSelectedIdentity(identity);
    }
  }, [identity, selectedIdentity]);

  const identities = useMemo(() => {
    const set = new Set();
    if (identity) set.add(identity);
    habits.forEach(h => { if (h.identityName) set.add(h.identityName); });
    badHabits.forEach(h => { if (h.identityName) set.add(h.identityName); });
    return Array.from(set);
  }, [identity, habits, badHabits]);


  // Load bad habits
  const loadBadHabits = async () => {
    if (!user) return;
    const { data } = await firestoreService.getBadHabits(user.uid);
    setBadHabits(data || []);
    // Only select first if not editing specific one
    if (data && data.length > 0 && !selectedBadHabit && !searchParams.get('editBad')) {
      setSelectedBadHabit(data[0]);
    }
  };

  useEffect(() => {
    if (user) loadBadHabits();
  }, [user]);

  // Handle query params for add/edit from Dashboard
  useEffect(() => {
    const editId = searchParams.get('edit');
    const addParam = searchParams.get('add');
    const editBadId = searchParams.get('editBad');

    if (editId && habits.length > 0) {
      const habitToEdit = habits.find(h => h.id === editId);
      if (habitToEdit) {
        handleEditHabit(habitToEdit);
        setSearchParams({}, { replace: true });
      }
    } else if (addParam === 'true') {
      setShowAddHabit(true);
      setEditingHabit(null);
      setSearchParams({}, { replace: true });
    } else if (editBadId && badHabits.length > 0) {
      const badHabitToEdit = badHabits.find(h => h.id === editBadId);
      if (badHabitToEdit) {
        setSelectedBadHabit(badHabitToEdit);
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, habits, badHabits]);

  // Scroll to form when it opens
  useEffect(() => {
    if ((showAddHabit || editingHabit) && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [showAddHabit, editingHabit]);



  // Days free for selected bad habit
  const daysFree = useMemo(() => {
    if (!selectedBadHabit) return 0;
    const lapses = selectedBadHabit.lapses || [];
    if (lapses.length === 0) {
      const createdAt = selectedBadHabit.createdAt?.toDate?.() || new Date(selectedBadHabit.createdAt);
      const diffTime = Date.now() - createdAt.getTime();
      return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }
    const lastLapse = lapses[lapses.length - 1];
    const lapseDate = lastLapse?.toDate?.() || new Date(lastLapse);
    const diffTime = Date.now() - lapseDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }, [selectedBadHabit]);

  const handleAddBadHabit = async () => {
    if (!user || !newBadHabitName.trim()) return;
    setLoading(true);
    const { id, success, error } = await firestoreService.saveBadHabit(user.uid, {
      name: newBadHabitName.trim(),
      identityName: selectedIdentity || identity,
      lapses: []
    });
    if (success) {
      const newHabitObj = { id, name: newBadHabitName.trim(), identityName: selectedIdentity || identity, lapses: [], createdAt: new Date() };
      setBadHabits(prev => [...prev, newHabitObj]);
      setSelectedBadHabit(newHabitObj);
      setNewBadHabitName('');
      setIsAddingBadHabit(false);
      toast.success('Bad habit added');
    } else {
      toast.error(error || 'Failed to add bad habit');
    }
    setLoading(false);
  };

  const handleLogRelapse = async () => {
    if (!user || !selectedBadHabit) return;
    setLoading(true);
    const { success, error } = await firestoreService.logBadHabitLapse(user.uid, selectedBadHabit.id);
    if (success) {
      await loadBadHabits();
      toast.success('Relapse logged. Keep trying!');
    } else {
      toast.error(error || 'Failed to log relapse');
    }
    setLoading(false);
  };


  const handleUpdateBadHabit = async () => {
    if (!user || !selectedBadHabit || !selectedBadHabit.name?.trim()) return;
    setLoading(true);
    const { success, error } = await firestoreService.updateBadHabit(user.uid, selectedBadHabit.id, {
      name: selectedBadHabit.name.trim(),
      identityName: selectedBadHabit.identityName || selectedIdentity || identity
    });
    if (success) {
      toast.success('Bad habit updated');
      await loadBadHabits();
    } else {
      toast.error(error || 'Failed to update bad habit');
    }
    setLoading(false);
  };

  const handleDeleteBadHabit = async () => {
    if (!user || !selectedBadHabit) return;
    if (!window.confirm('Delete this bad habit? This action cannot be undone.')) return;
    setLoading(true);
    const { success, error } = await firestoreService.deleteBadHabit(user.uid, selectedBadHabit.id);
    if (success) {
      toast.success('Bad habit deleted');
      const remaining = badHabits.filter(h => h.id !== selectedBadHabit.id);
      setBadHabits(remaining);
      setSelectedBadHabit(remaining[0] || null);
    } else {
      toast.error(error || 'Failed to delete bad habit');
    }
    setLoading(false);
  };

  const handleSaveIdentity = async () => {
    if (!localIdentity.trim()) {
      toast.error('Identity cannot be empty');
      return;
    }
    setLoading(true);
    await setIdentity(localIdentity.trim());
    toast.success('Identity saved!');
    setLoading(false);
  };

  // Habit form handlers (moved from Dashboard)
  const handleEditHabit = (habit) => {
    setSelectedIdentity(habit.identityName || identity);
    setEditingHabit(habit);
    setNewHabit({
      title: habit.title,
      description: habit.description || '',
      category: habit.category || '',
      time: habit.time || '',
      location: habit.location || '',
      stackedHabit: habit.stackedHabit || '',
      twoMinRule: habit.twoMinRule || '',
      targetSteps: habit.targetSteps || 1
    });
    setValidationErrors({});
    setShowAddHabit(true);
  };

  const handleAddHabitSubmit = () => {
    const validation = validateHabit(newHabit);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }
    const sanitizedHabit = {
      title: sanitizeInput(newHabit.title),
      description: sanitizeInput(newHabit.description),
      category: sanitizeInput(newHabit.category),
      time: sanitizeInput(newHabit.time),
      location: sanitizeInput(newHabit.location),
      stackedHabit: sanitizeInput(newHabit.stackedHabit),
      twoMinRule: sanitizeInput(newHabit.twoMinRule),
      targetSteps: parseInt(newHabit.targetSteps) || 1,
      identityName: selectedIdentity || identity,
    };
    addHabit(sanitizedHabit);
    resetForm();
  };

  const handleSaveEdit = () => {
    const validation = validateHabit(newHabit);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }
    const sanitizedHabit = {
      title: sanitizeInput(newHabit.title),
      description: sanitizeInput(newHabit.description),
      category: sanitizeInput(newHabit.category),
      time: sanitizeInput(newHabit.time),
      location: sanitizeInput(newHabit.location),
      stackedHabit: sanitizeInput(newHabit.stackedHabit),
      twoMinRule: sanitizeInput(newHabit.twoMinRule),
      targetSteps: parseInt(newHabit.targetSteps) || 1,
    };
    updateHabit(editingHabit.id, sanitizedHabit);
    resetForm();
  };

  const resetForm = () => {
    setNewHabit({ title: '', description: '', category: '', time: '', location: '', stackedHabit: '', twoMinRule: '', targetSteps: 1 });
    setValidationErrors({});
    setEditingHabit(null);
    setShowAddHabit(false);
  };

  const evidence = habits.filter(h => (h.identityName || identity) === (selectedIdentity || identity)).map(habit => ({
    id: habit.id,
    task: habit.title,
    schedule: `${habit.category} • ${habit.time}`,
    completed: isHabitCompletedToday(habit.id, allCompletions)
  }));

  return (
    <div className="font-display bg-background-light text-text-main antialiased overflow-x-hidden min-h-screen flex flex-col">
      <NavBar currentPage="identity" />

      <div className="layout-container flex h-full grow flex-col max-w-[1440px] mx-auto w-full">
        <div className="px-4 md:px-10 lg:px-20 pt-10 pb-6">
          <div className="flex flex-wrap justify-between gap-6 items-end">
            <div className="flex flex-col gap-2">
              <h1 className="text-slate-900 text-3xl md:text-4xl font-extrabold leading-tight tracking-tight">Identity Architect</h1>
              <p className="text-text-muted text-base font-normal max-w-2xl">
                "Every action you take is a vote for the type of person you wish to become."
              </p>
            </div>
            <div className="flex gap-3 items-center">
              {hasUnsavedChanges && (
                <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                  <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                  Unsaved changes
                </span>
              )}
              <button
                onClick={handleSaveIdentity}
                disabled={loading || !hasUnsavedChanges}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-subtle-blue ${hasUnsavedChanges
                  ? 'bg-primary hover:bg-primary-hover text-white shadow-primary/20'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
              >
                <span className="material-symbols-outlined !text-[18px]">{loading ? 'sync' : 'save'}</span>
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 px-4 md:px-10 lg:px-20 py-6 pb-20">
          {/* Left Column - Identity Builder & Good Habits */}
          <div className="flex-1 flex flex-col gap-8">
            {/* Identity Editor */}
            <div className="bg-surface rounded-xl border border-slate-100 shadow-subtle-blue overflow-hidden p-6 lg:p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="bg-primary-light p-2.5 rounded-lg">
                  <span className="material-symbols-outlined text-primary">psychology</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900">Edit Your Beliefs</h2>
              </div>

              <div className="flex flex-col gap-8">
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Core Identity</span>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-bold z-10">I am </span>
                    <input
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg pl-20 pr-4 py-4 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-slate-400 text-lg font-bold shadow-sm group-hover:bg-white"
                      type="text"
                      value={localIdentity}
                      onChange={(e) => setLocalIdentity(e.target.value)}
                    />
                  </div>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Manage Habits For Identity</span>
                  <select
                    className="w-full bg-white border border-slate-200 text-slate-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                    value={selectedIdentity || identity}
                    onChange={(e) => setSelectedIdentity(e.target.value)}
                  >
                    {identities.map((identityName) => (
                      <option key={identityName} value={identityName}>{identityName}</option>
                    ))}
                  </select>
                </label>

                {/* Evidence / Good Habits */}
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Good Habits (Votes Cast)</span>
                    <span className="text-xs font-bold text-primary bg-primary-light px-3 py-1 rounded-md">{evidence.length} Active Habits</span>
                  </div>

                  {evidence.map((item) => (
                    <div key={item.id} className="group flex items-center gap-4 bg-white border border-slate-200 p-4 rounded-xl hover:border-primary/50 hover:shadow-subtle-blue transition-all cursor-pointer">
                      <div className={`flex items-center justify-center shrink-0 rounded-full p-1.5 ${item.completed ? 'text-primary bg-primary-light' : 'text-slate-300'}`}>
                        <span className="material-symbols-outlined !text-[20px]">
                          {item.completed ? 'check_circle' : 'circle'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-slate-900 font-bold text-sm">{item.task}</p>
                        <p className="text-text-muted text-xs mt-0.5 font-medium">{item.schedule}</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditHabit(habits.find(h => h.id === item.id)); }}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-primary transition-all p-2 hover:bg-primary-light rounded-lg">
                        <span className="material-symbols-outlined !text-[20px]">edit</span>
                      </button>
                    </div>
                  ))}

                  {/* Add Habit Button */}
                  {!showAddHabit ? (
                    <button
                      onClick={() => { setShowAddHabit(true); setEditingHabit(null); }}
                      className="mt-2 flex items-center justify-center gap-2 w-full py-4 border border-dashed border-slate-300 rounded-xl text-text-muted font-semibold hover:text-primary hover:border-primary hover:bg-primary-light/30 transition-all group"
                    >
                      <span className="material-symbols-outlined group-hover:scale-110 transition-transform">add</span>
                      Add New Habit
                    </button>
                  ) : (
                    /* Add/Edit Habit Form */
                    <div ref={formRef} className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6 mt-2">
                      <h3 className="text-lg font-bold text-zinc-900 mb-4">
                        {editingHabit ? 'Edit Habit' : 'Add New Habit'}
                      </h3>

                      {Object.keys(validationErrors).length > 0 && (
                        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
                          <p className="text-sm text-red-600 font-medium">Please fix the following errors:</p>
                          <ul className="mt-2 text-sm text-red-600 list-disc list-inside">
                            {Object.values(validationErrors).map((error, idx) => (
                              <li key={idx}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <input
                            className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none ${validationErrors.title ? 'border-red-300 bg-red-50' : 'border-zinc-200'}`}
                            placeholder="Habit Title *"
                            value={newHabit.title}
                            onChange={(e) => setNewHabit({ ...newHabit, title: e.target.value })}
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none ${validationErrors.description ? 'border-red-300 bg-red-50' : 'border-zinc-200'}`}
                            placeholder="Description *"
                            value={newHabit.description}
                            onChange={(e) => setNewHabit({ ...newHabit, description: e.target.value })}
                          />
                        </div>
                        <input
                          className="w-full border border-zinc-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                          placeholder="Category (e.g., Morning • Cardio)"
                          value={newHabit.category}
                          onChange={(e) => setNewHabit({ ...newHabit, category: e.target.value })}
                        />
                        <input
                          className="w-full border border-zinc-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                          placeholder="Time (e.g., 07:00 AM)"
                          value={newHabit.time}
                          onChange={(e) => setNewHabit({ ...newHabit, time: e.target.value })}
                        />
                        <input
                          className="w-full border border-zinc-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                          placeholder="Location"
                          value={newHabit.location}
                          onChange={(e) => setNewHabit({ ...newHabit, location: e.target.value })}
                        />
                        <input
                          className="w-full border border-zinc-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                          placeholder="Stacked Habit (After...)"
                          value={newHabit.stackedHabit}
                          onChange={(e) => setNewHabit({ ...newHabit, stackedHabit: e.target.value })}
                        />
                        <input
                          className="col-span-2 w-full border border-zinc-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                          placeholder="2-Min Rule (Quick start action)"
                          value={newHabit.twoMinRule}
                          onChange={(e) => setNewHabit({ ...newHabit, twoMinRule: e.target.value })}
                        />
                        <div className="col-span-2 flex items-center gap-4 bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                          <span className="text-sm font-bold text-zinc-600">Target Steps/Times (0 for simple check):</span>
                          <input
                            type="number"
                            min="1"
                            className="w-24 border border-zinc-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                            value={newHabit.targetSteps}
                            onChange={(e) => setNewHabit({ ...newHabit, targetSteps: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="flex gap-3 mt-4">
                        <button
                          onClick={resetForm}
                          className="flex-1 py-3 text-zinc-500 font-bold hover:bg-zinc-50 rounded-xl transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={editingHabit ? handleSaveEdit : handleAddHabitSubmit}
                          className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover shadow-lg shadow-primary/30 hover:-translate-y-0.5 transition-all"
                        >
                          {editingHabit ? 'Save Changes' : 'Save Habit'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 1% Rule Card */}
            <div className="bg-surface rounded-xl border border-slate-100 shadow-subtle-blue p-8 relative overflow-hidden min-h-[200px] flex flex-col justify-center group hover:shadow-lg transition-shadow">
              <div className="absolute inset-0 z-0 opacity-10 bg-gradient-to-r from-blue-100 to-green-100"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-transparent z-0"></div>
              <div className="relative z-10 max-w-[90%]">
                <h3 className="text-primary text-lg font-bold mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined">trending_up</span>
                  The 1% Rule
                </h3>
                <p className="text-slate-600 text-sm font-medium leading-relaxed">
                  Improving by 1% isn't particularly notable, but it can be far more meaningful in the long run. The difference a tiny improvement can make over time is astounding.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Bad Habits (The Inversion) */}
          <div className="flex-1 flex flex-col gap-8">
            <div className="bg-white rounded-xl border border-coral/20 shadow-subtle-blue overflow-hidden relative">
              <div className="absolute top-0 right-0 w-48 h-48 bg-coral/5 blur-[80px] rounded-full pointer-events-none"></div>
              <div className="p-6 lg:p-8 relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="bg-coral-light p-2.5 rounded-lg border border-coral/10">
                      <span className="material-symbols-outlined text-coral">warning</span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">The Inversion</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAddingBadHabit ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newBadHabitName}
                          onChange={(e) => setNewBadHabitName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddBadHabit()}
                          placeholder="e.g. Late Night Snacking"
                          className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-2 shadow-sm outline-none focus:border-coral"
                          autoFocus
                        />
                        <button
                          onClick={handleAddBadHabit}
                          disabled={loading || !newBadHabitName.trim()}
                          className="bg-coral text-white px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 hover:bg-coral-dark transition-colors"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => setIsAddingBadHabit(false)}
                          className="text-slate-400 hover:text-slate-600 outline-none"
                        >
                          <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="relative">
                          <select
                            className="bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg focus:ring-2 focus:ring-coral/20 focus:border-coral block pl-3 pr-8 py-2.5 shadow-sm outline-none cursor-pointer hover:border-coral/50 transition-colors appearance-none"
                            value={selectedBadHabit?.id || ''}
                            onChange={(e) => {
                              const habit = badHabits.find(h => h.id === e.target.value);
                              setSelectedBadHabit(habit);
                            }}
                          >
                            {badHabits.length === 0 && (
                              <option value="">No bad habits tracked</option>
                            )}
                            {badHabits.filter(h => (h.identityName || identity) === (selectedIdentity || identity)).map(habit => (
                              <option key={habit.id} value={habit.id}>{habit.name}</option>
                            ))}
                          </select>
                          <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-sm">expand_more</span>
                        </div>
                        <button
                          onClick={() => setIsAddingBadHabit(true)}
                          className="text-coral hover:bg-coral-light p-2 rounded-lg transition-colors"
                          title="Add bad habit"
                        >
                          <span className="material-symbols-outlined text-[18px]">add</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {selectedBadHabit ? (
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1 bg-white rounded-xl p-6 border border-slate-100 shadow-card flex flex-col items-center justify-center text-center relative group hover:border-coral/20 transition-colors">
                      <span className="text-5xl font-black text-slate-800 tracking-tighter mb-1 mt-2">{daysFree}</span>
                      <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Days Free</span>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full mt-6 overflow-hidden">
                        <div className="bg-primary h-full rounded-full" style={{ width: `${Math.min((daysFree / 30) * 100, 100)}%` }}></div>
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col gap-4">
                      <input
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800"
                        value={selectedBadHabit.name || ''}
                        onChange={(e) => setSelectedBadHabit(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Bad habit name"
                      />
                      <select
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700"
                        value={selectedBadHabit.identityName || selectedIdentity || identity}
                        onChange={(e) => setSelectedBadHabit(prev => ({ ...prev, identityName: e.target.value }))}
                      >
                        {identities.map((identityName) => (
                          <option key={identityName} value={identityName}>{identityName}</option>
                        ))}
                      </select>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500 uppercase">Total Relapses</span>
                        <span className="text-slate-800 font-bold text-sm">{selectedBadHabit.lapses?.length || 0}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={handleUpdateBadHabit} disabled={loading} className="py-2 bg-slate-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider disabled:opacity-50">Save</button>
                        <button onClick={handleDeleteBadHabit} disabled={loading} className="py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-bold uppercase tracking-wider disabled:opacity-50">Delete</button>
                      </div>
                      <button
                        onClick={handleLogRelapse}
                        disabled={loading}
                        className="mt-auto w-full py-3 bg-coral-light hover:bg-coral/10 text-coral border border-coral/20 hover:border-coral/40 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm disabled:opacity-50"
                      >
                        {loading ? 'Logging...' : 'Log Relapse'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <span className="material-symbols-outlined text-4xl mb-2">add_circle</span>
                    <p className="text-sm">Add a bad habit to start tracking</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
