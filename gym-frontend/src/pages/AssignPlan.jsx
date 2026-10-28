import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  ClipboardList, Dumbbell, Apple, Loader2, CheckCircle, AlertCircle,
  Users, Calendar, ChevronRight, ChevronDown, ChevronUp, Zap, Target, Clock
} from 'lucide-react';

const API = 'http://localhost:5000/api';

function getHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const initialFormState = { 
  member_id: '', 
  plan_id: '', 
  type: 'workout', 
  start_date: new Date().toISOString().split('T')[0], 
  end_date: '' 
};

const MUSCLE_COLORS = {
  Chest: 'text-red-400 bg-red-500/10 border-red-500/20',
  Back: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  Legs: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  Shoulders: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  Arms: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  Core: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  Cardio: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
};
const getMuscleColor = (group) => MUSCLE_COLORS[group] || 'text-iron-text-secondary bg-white/5 border-white/10';

export default function AssignPlan() {
  const [formData, setFormData] = useState(initialFormState);
  const [msg, setMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isError, setIsError] = useState(false);
  const [members, setMembers] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [diets, setDiets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Exercise panel state
  const [exercises, setExercises] = useState([]);
  const [exercisesLoading, setExercisesLoading] = useState(false);
  const [showExercises, setShowExercises] = useState(false);

  const fetchMembers = async () => {
    try {
      const mRes = await axios.get(`${API}/members`, { headers: getHeaders() });
      setMembers(Array.isArray(mRes.data) ? mRes.data : []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [mRes, wRes, dRes] = await Promise.all([
          axios.get(`${API}/members`, { headers: getHeaders() }),
          axios.get(`${API}/workouts/plans`, { headers: getHeaders() }),
          axios.get(`${API}/diets/plans`, { headers: getHeaders() })
        ]);
        setMembers(Array.isArray(mRes.data) ? mRes.data : []);
        setWorkouts(Array.isArray(wRes.data) ? wRes.data : []);
        setDiets(Array.isArray(dRes.data) ? dRes.data : []);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchOptions();

    // Re-fetch members when tab becomes visible (user switches back from Members page)
    const handleVisibility = () => { if (!document.hidden) fetchMembers(); };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);



  // Fetch exercises whenever a workout plan is selected
  useEffect(() => {
    if (formData.type !== 'workout' || !formData.plan_id) {
      setExercises([]);
      setShowExercises(false);
      return;
    }
    const fetchExercises = async () => {
      setExercisesLoading(true);
      try {
        const res = await axios.get(`${API}/workouts/plans/${formData.plan_id}/exercises`, { headers: getHeaders() });
        setExercises(Array.isArray(res.data) ? res.data : []);
        setShowExercises(true);
      } catch (err) {
        console.error(err);
        setExercises([]);
      } finally {
        setExercisesLoading(false);
      }
    };
    fetchExercises();
  }, [formData.plan_id, formData.type]);

  const handleAssign = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMsg('');
    setIsError(false);
    try {
      const endpoint = formData.type === 'workout' ? 'workouts/assign' : 'diets/assign';
      await axios.post(`${API}/${endpoint}`, {
        member_id: formData.member_id,
        workout_id: formData.type === 'workout' ? formData.plan_id : null,
        diet_id: formData.type === 'diet' ? formData.plan_id : null,
        trainer_id: 1,
        start_date: formData.start_date,
        end_date: formData.end_date
      }, { headers: getHeaders() });

      setIsError(false);
      setMsg('Plan successfully assigned!');
      setFormData(initialFormState);
      setTimeout(() => setMsg(''), 5000);
    } catch (err) {
      setIsError(true);
      setMsg(err.response?.data?.message || 'Error assigning plan. Please try again.');
    } finally { setIsSubmitting(false); }
  };

  const currentPlans = formData.type === 'workout' ? workouts : diets;
  const selectedMember = members.find(m => m.member_id === parseInt(formData.member_id));
  const selectedPlan = currentPlans.find(p => {
    const id = formData.type === 'workout' ? p.workout_id : p.diet_id;
    return id === parseInt(formData.plan_id);
  });

  // Group exercises by muscle group
  const groupedExercises = exercises.reduce((acc, ex) => {
    const group = ex.muscle_group || 'Other';
    if (!acc[group]) acc[group] = [];
    acc[group].push(ex);
    return acc;
  }, {});

  return (
    <div className="space-y-6 pb-12 font-manrope">
      {/* Header */}
      <div>
        <h2 className="text-4xl font-space font-bold tracking-tighter text-white mb-2">Assign Plans</h2>
        <p className="text-iron-text-secondary font-medium italic text-sm">Assign workout or diet plans to members</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="text-xs font-space font-bold tracking-[0.2em] text-iron-text-secondary mb-3">Active Members</p>
          <p className="text-4xl font-space font-black text-white">{members.length}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs font-space font-bold tracking-[0.2em] text-iron-text-secondary mb-3">Workout Plans</p>
          <div className="flex items-end gap-2">
            <p className="text-4xl font-space font-black text-iron-lime">{workouts.length}</p>
            <Dumbbell size={16} className="text-iron-lime mb-2" />
          </div>
        </div>
        <div className="stat-card">
          <p className="text-xs font-space font-bold tracking-[0.2em] text-iron-text-secondary mb-3">Diet Plans</p>
          <div className="flex items-end gap-2">
            <p className="text-4xl font-space font-black text-emerald-400">{diets.length}</p>
            <Apple size={16} className="text-emerald-400 mb-2" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-6">
        {/* Left Column: Form & Breakdown */}
        <div className="space-y-6">
          <div className="card">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-iron-lime/10 flex items-center justify-center text-iron-lime">
                <ClipboardList size={18} />
              </div>
              <div>
                <h3 className="text-white font-space font-bold tracking-widest text-sm">Assign Plan</h3>
                <p className="text-iron-text-secondary text-xs italic">Select member, plan type, and date range</p>
              </div>
            </div>

            {msg && (
              <div role="alert" className={`flex items-center gap-3 p-4 rounded-xl text-xs mb-6 border ${
                isError ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              }`}>
                {isError ? <AlertCircle size={14} /> : <CheckCircle size={14} />}
                <span className="font-medium">{msg}</span>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12 gap-3 text-iron-text-secondary">
                <Loader2 size={16} className="animate-spin text-iron-lime" />
                <span className="font-space text-xs tracking-widest">Loading options...</span>
              </div>
            ) : (
              <form onSubmit={handleAssign} className="space-y-5">
              <p className="text-xs text-iron-text-secondary">Fields marked <span aria-hidden="true" className="text-red-400">*</span><span className="sr-only">with an asterisk</span> are required.</p>
                {/* Member Selection */}
                <div className="space-y-1.5">
                  <label htmlFor="assignplan-member-id" className="text-xs font-bold text-iron-text-secondary tracking-[0.2em] block">
                    <Users size={10} className="inline mr-1.5" />Select Member <span aria-hidden="true" className="text-red-400">*</span>
                  </label>
                  <select id="assignplan-member-id" required value={formData.member_id} onChange={e => setFormData({ ...formData, member_id: e.target.value })}
                    className="w-full bg-[#18181A] border border-white/5 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-iron-lime/30">
                    <option value="">Choose member...</option>
                    {members.map(m => (
                      <option key={m.member_id} value={m.member_id}>{m.member_name || m.name} (ID: {m.member_id})</option>
                    ))}
                  </select>
                </div>

                {/* Plan type toggle */}
                <div className="space-y-1.5">
                  <p id="assignplan-type-label" className="text-xs font-bold text-iron-text-secondary tracking-[0.2em] block">Plan Type</p>
                  <div role="group" aria-labelledby="assignplan-type-label" className="flex gap-3">
                    <button type="button"
                      aria-pressed={formData.type === 'workout'}
                      onClick={() => setFormData({ ...formData, type: 'workout', plan_id: '' })}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-space font-bold tracking-widest transition-all ${
                        formData.type === 'workout'
                          ? 'bg-iron-lime text-dark shadow-[0_4px_20px_rgba(217,255,0,0.3)]'
                          : 'bg-white/[0.03] border border-white/10 text-iron-text-secondary hover:text-white'
                      }`}>
                      <Dumbbell size={14} /> Workout
                    </button>
                    <button type="button"
                      aria-pressed={formData.type === 'diet'}
                      onClick={() => setFormData({ ...formData, type: 'diet', plan_id: '' })}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-space font-bold tracking-widest transition-all ${
                        formData.type === 'diet'
                          ? 'bg-emerald-500 text-dark shadow-[0_4px_20px_rgba(16,185,129,0.3)]'
                          : 'bg-white/[0.03] border border-white/10 text-iron-text-secondary hover:text-white'
                      }`}>
                      <Apple size={14} /> Diet
                    </button>
                  </div>
                </div>

                {/* Plan Selection */}
                <div className="space-y-1.5">
                  <label htmlFor="assignplan-plan-id" className="text-xs font-bold text-iron-text-secondary tracking-[0.2em] block">
                    <Target size={10} className="inline mr-1.5" />Select {formData.type === 'workout' ? 'Workout' : 'Diet'} Plan <span aria-hidden="true" className="text-red-400">*</span>
                  </label>
                  <select id="assignplan-plan-id" required value={formData.plan_id} onChange={e => setFormData({ ...formData, plan_id: e.target.value })}
                    className="w-full bg-[#18181A] border border-white/5 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-iron-lime/30">
                    <option value="">Choose {formData.type}...</option>
                    {currentPlans.map(p => {
                      const id = formData.type === 'workout' ? p.workout_id : p.diet_id;
                      return <option key={id} value={id}>{p.plan_name}</option>;
                    })}
                  </select>
                </div>

                {/* Date Range Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="assignplan-start-date" className="text-[10px] font-bold text-iron-text-secondary tracking-[0.2em] block">
                      <Calendar size={10} className="inline mr-1.5" />Start Date <span aria-hidden="true" className="text-red-400">*</span>
                    </label>
                    <input id="assignplan-start-date" type="date" required value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full bg-[#18181A] border border-white/5 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-iron-lime/30 [color-scheme:dark]" />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="assignplan-end-date" className="text-[10px] font-bold text-iron-text-secondary tracking-[0.2em] block">
                      <Calendar size={10} className="inline mr-1.5" />End Date <span aria-hidden="true" className="text-red-400">*</span>
                    </label>
                    <input id="assignplan-end-date" type="date" required value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full bg-[#18181A] border border-white/5 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-iron-lime/30 [color-scheme:dark]" />
                  </div>
                </div>

                <button type="submit" disabled={isSubmitting}
                  className="w-full btn flex items-center justify-center gap-2 !py-4 font-space font-bold tracking-widest text-xs">
                  {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <ChevronRight size={14} />}
                  {isSubmitting ? 'Assigning Plan...' : 'Confirm Assignment'}
                </button>
              </form>
            )}
          </div>

          {/* Exercise Breakdown Panel */}
          {formData.type === 'workout' && formData.plan_id && (
            <div className="card">
              <button
                type="button"
                onClick={() => setShowExercises(v => !v)}
                className="w-full flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-iron-lime/10 flex items-center justify-center text-iron-lime">
                    <Zap size={14} />
                  </div>
                  <div className="text-left">
                    <h3 className="text-white font-space font-bold text-xs tracking-widest">
                      Exercise Breakdown
                    </h3>
                    <p className="text-iron-text-secondary text-[10px] italic">
                      {exercisesLoading ? 'Loading...' : `${exercises.length} exercise${exercises.length !== 1 ? 's' : ''} in this plan`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {exercises.length > 0 && (
                    <span className="px-2 py-0.5 rounded text-[9px] font-black tracking-widest bg-iron-lime/10 text-iron-lime border border-iron-lime/20">
                      {Object.keys(groupedExercises).length} muscle groups
                    </span>
                  )}
                  {exercisesLoading
                    ? <Loader2 size={14} className="animate-spin text-iron-lime" />
                    : showExercises
                      ? <ChevronUp size={14} className="text-iron-text-secondary group-hover:text-white transition-colors" />
                      : <ChevronDown size={14} className="text-iron-text-secondary group-hover:text-white transition-colors" />
                  }
                </div>
              </button>

              {showExercises && !exercisesLoading && (
                <div className="mt-5 space-y-4">
                  {exercises.length === 0 ? (
                    <div className="text-center py-6 text-iron-text-secondary text-xs italic">
                      No exercises linked to this plan yet.
                    </div>
                  ) : (
                    Object.entries(groupedExercises).map(([group, exList]) => (
                      <div key={group}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-widest border ${getMuscleColor(group)}`}>
                            {group}
                          </span>
                          <span className="text-iron-text-secondary text-[10px]">{exList.length} exercise{exList.length !== 1 ? 's' : ''}</span>
                        </div>

                        <div className="space-y-1.5 pl-1">
                          {exList.map(ex => (
                            <div key={ex.exercise_id}
                              className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-xs font-bold truncate">{ex.exercise_name}</p>
                                {ex.equipment_required && (
                                  <p className="text-iron-text-secondary text-[10px] italic truncate">{ex.equipment_required}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-3 ml-3 shrink-0">
                                <div className="flex items-center gap-1 text-iron-lime">
                                  <Target size={10} />
                                  <span className="text-[10px] font-space font-bold">{ex.sets}×{ex.reps}</span>
                                </div>
                                {ex.rest_time && (
                                  <div className="flex items-center gap-1 text-iron-text-secondary">
                                    <Clock size={10} />
                                    <span className="text-[10px] font-space">{ex.rest_time}s</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Preview Sidebar */}
        <div className="space-y-4">
          <div className="card">
            <h3 className="text-white font-space font-bold text-xs tracking-widest mb-4">Assignment Preview</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-iron-text-secondary text-xs">Member</span>
                <span className="text-white text-xs font-bold">{selectedMember ? (selectedMember.member_name || selectedMember.name) : '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-iron-text-secondary text-xs">Type</span>
                <span className={`px-2.5 py-0.5 rounded text-[11px] font-black tracking-widest ${
                  formData.type === 'workout' ? 'bg-iron-lime/10 text-iron-lime border border-iron-lime/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}>{formData.type}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-iron-text-secondary text-xs">Plan</span>
                <span className="text-white text-xs font-bold">{selectedPlan ? selectedPlan.plan_name : '—'}</span>
              </div>
              {selectedPlan && formData.type === 'workout' && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-iron-text-secondary text-xs">Goal</span>
                    <span className="text-white text-xs">{selectedPlan.goal || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-iron-text-secondary text-xs">Difficulty</span>
                    <span className={`text-xs font-bold ${
                      selectedPlan.difficulty_level === 'Advanced' ? 'text-red-400' :
                      selectedPlan.difficulty_level === 'Intermediate' ? 'text-amber-400' : 'text-emerald-400'
                    }`}>{selectedPlan.difficulty_level || '—'}</span>
                  </div>
                </>
              )}
              {selectedPlan && formData.type === 'diet' && (
                <div className="flex items-center justify-between">
                  <span className="text-iron-text-secondary text-xs">Calories/Day</span>
                  <span className="text-iron-lime text-xs font-bold font-space">{selectedPlan.calories_per_day || '—'} kcal</span>
                </div>
              )}
              <hr className="border-white/5" />
              <div className="flex items-center justify-between">
                <span className="text-iron-text-secondary text-xs">Period</span>
                <span className="text-white text-xs font-medium">
                  {formData.start_date && formData.end_date
                    ? `${new Date(formData.start_date).toLocaleDateString()} → ${new Date(formData.end_date).toLocaleDateString()}`
                    : '—'}
                </span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-white font-space font-bold text-xs tracking-widest mb-4 flex items-center gap-2">
              {formData.type === 'workout' ? <Dumbbell size={12} className="text-iron-lime" /> : <Apple size={12} className="text-emerald-400" />}
              Quick Select {formData.type === 'workout' ? 'Workouts' : 'Diets'}
            </h3>
            <div className="space-y-2">
              {currentPlans.map(p => {
                const id = formData.type === 'workout' ? p.workout_id : p.diet_id;
                const isSelected = parseInt(formData.plan_id) === id;
                return (
                  <button key={id} type="button"
                    onClick={() => setFormData({ ...formData, plan_id: String(id) })}
                    className={`w-full text-left p-3 rounded-xl text-xs transition-all border ${
                      isSelected
                        ? 'bg-iron-lime/10 border-iron-lime/20 text-white'
                        : 'bg-white/[0.02] border-white/5 text-iron-text-secondary hover:text-white hover:bg-white/[0.04]'
                    }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{p.plan_name}</span>
                      {isSelected && <CheckCircle size={12} className="text-iron-lime" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
