// Page publique de suivi de course (track.html).
// Sources de position : canal Realtime « broadcast » (chauffeur au premier plan) et fonction
// SQL get_tracking_position (dernière position en base, aussi alimentée en arrière-plan).
(function () {
  'use strict';

  const POLL_INTERVAL_MS = 10000;
  const STALE_AFTER_MS = 30000;
  const RESUBSCRIBE_DELAY_MS = 5000;
  const ROUTE_REFRESH_MS = 45000;
  const ROUTE_REFRESH_DISTANCE_KM = 0.2;
  const AUTO_FIT_MS = 25000;
  const FALLBACK_SPEED_KMH = 30;
  // Même format que les jetons générés par l'application et la base.
  const TOKEN_PATTERN = /^[A-Za-z0-9]{16,64}$/;

  const token = new URLSearchParams(window.location.search).get('token');

  let map;
  let supa;
  let channel = null;
  let pollTimer = null;
  let resubscribeTimer = null;
  let directionsService = null;
  let vehicleMarker = null;
  let pickupMarker = null;
  let destinationMarker = null;
  let routeLine = null;

  let ended = false;
  let followDriver = true;
  let lastFitAt = 0;
  let lastTs = 0;
  let lastPosition = null;
  let arrivedAt = null;
  let rideStatus = 'accepted';
  let pickup = null;
  let destination = null;
  let route = { fetchedAt: 0, origin: null, targetKey: null, request: 0, durationMin: null, distanceKm: null };

  const $ = (id) => document.getElementById(id);

  function setStatus(text, kind) {
    const el = $('status');
    el.textContent = text;
    el.className = kind || '';
  }

  function showMessage(text) {
    const el = $('message');
    el.textContent = text;
    el.style.display = 'flex';
  }

  function formatAge(ms) {
    const s = Math.round(ms / 1000);
    return s < 60 ? 'il y a ' + s + ' s' : 'il y a ' + Math.round(s / 60) + ' min';
  }

  function haversineKm(a, b) {
    const R = 6371;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  function validPoint(p) {
    return p && typeof p.lat === 'number' && typeof p.lng === 'number';
  }

  // Cible : le point de prise en charge, puis la destination une fois la course démarrée.
  function currentTarget() {
    if (rideStatus === 'in_progress' && validPoint(destination)) return { key: 'destination', point: destination };
    if (validPoint(pickup)) return { key: 'pickup', point: pickup };
    return null;
  }

  async function loadConfig() {
    try {
      const resp = await fetch('/.netlify/functions/public-config', { cache: 'no-store' });
      if (resp.ok) {
        const json = await resp.json();
        if (json && json.VITE_SUPABASE_URL && json.VITE_SUPABASE_ANON_KEY) {
          return {
            supabaseUrl: json.VITE_SUPABASE_URL,
            supabaseAnonKey: json.VITE_SUPABASE_ANON_KEY,
            googleMapsApiKey: json.VITE_GOOGLE_MAPS_API_KEY,
          };
        }
      }
    } catch (e) {
      console.warn('Configuration publique indisponible, utilisation du fallback.');
    }

    const c = window.TRACK_CONFIG;
    if (c && c.supabaseUrl && c.supabaseAnonKey) {
      return { supabaseUrl: c.supabaseUrl, supabaseAnonKey: c.supabaseAnonKey, googleMapsApiKey: c.googleMapsApiKey };
    }
    return null;
  }

  function loadGoogleMapsScript(apiKey) {
    return new Promise((resolve, reject) => {
      if (window.google && window.google.maps) return resolve();
      const script = document.createElement('script');
      script.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(apiKey) + '&callback=initGoogleMaps';
      script.async = true;
      script.defer = true;
      window.initGoogleMaps = () => resolve();
      script.onerror = () => reject(new Error('Impossible de charger Google Maps'));
      document.head.appendChild(script);
    });
  }

  // ---- Carte --------------------------------------------------------------

  function dotIcon(color) {
    return {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 9,
      fillColor: color,
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 3,
    };
  }

  function vehicleIcon(heading) {
    return {
      path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
      scale: 6,
      fillColor: '#0b0b0c',
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2,
      rotation: heading || 0,
    };
  }

  function ensureTargetMarkers() {
    if (validPoint(pickup) && !pickupMarker) {
      pickupMarker = new google.maps.Marker({ position: pickup, map, title: 'Point de prise en charge', icon: dotIcon('#16a34a'), zIndex: 1 });
    }
    if (validPoint(destination) && !destinationMarker) {
      destinationMarker = new google.maps.Marker({ position: destination, map, title: 'Destination', icon: dotIcon('#0b0b0c'), zIndex: 1 });
    }
  }

  function updateVehicle(lat, lng, heading) {
    const position = { lat, lng };
    if (!vehicleMarker) {
      vehicleMarker = new google.maps.Marker({ position, map, title: 'Véhicule', icon: vehicleIcon(heading), zIndex: 3 });
    } else {
      vehicleMarker.setPosition(position);
      if (typeof heading === 'number') vehicleMarker.setIcon(vehicleIcon(heading));
    }
  }

  function fitMap(force) {
    if (!lastPosition || (!followDriver && !force)) return;
    const now = Date.now();
    if (!force && lastFitAt && now - lastFitAt < AUTO_FIT_MS) return;
    lastFitAt = now;
    const bounds = new google.maps.LatLngBounds();
    bounds.extend({ lat: lastPosition.lat, lng: lastPosition.lng });
    const t = currentTarget();
    if (t) bounds.extend(t.point);
    const panelHeight = $('panel').offsetHeight || 100;
    map.fitBounds(bounds, { top: 70, left: 40, right: 40, bottom: panelHeight + 40 });
    // Un seul point : fitBounds zoome au maximum, on borne le zoom.
    google.maps.event.addListenerOnce(map, 'idle', () => {
      if (map.getZoom() > 17) map.setZoom(17);
    });
  }

  function drawRoute(path) {
    if (!routeLine) {
      routeLine = new google.maps.Polyline({ map, strokeColor: '#0b0b0c', strokeOpacity: 0.9, strokeWeight: 5, zIndex: 2 });
    }
    routeLine.setPath(path);
  }

  function straightLine() {
    const t = currentTarget();
    if (lastPosition && t) drawRoute([{ lat: lastPosition.lat, lng: lastPosition.lng }, t.point]);
  }

  // Itinéraire réel (Google Directions, avec trafic) recalculé à intervalle raisonnable.
  function maybeRefreshRoute() {
    const t = currentTarget();
    if (!lastPosition || !t || !directionsService) return;

    const origin = { lat: lastPosition.lat, lng: lastPosition.lng };
    const now = Date.now();
    const moved = route.origin ? haversineKm(route.origin, origin) : Infinity;
    const due = now - route.fetchedAt >= ROUTE_REFRESH_MS;
    if (route.targetKey === t.key && !due && moved < ROUTE_REFRESH_DISTANCE_KM) return;

    const targetChanged = route.targetKey !== t.key;
    const request = ++route.request;
    route.fetchedAt = now;
    route.origin = origin;
    route.targetKey = t.key;
    if (targetChanged) {
      route.durationMin = null;
      route.distanceKm = null;
    }

    directionsService.route(
      {
        origin,
        destination: t.point,
        travelMode: google.maps.TravelMode.DRIVING,
        drivingOptions: { departureTime: new Date(), trafficModel: 'bestguess' },
      },
      (result, status) => {
        if (request !== route.request) return;
        if (status === 'OK' && result.routes && result.routes[0]) {
          const leg = result.routes[0].legs[0];
          const seconds = (leg.duration_in_traffic || leg.duration || {}).value;
          route.durationMin = seconds != null ? Math.max(1, Math.round(seconds / 60)) : null;
          route.distanceKm = leg.distance ? leg.distance.value / 1000 : null;
          drawRoute(result.routes[0].overview_path);
        } else {
          route.durationMin = null;
          route.distanceKm = null;
          straightLine();
        }
        renderPanel();
      }
    );
  }

  // ---- Affichage ----------------------------------------------------------

  function renderStatus() {
    if (ended) return;
    if (!lastPosition) {
      setStatus('En direct • en attente de position…', 'live');
      return;
    }
    const age = Date.now() - lastTs;
    if (rideStatus === 'in_progress') setStatus('Course en cours', 'live');
    else if (arrivedAt) setStatus('Votre chauffeur est arrivé', 'live');
    else if (age > STALE_AFTER_MS) setStatus('Dernière position ' + formatAge(age), 'warn');
    else setStatus('Votre chauffeur arrive', 'live');
  }

  function renderPanel() {
    if (ended) return;
    const value = $('etaValue');
    const unit = $('etaUnit');
    const sub = $('etaSub');
    const dist = $('distance');
    const inProgress = rideStatus === 'in_progress';
    const t = currentTarget();

    if (!lastPosition) {
      value.textContent = '—';
      unit.textContent = ' min';
      sub.textContent = 'Localisation du chauffeur…';
      dist.style.display = 'none';
      return;
    }

    if (arrivedAt && !inProgress) {
      value.textContent = '0';
      unit.textContent = ' min';
      sub.textContent = 'Il vous attend au point de prise en charge';
      dist.style.display = 'none';
      return;
    }

    let distanceKm = route.distanceKm;
    let etaMin = route.durationMin;
    if (t) {
      const crow = haversineKm(lastPosition, t.point);
      if (distanceKm == null) distanceKm = crow;
      if (etaMin == null) etaMin = Math.max(1, Math.round((crow / FALLBACK_SPEED_KMH) * 60));
    }

    if (etaMin != null) {
      value.textContent = etaMin <= 1 ? '< 1' : String(etaMin);
      unit.textContent = ' min';
      sub.textContent = inProgress ? 'avant l’arrivée à destination' : 'avant l’arrivée de votre chauffeur';
    } else {
      value.textContent = '—';
      unit.textContent = '';
      sub.textContent = inProgress ? 'Course en cours' : 'Calcul du temps d’attente…';
    }

    if (distanceKm != null) {
      dist.textContent = distanceKm < 1 ? Math.round(distanceKm * 1000) + ' m' : distanceKm.toFixed(1) + ' km';
      dist.style.display = 'inline-flex';
    } else {
      dist.style.display = 'none';
    }
  }

  // Applique une position venue du broadcast ou de la base, en ignorant les plus anciennes.
  function applyPosition(lat, lng, heading, speed, ts) {
    if (typeof lat !== 'number' || typeof lng !== 'number') return;
    const parsed = ts ? Date.parse(ts) : Date.now();
    const stamp = Number.isFinite(parsed) ? parsed : Date.now();
    if (stamp < lastTs) return;
    lastTs = stamp;
    lastPosition = { lat, lng, heading: heading || 0, speed };
    updateVehicle(lat, lng, heading);
    maybeRefreshRoute();
    fitMap(false);
    renderStatus();
    renderPanel();
  }

  function endTracking(status) {
    ended = true;
    clearInterval(pollTimer);
    clearTimeout(resubscribeTimer);
    if (channel) {
      supa.removeChannel(channel);
      channel = null;
    }
    if (status === 'cancelled') {
      setStatus('Course annulée', 'end');
      showMessage('Cette course a été annulée.');
    } else {
      setStatus('Course terminée', 'end');
      showMessage('Cette course est terminée. Merci d’avoir voyagé avec TuniDrive.');
    }
  }

  // ---- Données ------------------------------------------------------------

  // Dernière position en base : couvre l'ouverture de la page et le chauffeur en arrière-plan.
  async function pollPosition() {
    if (ended) return;
    try {
      const { data, error } = await supa.rpc('get_tracking_position', { p_token: token });
      if (error) {
        if (!lastPosition) setStatus('Connexion au suivi…', 'warn');
        return;
      }
      if (!data) {
        // Jeton inconnu : lien invalide, ou course déjà clôturée (le jeton est alors supprimé).
        if (lastPosition) {
          endTracking('completed');
        } else {
          ended = true;
          clearInterval(pollTimer);
          setStatus('Suivi indisponible', 'end');
          showMessage('Ce lien de suivi n’est plus valide : la course est terminée ou le lien est incorrect.');
        }
        return;
      }
      if (data.status === 'completed' || data.status === 'cancelled') {
        endTracking(data.status);
        return;
      }

      rideStatus = data.status || rideStatus;
      if (validPoint(data.pickup)) pickup = data.pickup;
      if (validPoint(data.destination)) destination = data.destination;
      ensureTargetMarkers();
      if (data.arrived_at) arrivedAt = data.arrived_at;

      if (typeof data.lat === 'number') {
        applyPosition(data.lat, data.lng, data.heading, data.speed, data.ts);
      } else {
        renderStatus();
        renderPanel();
      }
    } catch (e) {
      console.warn('Lecture de la position impossible.');
    }
  }

  function scheduleResubscribe() {
    if (ended || resubscribeTimer) return;
    resubscribeTimer = setTimeout(() => {
      resubscribeTimer = null;
      if (channel) {
        supa.removeChannel(channel);
        channel = null;
      }
      subscribeToTracking();
    }, RESUBSCRIBE_DELAY_MS);
  }

  function subscribeToTracking() {
    channel = supa.channel('tracking:' + token, { config: { broadcast: { self: false } } });

    channel.on('broadcast', { event: 'position' }, (payload) => {
      const { lat, lng, heading, speed, ts } = payload?.payload || {};
      applyPosition(lat, lng, heading, speed, ts);
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        if (!lastPosition) setStatus('En direct • en attente de position…', 'live');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        if (!ended) setStatus('Reconnexion…', 'warn');
        scheduleResubscribe();
      }
    });
  }

  // ---- Démarrage ----------------------------------------------------------

  async function init() {
    if (!token || !TOKEN_PATTERN.test(token)) {
      setStatus('Lien de suivi invalide', 'end');
      showMessage('Ce lien de suivi est incomplet ou incorrect. Ouvrez-le de nouveau depuis la notification reçue.');
      return;
    }

    const cfg = await loadConfig();
    if (!cfg) {
      setStatus('Configuration manquante', 'end');
      showMessage('Le suivi est momentanément indisponible. Réessayez dans quelques instants.');
      return;
    }
    if (!cfg.googleMapsApiKey) {
      setStatus('Clé Google Maps manquante', 'end');
      return;
    }

    try {
      await loadGoogleMapsScript(cfg.googleMapsApiKey);
    } catch (e) {
      setStatus('Carte indisponible', 'end');
      return;
    }

    map = new google.maps.Map($('map'), {
      center: { lat: 36.8065, lng: 10.1815 }, // Tunis par défaut
      zoom: 12,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: 'greedy',
      clickableIcons: false,
    });
    directionsService = new google.maps.DirectionsService();

    // Le recentrage automatique s'arrête dès que la personne déplace la carte.
    map.addListener('dragstart', () => {
      followDriver = false;
      $('recenter').style.display = 'flex';
    });
    $('recenter').addEventListener('click', () => {
      followDriver = true;
      $('recenter').style.display = 'none';
      fitMap(true);
    });

    if (!window.supabase) {
      setStatus('Suivi indisponible', 'end');
      return;
    }
    supa = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      realtime: { params: { eventsPerSecond: 10 } },
    });

    setStatus('Connexion au suivi…');
    supa.realtime.connect();
    subscribeToTracking();

    await pollPosition();
    if (!ended) {
      pollTimer = setInterval(pollPosition, POLL_INTERVAL_MS);
      // Rafraîchit le libellé « Dernière position il y a … » entre deux lectures.
      setInterval(renderStatus, 5000);
    }
  }

  init().catch(() => setStatus('Erreur d’initialisation', 'end'));
})();
