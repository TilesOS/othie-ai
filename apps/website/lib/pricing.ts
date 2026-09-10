export type Offer = {
  id: string;
  name: string;
  price: string;
  cadence: "monthly" | "yearly";
  entitlements: string[];
  destination: string;
};

export const pricingConfig: {
  status: "unpublished" | "published";
  message: string;
  offers: Offer[];
} = {
  status: "unpublished",
  message: "Pricing will be announced with the public release.",
  offers: [],
};
