-- Prefer live drivers; allow the explicitly enabled development pool as a fallback.
create or replace function public.driver_action(action text, payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=public as $$
declare d drivers; r driver_rides; dev boolean; uid uuid:=auth.uid(); lat double precision; lng double precision; next_status text;
begin
 if uid is null then raise exception 'Sign in to continue'; end if;
 -- One transaction lock gives deterministic allocation/cancellation ordering and prevents double assignment.
 perform pg_advisory_xact_lock(611060001);
 -- Release abandoned offers even if their rider closed the app.
 update driver_rides set status='searching',driver_id=null,driver=null,updated_at=now()
 where status='requested' and expires_at<=now() and id is distinct from nullif(payload->>'id','')::uuid;
 select development into dev from driver_settings where id;
 select * into d from drivers where owner_id=uid;
 if action='register' then
  insert into drivers(owner_id,name,phone,category,brand,model,registration) values(uid,trim(payload->>'name'),payload->>'phone',payload->>'category',trim(payload->>'brand'),trim(payload->>'model'),regexp_replace(upper(payload->>'registration'),'[^A-Z0-9]','','g')) returning * into d;
  return to_jsonb(d);
 elsif action='presence' then
  if d.id is null then raise exception 'Register your vehicle first'; end if;
  if not (payload->>'online')::boolean and exists(select 1 from driver_rides where driver_id=d.id and status in ('requested','assigned','arrived','in_progress')) then raise exception 'Finish or reject your current ride first'; end if;
  lat:=(payload->>'latitude')::double precision; lng:=(payload->>'longitude')::double precision;
  if (payload->>'online')::boolean and (lat is null or lng is null) then raise exception 'Enable device location to go online'; end if;
  update drivers set online=(payload->>'online')::boolean, latitude=lat, longitude=lng, heartbeat=now() where id=d.id returning * into d;
  return to_jsonb(d);
 elsif action='request' then
  if coalesce((payload->>'simulated')::boolean,false) and not dev then raise exception 'Ride simulation is not enabled on this server'; end if;
  if length(coalesce(payload->>'origin',''))=0 or length(coalesce(payload->>'destination',''))=0 or not coalesce((payload->>'fare')::numeric between 0 and 100000,false) then raise exception 'Invalid ride details'; end if;
  lat:=(payload#>>'{pickupCoords,latitude}')::double precision; lng:=(payload#>>'{pickupCoords,longitude}')::double precision;
  if lat is null or lng is null or not(lat between -90 and 90 and lng between -180 and 180) then raise exception 'Choose a valid pickup'; end if;
  select * into r from driver_rides where rider_id=uid and status in ('searching','requested','assigned','arrived','in_progress');
  if r.id is null then insert into driver_rides(rider_id,category,details,simulated) values(uid,payload->>'vehicleId',payload, false) returning * into r; end if;
 else
  select * into r from driver_rides where id=(payload->>'id')::uuid for update;
  if r.id is null or not(r.rider_id=uid or coalesce(r.driver_id=d.id,false)) then raise exception 'Ride not available'; end if;
  if action='cancel' then
   if r.rider_id<>uid or r.status not in ('searching','requested','assigned','arrived') then raise exception 'Cannot cancel this ride'; end if;
   r.status:='cancelled';
  elsif action in ('accept','reject','arrive','start','complete') then
   if r.driver_id is distinct from d.id or r.simulated then raise exception 'Only the assigned driver can update this ride'; end if;
   if action in ('accept','reject') and (r.status<>'requested' or r.expires_at<=now()) then raise exception 'Request expired'; end if;
   next_status:=case action when 'accept' then 'assigned' when 'reject' then 'searching' when 'arrive' then 'arrived' when 'start' then 'in_progress' when 'complete' then 'completed' end;
   if (action='arrive' and r.status<>'assigned') or (action='start' and (r.status<>'arrived' or payload->>'otp' is distinct from r.otp)) or (action='complete' and r.status<>'in_progress') then raise exception 'Invalid ride transition or start code'; end if;
   r.status:=next_status;
  elsif action<>'sync' then raise exception 'Unknown action'; end if;
 end if;
 if r.status='requested' and r.expires_at<=now() then r.status:='searching'; end if;
 -- Seed acceptance is isolated from registered drivers and additionally gated on the database.
 if action='sync' and r.simulated and dev and r.updated_at<now()-interval '5 seconds' then
  r.status:=case r.status when 'requested' then 'assigned' when 'assigned' then 'arrived' when 'arrived' then 'in_progress' when 'in_progress' then 'completed' else r.status end;
 end if;
 if r.status='searching' then
  r.driver_id:=null; r.driver:=null;
  lat:=(r.details#>>'{pickupCoords,latitude}')::double precision; lng:=(r.details#>>'{pickupCoords,longitude}')::double precision;
  select * into d from drivers x where x.category=r.category and x.online and x.owner_id is distinct from uid
   and ((x.source='registered' and x.heartbeat>now()-interval '60 seconds') or (dev and coalesce((r.details->>'simulated')::boolean,false) and x.source='seed'))
   and not(x.id=any(r.attempted)) and not exists(select 1 from driver_rides a where a.driver_id=x.id and a.id<>r.id and a.status in ('requested','assigned','arrived','in_progress'))
   and 6371*2*asin(sqrt(least(1.0,power(sin(radians(x.latitude-lat)/2),2)+cos(radians(lat))*cos(radians(x.latitude))*power(sin(radians(x.longitude-lng)/2),2))))<=8
   order by case when x.source='registered' then 0 else 1 end, random() limit 1;
  if d.id is null then r.status:='unavailable'; else
   r.simulated:=(d.source='seed'); r.driver_id:=d.id; r.attempted:=array_append(r.attempted,d.id); r.status:='requested'; r.expires_at:=now()+interval '30 seconds';
   r.driver:=jsonb_build_object('id',d.id,'name',d.name,'vehicleModel',d.brand||' '||d.model,'vehicleNumber',d.registration,'latitude',d.latitude,'longitude',d.longitude);
  end if;
 end if;
 if r.driver_id is not null then
  select * into d from drivers where id=r.driver_id;
  r.driver:=r.driver||jsonb_build_object('latitude',d.latitude,'longitude',d.longitude);
 end if;
 update driver_rides set driver_id=r.driver_id,status=r.status,driver=r.driver,attempted=r.attempted,expires_at=r.expires_at,simulated=r.simulated,
 updated_at=case when status<>r.status then now() else updated_at end where id=r.id
 and (driver_id,status,driver,attempted,expires_at,simulated) is distinct from (r.driver_id,r.status,r.driver,r.attempted,r.expires_at,r.simulated);
 select * into r from driver_rides where id=r.id;
 return to_jsonb(r);
end $$;
