import type { Product } from '../components/ProductCard';

type ShowcaseCategory = {
  category: Product['category'];
  categoryId: string;
  name: string;
  description: string;
  image: string;
};

// Product photography is loaded from Bearings Direct category and product listings.
// The array is intentionally five items per menu subcategory for this interim catalog.
const categories: ShowcaseCategory[] = [
  { category: 'rolling-bearings', categoryId: 'deep-groove-ball-bearings', name: 'Deep Groove Ball Bearing', description: 'Versatile radial bearing for motors, pumps and general machinery.', image: 'https://cdn11.bigcommerce.com/s-m2tbfwjufh/images/stencil/500x659/products/4150/25589/6203-2rs__72644.1695320215.jpg?c=1' },
  { category: 'rolling-bearings', categoryId: 'angular-contact-ball-bearings', name: 'Angular Contact Ball Bearing', description: 'Precision bearing for combined radial and axial loads.', image: 'https://cdn11.bigcommerce.com/s-m2tbfwjufh/images/stencil/500x659/products/4133/19644/6203-zz-1__01034.1677283224.jpg?c=1' },
  { category: 'rolling-bearings', categoryId: 'self-aligning-ball-bearings', name: 'Self-Aligning Ball Bearing', description: 'Double-row bearing that accommodates shaft deflection and misalignment.', image: 'https://cdn11.bigcommerce.com/s-m2tbfwjufh/images/stencil/500x659/products/5397/36083/1304__54760.1671220969.1280.1280__23977.1682463342.jpg?c=1' },
  { category: 'rolling-bearings', categoryId: 'spherical-roller-bearings', name: 'Spherical Roller Bearing', description: 'Heavy-duty self-aligning bearing for high radial load applications.', image: 'https://cdn11.bigcommerce.com/s-m2tbfwjufh/images/stencil/original/j/7589e2dbb48a160dcbb51bdb85f76de7__33473.original.png' },
  { category: 'rolling-bearings', categoryId: 'cylindrical-roller-bearings', name: 'Cylindrical Roller Bearing', description: 'High-capacity radial bearing for gearboxes, motors and process equipment.', image: 'https://cdn11.bigcommerce.com/s-m2tbfwjufh/images/stencil/original/a/e059d5129091b6e99b0d1b3006b34e60__71782.original.png' },
  { category: 'rolling-bearings', categoryId: 'tapered-roller-bearings', name: 'Tapered Roller Bearing', description: 'Robust bearing for combined radial and axial loads in hubs and transmissions.', image: 'https://cdn11.bigcommerce.com/s-m2tbfwjufh/images/stencil/500x659/products/114/30600/Tapered_Roller_Set__23870.1674060816.jpg?c=1' },
  { category: 'rolling-bearings', categoryId: 'needle-roller-bearings', name: 'Needle Roller Bearing', description: 'Compact bearing solution for space-constrained, high-load assemblies.', image: 'https://cdn11.bigcommerce.com/s-m2tbfwjufh/images/stencil/original/g/835101c41c6a40b2d41640bdbd18768d__45507.original.png' },
  { category: 'rolling-bearings', categoryId: 'thrust-bearings', name: 'Thrust Bearing', description: 'Axial-load bearing solution for turntables, vertical shafts and gear assemblies.', image: 'https://cdn11.bigcommerce.com/s-m2tbfwjufh/images/stencil/original/u/4b4819bb30cca703154428b090b846a3__85593.original.png' },
  { category: 'mounted-linear-units', categoryId: 'mounted-bearing-units', name: 'Mounted Bearing Unit', description: 'Ready-to-mount housing and insert bearing for dependable shaft support.', image: 'https://cdn11.bigcommerce.com/s-m2tbfwjufh/images/stencil/original/k/i44a1511-1-2__97333.original.jpg' },
  { category: 'mounted-linear-units', categoryId: 'linear-motion', name: 'Linear Motion Bearing', description: 'Precision component for smooth, low-friction automation and handling motion.', image: 'https://cdn11.bigcommerce.com/s-m2tbfwjufh/images/stencil/original/c/26e4218eedda4154edb4e12124196e88__47275.original.jpg' },
  { category: 'mounted-linear-units', categoryId: 'bearing-housings-seals', name: 'Bearing Housing & Seal', description: 'Protective housing and seal solution for reliable bearing operation.', image: 'https://cdn11.bigcommerce.com/s-m2tbfwjufh/images/stencil/original/o/i44a1485-2-2__18295.original.jpg' },
];

const sizeLabels = ['Compact', 'Standard', 'Medium Duty', 'Heavy Duty', 'Industrial'];

export const showcaseProducts: Product[] = categories.flatMap((item, categoryIndex) =>
  sizeLabels.map((size, index) => ({
    id: `max-${item.categoryId}-${index + 1}`,
    name: `${size} ${item.name}`,
    description: `${item.description} Available in a range of standard industrial sizes.`,
    category: item.category,
    categoryId: item.categoryId,
    price: Number((28 + categoryIndex * 14 + index * 8.75).toFixed(2)),
    originalPrice: index === 0 ? Number((38 + categoryIndex * 14).toFixed(2)) : undefined,
    currency: 'USD' as const,
    rating: 4.6 + (index % 3) * 0.1,
    reviewCount: 12 + categoryIndex * 3 + index * 4,
    image: item.image,
    inStock: true,
    stockCount: 16 + index * 9,
    soldCount: 44 + categoryIndex * 11 + index * 7,
    badge: index === 0 ? 'Best Seller' : undefined,
  }))
);
