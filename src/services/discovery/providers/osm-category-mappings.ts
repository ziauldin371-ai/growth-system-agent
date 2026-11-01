export interface OsmCategoryPreset {
  id: string;
  label: string;
  overpassTags: Array<{ key: string; val?: string }>;
  nominatimQuery: string;
  defaultIndustry: string;
}

export const OSM_CATEGORY_PRESETS: Record<string, OsmCategoryPreset> = {
  restaurants: {
    id: 'restaurants',
    label: 'Restaurants',
    overpassTags: [{ key: 'amenity', val: 'restaurant' }],
    nominatimQuery: 'restaurant',
    defaultIndustry: 'Software & Technology Services',
  },
  cafes: {
    id: 'cafes',
    label: 'Cafes',
    overpassTags: [{ key: 'amenity', val: 'cafe' }],
    nominatimQuery: 'cafe',
    defaultIndustry: 'Software & Technology Services',
  },
  salons: {
    id: 'salons',
    label: 'Salons & Barbers',
    overpassTags: [
      { key: 'shop', val: 'hairdresser' },
      { key: 'shop', val: 'beauty' },
      { key: 'shop', val: 'barber' },
    ],
    nominatimQuery: 'hairdresser',
    defaultIndustry: 'Personal Care & Wellness',
  },
  clinics: {
    id: 'clinics',
    label: 'Clinics & Dentists',
    overpassTags: [
      { key: 'amenity', val: 'dentist' },
      { key: 'amenity', val: 'clinic' },
      { key: 'amenity', val: 'doctors' },
      { key: 'healthcare', val: 'dentist' },
      { key: 'healthcare', val: 'clinic' },
    ],
    nominatimQuery: 'dentist',
    defaultIndustry: 'Dental & Healthcare Clinics',
  },
  gyms: {
    id: 'gyms',
    label: 'Gyms & Fitness',
    overpassTags: [
      { key: 'leisure', val: 'fitness_centre' },
      { key: 'leisure', val: 'sports_centre' },
      { key: 'amenity', val: 'gym' },
    ],
    nominatimQuery: 'gym',
    defaultIndustry: 'Personal Care & Wellness',
  },
  auto_repair: {
    id: 'auto_repair',
    label: 'Auto Repair',
    overpassTags: [
      { key: 'shop', val: 'car_repair' },
      { key: 'amenity', val: 'car_repair' },
      { key: 'craft', val: 'car_repair' },
    ],
    nominatimQuery: 'car repair',
    defaultIndustry: 'Home & Commercial Services',
  },
  contractors: {
    id: 'contractors',
    label: 'Plumbers, Electricians & Builders',
    overpassTags: [
      { key: 'craft', val: 'plumber' },
      { key: 'craft', val: 'electrician' },
      { key: 'craft', val: 'builder' },
      { key: 'craft', val: 'carpenter' },
      { key: 'craft', val: 'painter' },
    ],
    nominatimQuery: 'plumber',
    defaultIndustry: 'Home & Commercial Services',
  },
  real_estate: {
    id: 'real_estate',
    label: 'Real Estate Agents',
    overpassTags: [{ key: 'office', val: 'estate_agent' }],
    nominatimQuery: 'estate agent',
    defaultIndustry: 'Legal & Financial Services',
  },
  retail: {
    id: 'retail',
    label: 'Retail Shops',
    overpassTags: [
      { key: 'shop', val: 'clothes' },
      { key: 'shop', val: 'boutique' },
      { key: 'shop', val: 'gift' },
      { key: 'shop', val: 'supermarket' },
    ],
    nominatimQuery: 'shop',
    defaultIndustry: 'E-commerce & Logistics',
  },
  hotels: {
    id: 'hotels',
    label: 'Hotels & Hospitality',
    overpassTags: [
      { key: 'tourism', val: 'hotel' },
      { key: 'tourism', val: 'guest_house' },
      { key: 'tourism', val: 'motel' },
    ],
    nominatimQuery: 'hotel',
    defaultIndustry: 'Hospitality & Travel',
  },
  schools: {
    id: 'schools',
    label: 'Schools & Tutors',
    overpassTags: [
      { key: 'amenity', val: 'school' },
      { key: 'amenity', val: 'language_school' },
      { key: 'amenity', val: 'music_school' },
      { key: 'office', val: 'educational_institution' },
    ],
    nominatimQuery: 'school',
    defaultIndustry: 'Education & Training',
  },
};

/**
 * Resolves a category preset from industry string or search query.
 */
export function resolveOsmCategoryPreset(industryOrQuery?: string): OsmCategoryPreset {
  if (!industryOrQuery) {
    return OSM_CATEGORY_PRESETS.clinics;
  }

  const normalized = industryOrQuery.toLowerCase().trim();

  if (normalized.includes('dent') || normalized.includes('clinic') || normalized.includes('health') || normalized.includes('doctor')) {
    return OSM_CATEGORY_PRESETS.clinics;
  }
  if (normalized.includes('cafe') || normalized.includes('coffee')) {
    return OSM_CATEGORY_PRESETS.cafes;
  }
  if (normalized.includes('restaurant') || normalized.includes('food') || normalized.includes('dining')) {
    return OSM_CATEGORY_PRESETS.restaurants;
  }
  if (normalized.includes('salon') || normalized.includes('barber') || normalized.includes('beauty') || normalized.includes('hair')) {
    return OSM_CATEGORY_PRESETS.salons;
  }
  if (normalized.includes('gym') || normalized.includes('fitness') || normalized.includes('workout')) {
    return OSM_CATEGORY_PRESETS.gyms;
  }
  if (normalized.includes('auto') || normalized.includes('car') || normalized.includes('mechanic')) {
    return OSM_CATEGORY_PRESETS.auto_repair;
  }
  if (normalized.includes('plumb') || normalized.includes('electric') || normalized.includes('build') || normalized.includes('roof') || normalized.includes('home')) {
    return OSM_CATEGORY_PRESETS.contractors;
  }
  if (normalized.includes('estate') || normalized.includes('property') || normalized.includes('realt')) {
    return OSM_CATEGORY_PRESETS.real_estate;
  }
  if (normalized.includes('hotel') || normalized.includes('motel') || normalized.includes('lodg') || normalized.includes('guest')) {
    return OSM_CATEGORY_PRESETS.hotels;
  }
  if (normalized.includes('school') || normalized.includes('tutor') || normalized.includes('academy') || normalized.includes('educat')) {
    return OSM_CATEGORY_PRESETS.schools;
  }
  if (normalized.includes('retail') || normalized.includes('shop') || normalized.includes('store') || normalized.includes('boutique') || normalized.includes('commerce')) {
    return OSM_CATEGORY_PRESETS.retail;
  }

  // Default fallback for Software / Services
  return OSM_CATEGORY_PRESETS.clinics;
}
