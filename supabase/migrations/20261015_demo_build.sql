create or replace function private.demo_build(p_tenant uuid, p_keep_vehicles boolean) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  src uuid := '11111111-1111-4111-8111-000000000001';
  staff uuid[]; nstaff int; v_ids uuid[]; c_ids uuid[]; l_ids uuid[];
  fn text[] := array['Maria','James','Ashley','Carlos','Tyler','Jasmine','Kevin','Brianna','Luis','Megan','Anthony','Destiny','Ryan','Nicole','Jose','Samantha','Derek','Alyssa','Marcus','Rachel','Brandon','Gabriela','Sean','Kayla','Victor','Lauren','Hector','Emily','Jordan','Tanya'];
  ln text[] := array['Santos','Murphy','Nguyen','Rivera','Walsh','Johnson','Pereira','Lopez','Sullivan','Brooks','Diaz','Kelly','Morales','Carter','Ramirez','Doyle','Bennett','Cruz','Fitzgerald','Torres','Hughes','Reyes','O''Brien','Patel','Gomez','Russo','Ortiz','Flynn','Mendez','Lambert'];
  towns text[] := array['Methuen','Lawrence','Haverhill','Andover','Lowell','Salem','North Andover','Dracut','Tewksbury','Billerica'];
  srcs text[] := array['Website','CarGurus','Facebook','Phone','Walk-in','Cars.com','Referral','AutoTrader','Repeat','Website'];
  stages text[] := array['new','new','new','new','new','new','new','new','contacted','contacted','contacted','contacted','contacted','contacted','contacted','appointment','appointment','appointment','appointment','appointment','negotiating','negotiating','negotiating','negotiating','sold','sold','sold','sold','lost','lost'];
  msgs text[] := array['Is this still available? Can I come see it Saturday?','What''s the lowest you can do out the door?','I have a 2014 Civic to trade, what would you give me?','Do you finance? My credit is not great.','Can you send more pictures of the interior?','Looking for something AWD under $15k for my daughter.','Does it have a clean Carfax?','What would my payment be with $2,000 down?','Can I get a test drive after 5pm?','Is the price negotiable?'];
  nv int; i int; cid uuid; vid uuid; lid uuid; did uuid; st text; who uuid; p numeric; n int := 0;
