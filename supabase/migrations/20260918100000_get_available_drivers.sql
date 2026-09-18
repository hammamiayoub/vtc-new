-- Aligné sur TuniDriveMobile/supabase/get_available_drivers.sql
create or replace function public.get_available_drivers(
  p_date date,
  p_time time
)
returns setof public.drivers
language sql
stable
as $$
  with eligible as (
    select d.*
    from public.drivers d
    where d.status = 'active'
      and exists (
        select 1
        from public.get_driver_subscription_status(d.id) sub_status
        where sub_status.can_accept_more_bookings = true
      )
      and exists (
        select 1 from public.driver_availability a
        where a.driver_id = d.id
          and a.date::date = p_date
          and a.is_available = true
          and a.start_time::time <= p_time
          and a.end_time::time >= p_time
      )
      and not exists (
        select 1 from public.driver_availability a2
        where a2.driver_id = d.id
          and a2.date::date = p_date
          and a2.is_available = false
          and a2.start_time::time <= p_time
          and a2.end_time::time >= p_time
      )
      and not exists (
        select 1 from public.bookings b
        where b.driver_id = d.id
          and b.status in ('accepted','in_progress')
          and date(b.scheduled_time) = p_date
          and abs(extract(epoch from (b.scheduled_time - (p_date::timestamp + p_time)))/60) <= 120
      )
  )
  select * from eligible;
$$;
