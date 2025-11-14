import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Save,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Button } from './ui/Button';
import { supabase } from '../lib/supabase';
import { DriverAvailability } from '../types';

interface AvailabilityCalendarProps {
  driverId: string;
}

// Helper: format a Date to 'YYYY-MM-DD' in local time (no UTC conversion)
const toYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Build an inclusive array of YYYY-MM-DD between two YMD strings
const enumerateDatesInclusive = (startYmd: string, endYmd: string) => {
  const dates: string[] = [];
  const start = new Date(startYmd + 'T00:00:00');
  const end = new Date(endYmd + 'T00:00:00');
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(toYMD(d));
  }
  return dates;
};

// Get Monday..Sunday of the ISO week for the given date
const getISOWeekDates = (d: Date) => {
  const day = d.getDay(); // 0 (Sun) .. 6 (Sat)
  const offsetToMonday = (day + 6) % 7; // Mon=0, Sun=6
  const monday = new Date(d);
  monday.setDate(d.getDate() - offsetToMonday);
  const week: string[] = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + i);
    week.push(toYMD(cur));
  }
  return week;
};

// Format FR human date from YMD
const formatFr = (ymd: string) =>
  new Date(ymd + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

type SelectionMode = 'single' | 'range' | 'week';
type ID = string | number;

const DEFAULT_START = '08:00';
const DEFAULT_END = '20:00';

export const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = ({ driverId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [availabilities, setAvailabilities] = useState<DriverAvailability[]>([]);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('single');
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);

  // Valeurs par défaut 08:00 → 20:00 dès l’ouverture
  const [timeSlots, setTimeSlots] = useState<{ start: string; end: string }[]>([
    { start: DEFAULT_START, end: DEFAULT_END },
  ]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingIds, setDeletingIds] = useState<ID[]>([]);
  const [clearingDates, setClearingDates] = useState<string[]>([]);
  const [clearingRange, setClearingRange] = useState(false);

  useEffect(() => {
    fetchAvailabilities();
  }, [currentDate, driverId]);

  const fetchAvailabilities = async () => {
    setLoading(true);
    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const { data, error } = await supabase
        .from('driver_availability')
        .select('*')
        .eq('driver_id', driverId)
        .gte('date', toYMD(startOfMonth))
        .lte('date', toYMD(endOfMonth))
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Erreur lors de la récupération des disponibilités:', error);
        return;
      }

      const formattedAvailabilities = (data || []).map((item: any) => ({
        id: item.id,
        driver_id: item.driver_id,
        date: item.date,
        start_time: item.start_time,
        end_time: item.end_time,
        is_available: item.is_available,
        created_at: item.created_at,
        updated_at: item.updated_at,
      })) as DriverAvailability[];

      setAvailabilities(formattedAvailabilities);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [] as { date: Date; isCurrentMonth: boolean; dateString: string }[];

    // Jours du mois précédent pour compléter la première semaine
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i);
      days.push({
        date: prevDate,
        isCurrentMonth: false,
        dateString: toYMD(prevDate)
      });
    }

    // Jours du mois actuel
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push({
        date,
        isCurrentMonth: true,
        dateString: toYMD(date)
      });
    }

    // Jours du mois suivant pour compléter la dernière semaine
    const lastDayOfWeek = lastDay.getDay();
    for (let i = 1; i <= 6 - lastDayOfWeek; i++) {
      const nextDate = new Date(year, month + 1, i);
      days.push({
        date: nextDate,
        isCurrentMonth: false,
        dateString: toYMD(nextDate)
      });
    }

    return days;
  };

  const handleAddTimeSlot = () => {
    setTimeSlots(prev => [...prev, { start: DEFAULT_START, end: DEFAULT_END }]);
  };

  const removeTimeSlot = (index: number) => {
    setTimeSlots(timeSlots.filter((_, i) => i !== index));
    // Si tout est retiré, on remet un slot par défaut pour l’UX
    setTimeout(() => {
      if (timeSlots.length === 1) {
        setTimeSlots([{ start: DEFAULT_START, end: DEFAULT_END }]);
      }
    }, 0);
  };

  const updateTimeSlot = (index: number, field: 'start' | 'end', value: string) => {
    const updated = [...timeSlots];
    updated[index][field] = value;
    setTimeSlots(updated);
  };

  const clearSelection = () => {
    setSelectedDates([]);
    setRangeStart(null);
    setRangeEnd(null);
  };

  const handleDayClick = (day: { date: Date; isCurrentMonth: boolean; dateString: string }) => {
    const today = toYMD(new Date());
    if (day.dateString < today) return; // ne pas sélectionner les dates passées

    if (selectionMode === 'single') {
      setSelectedDates([day.dateString]);
      setRangeStart(null);
      setRangeEnd(null);
      return;
    }

    if (selectionMode === 'week') {
      const week = getISOWeekDates(day.date).filter(d => d >= today);
      setSelectedDates(week);
      setRangeStart(week[0] || null);
      setRangeEnd(week[6] || null);
      return;
    }

    // range
    if (!rangeStart) {
      setRangeStart(day.dateString);
      setSelectedDates([day.dateString]);
    } else {
      const start = rangeStart;
      const end = day.dateString;
      const [min, max] = start <= end ? [start, end] : [end, start];
      const dates = enumerateDatesInclusive(min, max).filter(d => d >= today);
      setRangeStart(min);
      setRangeEnd(max);
      setSelectedDates(dates);
    }
  };

  const saveAvailabilities = async () => {
    if (selectedDates.length === 0 || timeSlots.length === 0) return;

    setSaving(true);
    try {
      // Supprimer les disponibilités existantes pour ces dates
      await supabase
        .from('driver_availability')
        .delete()
        .eq('driver_id', driverId)
        .in('date', selectedDates);

      // Ajouter les nouvelles disponibilités pour chaque date sélectionnée
      const payload = selectedDates.flatMap(date =>
        timeSlots.map(slot => ({
          driver_id: driverId,
          date,
          start_time: slot.start,
          end_time: slot.end,
          is_available: true,
        }))
      );

      const { error } = await supabase
        .from('driver_availability')
        .insert(payload);

      if (error) {
        console.error('Erreur lors de la sauvegarde des disponibilités:', error);
      } else {
        await fetchAvailabilities();
        // On garde la sélection et on remet un slot par défaut
        setTimeSlots([{ start: DEFAULT_START, end: DEFAULT_END }]);
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setSaving(false);
    }
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') newDate.setMonth(newDate.getMonth() - 1);
    else newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  const isToday = (dateString: string) => {
    const today = toYMD(new Date());
    return dateString === today;
  };

  const isPastDate = (dateString: string) => {
    const today = toYMD(new Date());
    return dateString < today;
  };

  const days = getDaysInMonth();
  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const selectionSummary = () => {
    if (selectedDates.length === 0) return '';
    const sorted = [...selectedDates].sort();
    if (sorted.length === 1) return formatFr(sorted[0]);
    return `${formatFr(sorted[0])} → ${formatFr(sorted[sorted.length - 1])} (${sorted.length} jours)`;
  };

  // === Suppression de créneaux déjà enregistrés ===
  const existingByDate = useMemo(() =>
    selectedDates.reduce<Record<string, DriverAvailability[]>>((acc, date) => {
      acc[date] = availabilities.filter(a => a.date === date);
      return acc;
    }, {}), [selectedDates, availabilities]
  );

  const hasAnyExisting = useMemo(
    () => selectedDates.some(date => (existingByDate[date] || []).length > 0),
    [selectedDates, existingByDate]
  );

  const deleteSlotById = async (id: ID) => {
    setDeletingIds(prev => [...prev, id]);
    try {
      const { error } = await supabase
        .from('driver_availability')
        .delete()
        .eq('id', id);
      if (error) {
        console.error('Erreur lors de la suppression du créneau:', error);
      } else {
        await fetchAvailabilities();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingIds(prev => prev.filter(x => x !== id));
    }
  };

  const clearAllForDate = async (date: string) => {
    setClearingDates(prev => [...prev, date]);
    try {
      const { error } = await supabase
        .from('driver_availability')
        .delete()
        .eq('driver_id', driverId)
        .eq('date', date);
      if (error) {
        console.error('Erreur lors du nettoyage des créneaux du jour:', error);
      } else {
        await fetchAvailabilities();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setClearingDates(prev => prev.filter(d => d !== date));
    }
  };

  // === Suppression en masse sur la sélection ===
  const clearAllForSelectedDates = async () => {
    if (selectedDates.length === 0) return;
    setClearingRange(true);
    try {
      const { error } = await supabase
        .from('driver_availability')
        .delete()
        .eq('driver_id', driverId)
        .in('date', selectedDates);

      if (error) {
        console.error('Erreur suppression plage:', error);
      } else {
        await fetchAvailabilities();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setClearingRange(false);
    }
  };

  return (
    <div className="w-full mx-auto">
      <div className="bg-white shadow rounded-none sm:rounded-xl p-4 sm:p-6">
        {/* En-tête calendrier */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5" />
            <h2 className="text-lg sm:text-xl font-semibold">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => changeMonth('prev')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => changeMonth('next')}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Aide / Tutoriel */}
        <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-lg p-4 mb-4 space-y-2 text-sm">
          <h4 className="font-semibold flex items-center gap-2 text-blue-950">
            <span role="img" aria-label="aide">ℹ️</span>
            Tutoriel saisie des disponibilités
          </h4>
          <p><strong>Jour :</strong> choisissez une date précise, ajoutez vos créneaux puis enregistrez.</p>
          <p><strong>Plage :</strong> sélectionnez le premier et le dernier jour, définissez vos horaires, tout sera appliqué d'un coup.</p>
          <p><strong>Semaine :</strong> cliquez sur une semaine pour appliquer les mêmes créneaux sur les 7 jours.</p>
        </div>

        {/* Mode de sélection */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-sm text-gray-600">Mode de sélection :</span>
          <Button
            variant={selectionMode === 'single' ? 'default' : 'outline'}
            onClick={() => { setSelectionMode('single'); clearSelection(); }}
            size="sm"
          >Jour</Button>
          <Button
            variant={selectionMode === 'range' ? 'default' : 'outline'}
            onClick={() => { setSelectionMode('range'); clearSelection(); }}
            size="sm"
          >Plage</Button>
          <Button
            variant={selectionMode === 'week' ? 'default' : 'outline'}
            onClick={() => { setSelectionMode('week'); clearSelection(); }}
            size="sm"
          >Semaine</Button>
          {selectedDates.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearSelection}>
              <XCircle className="w-4 h-4 mr-1" /> Vider la sélection
            </Button>
          )}
        </div>

        {/* Résumé sélection */}
        {selectedDates.length > 0 && (
          <div className="text-sm text-gray-700 mb-2">
            <strong>Dates sélectionnées :</strong> {selectionSummary()}
          </div>
        )}

        {/* Grille des jours de la semaine — PLEINE LARGEUR */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-xs sm:text-sm font-medium text-gray-600 mb-2 w-full">
          {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(day => (
            <div key={day} className="p-2">{day}</div>
          ))}
        </div>

        {/* Grille du calendrier — PLEINE LARGEUR */}
        {loading ? (
          <div className="p-6 text-center text-gray-500">Chargement des disponibilités…</div>
        ) : (
          <div className="grid grid-cols-7 gap-1 sm:gap-2 w-full">
            {days.map((day, index) => {
              const hasAvailabilities = availabilities.some(a => a.date === day.dateString);
              const isPast = isPastDate(day.dateString);
              const isCurrentDay = isToday(day.dateString);
              const isSelected = selectedDates.includes(day.dateString);

              return (
                <button
                  key={index}
                  onClick={() => handleDayClick(day)}
                  disabled={isPast}
                  className={`
                    relative p-2 sm:p-3 text-xs sm:text-sm rounded-lg transition-all duration-200 min-h-[2.5rem] sm:min-h-[3rem] w-full
                    ${day.isCurrentMonth ? 'bg-gray-50 hover:bg-gray-100' : 'bg-white text-gray-400'}
                    ${isPast ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    ${isCurrentDay && day.isCurrentMonth ? 'bg-blue-100 font-semibold' : ''}
                    ${hasAvailabilities && day.isCurrentMonth ? 'bg-green-50' : ''}
                    ${isSelected ? 'ring-2 ring-gray-700 bg-gray-200' : ''}
                  `}
                >
                  <span className="block">{day.date.getDate()}</span>
                  {hasAvailabilities && (
                    <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Section d'ajout / suppression de créneaux */}
        {selectedDates.length > 0 && (
          <div className="mt-6 border-t pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <h3 className="text-base sm:text-lg font-semibold">
                  {selectedDates.length === 1
                    ? `Disponibilités pour le ${formatFr(selectedDates[0])}`
                    : `Disponibilités pour ${selectedDates.length} jours (${selectionSummary()})`}
                </h3>
              </div>

              {/* Bouton suppression en masse — étroit, responsive */}
              {hasAnyExisting && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllForSelectedDates}
                  disabled={clearingRange}
                  className="ml-auto w-full sm:w-auto max-w-[220px] whitespace-normal text-center"
                  title="Supprimer tous les créneaux sur la sélection"
                >
                  {clearingRange ? 'Suppression…' : 'Tout supprimer sur la sélection'}
                </Button>
              )}
            </div>

            {/* === Créneaux déjà enregistrés : n'afficher QUE s'il en existe === */}
            {hasAnyExisting && (
              <div className="space-y-4 mb-6">
                {selectedDates.map(date => {
                  const slots = existingByDate[date] || [];
                  if (slots.length === 0) return null;
                  return (
                    <div key={date} className="border rounded-lg p-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                        <div className="font-medium text-sm sm:text-base">{formatFr(date)}</div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full sm:w-auto"
                          onClick={() => clearAllForDate(date)}
                          disabled={clearingDates.includes(date)}
                        >
                          {clearingDates.includes(date) ? (
                            'Suppression…'
                          ) : (
                            <>
                              <span className="sm:hidden">Tout supprimer</span>
                              <span className="hidden sm:inline">Tout supprimer ce jour</span>
                            </>
                          )}
                        </Button>
                      </div>
                      <ul className="space-y-2">
                        {slots.map(slot => (
                          <li
                            key={String(slot.id)}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-gray-50 rounded-md px-3 py-2"
                          >
                            <span className="text-sm">{slot.start_time} → {slot.end_time}</span>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="w-full sm:w-auto"
                              onClick={() => deleteSlotById(slot.id as ID)}
                              disabled={deletingIds.includes(slot.id as ID)}
                            >
                              <Trash2 className="w-4 h-4 mr-1" /> {deletingIds.includes(slot.id as ID) ? 'Suppression…' : 'Supprimer'}
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}

            {/* === Ajout / remplacement de créneaux === */}
            <div className="space-y-3">
              {timeSlots.map((slot, index) => (
                <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                  <div className="flex items-center gap-2 w-full sm:w-1/3">
                    <label className="text-xs text-gray-600 w-12">Début</label>
                    <input
                      type="time"
                      className="w-full border rounded-md px-2 py-1"
                      value={slot.start}
                      onChange={(e) => updateTimeSlot(index, 'start', e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-1/3">
                    <label className="text-xs text-gray-600 w-12">Fin</label>
                    <input
                      type="time"
                      className="w-full border rounded-md px-2 py-1"
                      value={slot.end}
                      onChange={(e) => updateTimeSlot(index, 'end', e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button variant="destructive" className="w-full sm:w-auto" onClick={() => removeTimeSlot(index)}>
                      <Trash2 className="w-4 h-4 mr-1" />
                      <span className="sm:hidden">Retirer</span>
                      <span className="hidden sm:inline">Retirer (non enregistré)</span>
                    </Button>
                  </div>
                </div>
              ))}

              {timeSlots.length === 0 && (
                <div className="text-sm text-gray-500">Aucun nouveau créneau à ajouter. Ajoutez au moins un créneau pour l'appliquer aux dates sélectionnées.</div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 mt-2">
                <Button variant="outline" className="w-full sm:w-auto" onClick={handleAddTimeSlot}>
                  <Plus className="w-4 h-4 mr-1" /> Ajouter un créneau
                </Button>
                <Button className="w-full sm:w-auto" onClick={saveAvailabilities} disabled={saving || timeSlots.length === 0}>
                  <Save className="w-4 h-4 mr-1" /> {saving ? 'Enregistrement…' : `Enregistrer pour ${selectedDates.length} jour(s)`}
                </Button>
              </div>

              <div className="mt-3 text-xs text-gray-500 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>Les clients pourront réserver pendant ces créneaux sur chaque date sélectionnée. L'enregistrement remplace les créneaux existants pour ces dates.</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
