import { IDiscoveryProvider, RawDiscoveredLead } from '../types';
import { DiscoveryRequest } from '@/lib/validation/schemas';
import { GrowthEvidenceEntity } from '@/types';

/**
 * Google Places API (New) Provider Adapter
 * Queries the official Google Places API (New) Text Search endpoint for commercial establishments.
 * Supports pagination, cost controls, exponential backoff, and rich business-problem signals.
 */
export class GooglePlacesProvider implements IDiscoveryProvider {
  public readonly id = 'google_places';
  public readonly name = 'Google Places API (New)';

  // Approximate cost per Text Search (Pro/Enterprise fields) is $0.032 USD per request
  public static readonly COST_PER_REQUEST_USD = 0.032;

  private static monthlyRequestsCount = 0;
  private static runRequestsCount = 0;

  public isConfigured(): boolean {
    return Boolean(process.env.GOOGLE_PLACES_API_KEY && process.env.GOOGLE_PLACES_API_KEY.trim().length > 0);
  }

  public getCostMetrics(): {
    runRequestsCount: number;
    monthlyRequestsCount: number;
    runEstimatedCostUsd: number;
    monthlyEstimatedCostUsd: number;
    budgetUsd: number;
    budgetRemainingUsd: number;
  } {
    const budgetUsd = Number(process.env.PLACES_MONTHLY_BUDGET) || 50.0;
    const monthlyCost = Number((GooglePlacesProvider.monthlyRequestsCount * GooglePlacesProvider.COST_PER_REQUEST_USD).toFixed(3));
    const runCost = Number((GooglePlacesProvider.runRequestsCount * GooglePlacesProvider.COST_PER_REQUEST_USD).toFixed(3));

    return {
      runRequestsCount: GooglePlacesProvider.runRequestsCount,
      monthlyRequestsCount: GooglePlacesProvider.monthlyRequestsCount,
      runEstimatedCostUsd: runCost,
      monthlyEstimatedCostUsd: monthlyCost,
      budgetUsd,
      budgetRemainingUsd: Math.max(0, Number((budgetUsd - monthlyCost).toFixed(3))),
    };
  }

  public async discover(
    request: DiscoveryRequest & { pageToken?: string }
  ): Promise<RawDiscoveredLead[] & { nextPageToken?: string | null }> {
    if (!this.isConfigured()) {
      throw new Error('Google Places key is missing. Configure GOOGLE_PLACES_API_KEY in environment to discover live commercial establishments.');
    }

    const metrics = this.getCostMetrics();
    if (metrics.monthlyEstimatedCostUsd >= metrics.budgetUsd) {
      throw new Error(`Google Places monthly budget ($${metrics.budgetUsd} USD) reached. Halting discovery to protect spend.`);
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY!;
    const searchQuery = `${request.industry} in ${request.location || request.market}`;
    const url = 'https://places.googleapis.com/v1/places:searchText';

    const fieldMask = [
      'places.id',
      'places.displayName',
      'places.formattedAddress',
      'places.websiteUri',
      'places.nationalPhoneNumber',
      'places.internationalPhoneNumber',
      'places.googleMapsUri',
      'places.rating',
      'places.userRatingCount',
      'places.businessStatus',
      'places.regularOpeningHours',
      'places.photos',
      'places.primaryType',
      'places.types',
      'places.reviews',
      'nextPageToken',
    ].join(',');

    const requestPayload: any = {
      textQuery: searchQuery,
      pageSize: Math.min(request.limit || 20, 20),
    };

    if (request.pageToken) {
      requestPayload.pageToken = request.pageToken;
    }

    // Execute with exponential backoff on 429/5xx (up to 3 attempts)
    let response: Response | null = null;
    let attempt = 0;
    const maxAttempts = 3;

    while (attempt < maxAttempts) {
      attempt++;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': fieldMask,
          },
          body: JSON.stringify(requestPayload),
        });

        if (response.ok) {
          GooglePlacesProvider.runRequestsCount++;
          GooglePlacesProvider.monthlyRequestsCount++;
          break;
        }

        if (response.status === 429 || response.status >= 500) {
          if (attempt < maxAttempts) {
            const delayMs = Math.pow(2, attempt) * 1000;
            await new Promise((res) => setTimeout(res, delayMs));
            continue;
          }
        }

