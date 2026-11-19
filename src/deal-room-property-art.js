// Local static paths only. A catalogue crop may survive even when the old HD source did not.
// Catalogue/UI and immersive room art are intentionally separate. Neither reads game state.
export const PROPERTY_SCENE_ART = Object.freeze({
  "office-window": "assets/deal-office-window-v1.webp",
  "office-loft": "assets/deal-property-office-loft.webp",
  "office-yard": "assets/deal-property-office-yard.webp",
  "office-city": "assets/deal-property-office-city.webp",
  "office-river": "assets/deal-property-office-river.webp",
  "office-wide": "assets/deal-property-office-wide.webp",
  "office-terrace": "assets/deal-property-office-terrace.webp",
  "office-sky": "assets/deal-property-office-sky.webp",
  "home-starter": "assets/deal-life-empty.webp",
  "home-flat": "assets/deal-property-home-flat.webp",
  "home-harbor": "assets/deal-property-home-harbor.webp",
  "home-tower": "assets/deal-property-home-tower.webp",
  "home-villa": "assets/deal-property-home-villa.webp",
});

export const PROPERTY_CATALOGUE_ART = Object.freeze({
  "office-window": "assets/deal-property-card-office-window.webp",
  "office-loft": "assets/deal-property-card-office-loft.webp",
  "office-yard": "assets/deal-property-card-office-yard.webp",
  "office-city": "assets/deal-property-card-office-city.webp",
  "office-river": "assets/deal-property-card-office-river.webp",
  "office-wide": "assets/deal-property-card-office-wide.webp",
  "office-terrace": "assets/deal-property-card-office-terrace.webp",
  "office-sky": "assets/deal-property-card-office-sky.webp",
  "home-starter": "assets/deal-property-card-home-starter.webp",
  "home-flat": "assets/deal-property-card-home-flat.webp",
  "home-harbor": "assets/deal-property-card-home-harbor.webp",
  "home-tower": "assets/deal-property-card-home-tower.webp",
  "home-villa": "assets/deal-property-card-home-villa.webp",
});

const roomPath = (map, id) => typeof id === 'string' && Object.hasOwn(map, id) ? map[id] : '';
export const propertySceneArt = id => roomPath(PROPERTY_SCENE_ART, id);
export const propertyCatalogueArt = id => roomPath(PROPERTY_CATALOGUE_ART, id);

// Actual centre of the painted computer screen in the UNCROPPED office frame.
// Fractions of natural width/height; a crop or object-fit:cover needs a matching transform.
// These coordinates do not signify unread mail; that comes from the mailbox state.
const pmPoint = (x,y) => Object.freeze({x,y});
const pmAnchors = Object.freeze({
  'office-window':pmPoint(.142,.345), 'office-loft':pmPoint(.173,.537),
  'office-yard':pmPoint(.231,.520), 'office-city':pmPoint(.369,.493),
  'office-river':pmPoint(.213,.527), 'office-wide':pmPoint(.078,.467),
  'office-terrace':pmPoint(.593,.467), 'office-sky':pmPoint(.293,.493)
});
export const propertyMailAnchor = id => typeof id === 'string' && Object.hasOwn(pmAnchors,id) ? pmAnchors[id] : null;
