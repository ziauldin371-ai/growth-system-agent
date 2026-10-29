import { IDiscoveryProvider, RawDiscoveredLead } from '../types';
import { DiscoveryRequest } from '@/lib/validation/schemas';

/**
 * Google Places API Provider Adapter
 * Queries the official Google Places API (New) / Text Search endpoint for commercial establishments.
 * Requires GOOGLE_PLACES_API_KEY in environment.
 */
export class GooglePlacesProvider implements IDiscoveryProvider {
  public readonly id = 'google_places';
  public readonly name = 'Google Places API';

  public isConfigured(): boolean {
    return Boolean(process.env.GOOGLE_PLACES_API_KEY && process.env.GOOGLE_PLACES_API_KEY.trim().length > 0);
  }

  public async discover(request: DiscoveryRequest): Promise<RawDiscoveredLead[]> {
    if (!this.isConfigured()) {
      throw new Error('Google Places API is unconfigured: GOOGLE_PLACES_API_KEY environment variable is missing.');
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY!;
    const searchQuery = `${request.industry} in ${request.location || request.market}`;
    
    // Official Google Places API (New) Text Search URL
    const url = 'https://places.googleapis.com/v1/places:searchText';
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.websiteUri,places.nationalPhoneNumber,places.rating,places.userRatingCount,places.id,places.types,places.businessStatus',
      },
      body: JSON.stringify({
        textQuery: searchQuery,
        pageSize: Math.min(request.limit, 20),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Places API returned error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const places = data.places || [];

    return places
      .filter((place: any) => place.businessStatus !== 'CLOSED_PERMANENTLY' && place.businessStatus !== 'CLOSED_TEMPORARILY')
      .map((place: any): RawDiscoveredLead => {
      const name = place.displayName?.text || 'Unknown Business';
      const website = place.websiteUri || null;
      const rating = place.rating || 0;
      const reviews = place.userRatingCount || 0;

      return {
        name,
        domain: website,
        country: request.market,
        address: place.formattedAddress,
        phone: place.nationalPhoneNumber,
        industry: request.industry,
        sourceProvider: 'google_places',
        sourceIdentifier: place.id,
        fetchedAt: new Date().toISOString(),
        rawPayloadRef: {
          id: place.id,
          businessStatus: place.businessStatus,
          types: place.types,
          rating,
          userRatingCount: reviews,
        },
        evidence: [
          {
            sourceName: 'Google Places API',
            sourceUrl: `https://www.google.com/maps/search/?api=1&query_place_id=${place.id}`,
            observationTime: new Date().toISOString(),
            evidenceType: 'business_listing',
            summary: `Verified physical business listing with ${reviews} reviews and ${rating} rating.`,
            isFactual: true,
            confidence: 0.95,
          },
        ],
      };
    });
  }
}
