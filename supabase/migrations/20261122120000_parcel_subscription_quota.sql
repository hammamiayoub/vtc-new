/*
  # Abonnement et courses gratuites pour les transporteurs de colis

  Règle : le quota gratuit (2 courses à vie) puis l'abonnement Premium sont
  PARTAGÉS entre courses VTC et colis (local et international). Un seul compteur :
  drivers.lifetime_accepted_bookings.

  1. Envoi d'une proposition de prix
     - refusé (subscription_required) si le transporteur n'a plus de course gratuite
       et pas d'abonnement payant actif (ni de période de grâce de paiement).
  2. Acceptation par le client (accept_parcel_proposal)
     - re-vérifie le droit du transporteur (il a pu épuiser son quota entre-temps)
       et refuse avec subscription_required_driver : le client choisit une autre offre.
     - compte une course pour le transporteur retenu.
  3. Annulation d'une demande acceptée
     - la course est rendue au transporteur, sauf si l'annulation vient de lui
       (même règle que pour les courses VTC, cf. 20261118110000).

  Dépend de : driver_can_accept_new_booking (20260713100000),
              get_driver_subscription_status (incl. grâce, 20261118100000).
*/

-- =============================================================
-- 1. Proposition de prix : réservée aux transporteurs autorisés
-- =============================================================
CREATE OR REPLACE FUNCTION public.enforce_subscription_on_parcel_proposal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.driver_can_accept_new_booking(NEW.driver_id) THEN
    RAISE EXCEPTION 'subscription_required: Le transporteur a épuisé ses courses gratuites et doit souscrire un abonnement Premium.'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS parcel_proposals_enforce_subscription ON public.parcel_quote_proposals;
CREATE TRIGGER parcel_proposals_enforce_subscription
  BEFORE INSERT ON public.parcel_quote_proposals
  FOR EACH ROW EXECUTE FUNCTION public.enforce_subscription_on_parcel_proposal();

-- =============================================================
-- 2. Acceptation : contrôle + comptage de la course
-- =============================================================
CREATE OR REPLACE FUNCTION public.accept_parcel_proposal(p_proposal_id uuid)
RETURNS public.parcel_quote_proposals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id uuid;
  v_driver_id uuid;
  v_client_id uuid;
  v_status text;
  v_result public.parcel_quote_proposals;
BEGIN
  SELECT p.request_id, p.driver_id INTO v_request_id, v_driver_id
  FROM public.parcel_quote_proposals p
  WHERE p.id = p_proposal_id;

  IF v_request_id IS NULL THEN
    RAISE EXCEPTION 'Proposition introuvable';
  END IF;

  -- Verrou sur la demande : deux acceptations simultanées ne comptent pas deux fois
  SELECT r.client_id, r.status INTO v_client_id, v_status
  FROM public.parcel_quote_requests r
  WHERE r.id = v_request_id
  FOR UPDATE;

  IF v_client_id <> auth.uid() THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  IF v_status NOT IN ('pending', 'quoted') THEN
    RAISE EXCEPTION 'Cette demande ne peut plus être modifiée (statut %)', v_status;
  END IF;

  -- Verrou sur le transporteur : le contrôle de quota et l'incrément sont atomiques
  PERFORM 1 FROM public.drivers WHERE id = v_driver_id FOR UPDATE;

  IF NOT public.driver_can_accept_new_booking(v_driver_id) THEN
    RAISE EXCEPTION 'subscription_required_driver: Ce transporteur ne peut plus accepter de nouvelle demande pour le moment. Veuillez choisir une autre offre.'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.parcel_quote_proposals
  SET status = CASE WHEN id = p_proposal_id THEN 'accepted' ELSE 'rejected' END
  WHERE request_id = v_request_id;

  UPDATE public.parcel_quote_requests
  SET status = 'accepted', accepted_proposal_id = p_proposal_id
  WHERE id = v_request_id;

  -- Même règle de comptage que increment_driver_lifetime_bookings (quota de 2)
  UPDATE public.drivers
  SET
    lifetime_accepted_bookings = lifetime_accepted_bookings + 1,
    has_used_free_trial = CASE
      WHEN lifetime_accepted_bookings + 1 >= 2 THEN TRUE
      ELSE has_used_free_trial
    END
  WHERE id = v_driver_id;

  SELECT * INTO v_result FROM public.parcel_quote_proposals WHERE id = p_proposal_id;
  RETURN v_result;
END;
$$;

-- =============================================================
-- 3. Annulation d'une demande acceptée : course rendue
-- =============================================================
CREATE OR REPLACE FUNCTION public.refund_driver_ride_on_parcel_cancellation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id uuid;
BEGIN
  IF OLD.status = 'accepted' AND NEW.status = 'cancelled' AND OLD.accepted_proposal_id IS NOT NULL THEN
    SELECT p.driver_id INTO v_driver_id
    FROM public.parcel_quote_proposals p
    WHERE p.id = OLD.accepted_proposal_id;

    IF v_driver_id IS NOT NULL AND auth.uid() IS DISTINCT FROM v_driver_id THEN
      UPDATE public.drivers
      SET
        lifetime_accepted_bookings = GREATEST(0, lifetime_accepted_bookings - 1),
        has_used_free_trial = GREATEST(0, lifetime_accepted_bookings - 1) >= 2
      WHERE id = v_driver_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_refund_driver_ride_on_parcel_cancellation ON public.parcel_quote_requests;
CREATE TRIGGER trigger_refund_driver_ride_on_parcel_cancellation
  AFTER UPDATE OF status ON public.parcel_quote_requests
  FOR EACH ROW
  WHEN (OLD.status = 'accepted' AND NEW.status = 'cancelled')
  EXECUTE FUNCTION public.refund_driver_ride_on_parcel_cancellation();
