export const GOOGLE_QUERY_MIN_LENGTH = 3;
export const GOOGLE_DEBOUNCE_MS = 300;

export function createPlacesSessionToken(): google.maps.places.AutocompleteSessionToken | null {
  const Token = window.google?.maps?.places?.AutocompleteSessionToken;
  if (!Token) return null;
  return new Token();
}

export function fetchPlacePredictions(
  input: string,
  sessionToken: google.maps.places.AutocompleteSessionToken,
  options: { countries?: string[] | null; types?: string[] }
): Promise<google.maps.places.AutocompletePrediction[]> {
  const Service = window.google?.maps?.places?.AutocompleteService;
  if (!Service) return Promise.resolve([]);

  const service = new Service();
  const request: google.maps.places.AutocompletionRequest = {
    input,
    sessionToken,
  };
  if (options.types && options.types.length > 0) {
    request.types = options.types;
  }
  if (options.countries && options.countries.length > 0) {
    request.componentRestrictions = {
      country: options.countries.length === 1 ? options.countries[0] : options.countries,
    };
  }

  return new Promise((resolve) => {
    service.getPlacePredictions(request, (predictions, status) => {
      if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions) {
        resolve([]);
        return;
      }
      resolve(predictions);
    });
  });
}

let attributionNode: HTMLDivElement | null = null;

function getAttributionNode(): HTMLDivElement | null {
  if (typeof document === 'undefined') return null;
  if (!attributionNode) {
    attributionNode = document.createElement('div');
    attributionNode.setAttribute('data-places-attribution', 'true');
    document.body.appendChild(attributionNode);
  }
  return attributionNode;
}

export function fetchPlaceDetails(
  placeId: string,
  sessionToken: google.maps.places.AutocompleteSessionToken
): Promise<google.maps.places.PlaceResult | null> {
  const Service = window.google?.maps?.places?.PlacesService;
  const node = getAttributionNode();
  if (!Service || !node) return Promise.resolve(null);

  const service = new Service(node);
  return new Promise((resolve) => {
    service.getDetails(
      {
        placeId,
        sessionToken,
        fields: ['formatted_address', 'geometry', 'place_id', 'name', 'address_components'],
      },
      (place, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !place) {
          resolve(null);
          return;
        }
        resolve(place);
      }
    );
  });
}
