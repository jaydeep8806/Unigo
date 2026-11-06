-- Run ONLY against a development database. Production migrations never enable this.
begin;
update public.driver_settings set development=true where id;
insert into public.drivers(id,name,phone,category,brand,model,registration,source,online,latitude,longitude,heartbeat)
select md5('unigo-rajkot-driver-'||n)::uuid,
 (array['Aarav','Dhruv','Harsh','Jay','Kiran','Manish','Nikhil','Pranav','Ravi','Sanjay','Vivek','Yash'])[1+n%12]||' '||
 (array['Patel','Shah','Joshi','Mehta','Parmar','Rathod','Chauhan','Trivedi','Solanki','Desai'])[1+(n/12)%10],
 '9'||lpad(n::text,9,'0'), case when n<=1800 then 'bike' when n%2=0 then 'car' else 'sedan' end,
 case when n<=1800 then (array['Honda','TVS','Hero'])[1+n%3] else (array['Maruti Suzuki','Hyundai','Honda'])[1+n%3] end,
 case when n<=1800 then (array['Activa','Jupiter','Splendor'])[1+n%3] else (array['Dzire','Aura','Amaze'])[1+n%3] end,
 'GJ03UZ'||lpad(n::text,4,'0'),'seed',true,
 (array[22.278,22.290,22.310,22.290,22.291,22.269,22.258,22.272,22.287,22.310,22.304])[1+n%11]+((n*37%1000)/1000.0-0.5)*0.012,
 (array[70.755,70.770,70.770,70.775,70.795,70.803,70.785,70.775,70.780,70.790,70.802])[1+n%11]+((n*61%1000)/1000.0-0.5)*0.012,now()
from generate_series(1,3000) n on conflict do nothing;
commit;
