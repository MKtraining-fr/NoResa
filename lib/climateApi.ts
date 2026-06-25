import { supabase } from './supabaseClient';

/**
 * Climatisation — réglages par zone (3 unités intérieures).
 * Stocke l'état VOULU (on/off, mode, température, ventilation) + la programmation.
 * Le pilotage matériel (pont -> IR) sera branché ensuite ; ici c'est le panneau de réglages.
 */

export type ClimateMode = 'cool' | 'heat' | 'auto' | 'fan' | 'dry';
export type ClimateFan = 'auto' | 'low' | 'mid' | 'high';

export interface ClimateZone {
  id: string;
  name: string;
  position: number;
  power: boolean;
  mode: ClimateMode;
  temperature: number;
  fan: ClimateFan;
  scheduleEnabled: boolean;
  followOpeningHours: boolean;
  onTime: string | null;   // 'HH:MM'
  offTime: string | null;  // 'HH:MM'
  weekdays: number[];      // 0=dim .. 6=sam
}

const hhmm = (t: string | null) => (t ? String(t).slice(0, 5) : null);

export async function getClimateZones(): Promise<ClimateZone[]> {
  const { data, error } = await supabase.rpc('admin_list_climate_zones');
  if (error) { console.error('climateApi.getClimateZones', error); return []; }
  return (data ?? []).map((r: any) => ({
    id: r.id,
    name: r.name ?? 'Zone',
    position: r.position ?? 0,
    power: !!r.power,
    mode: (r.mode ?? 'cool') as ClimateMode,
    temperature: r.temperature ?? 21,
    fan: (r.fan ?? 'auto') as ClimateFan,
    scheduleEnabled: !!r.schedule_enabled,
    followOpeningHours: !!r.follow_opening_hours,
    onTime: hhmm(r.on_time),
    offTime: hhmm(r.off_time),
    weekdays: Array.isArray(r.weekdays) ? r.weekdays : [0, 1, 2, 3, 4, 5, 6],
  }));
}

export async function saveClimateZone(z: ClimateZone): Promise<void> {
  const { error } = await supabase.rpc('admin_upsert_climate_zone', {
    p_id: z.id,
    p_name: z.name,
    p_power: z.power,
    p_mode: z.mode,
    p_temperature: z.temperature,
    p_fan: z.fan,
    p_schedule_enabled: z.scheduleEnabled,
    p_follow_opening_hours: z.followOpeningHours,
    p_on_time: z.onTime || null,
    p_off_time: z.offTime || null,
    p_weekdays: z.weekdays,
  });
  if (error) { console.error('climateApi.saveClimateZone', error); throw error; }
}
