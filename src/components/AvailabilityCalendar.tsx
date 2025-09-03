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
        .gte('date', startOfMonth.toISOString().split('T')[0])
        .lte('date', endOfMonth.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) {
        console.error('Erreur lors de la récupération des disponibilités:', error);
        return;
      }

      const formattedAvailabilities = data.map(item => ({
        id: item.id,
        driverId: item.driver_id,
        date: item.date,
        startTime: item.start_time,
        endTime: item.end_time,
        isAvailable: item.is_available,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));

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

    const days = [];
    
    // Jours du mois précédent pour compléter la première semaine
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i);
      days.push({
        date: prevDate,
        isCurrentMonth: false,
        dateString: prevDate.toISOString().split('T')[0]
      });
    }

    // Jours du mois actuel
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push({
        date,
        isCurrentMonth: true,
        dateString: date.toISOString().split('T')[0]
      });
    }

    // Jours du mois suivant pour compléter la dernière semaine
    const remainingDays = 42 - days.length; // 6 semaines * 7 jours
    for (let day = 1; day <= remainingDays; day++) {
      const nextDate = new Date(year, month + 1, day);
      days.push({
        date: nextDate,
        isCurrentMonth: false,
        dateString: nextDate.toISOString().split('T')[0]
      });
    }

    return days;
  };

  const getAvailabilityForDate = (dateString: string) => {
    return availabilities.filter(av => av.date === dateString);
  };

  const addTimeSlot = () => {
    setTimeSlots([...timeSlots, { start: '09:00', end: '17:00' }]);
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
        console.error('Erreur lors de la sauvegarde:', error);
        return;
      }

      // Rafraîchir les données
      await fetchAvailabilities();
      setSelectedDate(null);
      setTimeSlots([]);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setSaving(false);
    }
  };

  const deleteAvailability = async (availabilityId: string) => {
    try {
      const { error } = await supabase
        .from('driver_availability')
        .delete()
        .eq('id', availabilityId);

      if (error) {
        console.error('Erreur lors de la suppression:', error);
        return;
      }

      await fetchAvailabilities();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const isToday = (dateString: string) => {
    const today = new Date().toISOString().split('T')[0];
    return dateString === today;
  };

  const isPastDate = (dateString: string) => {
    const today = new Date().toISOString().split('T')[0];
    return dateString < today;
  };

  const days = getDaysInMonth();
  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Calendar size={20} className="text-blue-600" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Mes disponibilités</h3>
            <p className="text-sm text-gray-600">Gérez vos créneaux de disponibilité</p>
          </div>
        </div>
      </div>

      {/* Navigation du calendrier */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigateMonth('prev')}
          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        
        <h4 className="text-lg font-semibold text-gray-900">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h4>
        
        <button
          onClick={() => navigateMonth('next')}
          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Calendrier */}
      <div className="grid grid-cols-7 gap-1 mb-6">
        {/* En-têtes des jours */}
        {dayNames.map(day => (
          <div key={day} className="p-3 text-center text-sm font-medium text-gray-500">
            {day}
          </div>
        ))}
        
        {/* Jours du calendrier */}
        {days.map((day, index) => {
          const dayAvailabilities = getAvailabilityForDate(day.dateString);
          const hasAvailabilities = dayAvailabilities.length > 0;
          const isPast = isPastDate(day.dateString);
          const isCurrentDay = isToday(day.dateString);
          
          return (
            <button
              key={index}
              onClick={() => !isPast && day.isCurrentMonth && setSelectedDate(day.dateString)}
              disabled={isPast || !day.isCurrentMonth}
              className={`
                relative p-3 text-sm rounded-lg transition-all duration-200 min-h-[3rem]
                ${day.isCurrentMonth 
                  ? isPast 
                    ? 'text-gray-400 cursor-not-allowed' 
                    : 'text-gray-900 hover:bg-blue-50 cursor-pointer'
                  : 'text-gray-300 cursor-not-allowed'
                }
                ${isCurrentDay && day.isCurrentMonth ? 'bg-blue-100 font-semibold' : ''}
                ${selectedDate === day.dateString ? 'bg-blue-200 ring-2 ring-blue-500' : ''}
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

      {/* Légende */}
      <div className="flex items-center gap-6 mb-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-100 rounded"></div>
          <span className="text-gray-600">Aujourd'hui</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-50 border border-green-200 rounded"></div>
          <span className="text-gray-600">Disponibilités définies</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-200 rounded"></div>
          <span className="text-gray-600">Dates passées</span>
        </div>
      </div>

      {/* Formulaire d'ajout de disponibilités */}
      {selectedDate && (
        <div className="border-t border-gray-200 pt-6">
          <div className="bg-blue-50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900">
                Disponibilités pour le {new Date(selectedDate + 'T00:00:00').toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </h4>
              <button
                onClick={() => {
                  setSelectedDate(null);
                  setTimeSlots([]);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white transition-colors"
              >
                <XCircle size={20} />
              </button>
            </div>

            {/* Disponibilités existantes */}
            {getAvailabilityForDate(selectedDate).length > 0 && (
              <div className="mb-6">
                <h5 className="text-sm font-medium text-gray-700 mb-3">Disponibilités actuelles</h5>
                <div className="space-y-2">
                  {getAvailabilityForDate(selectedDate).map((availability) => (
                    <div key={availability.id} className="flex items-center justify-between bg-white rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <Clock size={16} className="text-green-600" />
                        <span className="text-sm font-medium text-gray-900">
                          {availability.startTime} - {availability.endTime}
                        </span>
                      </div>
                      <button
                        onClick={() => deleteAvailability(availability.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Nouveaux créneaux */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h5 className="text-sm font-medium text-gray-700">Ajouter des créneaux</h5>
                <Button
                  onClick={addTimeSlot}
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Plus size={16} />
                  Ajouter un créneau
                </Button>
              </div>

              {timeSlots.map((slot, index) => (
                <div key={index} className="flex items-center gap-3 bg-white rounded-lg p-3">
                  <Clock size={16} className="text-blue-600" />
                  <input
                    type="time"
                    value={slot.start}
                    onChange={(e) => updateTimeSlot(index, 'start', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-500">à</span>
                  <input
                    type="time"
                    value={slot.end}
                    onChange={(e) => updateTimeSlot(index, 'end', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => removeTimeSlot(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}

              {timeSlots.length > 0 && (
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={saveAvailabilities}
                    loading={saving}
                    className="flex items-center gap-2"
                  >
                    <Save size={16} />
                    {saving ? 'Enregistrement...' : 'Enregistrer'}
                  </Button>
                  <Button
                    onClick={() => {
                      setTimeSlots([]);
                      setSelectedDate(null);
                    }}
                    variant="outline"
                  >
                    Annuler
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      {!selectedDate && (
        <div className="bg-gray-50 rounded-xl p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-3">Comment ça marche ?</h4>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-green-600" />
              <span>Cliquez sur une date future pour ajouter vos disponibilités</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-green-600" />
              <span>Définissez vos créneaux horaires de disponibilité</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-green-600" />
              <span>Les clients pourront réserver pendant ces créneaux</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};