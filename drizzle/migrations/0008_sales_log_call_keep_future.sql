CREATE OR REPLACE FUNCTION public.sales_log_call(_account uuid, _outcome text, _note text, _next_date date, _next_label text)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE acc public.sales_accounts; act_id uuid;
BEGIN
  SELECT * INTO acc FROM public.sales_accounts WHERE id = _account;
  IF acc.id IS NULL THEN RAISE EXCEPTION 'Prospect introuvable'; END IF;
  IF _outcome = 'r2' AND _next_date IS NULL THEN RAISE EXCEPTION 'Un R2 doit avoir une date de rendez-vous'; END IF;
  INSERT INTO public.sales_activities(workspace_id, account_id, outcome, note)
  VALUES (acc.workspace_id, acc.id, _outcome, NULLIF(trim(_note), '')) RETURNING id INTO act_id;
  -- Seules les actions dues sont closes ; les actions futures restent intactes.
  UPDATE public.sales_next_actions SET done_at = now()
  WHERE account_id = acc.id AND done_at IS NULL AND next_action_date <= CURRENT_DATE;
  IF _next_date IS NOT NULL THEN
    INSERT INTO public.sales_next_actions(workspace_id, account_id, label, next_action_date, assignee_id)
    VALUES (acc.workspace_id, acc.id, COALESCE(NULLIF(trim(_next_label), ''), 'Rappeler'), _next_date, COALESCE(acc.owner_id, auth.uid()));
  END IF;
  UPDATE public.sales_accounts SET last_activity_at = now(),
    stage = CASE
      WHEN _outcome = 'r2' AND stage IN ('lead','contacte','qualifie') THEN 'r2_pris'
      WHEN _outcome = 'refus' AND stage NOT IN ('gagne') THEN 'perdu'
      WHEN _outcome IN ('repondu','decideur_absent') AND stage = 'lead' THEN 'contacte'
      ELSE stage END
  WHERE id = acc.id;
  RETURN act_id;
END $$;
REVOKE ALL ON FUNCTION public.sales_log_call(uuid, text, text, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sales_log_call(uuid, text, text, date, text) TO authenticated;