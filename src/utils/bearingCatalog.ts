export type BearingProductCopy = {
  name: string;
  description: string;
  categoryId: string;
  badge?: string;
};

// Original catalog records remain the source of inventory, pricing and fulfilment.
// This layer gives the storefront a consistent industrial-bearing assortment.
const bearingCatalog: BearingProductCopy[] = [
  { name: 'Deep Groove Ball Bearing', description: 'Versatile single-row bearing for radial loads and moderate axial loads in electric motors, pumps and general machinery.', categoryId: 'deep-groove-ball-bearings', badge: 'Best Seller' },
  { name: 'Angular Contact Ball Bearing', description: 'Precision bearing designed for combined radial and axial loads, ideal for machine tools, pumps and high-speed equipment.', categoryId: 'angular-contact-ball-bearings' },
  { name: 'Self-Aligning Ball Bearing', description: 'Accommodates shaft misalignment and deflection for dependable service in conveyors, fans and agricultural equipment.', categoryId: 'self-aligning-ball-bearings' },
  { name: 'Spherical Roller Bearing', description: 'Heavy-duty bearing with high load capacity and self-aligning capability for demanding industrial applications.', categoryId: 'spherical-roller-bearings', badge: 'Best Seller' },
  { name: 'Cylindrical Roller Bearing', description: 'High radial-load capacity bearing engineered for rigid shaft support in gearboxes, motors and rolling mills.', categoryId: 'cylindrical-roller-bearings' },
  { name: 'Tapered Roller Bearing', description: 'Handles combined loads with robust roller geometry for hubs, gear drives, transmissions and heavy equipment.', categoryId: 'tapered-roller-bearings' },
  { name: 'Needle Roller Bearing', description: 'Compact, high-capacity roller bearing for space-constrained automotive and industrial assemblies.', categoryId: 'needle-roller-bearings' },
  { name: 'Thrust Ball Bearing', description: 'Axial-load bearing solution for vertical shafts, turntables and low-to-medium speed industrial equipment.', categoryId: 'thrust-bearings' },
  { name: 'Pillow Block Bearing Unit', description: 'Ready-to-mount housed bearing unit for reliable shaft support in conveyors, fans and processing lines.', categoryId: 'mounted-bearing-units' },
  { name: 'Flanged Bearing Unit', description: 'Easy-install flanged unit providing stable support where shafts pass through machinery frames.', categoryId: 'mounted-bearing-units' },
  { name: 'Linear Ball Bearing Unit', description: 'Smooth, accurate linear motion component for automation equipment, handling systems and machine tools.', categoryId: 'linear-motion' },
  { name: 'Bearing Housing & Seal Kit', description: 'Durable housing and sealing components that protect bearing assemblies from contamination and retain lubrication.', categoryId: 'bearing-housings-seals' },
];

export const bearingCategoryIds = new Set(bearingCatalog.map((item) => item.categoryId));

export function bearingCopyFor(id: string): BearingProductCopy {
  const bucket = id.split('').reduce((total, character) => total + character.charCodeAt(0), 0);
  return bearingCatalog[bucket % bearingCatalog.length];
}

export function bearingImageFor(id: string): string {
  const copy = bearingCopyFor(id);
  const query = copy.categoryId.includes('linear')
    ? 'linear,bearing,industrial'
    : copy.categoryId.includes('mounted') || copy.categoryId.includes('housings')
      ? 'pillow,block,bearing'
      : copy.categoryId.includes('roller')
        ? 'roller,bearing,industrial'
        : 'ball,bearing,industrial';
  const lock = id.split('').reduce((total, character) => total + character.charCodeAt(0), 0);

  return `https://loremflickr.com/800/800/${query}?lock=${lock}`;
}

export function bearingCategoryLabel(category: string): string {
  return category === 'mounted-linear-units' ? 'Mounted & Linear Units' : 'Rolling Bearings';
}
