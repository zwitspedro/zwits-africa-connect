CREATE OR REPLACE FUNCTION public.admin_dispatch_directory(_filters jsonb DEFAULT '{}'::jsonb) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
 WITH jobs AS (
 SELECT 'booking'::text kind,b.id,b.customer_id,b.provider_id AS assignee_id,b.category,b.address,b.description,b.status::text status,b.price,b.payment_status,b.dispatch_state,b.scheduled_for,b.created_at,b.updated_at,p.display_name AS customer_name,pr.business_name AS assignee_name FROM public.bookings b LEFT JOIN public.profiles p ON p.user_id=b.customer_id LEFT JOIN public.providers pr ON pr.id=b.provider_id
 UNION ALL SELECT 'delivery',d.id,d.customer_id,d.driver_id,d.service_tier,d.pickup_address||' → '||d.dropoff_address,d.notes,d.status,d.price,d.payment_status,d.dispatch_state,NULL,d.created_at,d.updated_at,p.display_name,dr.full_name FROM public.deliveries d LEFT JOIN public.profiles p ON p.user_id=d.customer_id LEFT JOIN public.driver_profiles dr ON dr.user_id=d.driver_id
 ), annotated AS (
 SELECT j.*,coalesce(c.held,false) AS held,coalesce(c.manual_dispatch,false) AS manual_dispatch,EXISTS(SELECT 1 FROM public.admin_job_changes ch WHERE ch.kind=j.kind AND ch.job_id=j.id AND ch.status IN ('pending_customer','pending_assignee')) AS pending_change,EXISTS(SELECT 1 FROM public.job_offers o WHERE j.kind='booking' AND o.booking_id=j.id AND o.status='offered' AND o.expires_at>now()) OR EXISTS(SELECT 1 FROM public.delivery_offers o WHERE j.kind='delivery' AND o.delivery_id=j.id AND o.status='offered' AND o.expires_at>now()) AS live_offer FROM jobs j LEFT JOIN public.admin_job_controls c ON c.kind=j.kind AND c.job_id=j.id
 ), filtered AS (
 SELECT * FROM annotated j WHERE (coalesce(_filters->>'kind','all')='all' OR j.kind=_filters->>'kind')
 AND (coalesce(_filters->>'term','')='' OR strpos(lower(j.id::text||' '||j.address||' '||j.category||' '||coalesce(j.description,'')),lower(_filters->>'term'))>0)
 AND (coalesce(_filters->>'category','')='' OR strpos(lower(j.category),lower(_filters->>'category'))>0)
 AND (coalesce(_filters->>'customer','')='' OR strpos(lower(j.customer_id::text||' '||coalesce(j.customer_name,'')),lower(_filters->>'customer'))>0)
 AND (coalesce(_filters->>'assignee','')='' OR strpos(lower(coalesce(j.assignee_id::text,'')||' '||coalesce(j.assignee_name,'')),lower(_filters->>'assignee'))>0)
 AND (coalesce(_filters->>'from','')='' OR j.created_at>=((nullif(_filters->>'from',''))::date::timestamp AT TIME ZONE 'Africa/Harare'))
 AND (coalesce(_filters->>'to','')='' OR j.created_at<(((nullif(_filters->>'to',''))::date+1)::timestamp AT TIME ZONE 'Africa/Harare'))
 AND CASE coalesce(_filters->>'view','all')
 WHEN 'all' THEN true WHEN 'unassigned' THEN assignee_id IS NULL AND status IN ('pending','matching','offered') AND NOT live_offer
 WHEN 'awaiting_acceptance' THEN status IN ('pending','matching','offered') AND (live_offer OR assignee_id IS NOT NULL)
 WHEN 'assigned' THEN (assignee_id IS NOT NULL OR live_offer) AND status NOT IN ('completed','delivered','cancelled','refunded')
 WHEN 'accepted' THEN status='accepted' WHEN 'awaiting_collection' THEN status IN ('accepted','arriving','arrived','travelling','provider_arriving')
 WHEN 'in_transit' THEN status IN ('picked_up','travelling','provider_arriving','in_progress') WHEN 'completed' THEN status IN ('completed','delivered')
 WHEN 'failed' THEN status='failed' OR dispatch_state IN ('no_providers','no_drivers') WHEN 'cancelled' THEN status='cancelled'
 WHEN 'intervention' THEN held OR pending_change OR status='disputed' OR dispatch_state IN ('no_providers','no_drivers') ELSE false END
 ), page AS (SELECT * FROM filtered ORDER BY created_at DESC,id DESC OFFSET greatest(0,least(10000,coalesce((_filters->>'page')::integer,0)))*25 LIMIT 25)
 SELECT jsonb_build_object('rows',coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY created_at DESC,id DESC) FROM page p),'[]'::jsonb),'total',(SELECT count(*) FROM filtered)) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_dispatch_directory(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_dispatch_directory(jsonb) TO authenticated,service_role;