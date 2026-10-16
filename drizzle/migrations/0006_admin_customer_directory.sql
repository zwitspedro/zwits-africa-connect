CREATE OR REPLACE FUNCTION public.admin_customer_directory(_term text DEFAULT '',_page integer DEFAULT 0,_from timestamptz DEFAULT NULL,_to timestamptz DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF _page<0 OR _page>10000 OR length(_term)>80 THEN RAISE EXCEPTION 'Invalid directory query'; END IF;
 WITH customers AS (
 SELECT p.user_id,p.display_name,p.phone,p.city,p.country,p.account_type,p.created_at,p.updated_at,u.email
 FROM public.profiles p JOIN auth.users u ON u.id=p.user_id
 WHERE EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=p.user_id AND r.role='customer')
 AND (_from IS NULL OR p.created_at>=_from) AND (_to IS NULL OR p.created_at<_to)
 AND (coalesce(_term,'')='' OR p.display_name ILIKE '%'||_term||'%' OR p.phone ILIKE '%'||_term||'%' OR u.email ILIKE '%'||_term||'%')
 ), page_rows AS (SELECT * FROM customers ORDER BY created_at DESC,user_id LIMIT 25 OFFSET _page*25)
 SELECT jsonb_build_object('total',(SELECT count(*) FROM customers),'page',_page,'rows',coalesce((SELECT jsonb_agg(to_jsonb(p)||jsonb_build_object('bookings_count',(SELECT count(*) FROM public.bookings b WHERE b.customer_id=p.user_id),'deliveries_count',(SELECT count(*) FROM public.deliveries d WHERE d.customer_id=p.user_id))) FROM page_rows p),'[]'::jsonb)) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_customer_directory(text,integer,timestamptz,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_customer_directory(text,integer,timestamptz,timestamptz) TO authenticated;