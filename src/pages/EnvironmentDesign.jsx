import { useState, useEffect, useMemo } from 'react'
import toast from 'react-hot-toast'
import NavBar from '../components/NavBar'
import { useUser } from '../context/UserContext'
import { useAuth } from '../context/AuthContext'
import * as firestoreService from '../services/firestoreService'

const IDENTITY_ICONS = {
    'The Athlete': 'directions_run',
    'The Developer': 'code',
    'The Writer': 'edit',
    'The Reader': 'book',
    'The Meditator': 'self_improvement',
}

function getIdentityIcon(name) {
    return IDENTITY_ICONS[name] || 'person'
}

function getIdentityColor(index) {
    const colors = [
        { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-600 dark:text-blue-400' },
        { bg: 'bg-purple-100 dark:bg-purple-900/40', text: 'text-purple-600 dark:text-purple-400' },
        { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-600 dark:text-amber-400' },
        { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-600 dark:text-emerald-400' },
        { bg: 'bg-rose-100 dark:bg-rose-900/40', text: 'text-rose-600 dark:text-rose-400' },
    ]
    return colors[index % colors.length]
}

export default function EnvironmentDesign() {
    const { user } = useAuth()
    const { habits, identity } = useUser()

    // Build identities from habits + current identity
    const identities = useMemo(() => {
        const identitySet = new Set()
        identitySet.add(identity || 'The Athlete')
        habits.forEach(h => {
            if (h.identityName) identitySet.add(h.identityName)
        })
        return Array.from(identitySet)
    }, [habits, identity])

    const [selectedIdentity, setSelectedIdentity] = useState(null)
    const [strategies, setStrategies] = useState({}) // { identityName: { engines: [...], brakes: [...] } }
    const [loading, setLoading] = useState(false)

    // Set default selected identity
    useEffect(() => {
        if (identities.length > 0 && !selectedIdentity) {
            setSelectedIdentity(identities[0])
        }
    }, [identities, selectedIdentity])

    // Load strategies from Firestore
    useEffect(() => {
        if (user) {
            loadStrategies()
        }
    }, [user])

    const loadStrategies = async () => {
        if (!user) return
        setLoading(true)
        const { data } = await firestoreService.getEnvironmentStrategies(user.uid)
        if (data && data.length > 0) {
            const mapped = {}
            data.forEach(s => {
                mapped[s.identityName] = {
                    engines: s.engines || [],
                    brakes: s.brakes || [],
                }
            })
            setStrategies(mapped)
        }
        setLoading(false)
    }

    // Get habits and bad habits for selected identity
    const identityHabits = useMemo(() => {
        return habits.filter(h => {
            const habitIdentity = h.identityName || identity
            return habitIdentity === selectedIdentity
        })
    }, [habits, identity, selectedIdentity])

    // Get strategies for current identity
    const currentStrategies = useMemo(() => {
        return strategies[selectedIdentity] || { engines: [], brakes: [] }
    }, [strategies, selectedIdentity])

    const updateEngineStrategy = (index, field, value) => {
        setStrategies(prev => {
            const current = prev[selectedIdentity] || { engines: [], brakes: [] }
            const engines = [...current.engines]
            engines[index] = { ...engines[index], [field]: value }
            return { ...prev, [selectedIdentity]: { ...current, engines } }
        })
    }

    const updateBrakeStrategy = (index, field, value) => {
        setStrategies(prev => {
            const current = prev[selectedIdentity] || { engines: [], brakes: [] }
            const brakes = [...current.brakes]
            brakes[index] = { ...brakes[index], [field]: value }
            return { ...prev, [selectedIdentity]: { ...current, brakes } }
        })
    }

    const addEngine = () => {
        setStrategies(prev => {
            const current = prev[selectedIdentity] || { engines: [], brakes: [] }
            return {
                ...prev,
                [selectedIdentity]: {
                    ...current,
                    engines: [...current.engines, { habitTitle: '', icon: 'fitness_center', schedule: '', strategy: '' }]
                }
            }
        })
    }

    const addBrake = () => {
        setStrategies(prev => {
            const current = prev[selectedIdentity] || { engines: [], brakes: [] }
            return {
                ...prev,
                [selectedIdentity]: {
                    ...current,
                    brakes: [...current.brakes, { habitTitle: '', icon: 'block', schedule: '', strategy: '' }]
                }
            }
        })
    }

    const removeEngine = (index) => {
        setStrategies(prev => {
            const current = prev[selectedIdentity] || { engines: [], brakes: [] }
            const engines = current.engines.filter((_, i) => i !== index)
            return { ...prev, [selectedIdentity]: { ...current, engines } }
        })
    }

    const removeBrake = (index) => {
        setStrategies(prev => {
            const current = prev[selectedIdentity] || { engines: [], brakes: [] }
            const brakes = current.brakes.filter((_, i) => i !== index)
            return { ...prev, [selectedIdentity]: { ...current, brakes } }
        })
    }

    const handleSave = async () => {
        if (!user || !selectedIdentity) return
        setLoading(true)
        const data = strategies[selectedIdentity] || { engines: [], brakes: [] }
        const { success } = await firestoreService.saveEnvironmentStrategy(user.uid, selectedIdentity, data)
        if (success) {
            toast.success('Environment design saved!')
        } else {
            toast.error('Failed to save')
        }
        setLoading(false)
    }

    const handleSaveBlur = async (identityName) => {
        if (!user || !identityName) return
        const data = strategies[identityName] || { engines: [], brakes: [] }
        const { success } = await firestoreService.saveEnvironmentStrategy(user.uid, identityName, data)
        if (success) {
            toast.success('Saved!', { duration: 1500 })
        }
    }

    return (
        <div className="bg-background-light text-zinc-900 min-h-screen flex flex-col font-display">
            <NavBar currentPage="environment-design" />

            <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 py-12">
                {/* Header */}
                <div className="flex flex-col gap-2 w-full text-center mb-10">
                    <h2 className="text-3xl md:text-4xl font-extrabold text-zinc-900 tracking-tight">
                        Identity Environment Strategist
                    </h2>
                    <p className="text-zinc-500 max-w-2xl mx-auto">
                        Design your environment to reduce friction for who you want to be, and increase friction for who you used to be.
                    </p>
                </div>

                {/* Identity Tabs */}
                <div className="flex justify-center mb-12">
                    <div className="inline-flex bg-white p-1 rounded-full border border-zinc-200 shadow-sm flex-wrap gap-1 justify-center">
                        <button
                            onClick={() => setSelectedIdentity(null)}
                            className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${selectedIdentity === null
                                    ? 'bg-zinc-900 text-white shadow-sm'
                                    : 'text-zinc-500 hover:text-zinc-900'
                                }`}
                        >
                            All Identities
                        </button>
                        {identities.map((id, idx) => (
                            <button
                                key={id}
                                onClick={() => setSelectedIdentity(id)}
                                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${selectedIdentity === id
                                        ? 'bg-zinc-900 text-white shadow-sm'
                                        : 'text-zinc-500 hover:text-zinc-900'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-base">{getIdentityIcon(id)}</span>
                                {id}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Identity Sections */}
                {(selectedIdentity ? [selectedIdentity] : identities).map((identityName, identityIdx) => {
                    const strats = strategies[identityName] || { engines: [], brakes: [] }
                    const color = getIdentityColor(identityIdx)

                    return (
                        <section key={identityName} className="mb-16">
                            {/* Identity Header */}
                            <div className="flex items-center gap-4 mb-8">
                                <div className={`h-10 w-10 ${color.bg} rounded-xl flex items-center justify-center ${color.text} shadow-sm`}>
                                    <span className="material-symbols-outlined text-xl">{getIdentityIcon(identityName)}</span>
                                </div>
                                <h3 className="text-2xl font-bold text-zinc-900">Identity: {identityName}</h3>
                                <div className="h-px bg-zinc-200 flex-grow"></div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                {/* ENGINE Column — Friction Reduction */}
                                <div className="space-y-5">
                                    <div className="flex items-center justify-between px-1">
                                        <div className="flex items-center gap-2 text-primary">
                                            <span className="material-symbols-outlined text-xl">bolt</span>
                                            <h4 className="font-bold text-xs uppercase tracking-widest">THE ENGINE</h4>
                                        </div>
                                        <span className="text-xs font-medium text-zinc-400">Environment: Friction Reduction</span>
                                    </div>

                                    {strats.engines.map((engine, idx) => (
                                        <div key={idx} className="bg-white rounded-2xl p-6 border-l-[6px] border-l-primary shadow-sm border border-zinc-200 group relative">
                                            <button
                                                onClick={() => removeEngine(idx)}
                                                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-zinc-300 hover:text-red-500 transition-all"
                                            >
                                                <span className="material-symbols-outlined text-lg">close</span>
                                            </button>
                                            <div className="flex items-center gap-4 mb-5">
                                                <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-primary">
                                                    <span className="material-symbols-outlined text-xl">{engine.icon || 'fitness_center'}</span>
                                                </div>
                                                <div className="flex-1">
                                                    <input
                                                        className="w-full font-bold text-zinc-900 text-base bg-transparent border-none outline-none placeholder-zinc-300"
                                                        placeholder="Habit name..."
                                                        value={engine.habitTitle || ''}
                                                        onChange={(e) => updateEngineStrategy(idx, 'habitTitle', e.target.value)}
                                                        onBlur={() => handleSaveBlur(identityName)}
                                                    />
                                                    <input
                                                        className="w-full text-[11px] text-zinc-500 font-medium bg-transparent border-none outline-none placeholder-zinc-300 mt-0.5"
                                                        placeholder="Schedule (e.g. Every day at 6:00 AM)"
                                                        value={engine.schedule || ''}
                                                        onChange={(e) => updateEngineStrategy(idx, 'schedule', e.target.value)}
                                                        onBlur={() => handleSaveBlur(identityName)}
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-xs text-zinc-500 font-medium">
                                                    How will you design your environment to make this easy?
                                                </p>
                                                <div className="relative">
                                                    <input
                                                        className="w-full bg-zinc-50 border-none rounded-lg py-3.5 pl-4 pr-10 text-sm text-zinc-900 placeholder-zinc-400 focus:ring-1 focus:ring-primary outline-none"
                                                        type="text"
                                                        placeholder="e.g. Set out running clothes on the chair next to bed..."
                                                        value={engine.strategy || ''}
                                                        onChange={(e) => updateEngineStrategy(idx, 'strategy', e.target.value)}
                                                        onBlur={() => handleSaveBlur(identityName)}
                                                    />
                                                    <span className={`material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-sm ${engine.strategy ? 'text-primary' : 'text-zinc-300'
                                                        }`}>
                                                        {engine.strategy ? 'check' : 'save'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Add Engine card */}
                                    <button
                                        onClick={addEngine}
                                        className="w-full h-[140px] border-2 border-dashed border-zinc-200 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-zinc-50 transition-colors group"
                                    >
                                        <div className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                                            <span className="material-symbols-outlined">add</span>
                                        </div>
                                        <span className="text-sm font-medium text-zinc-500 group-hover:text-primary transition-colors">
                                            Add a new habit engine
                                        </span>
                                    </button>
                                </div>

                                {/* BRAKES Column — Friction Addition */}
                                <div className="space-y-5">
                                    <div className="flex items-center justify-between px-1">
                                        <div className="flex items-center gap-2 text-coral">
                                            <span className="material-symbols-outlined text-xl">pan_tool</span>
                                            <h4 className="font-bold text-xs uppercase tracking-widest">THE BRAKES</h4>
                                        </div>
                                        <span className="text-xs font-medium text-zinc-400">Environment: Friction Addition</span>
                                    </div>

                                    {strats.brakes.map((brake, idx) => (
                                        <div key={idx} className="bg-white rounded-2xl p-6 border-l-[6px] border-l-coral shadow-sm border border-zinc-200 group relative">
                                            <button
                                                onClick={() => removeBrake(idx)}
                                                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-zinc-300 hover:text-red-500 transition-all"
                                            >
                                                <span className="material-symbols-outlined text-lg">close</span>
                                            </button>
                                            <div className="flex items-center gap-4 mb-5">
                                                <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center text-coral">
                                                    <span className="material-symbols-outlined text-xl">{brake.icon || 'block'}</span>
                                                </div>
                                                <div className="flex-1">
                                                    <input
                                                        className="w-full font-bold text-zinc-900 text-base bg-transparent border-none outline-none placeholder-zinc-300"
                                                        placeholder="Bad habit name..."
                                                        value={brake.habitTitle || ''}
                                                        onChange={(e) => updateBrakeStrategy(idx, 'habitTitle', e.target.value)}
                                                        onBlur={() => handleSaveBlur(identityName)}
                                                    />
                                                    <input
                                                        className="w-full text-[11px] text-zinc-500 font-medium bg-transparent border-none outline-none placeholder-zinc-300 mt-0.5"
                                                        placeholder="e.g. Avoid after 9 PM"
                                                        value={brake.schedule || ''}
                                                        onChange={(e) => updateBrakeStrategy(idx, 'schedule', e.target.value)}
                                                        onBlur={() => handleSaveBlur(identityName)}
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-xs text-zinc-500 font-medium">
                                                    How will you design your environment to make this hard?
                                                </p>
                                                <div className="relative">
                                                    <input
                                                        className="w-full bg-zinc-50 border-none rounded-lg py-3.5 pl-4 pr-10 text-sm text-zinc-900 placeholder-zinc-400 focus:ring-1 focus:ring-coral outline-none"
                                                        type="text"
                                                        placeholder="e.g. Put a 'Kitchen Closed' sign on the fridge..."
                                                        value={brake.strategy || ''}
                                                        onChange={(e) => updateBrakeStrategy(idx, 'strategy', e.target.value)}
                                                        onBlur={() => handleSaveBlur(identityName)}
                                                    />
                                                    <span className={`material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-sm ${brake.strategy ? 'text-coral' : 'text-zinc-300'
                                                        }`}>
                                                        {brake.strategy ? 'check' : 'save'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Add Brake card */}
                                    <button
                                        onClick={addBrake}
                                        className="w-full h-[140px] border-2 border-dashed border-zinc-200 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-red-50/50 transition-colors group"
                                    >
                                        <div className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 group-hover:text-coral group-hover:bg-coral-light transition-colors">
                                            <span className="material-symbols-outlined">add</span>
                                        </div>
                                        <span className="text-sm font-medium text-zinc-500 group-hover:text-coral transition-colors">
                                            Identify another blocker
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </section>
                    )
                })}

                {/* Save Button */}
                <div className="mt-8 flex justify-center">
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="bg-secondary hover:bg-secondary-hover text-white px-10 py-4 rounded-2xl font-bold shadow-xl shadow-blue-500/25 transition-all flex items-center gap-3 disabled:opacity-50 hover:-translate-y-0.5 active:scale-95"
                    >
                        <span className="material-symbols-outlined">save</span>
                        {loading ? 'Saving...' : 'Commit to Environment Design'}
                    </button>
                </div>
            </main>
        </div>
    )
}
