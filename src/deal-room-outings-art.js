// Only authored catalogue IDs resolve. The shipping WebP literals are embedded by
// the existing standalone build; no untrusted filename can enter an image element.
const art = new Map([
  ["paper-boat", new Map([
    [null, "assets/deal-outing-paper-boat-opening.webp"],
    ["fold", "assets/deal-outing-paper-boat-fold.webp"],
    ["float", "assets/deal-outing-paper-boat-float.webp"]
  ])],
  ["shadow-show", new Map([
    [null, "assets/deal-outing-shadow-show-opening.webp"],
    ["lantern", "assets/deal-outing-shadow-show-lantern.webp"],
    ["puppet", "assets/deal-outing-shadow-show-puppet.webp"]
  ])],
  ["tidepool", new Map([
    [null, "assets/deal-outing-tidepool-opening.webp"],
    ["look", "assets/deal-outing-tidepool-look.webp"],
    ["map", "assets/deal-outing-tidepool-map.webp"]
  ])],
  ["pottery", new Map([
    [null, "assets/deal-outing-pottery-opening.webp"],
    ["center", "assets/deal-outing-pottery-center.webp"],
    ["shape", "assets/deal-outing-pottery-shape.webp"]
  ])],
  ["cave-boat", new Map([
    [null, "assets/deal-outing-cave-boat-opening.webp"],
    ["echo", "assets/deal-outing-cave-boat-echo.webp"],
    ["outline", "assets/deal-outing-cave-boat-outline.webp"]
  ])],
  ["night-train", new Map([
    [null, "assets/deal-outing-night-train-opening.webp"],
    ["wake", "assets/deal-outing-night-train-wake.webp"],
    ["breakfast", "assets/deal-outing-night-train-breakfast.webp"]
  ])],
  ["balloon", new Map([
    [null, "assets/deal-outing-balloon-opening.webp"],
    ["rise", "assets/deal-outing-balloon-rise.webp"],
    ["land", "assets/deal-outing-balloon-land.webp"]
  ])],
  ["sail-charter", new Map([
    [null, "assets/deal-outing-sail-charter-opening.webp"],
    ["twilight", "assets/deal-outing-sail-charter-twilight.webp"],
    ["return", "assets/deal-outing-sail-charter-return.webp"]
  ])],
]);

export function outingSceneArt(routeId, interactionId = null) {
  return art.get(routeId)?.get(interactionId) ?? '';
}
