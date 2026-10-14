-- Demo realism: fill every module so no page in the demo dealership is empty.
create or replace function private.demo_extras(p_tenant uuid) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  staff uuid[]; sales uuid[]; mgr uuid; fi uuid; tech uuid; owner uuid;
  cust uuid[]; veh uuid[]; vprice numeric[]; delivered uuid[]; dcust uuid[]; dveh uuid[]; td_appts uuid[]; td_c uuid[]; td_v uuid[];
  nv int; i int; rid uuid; auc1 uuid; auc2 uuid; pp1 uuid; pp2 uuid; w1 uuid; acct uuid;
  d date := current_date;
  ts text;
begin
  if not exists (select 1 from tenants where id = p_tenant and is_demo) then raise exception 'not a demo dealership'; end if;
  perform set_config('cso.from_ghl', '1', true);
  perform setseed(0.17);
  select array_agg(id order by created_at) into staff from profiles where tenant_id = p_tenant and is_active and role <> 'super_admin';
  select array_agg(id order by created_at) into sales from profiles where tenant_id = p_tenant and is_active and role in ('sales','owner');
  select id into mgr from profiles where tenant_id = p_tenant and is_active and role in ('manager','owner') order by role = 'manager' desc, created_at limit 1;
  select coalesce((select id from profiles where tenant_id = p_tenant and is_active and role = 'f_and_i' limit 1), mgr) into fi;
  select coalesce((select id from profiles where tenant_id = p_tenant and is_active and role = 'technician' limit 1), mgr) into tech;
  owner := mgr;
  select array_agg(id order by created_at) into cust from customers where tenant_id = p_tenant;
  select array_agg(id order by added_at), array_agg(coalesce(price, 12000) order by added_at) into veh, vprice from vehicles where tenant_id = p_tenant and status <> 'Sold';
  nv := coalesce(array_length(veh, 1), 0);
  select array_agg(id order by created_at), array_agg(customer_id order by created_at), array_agg(vehicle_id order by created_at) into delivered, dcust, dveh from deals where tenant_id = p_tenant and status = 'delivered';
  select array_agg(id order by starts_at), array_agg(customer_id order by starts_at), array_agg(vehicle_id order by starts_at) into td_appts, td_c, td_v from appointments where tenant_id = p_tenant and type = 'test_drive';
  if nv < 6 or cust is null then return jsonb_build_object('ok', false, 'why', 'not enough base data'); end if;

  -- F&I: credit apps
  for i in 1..4 loop
    insert into records (tenant_id, kind, data, created_by) values (p_tenant, 'credit_app', jsonb_build_object(
      'customerId', cust[20 + i], 'vehicleId', veh[1 + (i * 3) % nv], 'status', (array['approved','submitted','declined','draft'])[i],
      'applicant', jsonb_build_object('firstName', (select first_name from customers where id = cust[20 + i]), 'lastName', (select last_name from customers where id = cust[20 + i]), 'phone', (select phone from customers where id = cust[20 + i]), 'email', (select email from customers where id = cust[20 + i])),
      'coApplicant', null,
      'residence', jsonb_build_object('address', (array['14 Oak St','220 Broadway','9 Summer St','77 Pleasant St'])[i], 'city', (array['Methuen','Lawrence','Haverhill','Salem'])[i], 'state', (array['MA','MA','MA','NH'])[i], 'zip', (array['01844','01841','01830','03079'])[i], 'housing', (array['rent','own','family','rent'])[i], 'monthlyPayment', (array[1450,1900,0,1250])[i], 'years', (array[3,7,2,1])[i]),
      'employment', jsonb_build_object('employer', (array['Amazon Fulfillment','Lawrence General Hospital','Market Basket','Self-employed (landscaping)'])[i], 'title', (array['Associate','RN','Department manager','Owner'])[i], 'phone', '978-555-0170', 'years', (array[2,9,4,6])[i], 'type', (array['full_time','full_time','full_time','self'])[i], 'monthlyGross', (array[3600,7800,4200,5100])[i], 'otherIncome', 0, 'otherSource', ''),
      'coEmployment', null, 'requestedAmount', (array[14500,22800,9800,16900])[i], 'requestedTerm', (array[72,60,48,72])[i], 'downPayment', (array[2000,4000,500,1500])[i],
      'consent', i <> 4, 'consentAt', case when i <> 4 then to_jsonb(now() - (i || ' days')::interval) end, 'takenBy', fi,
      'notes', (array['Approved at Capital Auto Finance, 9.9% / 72','Sent to Merrimack Valley CU','Declined — DTI too high, try co-signer','Customer finishing at home'])[i]), fi);
  end loop;

  -- delivered deals: title & reg, compliance, deal jacket docs, warranty, BHPH
  if delivered is not null then
    for i in 1..array_length(delivered, 1) loop
      insert into records (tenant_id, kind, data) values (p_tenant, 'title_reg', jsonb_build_object('dealId', delivered[i], 'deliveredAt', to_char(d - (i * 2), 'YYYY-MM-DD'),
        'titleReceivedAt', case when i > 1 then to_char(d - (i * 2) + 1, 'YYYY-MM-DD') end, 'lienReleaseAt', case when i > 2 then to_char(d - i, 'YYYY-MM-DD') end,
        'regSubmittedAt', case when i > 1 then to_char(d - i, 'YYYY-MM-DD') end, 'platesIssuedAt', case when i > 3 then to_char(d - 1, 'YYYY-MM-DD') end,
        'tempTagExpires', to_char(d - (i * 2) + 20, 'YYYY-MM-DD'), 'notes', case when i = 1 then 'Waiting on payoff from prior lender' else '' end, 'completedAt', case when i > 3 then to_char(d - 1, 'YYYY-MM-DD') end));
      insert into records (tenant_id, kind, data)
        select p_tenant, 'compliance_item', jsonb_build_object('dealId', delivered[i], 'key', k, 'done', not (i = 1 and k in ('adverse_action','menu_presented')), 'by', fi, 'at', to_jsonb(now() - (i * 2 || ' days')::interval))
        from unnest(array['ofac','red_flags','privacy_notice','risk_based_pricing','menu_presented']) k;
      insert into records (tenant_id, kind, data)
        select p_tenant, 'deal_doc', jsonb_build_object('dealId', delivered[i], 'group', 'document', 'name', n, 'status', case when i = 1 and n = 'Proof of insurance' then 'missing' else 'received' end, 'note', '', 'doneAt', to_jsonb(now() - (i * 2 || ' days')::interval), 'doneBy', fi)
        from unnest(array['Driver''s license copy','Proof of insurance','Credit application','Buyer''s Guide (used)','Odometer disclosure','Bill of sale / RISC','Privacy notice']) n;
    end loop;
    insert into records (tenant_id, kind, data) values (p_tenant, 'warranty', jsonb_build_object('dealId', delivered[1], 'customerId', dcust[1], 'provider', 'CarShield Dealer Plus', 'contractNo', 'CS-448120', 'termMonths', 36, 'miles', 36000, 'cost', 1150, 'retail', 2495, 'startDate', to_char(d - 2, 'YYYY-MM-DD'), 'status', 'active', 'notes', 'Powertrain + electrical')) returning id into w1;
    if array_length(delivered, 1) > 2 then
      insert into records (tenant_id, kind, data) values (p_tenant, 'warranty', jsonb_build_object('dealId', delivered[3], 'customerId', dcust[3], 'provider', 'Fidelity Warranty Services', 'contractNo', 'FWS-90233', 'termMonths', 24, 'miles', 24000, 'cost', 890, 'retail', 1995, 'startDate', to_char(d - 6, 'YYYY-MM-DD'), 'status', 'active'));
    end if;
    insert into records (tenant_id, kind, data) values (p_tenant, 'warranty_claim', jsonb_build_object('warrantyId', w1, 'date', to_char(d - 1, 'YYYY-MM-DD'), 'description', 'Check-engine light — O2 sensor replaced', 'amount', 340, 'status', 'submitted'));
    if array_length(delivered, 1) > 1 then
      insert into records (tenant_id, kind, data) values (p_tenant, 'bhph_account', jsonb_build_object('dealId', delivered[2], 'customerId', dcust[2], 'vehicleId', dveh[2], 'principal', 8900, 'apr', 18.9, 'termMonths', 36, 'paymentAmount', 165, 'frequency', 'biweekly', 'firstDue', to_char(d - 28, 'YYYY-MM-DD'), 'nextDue', to_char(d + 3, 'YYYY-MM-DD'), 'status', 'active', 'notes', 'Pays cash at the window')) returning id into acct;
      insert into records (tenant_id, kind, data) values
        (p_tenant, 'bhph_payment', jsonb_build_object('accountId', acct, 'amount', 165, 'date', to_char(d - 25, 'YYYY-MM-DD'), 'method', 'cash', 'note', '')),
        (p_tenant, 'bhph_payment', jsonb_build_object('accountId', acct, 'amount', 165, 'date', to_char(d - 11, 'YYYY-MM-DD'), 'method', 'card', 'note', ''));
    end if;
  end if;
  -- a second BHPH account that is late, so the collections view has something to show
  insert into records (tenant_id, kind, data) values (p_tenant, 'bhph_account', jsonb_build_object('dealId', null, 'customerId', cust[12], 'vehicleId', null, 'principal', 6400, 'apr', 21.9, 'termMonths', 30, 'paymentAmount', 120, 'frequency', 'weekly', 'firstDue', to_char(d - 70, 'YYYY-MM-DD'), 'nextDue', to_char(d - 9, 'YYYY-MM-DD'), 'status', 'active', 'notes', 'Called twice — promised Friday'));

  -- test drives on the showed / upcoming test-drive appointments
  if td_appts is not null then
    for i in 1..least(3, array_length(td_appts, 1)) loop
      insert into records (tenant_id, kind, data) values (p_tenant, 'test_drive', jsonb_build_object('appointmentId', td_appts[i], 'customerId', td_c[i], 'vehicleId', td_v[i], 'salespersonId', sales[1 + i % array_length(sales, 1)],
        'checkOutAt', to_jsonb(now() - ((4 - i) * 20 || ' hours')::interval), 'checkInAt', case when i < 3 then to_jsonb(now() - ((4 - i) * 20 || ' hours')::interval + interval '35 minutes') end,
        'licenseNote', 'MA license scanned, exp 2029', 'startMiles', 48210 + i * 1000, 'endMiles', case when i < 3 then 48222 + i * 1000 end, 'notes', case when i = 1 then 'Loved it — wants numbers' else '' end));
    end loop;
  end if;

  -- inventory ops: floorplan, lot map, wholesale, auctions, acquisition, pricing
  insert into records (tenant_id, kind, data) values
    (p_tenant, 'floorplan_line', jsonb_build_object('lender', 'NextGear Capital', 'limit', 750000, 'notes', 'Curtail 10% at 90 days')),
    (p_tenant, 'floorplan_line', jsonb_build_object('lender', 'Westlake Flooring', 'limit', 400000, 'notes', ''));
  for i in 1..least(14, nv) loop
    insert into records (tenant_id, kind, data) values (p_tenant, 'floorplan', jsonb_build_object('vehicleId', veh[i], 'lender', case when i % 3 = 0 then 'Westlake Flooring' else 'NextGear Capital' end,
      'amount', round(vprice[i] * 0.78 / 100) * 100, 'dateFloored', to_char(d - (10 + i * 7), 'YYYY-MM-DD'), 'rate', case when i % 3 = 0 then 8.25 else 7.5 end,
      'curtailmentDate', to_char(d - (10 + i * 7) + 90, 'YYYY-MM-DD'), 'paidOff', false));
  end loop;
  for i in 1..least(24, nv) loop
    insert into records (tenant_id, kind, data) values (p_tenant, 'lot_spot', jsonb_build_object('label', (array['A','B','C'])[1 + (i - 1) / 8] || (1 + (i - 1) % 8), 'zone', (array['Front line','Back lot','Service side'])[1 + (i - 1) / 8], 'vehicleId', case when i % 7 = 0 then null else veh[i] end, 'keyTag', 'K' || lpad((100 + i)::text, 3, '0')));
  end loop;
  insert into records (tenant_id, kind, data) values
    (p_tenant, 'wholesale', jsonb_build_object('vehicleId', veh[1], 'buyer', 'North Shore Wholesale', 'buyerContact', 'Gary · 978-555-0144', 'offer', round(vprice[1] * 0.7), 'soldPrice', null, 'soldDate', null, 'status', 'listed', 'notes', 'Aged 120+ days — move it')),
    (p_tenant, 'wholesale', jsonb_build_object('vehicleId', veh[2], 'buyer', 'Route 28 Auto Brokers', 'buyerContact', 'Sam · 603-555-0122', 'offer', round(vprice[2] * 0.72), 'soldPrice', round(vprice[2] * 0.74), 'soldDate', to_char(d - 3, 'YYYY-MM-DD'), 'status', 'sold', 'notes', ''));
  insert into records (tenant_id, kind, data) values (p_tenant, 'auction', jsonb_build_object('name', 'Manheim New England', 'date', to_char(d + 2, 'YYYY-MM-DD'), 'location', 'North Dighton, MA', 'url', 'https://www.manheim.com', 'laneNotes', 'Lanes 4–7 dealer consignment')) returning id into auc1;
  insert into records (tenant_id, kind, data) values (p_tenant, 'auction', jsonb_build_object('name', 'ADESA Boston', 'date', to_char(d - 5, 'YYYY-MM-DD'), 'location', 'Framingham, MA', 'url', 'https://www.adesa.com', 'laneNotes', '')) returning id into auc2;
  insert into records (tenant_id, kind, data) values
    (p_tenant, 'auction_lot', jsonb_build_object('auctionId', auc1, 'vehicleId', null, 'description', '2019 Honda CR-V EX AWD · 61k', 'lane', '5-112', 'maxBid', 17800, 'result', 'pending', 'price', null)),
    (p_tenant, 'auction_lot', jsonb_build_object('auctionId', auc1, 'vehicleId', null, 'description', '2018 Toyota Camry SE · 74k', 'lane', '6-044', 'maxBid', 14200, 'result', 'pending', 'price', null)),
    (p_tenant, 'auction_lot', jsonb_build_object('auctionId', auc2, 'vehicleId', null, 'description', '2017 Jeep Grand Cherokee Laredo · 88k', 'lane', '3-201', 'maxBid', 15500, 'result', 'won', 'price', 15100)),
    (p_tenant, 'auction_lot', jsonb_build_object('auctionId', auc2, 'vehicleId', null, 'description', '2020 Nissan Rogue SV · 52k', 'lane', '3-208', 'maxBid', 15000, 'result', 'lost', 'price', 16250));
  insert into records (tenant_id, kind, data) values
    (p_tenant, 'acquisition', jsonb_build_object('source', 'private_party', 'year', '2016', 'make', 'Subaru', 'model', 'Outback', 'vin', '4S4BSANC5G3200001', 'mileage', '98000', 'sellerName', 'Karen Doyle', 'sellerContact', '978-555-0151', 'asking', 11500, 'offer', 9800, 'status', 'offered', 'notes', 'Clean, new tires')),
    (p_tenant, 'acquisition', jsonb_build_object('source', 'service_lane', 'year', '2015', 'make', 'Ford', 'model', 'Escape', 'vin', '1FMCU9GX0FUA00002', 'mileage', '112000', 'sellerName', 'Bill Ortiz', 'sellerContact', '978-555-0152', 'asking', null, 'offer', null, 'status', 'prospect', 'notes', 'Repair estimate $2,800 — pitch buying it')),
    (p_tenant, 'acquisition', jsonb_build_object('source', 'lease_return', 'year', '2022', 'make', 'Honda', 'model', 'Civic', 'vin', '2HGFE2F59NH000003', 'mileage', '31000', 'sellerName', 'Honda Financial', 'sellerContact', 'Portal', 'asking', 21000, 'offer', 19500, 'status', 'contacted', 'notes', '')),
    (p_tenant, 'acquisition', jsonb_build_object('source', 'trade', 'year', '2018', 'make', 'Toyota', 'model', 'Corolla', 'vin', '2T1BURHE5JC012345', 'mileage', '64000', 'sellerName', (select first_name || ' ' || last_name from customers where id = cust[22]), 'sellerContact', (select phone from customers where id = cust[22]), 'asking', 13000, 'offer', 12000, 'status', 'bought', 'notes', 'Traded in on delivery'));
  for i in 1..least(4, nv) loop
    insert into records (tenant_id, kind, data) values (p_tenant, 'price_change', jsonb_build_object('vehicleId', veh[i], 'from', vprice[i] + 1000, 'to', vprice[i], 'by', mgr, 'at', to_jsonb(now() - (i * 5 || ' days')::interval), 'source', 'Pricing Desk'));
  end loop;
  insert into records (tenant_id, kind, data) values
    (p_tenant, 'pricing_note', jsonb_build_object('vehicleId', veh[1], 'targetPrice', round(vprice[1] * 0.95 / 100) * 100, 'note', '3 similar within 50 mi priced lower')),
    (p_tenant, 'pricing_note', jsonb_build_object('vehicleId', veh[3], 'targetPrice', null, 'note', 'Hold price — only one in market'));

  -- marketing: templates and videos
  insert into records (tenant_id, kind, data) values
    (p_tenant, 'template', jsonb_build_object('name', 'New internet lead — first text', 'channel', 'sms', 'subject', '', 'body', 'Hi {first_name}, this is {salesperson} at {dealer}. The {vehicle} is here and ready — want to see it today or tomorrow?')),
    (p_tenant, 'template', jsonb_build_object('name', 'Missed appointment', 'channel', 'sms', 'subject', '', 'body', 'Hi {first_name}, we missed you today! Want me to hold the {vehicle} for you tomorrow? — {salesperson}')),
    (p_tenant, 'template', jsonb_build_object('name', 'Thank-you after visit', 'channel', 'email', 'subject', 'Thanks for stopping by {dealer}', 'body', E'Hi {first_name},\n\nThanks for coming in to see the {vehicle}. Any questions, call me at {phone}.\n\n{salesperson}')),
    (p_tenant, 'template', jsonb_build_object('name', 'Phone-up script', 'channel', 'script', 'subject', '', 'body', 'Thank you for calling {dealer}, this is {salesperson}. Which vehicle are you looking at? ... Great — is today or tomorrow better to see it?')),
    (p_tenant, 'template', jsonb_build_object('name', 'Trade-in follow up', 'channel', 'sms', 'subject', '', 'body', 'Hi {first_name}, I ran the numbers on your trade — call or text me at {phone}.'));
  for i in 1..3 loop
    insert into records (tenant_id, kind, data) values (p_tenant, 'video', jsonb_build_object('customerId', cust[i + 1], 'vehicleId', veh[3 + i], 'url', 'https://youtu.be/demo-walkaround-' || i, 'note', 'Walkaround — interior and engine bay', 'sentAt', to_jsonb(now() - (i * 7 || ' hours')::interval), 'by', sales[1 + i % array_length(sales, 1)]));
  end loop;

  -- service: tickets, parts, reminders
  for i in 1..5 loop
    insert into records (tenant_id, kind, data) values (p_tenant, 'service_ticket', jsonb_build_object('customerId', cust[25 + i - 1], 'vehicle', (array['2017 Honda Accord','2019 Ford F-150','2015 Toyota RAV4','2020 Nissan Altima','2014 Jeep Wrangler'])[i],
      'concern', (array['Oil change + tire rotation','Brakes grinding front','Check-engine light','State inspection','Clunk over bumps'])[i], 'status', (array['done','in_progress','waiting_parts','open','open'])[i],
      'laborHours', (array[0.5,2.0,1.5,0.5,1.0])[i], 'partsCost', (array[42,186,94,0,0])[i], 'laborRate', 135, 'total', (array[109.5,456,296.5,67.5,135])[i], 'technicianId', tech, 'notes', '',
      'laborStartedAt', case when i = 2 then to_jsonb(now() - interval '50 minutes') end, 'laborMinutes', case when i = 1 then 30 end, 'openedAt', to_jsonb(now() - (i * 5 || ' hours')::interval), 'closedAt', case when i = 1 then to_jsonb(now() - interval '1 hour') end)) returning id into rid;
    if i = 2 then insert into records (tenant_id, kind, data) values (p_tenant, 'parts_order', jsonb_build_object('ticketId', rid, 'part', 'Front brake pads + rotors (pair)', 'qty', 1, 'cost', 186, 'status', 'received', 'at', to_jsonb(now() - interval '3 hours'))); end if;
    if i = 3 then insert into records (tenant_id, kind, data) values (p_tenant, 'parts_order', jsonb_build_object('ticketId', rid, 'part', 'Upstream O2 sensor', 'qty', 1, 'cost', 94, 'status', 'ordered', 'at', to_jsonb(now() - interval '2 hours'))); end if;
  end loop;
  insert into records (tenant_id, kind, data)
    select p_tenant, 'part', jsonb_build_object('partNo', pn, 'description', ds, 'qty', q, 'minQty', m)
    from (values ('OF-5W30','Oil filter (common)',24,10),('OIL-5W30-Q','5W-30 synthetic, qt',60,24),('BP-F-UNI','Front brake pads (universal)',3,4),('WB-22','Wiper blade 22"',14,6),('WB-18','Wiper blade 18"',12,6),('BAT-H6','Battery H6/48',2,3),('AF-STD','Engine air filter',9,6),('CAF-STD','Cabin air filter',7,6),('BULB-H11','Headlight bulb H11',10,4),('COOL-G','Coolant 50/50, gal',8,4)) t(pn, ds, q, m);
  for i in 1..6 loop
    insert into records (tenant_id, kind, data) values (p_tenant, 'reminder', jsonb_build_object('customerId', cust[i + 5], 'vehicle', (array['2018 Toyota Camry','2016 Honda Pilot','2019 Hyundai Elantra','2017 Ford Escape','2015 Nissan Rogue','2020 Kia Forte'])[i],
      'type', (array['oil','inspection','oil','registration','oil','inspection'])[i], 'dueDate', to_char(d + (i * 4 - 8), 'YYYY-MM-DD'), 'status', (array['sent','pending','pending','pending','done','pending'])[i]));
  end loop;

  -- back office: AP, journal, HR, pay plans
  insert into records (tenant_id, kind, data) values
    (p_tenant, 'ap_bill', jsonb_build_object('vendor', 'NextGear Capital', 'invoiceNo', 'NG-10442', 'date', to_char(d - 20, 'YYYY-MM-DD'), 'dueDate', to_char(d + 10, 'YYYY-MM-DD'), 'amount', 3180, 'category', 'Floorplan interest', 'status', 'open')),
    (p_tenant, 'ap_bill', jsonb_build_object('vendor', 'Manheim New England', 'invoiceNo', 'MH-77310', 'date', to_char(d - 6, 'YYYY-MM-DD'), 'dueDate', to_char(d + 1, 'YYYY-MM-DD'), 'amount', 15495, 'category', 'Auction / purchase', 'status', 'open')),
    (p_tenant, 'ap_bill', jsonb_build_object('vendor', 'Merrimack Detail Co.', 'invoiceNo', '2291', 'date', to_char(d - 40, 'YYYY-MM-DD'), 'dueDate', to_char(d - 10, 'YYYY-MM-DD'), 'amount', 1240, 'category', 'Reconditioning', 'status', 'open')),
    (p_tenant, 'ap_bill', jsonb_build_object('vendor', 'CarGurus', 'invoiceNo', 'CG-2026-10', 'date', to_char(d - 13, 'YYYY-MM-DD'), 'dueDate', to_char(d - 3, 'YYYY-MM-DD'), 'amount', 1899, 'category', 'Advertising', 'status', 'paid', 'paidDate', to_char(d - 4, 'YYYY-MM-DD'))),
    (p_tenant, 'ap_bill', jsonb_build_object('vendor', 'National Grid', 'invoiceNo', '88120-10', 'date', to_char(d - 15, 'YYYY-MM-DD'), 'dueDate', to_char(d + 5, 'YYYY-MM-DD'), 'amount', 612, 'category', 'Rent / utilities', 'status', 'open')),
    (p_tenant, 'ap_bill', jsonb_build_object('vendor', 'Auto Parts Plus', 'invoiceNo', 'APP-5531', 'date', to_char(d - 70, 'YYYY-MM-DD'), 'dueDate', to_char(d - 40, 'YYYY-MM-DD'), 'amount', 455, 'category', 'Parts', 'status', 'open')),
    (p_tenant, 'journal', jsonb_build_object('date', to_char(d - 2, 'YYYY-MM-DD'), 'dealId', delivered[1], 'account', 'Reserve received', 'memo', 'Capital Auto Finance reserve', 'amount', 425)),
    (p_tenant, 'journal', jsonb_build_object('date', to_char(d - 4, 'YYYY-MM-DD'), 'dealId', delivered[2], 'account', 'Doc fee', 'memo', '', 'amount', 499)),
    (p_tenant, 'journal', jsonb_build_object('date', to_char(d - 9, 'YYYY-MM-DD'), 'account', 'Chargeback', 'memo', 'GAP cancelled — early payoff', 'amount', -310));
  insert into records (tenant_id, kind, data) values (p_tenant, 'payplan', jsonb_build_object('name', 'Sales — 25% front / 5% back', 'type', 'commission', 'percentFront', 25, 'percentBack', 5, 'flatPerUnit', 0, 'minis', 150, 'salary', 0, 'volumeBonuses', '[{"units":10,"bonus":500},{"units":15,"bonus":1000}]'::jsonb)) returning id into pp1;
  insert into records (tenant_id, kind, data) values (p_tenant, 'payplan', jsonb_build_object('name', 'F&I — salary + 10% back', 'type', 'salary_commission', 'percentFront', 0, 'percentBack', 10, 'flatPerUnit', 0, 'minis', 0, 'salary', 3000, 'volumeBonuses', '[]'::jsonb)) returning id into pp2;
  insert into records (tenant_id, kind, data) select p_tenant, 'payplan_assignment', jsonb_build_object('userId', p.id, 'payplanId', case when p.role = 'f_and_i' then pp2 else pp1 end) from profiles p where p.tenant_id = p_tenant and p.is_active and p.role in ('sales','f_and_i');
  insert into records (tenant_id, kind, data) select p_tenant, 'hr_employee', jsonb_build_object('userId', p.id,
      'title', case p.role when 'owner' then 'General Manager' when 'manager' then 'Sales Manager' when 'f_and_i' then 'F&I Manager' when 'technician' then 'Technician' else 'Sales Consultant' end,
      'hireDate', to_char(d - (200 + (row_number() over (order by p.created_at)) * 170)::int, 'YYYY-MM-DD'), 'phone', '978-555-01' || lpad((60 + row_number() over (order by p.created_at))::text, 2, '0'),
      'emergencyName', 'On file', 'emergencyPhone', '978-555-0199', 'notes', '', 'docs', jsonb_build_object('i9', true, 'w4', true, 'handbook', true, 'license', p.role <> 'technician'))
    from profiles p where p.tenant_id = p_tenant and p.is_active and p.role <> 'super_admin';

  -- BDC call log
  for i in 1..12 loop
    insert into records (tenant_id, kind, data, created_at) values (p_tenant, 'call_log', jsonb_build_object('customerId', cust[i], 'outcome', (array['talked','left_vm','no_answer','appointment_set','talked','left_vm'])[1 + i % 6],
      'notes', (array['Wants to come Saturday','Left VM about trade numbers','','Booked test drive','Asked about financing','Second VM'])[1 + i % 6], 'by', sales[1 + i % array_length(sales, 1)], 'at', to_jsonb(now() - (i * 50 || ' minutes')::interval)), now() - (i * 50 || ' minutes')::interval);
  end loop;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function private.demo_extras(uuid) from public, anon, authenticated;

create or replace function public.demo_build_svc(p_tenant uuid, p_keep_vehicles boolean) returns jsonb language plpgsql security definer set search_path = public as $w$
declare r jsonb; begin r := private.demo_build(p_tenant, p_keep_vehicles); perform private.demo_extras(p_tenant); return r; end $w$;
revoke all on function public.demo_build_svc(uuid, boolean) from public, anon, authenticated;
grant execute on function public.demo_build_svc(uuid, boolean) to service_role;
select 'ok';
