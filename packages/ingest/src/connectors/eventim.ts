import { createEventimConnector } from "./_seller-base/create-eventim-connector";

// Confirmed live via robots.txt ("Sitemap: .../staticsite/sitemap/EIL/..."):
// eventim.co.il runs the same Eventim platform as zappa-club.co.il — see
// create-eventim-connector.ts.
export const eventimConnector = createEventimConnector({
  slug: "eventim",
  origin: "https://www.eventim.co.il",
  sourceDomain: "eventim.co.il",
  affiliateCode: "EIL",
});
