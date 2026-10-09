import React, { useState } from 'react';
import {
  CalendarDays,
  Clock,
  Plus,
  Edit2,
  Trash2,
  Sun,
  Sunset,
  Moon,
  Sparkles,
  X,
  Coffee,
  Calendar,
  AlertTriangle,
  Building,
  CheckCircle2,
  Info
} from 'lucide-react';
import { Shift, CalendarEvent, CalendarEventType, CalendarPaidStatus } from '../../types';
import { StorageService } from '../../services/storage';
import { ShamsiDatePicker } from '../common/ShamsiDatePicker';
import { getTodayShamsi, formatShamsiDate } from '../../utils/dateUtils';

interface SchedulesViewProps {
  shifts: Shift[];
  onRefresh: () => void;
  canEdit: boolean;
}

const WEEK_DAYS = [
  { id: 0, name: 'شنبه' },
  { id: 1, name: 'یکشنبه' },
  { id: 2, name: 'دوشنبه' },
  { id: 3, name: 'سه‌شنبه' },
  { id: 4, name: 'چهارشنبه' },
  { id: 5, name: 'پنج‌شنبه' },
  { id: 6, name: 'جمعه' },
];

export const SchedulesView: React.FC<SchedulesViewProps> = ({
  shifts,
  onRefresh,
  canEdit,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'SHIFTS' | 'CALENDAR'>('SHIFTS');

  // Shift Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [deletingShift, setDeletingShift] = useState<{ id: string; name: string } | null>(null);

  // Calendar Event State
  const calendarEvents = StorageService.getCalendarEvents();
  const settings = StorageService.getSettings();
  const workshops = settings.workshops || [];

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<CalendarEvent | null>(null);

  const defaultShiftFormData: Omit<Shift, 'id' | 'companyId'> = {
    name: '',
    type: 'MORNING',
    startTime: '07:00',
    endTime: '16:00',
    thursdayEndTime: '13:00',
    breakDurationMinutes: 60,
    workDays: [0, 1, 2, 3, 4, 5],
    lateToleranceMinutes: 15,
    earlyExitToleranceMinutes: 10,
  };

  const [formData, setFormData] = useState<Omit<Shift, 'id' | 'companyId'>>(defaultShiftFormData);

  // Calendar Event Form State
  const defaultEventFormData: Omit<CalendarEvent, 'id' | 'companyId'> = {
    title: '',
    type: 'OFFICIAL_HOLIDAY',
    startDate: getTodayShamsi(),
    endDate: getTodayShamsi(),
    description: '',
    scope: 'ALL',
    workshopId: undefined,
    paidStatus: 'PAID',
    isActive: true,
  };

  const [eventFormData, setEventFormData] = useState<Omit<CalendarEvent, 'id' | 'companyId'>>(defaultEventFormData);

  const handleOpenAddShift = () => {
    setEditingShift(null);
    setFormData(defaultShiftFormData);
    setIsModalOpen(true);
  };

  const handleOpenEditShift = (shift: Shift) => {
    setEditingShift(shift);
    setFormData({
      name: shift.name,
      type: shift.type,
      startTime: shift.startTime,
      endTime: shift.endTime,
      thursdayEndTime: shift.thursdayEndTime || '13:00',
      breakDurationMinutes: shift.breakDurationMinutes,
      workDays: [...shift.workDays],
      lateToleranceMinutes: shift.lateToleranceMinutes,
      earlyExitToleranceMinutes: shift.earlyExitToleranceMinutes,
    });
    setIsModalOpen(true);
  };

  const handleDeleteShift = (id: string, name: string) => {
    setDeletingShift({ id, name });
  };

  const handleConfirmDeleteShift = () => {
    if (!deletingShift) return;
    StorageService.deleteShift(deletingShift.id);
    setDeletingShift(null);
    onRefresh();
  };

  const handleShiftSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    if (editingShift) {
      StorageService.updateShift({
        ...formData,
        id: editingShift.id,
        companyId: editingShift.companyId,
      });
    } else {
      StorageService.addShift({
        ...formData,
        id: `shift_${Date.now()}`,
        companyId: settings.id,
      });
    }
    setIsModalOpen(false);
    onRefresh();
  };

  const toggleDay = (dayId: number) => {
    if (formData.workDays.includes(dayId)) {
      setFormData({
        ...formData,
        workDays: formData.workDays.filter((d) => d !== dayId),
      });
    } else {
      setFormData({
        ...formData,
        workDays: [...formData.workDays, dayId].sort(),
      });
    }
  };

  // Calendar Event Handlers
  const handleOpenAddEvent = () => {
    setEditingEvent(null);
    setEventFormData(defaultEventFormData);
    setIsEventModalOpen(true);
  };

  const handleOpenEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    setEventFormData({
      title: event.title,
      type: event.type,
      startDate: event.startDate,
      endDate: event.endDate || event.startDate,
      description: event.description || '',
      scope: event.scope,
      workshopId: event.workshopId,
      paidStatus: event.paidStatus,
      isActive: event.isActive,
    });
    setIsEventModalOpen(true);
  };

  const handleEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventFormData.title.trim() || !eventFormData.startDate) return;

    if (editingEvent) {
      StorageService.updateCalendarEvent({
        ...eventFormData,
        id: editingEvent.id,
        companyId: editingEvent.companyId,
      });
    } else {
      StorageService.addCalendarEvent({
        ...eventFormData,
        id: `cal_${Date.now()}`,
        companyId: settings.id,
      });
    }
    setIsEventModalOpen(false);
    onRefresh();
  };

  const handleConfirmDeleteEvent = () => {
    if (!deletingEvent) return;
    StorageService.deleteCalendarEvent(deletingEvent.id);
    setDeletingEvent(null);
    onRefresh();
  };

  const getShiftIcon = (type: Shift['type']) => {
    switch (type) {
      case 'MORNING':
        return <Sun className="w-4 h-4 text-amber-500" />;
      case 'EVENING':
        return <Sunset className="w-4 h-4 text-orange-500" />;
      case 'NIGHT':
        return <Moon className="w-4 h-4 text-indigo-400" />;
      case 'FLEXIBLE':
        return <Sparkles className="w-4 h-4 text-teal-500" />;
    }
  };

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-indigo-600" />
            <span>شیفت‌ها، تقویم کاری و تعطیلات</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            تنظیم شیفت‌های کاری، تعطیلات رسمی کشور، تعطیلی اضطراری کارگاه و محاسبه خودکار روزهای موظفی
          </p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            {activeSubTab === 'SHIFTS' ? (
              <button
                type="button"
                onClick={handleOpenAddShift}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4 text-indigo-400" />
                <span>تعریف شیفت جدید</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleOpenAddEvent}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4 text-white" />
                <span>ثبت تعطیلی / رویداد تقویم</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('SHIFTS')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeSubTab === 'SHIFTS'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>الگوها و شیفت‌های کاری ({shifts.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('CALENDAR')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeSubTab === 'CALENDAR'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>تقویم و تعطیلات ({calendarEvents.length})</span>
        </button>
      </div>

      {activeSubTab === 'SHIFTS' ? (
        <>
          {/* Standard Work Schedule Example Preview Card */}
          <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-2xl p-4 lg:p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold text-slate-800">
                  الگوی پایه شیفت کارگاهی M.GAMMON
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                شنبه تا چهارشنبه: ۰۷:۰۰ الی ۱۶:۰۰ | پنج‌شنبه‌ها: ۰۷:۰۰ الی ۱۳:۰۰
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              مهلت شناوری ورود ۱۵ دقیقه بدون کسر کار است. ترددهای بعد از مهلت به صورت تاخیر غیرمجاز و کسری در پایان ماه محاسبه می‌گردد.
            </p>
          </div>

          {/* Shifts Grid Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {shifts.map((shift) => (
              <div
                key={shift.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
                        {getShiftIcon(shift.type)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">{shift.name}</h4>
                        <span className="text-[11px] text-slate-400">
                          {shift.type === 'MORNING'
                            ? 'شیفت صبح / روزانه'
                            : shift.type === 'EVENING'
                            ? 'شیفت عصرگاهی'
                            : shift.type === 'NIGHT'
                            ? 'شیفت شب'
                            : 'شیفت شناور'}
                        </span>
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditShift(shift)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {shifts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteShift(shift.id, shift.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Timing Details */}
                  <div className="space-y-2 py-3 border-y border-slate-100 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">ساعت کاری عادی:</span>
                      <span className="font-mono font-bold text-slate-800">
                        {shift.startTime} الی {shift.endTime}
                      </span>
                    </div>
                    {shift.thursdayEndTime && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">پایان کار پنج‌شنبه:</span>
                        <span className="font-mono font-bold text-slate-800">
                          {shift.thursdayEndTime}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Coffee className="w-3.5 h-3.5 text-slate-400" />
                        استراحت و ناهار:
                      </span>
                      <span className="font-semibold text-slate-700">
                        {shift.breakDurationMinutes} دقیقه
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">شناوری مجاز ورود:</span>
                      <span className="font-mono font-medium text-emerald-600">
                        {shift.lateToleranceMinutes} دقیقه
                      </span>
                    </div>
                  </div>

                  {/* Work Days Badge list */}
                  <div className="mt-4">
                    <span className="text-[11px] text-slate-400 font-medium block mb-2">
                      روزهای کاری در هفته:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {WEEK_DAYS.map((day) => {
                        const isWorking = shift.workDays.includes(day.id);
                        return (
                          <span
                            key={day.id}
                            className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${
                              isWorking
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-slate-50 text-slate-400 line-through'
                            }`}
                          >
                            {day.name}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* CALENDAR & HOLIDAYS MANAGEMENT TAB */
        <div className="space-y-4">
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 text-xs text-amber-900 leading-relaxed flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-950 mb-1">قواعد اثر تعطیلات بر حقوق و موظفی:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-700">
                <li><strong>تعطیلات رسمی کشور:</strong> از روزهای موظفی کارگاه کسر شده و هرگز غیبت محسوب نمی‌شوند.</li>
                <li><strong>تعطیلی اضطراری باحقوق:</strong> هیچ کسر حقوقی برای پرسنل به همراه ندارد و کارکرد کارمند حفظ می‌شود.</li>
                <li><strong>تعطیلی اضطراری بدون حقوق:</strong> تنها در صورت تعیین صریح وضعیت «بدون حقوق» توسط مدیر در محاسبات اعمال می‌گردد.</li>
                <li><strong>محدوده کارگاه:</strong> می‌توانید تعطیلی را به کل کارگاه‌ها یا یک کارگاه خاص اختصاص دهید.</li>
              </ul>
            </div>
          </div>

          {calendarEvents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <Calendar className="w-12 h-12 mx-auto text-slate-300" />
              <h4 className="font-bold text-sm text-slate-700">هیچ رویداد یا تعطیلی ثبت نشده است</h4>
              <p className="text-xs text-slate-400">
                برای تعیین تعطیلات رسمی ماه جاری، تعطیلی عید، یا تعطیلی اضطراری بر روی دکمه «ثبت تعطیلی / رویداد تقویم» کلیک کنید.
              </p>
              {canEdit && (
                <button
                  type="button"
                  onClick={handleOpenAddEvent}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>ثبت اولین تعطیلی</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {calendarEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs hover:border-slate-300 transition space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        evt.type === 'OFFICIAL_HOLIDAY'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : evt.type === 'EMERGENCY_SHUTDOWN'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      }`}>
                        {evt.type === 'OFFICIAL_HOLIDAY'
                          ? 'تعطیل رسمی کشور'
                          : evt.type === 'EMERGENCY_SHUTDOWN'
                          ? 'تعطیلی اضطراری کارگاه'
                          : evt.type === 'WEEKLY_OFF'
                          ? 'تعطیلی هفتگی'
                          : 'روز کاری ویژه'}
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm mt-1.5">{evt.title}</h4>
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditEvent(evt)}
                          className="p-1 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingEvent(evt)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 py-2 border-y border-slate-100 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">بازه زمانی:</span>
                      <span className="font-mono font-bold text-slate-800">
                        {evt.startDate === evt.endDate
                          ? formatShamsiDate(evt.startDate)
                          : `${evt.startDate} الی ${evt.endDate}`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">محدوده اعمال:</span>
                      <span className="font-medium text-slate-700 flex items-center gap-1">
                        <Building className="w-3 h-3 text-slate-400" />
                        {evt.scope === 'ALL'
                          ? 'کل مجموعه کارگاهی'
                          : workshops.find(w => w.id === evt.workshopId)?.name || 'کارگاه اختصاصی'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">اثر بر حقوق:</span>
                      <span className={`font-bold ${
                        evt.paidStatus === 'PAID' ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {evt.paidStatus === 'PAID' ? 'باحقوق (بدون کسر)' : 'بدون حقوق'}
                      </span>
                    </div>
                  </div>

                  {evt.description && (
                    <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-xl">
                      {evt.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Shift Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 p-6 space-y-4 shadow-2xl text-right">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-base">
                {editingShift ? 'ویرایش شیفت کاری' : 'تعریف شیفت کاری جدید'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleShiftSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  نام شیفت: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: شیفت روزانه کارگاه ۱"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ساعت شروع:</label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ساعت پایان:</label>
                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    پایان کار پنج‌شنبه:
                  </label>
                  <input
                    type="time"
                    value={formData.thursdayEndTime || '13:00'}
                    onChange={(e) => setFormData({ ...formData, thursdayEndTime: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    استراحت (دقیقه):
                  </label>
                  <input
                    type="number"
                    value={formData.breakDurationMinutes}
                    onChange={(e) => setFormData({ ...formData, breakDurationMinutes: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-2">
                  روزهای کاری مجاز در هفته:
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                  {WEEK_DAYS.map((day) => {
                    const isSelected = formData.workDays.includes(day.id);
                    return (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => toggleDay(day.id)}
                        className={`py-2 rounded-xl font-bold text-center border cursor-pointer transition ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-slate-50 text-slate-500 border-slate-200'
                        }`}
                      >
                        {day.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800 cursor-pointer shadow-xs"
                >
                  {editingShift ? 'ثبت تغییرات' : 'ایجاد شیفت'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Calendar Event Modal */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 p-6 space-y-4 shadow-2xl text-right">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <span>{editingEvent ? 'ویرایش رویداد تقویم' : 'ثبت تعطیلی / رویداد تقویم کاری'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEventModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEventSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  عنوان رویداد یا مناسبت: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={eventFormData.title}
                  onChange={(e) => setEventFormData({ ...eventFormData, title: e.target.value })}
                  placeholder="مثال: عید نوروز، تعطیلی قطعی برق کارگاه، شهادت حضرت علی (ع)..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">نوع رویداد:</label>
                  <select
                    value={eventFormData.type}
                    onChange={(e) => setEventFormData({ ...eventFormData, type: e.target.value as CalendarEventType })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none bg-white"
                  >
                    <option value="OFFICIAL_HOLIDAY">تعطیل رسمی کشور</option>
                    <option value="EMERGENCY_SHUTDOWN">تعطیلی اضطراری کارگاه</option>
                    <option value="WEEKLY_OFF">تعطیلی هفتگی شیفت</option>
                    <option value="SPECIAL_WORKDAY">روز کاری ویژه / جمعه کاری</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">وضعیت پرداخت و حقوق:</label>
                  <select
                    value={eventFormData.paidStatus}
                    onChange={(e) => setEventFormData({ ...eventFormData, paidStatus: e.target.value as CalendarPaidStatus })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none bg-white font-bold"
                  >
                    <option value="PAID">باحقوق (بدون کسر از حقوق)</option>
                    <option value="UNPAID">بدون حقوق (کسر روز موظفی)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    از تاریخ: <span className="text-rose-500">*</span>
                  </label>
                  <ShamsiDatePicker
                    value={eventFormData.startDate}
                    onChange={(val) => setEventFormData({ ...eventFormData, startDate: val, endDate: val > eventFormData.endDate ? val : eventFormData.endDate })}
                    placeholder="تاریخ شروع..."
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">تا تاریخ:</label>
                  <ShamsiDatePicker
                    value={eventFormData.endDate}
                    onChange={(val) => setEventFormData({ ...eventFormData, endDate: val })}
                    placeholder="تاریخ پایان..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">محدوده اجرا:</label>
                  <select
                    value={eventFormData.scope}
                    onChange={(e) => setEventFormData({ ...eventFormData, scope: e.target.value as 'ALL' | 'WORKSHOP' })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none bg-white"
                  >
                    <option value="ALL">تمامی کارگاه‌ها (سراسری)</option>
                    <option value="WORKSHOP">فقط یک کارگاه خاص</option>
                  </select>
                </div>
                {eventFormData.scope === 'WORKSHOP' && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">انتخاب کارگاه:</label>
                    <select
                      value={eventFormData.workshopId || workshops[0]?.id}
                      onChange={(e) => setEventFormData({ ...eventFormData, workshopId: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none bg-white"
                    >
                      {workshops.map((w) => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">توضیحات و دستور مدیر (اختیاری):</label>
                <textarea
                  rows={2}
                  value={eventFormData.description || ''}
                  onChange={(e) => setEventFormData({ ...eventFormData, description: e.target.value })}
                  placeholder="مثال: تعطیلی به دلیل دستور فرمانداری / تعمیرات تجهیزات کارگاه..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer shadow-xs"
                >
                  {editingEvent ? 'ثبت تغییرات رویداد' : 'ذخیره تعطیلی'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Shift Confirmation Modal */}
      {deletingShift && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 p-5 space-y-4 shadow-2xl text-right">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">حذف شیفت کاری</h3>
                <p className="text-[11px] text-slate-400">شیفت {deletingShift.name}</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              آیا از حذف این شیفت اطمینان دارید؟ پرسنل دارای این شیفت به شیفت پیش‌فرض منتقل خواهند شد.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingShift(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteShift}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-xs"
              >
                تایید و حذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Event Confirmation Modal */}
      {deletingEvent && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 p-5 space-y-4 shadow-2xl text-right">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">حذف رویداد تقویم</h3>
                <p className="text-[11px] text-slate-400">{deletingEvent.title}</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              آیا از حذف این رویداد یا تعطیلی اطمینان دارید؟ با حذف آن، روزهای مربوطه مجدداً بر اساس شیفت عادی ارزیابی خواهند شد.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingEvent(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteEvent}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-xs"
              >
                تایید و حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
