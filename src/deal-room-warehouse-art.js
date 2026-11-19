// Room architecture only. Whether goods have arrived is decided by the ledger,
// never by these paintings. Keep the three literals for standalone asset inlining.
export function warehouseSceneArt(capacity) {
  switch (capacity) {
    case 10: case 24: return 'assets/deal-warehouse-starter.webp';
    case 60: case 100: return 'assets/deal-warehouse-transit.webp';
    case 180: case 300: return 'assets/deal-warehouse-highbay.webp';
    default: return '';
  }
}