begin
  if not exists (select 1 from tenants where id = p_tenant and is_demo) then raise exception 'not a demo dealership'; end if;
  perform set_config('cso.from_ghl', '1', true);   -- no follow-up tasks, workflows or webhooks while seeding
  perform setseed(0.42);

  select array_agg(id order by role, created_at) into staff from profiles where tenant_id = p_tenant and is_active and role in ('owner','admin','manager','sales');
  nstaff := coalesce(array_length(staff,1),0);
  if nstaff = 0 then raise exception 'demo dealership has no staff'; end if;

  -- inventory: the newest 60 available cars from tenant #1's live feed, with demo stock numbers and demo costs
  if not p_keep_vehicles then
  insert into vehicles (tenant_id, stock_number, vin, year, make, model, trim, body_style, mileage, price, cost, exterior_color, interior_color,
    transmission, drivetrain, engine, fuel_type, mpg, images, description, features, status, source, added_at)
  select p_tenant, 'DM' || lpad(row_number() over (order by added_at desc)::text, 4, '0'), vin, year, make, model, trim, body_style, mileage, price,
    round(coalesce(price,0) * (0.74 + random()*0.12) / 100) * 100, exterior_color, interior_color, transmission, drivetrain, engine, fuel_type, mpg, images,
    description, features, 'Available', 'demo', now() - ((random()*110)::int || ' days')::interval
  from (select * from vehicles where tenant_id = src and status = 'Available' and price > 0 order by added_at desc limit 60) s;
  end if;
  select array_agg(id order by random()) into v_ids from vehicles where tenant_id = p_tenant and status = 'Available';
  nv := coalesce(array_length(v_ids,1),0);
  if nv = 0 then raise exception 'demo has no cars'; end if;
  if nv >= 12 then update vehicles set status = 'Recon', added_at = now() - interval '3 days' where id = any(v_ids[nv-2:nv]); end if;

  -- customers + leads
  for i in 1..30 loop
    insert into customers (tenant_id, first_name, last_name, phone, email, city, state, source, owner_id, created_at)
    values (p_tenant, fn[i], ln[i], '978-555-' || lpad((100+i)::text,4,'0'), lower(fn[i]) || '.' || lower(replace(ln[i],'''','')) || '@example.com',
      towns[1 + (i % 10)], 'MA', srcs[1 + (i % 10)], staff[1 + (i % nstaff)], now() - ((i*2) || ' days')::interval)
    returning id into cid;
    c_ids := c_ids || cid;
    st := stages[i]; who := staff[1 + (i % nstaff)]; vid := v_ids[1 + ((i-1) % nv)];
    insert into leads (tenant_id, customer_id, vehicle_id, stage, source, assigned_to, score, message, notes, created_at)
    values (p_tenant, cid, vid, st, srcs[1 + (i % 10)], who, 40 + (random()*55)::int, msgs[1 + (i % 10)],
      case st when 'negotiating' then 'Working numbers — wants payment under $400' when 'lost' then 'Bought elsewhere' else null end,
      case when st = 'new' then now() - ((i*37) || ' minutes')::interval else now() - ((i/2) || ' days')::interval end)
    returning id into lid;
    l_ids := l_ids || lid;
  end loop;

  -- deals: 4 delivered this month, 2 approved / pending, 2 being worked
  for i in 21..28 loop
    vid := v_ids[1 + ((i-1) % nv)]; select price into p from vehicles where id = vid;
    insert into deals (tenant_id, customer_id, vehicle_id, salesperson_id, status, sale_price, down_payment, trade_value, trade_payoff, term_months, apr, tax_rate, fees, monthly_payment, created_at)
    values (p_tenant, c_ids[i], vid, staff[1 + (i % nstaff)],
      (case when i >= 25 then 'delivered' when i in (21,22) then 'working' when i = 23 then 'pending_approval' else 'approved' end)::deal_status,
      p, 2000 + (i % 3)*1000, case when i % 2 = 0 then 3500 else 0 end, case when i % 2 = 0 then 1200 else 0 end, 72, 7.9, 6.25,
      '{"doc": 499, "title": 135}'::jsonb, round(((p - 2000) * 1.0625 * (0.079/12)) / (1 - power(1 + 0.079/12, -72))),
      now() - (((28 - i) * 2) || ' days')::interval);
    if i >= 25 and nv >= 20 then update vehicles set status = 'Sold', sold_at = now() - (((28 - i) * 2) || ' days')::interval where id = vid; end if;
  end loop;

  -- appointments: today, this week, and a few past ones that showed / no-showed
  for i in 1..10 loop
    insert into appointments (tenant_id, customer_id, vehicle_id, type, starts_at, ends_at, status, assigned_to, source, notes)
    values (p_tenant, c_ids[15 + i], v_ids[1 + ((14 + i) % nv)], (array['test_drive','sales','test_drive','delivery','test_drive'])[1 + (i % 5)],
      date_trunc('hour', now()) + (array[-50, -26, -3, 1, 2, 4, 22, 27, 48, 72])[i] * interval '1 hour',
      date_trunc('hour', now()) + (array[-50, -26, -3, 1, 2, 4, 22, 27, 48, 72])[i] * interval '1 hour' + interval '45 minutes',
      (array['showed','no_show','showed','confirmed','scheduled','confirmed','scheduled','scheduled','scheduled','scheduled'])[i],
      staff[1 + (i % nstaff)], 'demo', null);
  end loop;

  -- tasks: some overdue, some due today
  for i in 1..12 loop
    insert into tasks (tenant_id, assigned_to, title, due_at, status, priority, related_type, related_id, created_by)
    values (p_tenant, staff[1 + (i % nstaff)],
      (array['Call ','Text ','Follow up with ','Send trade numbers to ','Confirm appointment with ','Send Carfax to '])[1 + (i % 6)] || fn[i] || ' ' || ln[i],
      now() + ((i - 5) * 3) * interval '1 hour', case when i > 10 then 'done' else 'open' end,
      (array['high','normal','normal','low'])[1 + (i % 4)], 'lead', l_ids[i], staff[1]);
  end loop;

  -- inbox conversations
  for i in 1..10 loop
    insert into records (tenant_id, kind, data, created_at) values
      (p_tenant, 'message', jsonb_build_object('customerId', c_ids[i], 'channel', 'sms', 'direction', 'inbound', 'via', 'manual', 'body', msgs[1 + (i % 10)], 'at', now() - ((i*41) || ' minutes')::interval), now() - ((i*41) || ' minutes')::interval);
    if i % 2 = 0 then
      insert into records (tenant_id, kind, data, created_at) values
        (p_tenant, 'message', jsonb_build_object('customerId', c_ids[i], 'channel', 'sms', 'direction', 'outbound', 'via', 'manual', 'by', staff[1 + (i % nstaff)],
          'body', 'Hi ' || fn[i] || '! Yes it''s here — want to come by today or tomorrow? I can have it pulled up front for you.', 'at', now() - ((i*41 - 12) || ' minutes')::interval), now() - ((i*41 - 12) || ' minutes')::interval);
    end if;
  end loop;

  -- appraisals, lenders, recon, spiff, monthly target, campaign
  insert into records (tenant_id, kind, data) values
    (p_tenant, 'appraisal', jsonb_build_object('vin','1HGCM82633A004352','year',2014,'make','Honda','model','Civic','trim','LX','mileage',118000,'condition','good','reconEstimate',900,'bookValue',7800,'acv',6200,'offer',5500,'customerId',c_ids[3],'status','pending','notes','Small dent rear bumper','appraisedBy',staff[1])),
    (p_tenant, 'appraisal', jsonb_build_object('vin','2T1BURHE5JC012345','year',2018,'make','Toyota','model','Corolla','trim','SE','mileage',64000,'condition','excellent','reconEstimate',300,'bookValue',14200,'acv',12500,'offer',12000,'customerId',c_ids[22],'status','won','notes','One owner','appraisedBy',staff[1])),
    (p_tenant, 'appraisal', jsonb_build_object('vin','1FTEW1EP2JK123456','year',2012,'make','Ford','model','F-150','trim','XLT','mileage',152000,'condition','fair','reconEstimate',1800,'bookValue',11000,'acv',8200,'offer',7500,'customerId',c_ids[9],'status','lost','notes','Customer wanted 10k','appraisedBy',staff[1])),
    (p_tenant, 'lender', jsonb_build_object('name','Merrimack Valley Credit Union','contact','Dana','phone','978-555-0190','email','','programs','Prime, near-prime','minScore',620,'maxLtv',125,'maxTerm',84,'notes','','active',true)),
    (p_tenant, 'lender', jsonb_build_object('name','Capital Auto Finance','contact','Rob','phone','978-555-0191','email','','programs','Subprime, first-time buyer','minScore',500,'maxLtv',140,'maxTerm',72,'notes','Fast funding','active',true)),
    (p_tenant, 'lender', jsonb_build_object('name','North Shore Bank','contact','Lisa','phone','978-555-0192','email','','programs','Prime','minScore',680,'maxLtv',115,'maxTerm',75,'notes','','active',true)),
    (p_tenant, 'recon', jsonb_build_object('vehicleId',v_ids[greatest(nv-2,1)],'stage','mechanical','estCost',650,'actualCost',null,'notes','Needs front brakes','items','[]'::jsonb,'startedAt',now() - interval '3 days')),
    (p_tenant, 'recon', jsonb_build_object('vehicleId',v_ids[greatest(nv-1,1)],'stage','detail','estCost',250,'actualCost',180,'notes','','items','[]'::jsonb,'startedAt',now() - interval '2 days')),
    (p_tenant, 'recon', jsonb_build_object('vehicleId',v_ids[nv],'stage','photos','estCost',100,'actualCost',90,'notes','','items','[]'::jsonb,'startedAt',now() - interval '1 day')),
    (p_tenant, 'spiff', jsonb_build_object('name','Weekend warrior','rule','Most units Fri–Sun','amount',250,'startDate',to_char(now(),'YYYY-MM-DD'),'endDate',to_char(now() + interval '7 days','YYYY-MM-DD'))),
    (p_tenant, 'target', jsonb_build_object('month',to_char(now(),'YYYY-MM'),'units',30,'gross',75000,'appointments',60)),
    (p_tenant, 'campaign', jsonb_build_object('name','Tax-season pre-approval blast','channel','sms','audience',jsonb_build_object('source','','stage','contacted','lastActivityDays',30,'vehicleId',''),'templateId','','scheduledAt',now() + interval '2 days','status','draft','notes','Demo campaign — never sends'));

  update tenants set demo_reset_at = now() where id = p_tenant;
  insert into audit_log (tenant_id, user_id, action, entity, details) values (p_tenant, auth.uid(), 'demo_reset', 'tenant', jsonb_build_object('vehicles', nv, 'kept', p_keep_vehicles, 'customers', 30, 'leads', 30));
  return jsonb_build_object('ok', true, 'vehicles', (select count(*) from vehicles where tenant_id = p_tenant), 'customers', 30, 'leads', 30, 'deals', 8, 'appointments', 10);
end $$;
revoke all on function private.demo_build(uuid, boolean) from public, anon, authenticated;
create or replace function private.demo_seed(p_tenant uuid) returns jsonb language sql security definer set search_path = public as $w$ select private.demo_build(p_tenant, false) $w$;
create or replace function public.demo_build_svc(p_tenant uuid, p_keep_vehicles boolean) returns jsonb language sql security definer set search_path = public as $w$ select private.demo_build(p_tenant, p_keep_vehicles) $w$;
revoke all on function public.demo_build_svc(uuid, boolean) from public, anon, authenticated;
grant execute on function public.demo_build_svc(uuid, boolean) to service_role;
select 'ok';
