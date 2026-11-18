import { describe, expect, it } from "vitest";
import { extractOgImage } from "./extract-og-image";

const PAGE = "https://comy.co.il/event/adi-ashkenazi/";

describe("extractOgImage", () => {
  it("reads the og:image a seller advertises for the page", () => {
    const html = `<meta property="og:image" content="https://cdn.comy.co.il/uploads/Adi-Ashkenazi1200-630.jpg" />`;
    expect(extractOgImage(html, PAGE)).toBe("https://cdn.comy.co.il/uploads/Adi-Ashkenazi1200-630.jpg");
  });

  it("handles the reversed attribute order some themes emit", () => {
    const html = `<meta content="https://grayclub.co.il/wp-content/uploads/saranga.jpg" property="og:image">`;
    expect(extractOgImage(html, PAGE)).toBe("https://grayclub.co.il/wp-content/uploads/saranga.jpg");
  });

  it("resolves a relative og:image against the page URL", () => {
    const html = `<meta property="og:image" content="/wp-content/uploads/x.jpg">`;
    expect(extractOgImage(html, PAGE)).toBe("https://comy.co.il/wp-content/uploads/x.jpg");
  });

  it("upgrades a protocol-relative og:image to https", () => {
    const html = `<meta property="og:image" content="//cdn.comy.co.il/x.jpg">`;
    expect(extractOgImage(html, PAGE)).toBe("https://cdn.comy.co.il/x.jpg");
  });

  it("ignores og:image:width and other og:image-prefixed tags", () => {
    const html = `<meta property="og:image:width" content="1200"><meta property="og:image" content="https://cdn.comy.co.il/real.jpg">`;
    expect(extractOgImage(html, PAGE)).toBe("https://cdn.comy.co.il/real.jpg");
  });

  it("returns undefined when there is no og:image", () => {
    expect(extractOgImage("<html><head></head></html>", PAGE)).toBeUndefined();
  });

  it("rejects a non-http scheme", () => {
    const html = `<meta property="og:image" content="data:image/png;base64,AAAA">`;
    expect(extractOgImage(html, PAGE)).toBeUndefined();
  });
});
