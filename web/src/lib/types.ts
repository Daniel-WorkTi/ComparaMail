export type Person = {
  id: string;
  slug: string;
  name: string;
  title: string;
  email?: string;
  phone?: string;
  photoUrl: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CompanySettings = {
  logoUrl: string;
  website: string;
  websiteLabel: string;
  address: string;
  addressMapsUrl: string;
  companyName: string;
  brandColor: string;
  instagramUrl: string;
  facebookUrl: string;
  linkedinUrl: string;
};

export type StoreData = {
  settings: CompanySettings;
  people: Person[];
};

export type PersonInput = {
  name: string;
  title: string;
  email?: string;
  phone?: string;
  photoUrl: string;
  active?: boolean;
};