        const errText = await response.text();
        throw new Error(`Google Places API returned HTTP ${response.status}: ${errText}`);
      } catch (err: any) {
        if (attempt >= maxAttempts) {
          throw new Error(`Google Places API request failed after ${maxAttempts} attempts: ${err?.message}`);
        }
        await new Promise((res) => setTimeout(res, 1000 * attempt));
      }
    }

    if (!response || !response.ok) {
      throw new Error('Google Places API call failed.');
    }

    const data = await response.json();
    const places = data.places || [];
    const nextPageToken = data.nextPageToken || null;

    const leads: any = places
      .filter((place: any) =>
        place.businessStatus !== 'CLOSED_PERMANENTLY' &&
        place.businessStatus !== 'CLOSED_TEMPORARILY'
      )
      .map((place: any): RawDiscoveredLead => {
        const name = place.displayName?.text || 'Unknown Business';
        const website = place.websiteUri || null;
        const rating = place.rating || 0;
        const reviewCount = place.userRatingCount || 0;
        const photoCount = place.photos?.length || 0;
        const googleMapsUrl = place.googleMapsUri || `https://www.google.com/maps/search/?api=1&query_place_id=${place.id}`;

        // Determine social links
        const socialUrls: string[] = [];
        if (website) {
          const lower = website.toLowerCase();
          if (lower.includes('facebook.com') || lower.includes('instagram.com') || lower.includes('linkedin.com')) {
            socialUrls.push(website);
          }
        }

        // Build factual evidence & business-problem signals
        const evidence: GrowthEvidenceEntity[] = [];

        // 1. Physical profile listing
        evidence.push({
          id: `ev_gplace_${place.id}_listing`,
          businessId: '',
          sourceName: 'Google Places API',
          sourceUrl: googleMapsUrl,
          observationTime: new Date().toISOString(),
          evidenceType: 'business_listing',
          summary: `Verified commercial listing with ${reviewCount} customer reviews and ${rating.toFixed(1)}/5.0 rating on Google Maps.`,
          isFactual: true,
          confidence: 0.98,
          freshnessScore: 1.0,
          createdAt: new Date().toISOString(),
        });

        // 2. Website absence or social-only problem signal
        if (!website) {
          evidence.push({
            id: `ev_gplace_${place.id}_no_web`,
            businessId: '',
            sourceName: 'Google Business Profile',
            sourceUrl: googleMapsUrl,
            observationTime: new Date().toISOString(),
            evidenceType: 'website_gap',
            summary: 'Google Business Profile has no website URL configured, preventing direct online customer intake.',
            isFactual: true,
            confidence: 0.95,
            freshnessScore: 1.0,
            createdAt: new Date().toISOString(),
          });
        } else if (
          website.includes('facebook.com') ||
          website.includes('instagram.com') ||
          website.includes('linktr.ee') ||
          website.includes('yelp.com')
        ) {
          evidence.push({
            id: `ev_gplace_${place.id}_social_only`,
            businessId: '',
            sourceName: 'Google Business Profile',
            sourceUrl: googleMapsUrl,
            observationTime: new Date().toISOString(),
            evidenceType: 'social_only_web',
            summary: `Profile relies entirely on a third-party social link (${website}) instead of a branded conversion website.`,
            isFactual: true,
            confidence: 0.95,
            freshnessScore: 1.0,
            createdAt: new Date().toISOString(),
          });
        }

        // 3. Low rating signal (<4.0 with sufficient review volume)
        if (rating > 0 && rating < 4.0 && reviewCount >= 5) {
          evidence.push({
            id: `ev_gplace_${place.id}_rating_gap`,
            businessId: '',
            sourceName: 'Google Reviews',
            sourceUrl: googleMapsUrl,
            observationTime: new Date().toISOString(),
            evidenceType: 'reputation_signal',
            summary: `Public rating is ${rating.toFixed(1)}/5.0 across ${reviewCount} reviews. Opportunity for automated review collection and customer intake modernization.`,
            isFactual: true,
            confidence: 0.90,
            freshnessScore: 1.0,
            createdAt: new Date().toISOString(),
          });
        }

        // 4. Missing hours or sparse photo signals
        if (photoCount <= 2) {
          evidence.push({
            id: `ev_gplace_${place.id}_sparse_media`,
            businessId: '',
            sourceName: 'Google Places API',
            sourceUrl: googleMapsUrl,
            observationTime: new Date().toISOString(),
            evidenceType: 'profile_completeness',
            summary: `Listing has only ${photoCount} uploaded photos, indicating an un-optimized digital presence.`,
            isFactual: true,
            confidence: 0.85,
            freshnessScore: 1.0,
            createdAt: new Date().toISOString(),
          });
        }

        // 5. Review text themes (factual customer experience observations without customer names)
        if (place.reviews && Array.isArray(place.reviews) && place.reviews.length > 0) {
          const combinedReviews = place.reviews
            .map((r: any) => (r.text?.text || '').toLowerCase())
            .join(' ');

          const mentionsBooking = combinedReviews.includes('book') || combinedReviews.includes('appointment') || combinedReviews.includes('schedule');
          const mentionsSlowPhone = combinedReviews.includes('phone') || combinedReviews.includes('answer') || combinedReviews.includes('call back') || combinedReviews.includes('hold');

          if (mentionsSlowPhone) {
            evidence.push({
              id: `ev_gplace_${place.id}_intake_friction`,
              businessId: '',
              sourceName: 'Customer Reviews (Aggregated)',
              sourceUrl: googleMapsUrl,
              observationTime: new Date().toISOString(),
              evidenceType: 'operational_friction',
              summary: 'Customer feedback indicates phone contact delays or response friction; strong candidate for 24/7 web intake.',
              isFactual: true,
              confidence: 0.80,
              freshnessScore: 1.0,
              createdAt: new Date().toISOString(),
            });
          } else if (mentionsBooking) {
            evidence.push({
              id: `ev_gplace_${place.id}_booking_demand`,
              businessId: '',
              sourceName: 'Customer Reviews (Aggregated)',
              sourceUrl: googleMapsUrl,
              observationTime: new Date().toISOString(),
              evidenceType: 'booking_demand',
              summary: 'Customers frequently reference scheduling and appointments in reviews, indicating high value for direct digital booking.',
              isFactual: true,
              confidence: 0.85,
              freshnessScore: 1.0,
              createdAt: new Date().toISOString(),
            });
          }
        }

        return {
          name,
          domain: website,
          country: request.market,
          address: place.formattedAddress,
          phone: place.nationalPhoneNumber || place.internationalPhoneNumber,
          industry: request.industry,
          sourceProvider: 'google_places',
          sourceIdentifier: place.id,
          fetchedAt: new Date().toISOString(),
          socialUrls,
          evidence,
          rawPayloadRef: {
            id: place.id,
            businessStatus: place.businessStatus,
            rating,
            userRatingCount: reviewCount,
            types: place.types,
            primaryType: place.primaryType,
            photoCount,
            googleMapsUri: place.googleMapsUri,
          },
        };
      });

    leads.nextPageToken = nextPageToken;
    return leads;
  }
}
