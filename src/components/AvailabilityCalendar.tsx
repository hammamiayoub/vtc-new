import React, { useState, useEffect } from 'react';
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

export const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = ({ driverId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [availabilities, setAvailabilities] = useState<DriverAvailability[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [timeSlots, setTimeSlots] = useState<{ start: string; end: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
        .order('date', { ascending: true });

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
    setTimeSlots([...timeSlots, { start: '09:00', end: '12:00' }]);
  };

  const removeTimeSlot = (index: number) => {
    setTimeSlots(timeSlots.filter((_, i) => i !== index));
  };

  const updateTimeSlot = (index: number, field: 'start' | 'end', value: string) => {
    const updated = [...timeSlots];
    updated[index][field] = value;
    setTimeSlots(updated);
  };

  const saveAvailabilities = async () => {
    if (!selectedDate || timeSlots.length === 0) return;

    setSaving(true);
    try {
      // Supprimer les disponibilités existantes pour cette date
      await supabase
        .from('driver_availability')
        .delete()
        .eq('driver_id', driverId)
        .eq('date', selectedDate);

      // Ajouter les nouvelles disponibilités
      const newAvailabilities = timeSlots.map(slot => ({
        driver_id: driverId,
        date: selectedDate,
        start_time: slot.start,
        end_time: slot.end,
        is_available: true
      }));

      const { error } = await supabase
        .from('driver_availability')
        .insert(newAvailabilities);

      if (error) {
        console.error('Erreur lors de la sauvegarde des disponibilités:', error);
      } else {
        // Rafraîchir les disponibilités
        await fetchAvailabilities();
        setTimeSlots([]);
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setSaving(false);
    }
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
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

  return (
    <div className="w-full max-w-5xl mx-auto p-4">
      <div className="bg-white shadow rounded-xl p-4 sm:p-6">
        {/* En-tête calendrier */}
        <div className="flex items-center justify-between mb-4">
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

        {/* Grille des jours de la semaine */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-xs sm:text-sm font-medium text-gray-600 mb-2">
          {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(day => (
            <div key={day} className="p-2">{day}</div>
          ))}
        </div>

        {/* Grille du calendrier */}
        {loading ? (
          <div className="p-6 text-center text-gray-500">Chargement des disponibilités…</div>
        ) : (
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {days.map((day, index) => {
              const hasAvailabilities = availabilities.some(a => a.date === day.dateString);
              const isPast = isPastDate(day.dateString);
              const isCurrentDay = isToday(day.dateString);
              
              return (
                <button
                  key={index}
                  onClick={() => !isPast && day.isCurrentMonth && setSelectedDate(day.dateString)}
                  disabled={isPast || !day.isCurrentMonth}
                  className={`
                    relative p-2 sm:p-3 text-xs sm:text-sm rounded-lg transition-all duration-200 min-h-[2.5rem] sm:min-h-[3rem]
                    ${day.isCurrentMonth ? 'bg-gray-50 hover:bg-gray-100' : 'bg-white text-gray-400'}
                    ${isPast ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    ${isCurrentDay && day.isCurrentMonth ? 'bg-blue-100 font-semibold' : ''}
                    ${selectedDate === day.dateString ? 'bg-gray-200 ring-2 ring-gray-500' : ''}
                    ${hasAvailabilities && day.isCurrentMonth ? 'bg-green-50' : ''}
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

        {/* Section d'ajout de créneaux */}
        {selectedDate && (
          <div className="mt-6 border-t pt-4">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5" />
              <h3 className="text-base sm:text-lg font-semibold">
                Disponibilités pour le {new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </h3>
            </div>

            {/* Créneaux existants */}
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
                    <Button variant="destructive" onClick={() => removeTimeSlot(index)}>
                      <Trash2 className="w-4 h-4 mr-1" /> Supprimer
                    </Button>
                  </div>
                </div>
              ))}

              {timeSlots.length === 0 && (
                <div className="text-sm text-gray-500">Aucun créneau ajouté pour cette date.</div>
              )}

              <div className="flex gap-2 mt-2">
                <Button variant="outline" onClick={handleAddTimeSlot}>
                  <Plus className="w-4 h-4 mr-1" /> Ajouter un créneau
                </Button>
                <Button onClick={saveAvailabilities} disabled={saving || timeSlots.length === 0}>
                  <Save className="w-4 h-4 mr-1" /> {saving ? 'Enregistrement…' : 'Enregistrer'}
                </Button>
              </div>

              <div className="mt-3 text-xs text-gray-500 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>Les clients pourront réserver pendant ces créneaux</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
