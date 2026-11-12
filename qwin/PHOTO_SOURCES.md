# Qwin promotional landing — licensed photography register

**Scope:** `/qwin/` promotional website only, not a database of items for sale.
**Reviewed:** 12 November 2026.
**License:** https://unsplash.com/license (free use, including commercial websites; no compilation to compete with Unsplash). Always review visible brands, logos, recognizable people and artworks separately before changing usage.

| Website usage | Photographer | Original verified photo page | Image CDN identifier |
| --- | --- | --- | --- |
| Hero — fashion / clothing rack | Polina Kuzovkova | https://unsplash.com/photos/clothes-hanging-on-a-rack-in-a-boutique-pt3EBzQcxP0 | `photo-1767968037382-8eb9c564339f` |
| Hero — vintage seating | Clay Banks | https://unsplash.com/photos/a-chair-and-a-potted-plant-in-a-room-CqQYuru1gxo | `photo-1713962497443-5fadcdb95fc4` |
| Editorial section — vintage camera | Annie Spratt | https://unsplash.com/photos/an-old-camera-sitting-on-top-of-a-wooden-table-IJF6K0OjPqM/ | `photo-1631891425066-435bb61c6ab8` |
| Category style — clothes | Adiel Gavish | https://unsplash.com/photos/a-bunch-of-clothes-hanging-on-a-rack-7E-bTt8i28k | `photo-1643935242152-bccdddd3b816` |
| Category home — chair | Cristian Tejeda | https://unsplash.com/photos/a-rocking-chair-sitting-in-a-living-room-next-to-a-window-6DcLt1LtRuA | `photo-1702477290873-925d17b0afc1` |
| Category technology — camera | Chris Hardy | https://unsplash.com/photos/a-camera-sitting-on-top-of-a-wooden-table-8nNc95tMfGY | `photo-1649023000556-f9c784ee48b1` |
| Category active living — bicycle | Daniel Salcius | https://unsplash.com/photos/white-road-bike-leaning-on-wall-yGULmDIh9GA | `photo-1571068316663-97b816c38453` |

Photographers are credited in the homepage footer. All visuals are illustrations of typical product categories and are **not** live sale listings, endorsements, or promises of inventory. They must not be presented as products currently for sale.

## Technical notes
- Image URLs are served by Unsplash image CDN via HTTPS, resized with `auto=format&fit=crop&w=...&h=...&q=...`.
- HTML includes explicit dimensions, descriptive alt text, lazy loading outside the hero, and `referrerpolicy="no-referrer"` for photo requests.
- Avoid uploading these photos to Etsy, eBay or OLX listings; those platforms require the actual seller's original/authorized product imagery.
- Current hero/category images are external. If a future deployment needs zero third-party runtime requests, self-host licensed optimized files with preserved source metadata.
