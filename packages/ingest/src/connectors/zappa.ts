import { createEventimConnector } from "./_seller-base/create-eventim-connector";

// Confirmed live via robots.txt ("Sitemap: .../staticsite/sitemap/ZPE/..."):
// zappa-club.co.il runs the Eventim platform — see create-eventim-connector.ts.
export const zappaConnector = createEventimConnector({
  slug: "zappa",
  origin: "https://www.zappa-club.co.il",
  sourceDomain: "zappa-club.co.il",
  affiliateCode: "ZPE",
});
