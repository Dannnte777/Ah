const H = 'holgada', R = 'recta', E = 'entallada';
const F = 'formal', D = 'diario', S = 'deporte';
const FEM = ['Femenino'], MASC = ['Masculino'], ALL = ['Femenino', 'Masculino'];

const item = (audience, id, slot, name, heroFor, fits, occasions, genders = ALL) => ({
  audience, id, slot, name, heroFor, fits, occasions, genders,
  img: `/catalogo/${audience}/${id}.png`,
});
const general = (...args) => item('general', ...args);
const infantil = (...args) => item('infantil', ...args);

export const GARMENTS = [
  // Catálogo general
  general('camiseta', 'top', 'Camiseta', 'Top / Camiseta', [H, R], [D, S]),
  general('top-entallado', 'top', 'Top entallado', 'Top / Camiseta', [E], [D, S]),
  general('blusa', 'top', 'Blusa', 'Top / Camiseta', [R, E], [F], FEM),
  general('camisa', 'top', 'Camisa', 'Top / Camiseta', [R, E], [F], MASC),
  general('pantalon-amplio', 'bottom', 'Pantalón amplio', 'Pantalón amplio', [H, R], [F, D]),
  general('pantalon-recto', 'bottom', 'Pantalón recto', null, [R, E], [F, D]),
  general('pantalon-buzo', 'bottom', 'Pantalón de buzo', null, [H, R, E], [S]),
  general('falda-a', 'bottom', 'Falda A', 'Falda', [H, R], [F, D], FEM),
  general('falda-ajustada', 'bottom', 'Falda ajustada', 'Falda', [E], [F, D], FEM),
  general('short-bermuda', 'bottom', 'Short bermuda', 'Short', [H, R], [D, S]),
  general('chaqueta-denim', 'outer', 'Chaqueta denim', 'Chaqueta', [H, R], [D]),
  general('chaqueta-entallada', 'outer', 'Chaqueta entallada', 'Chaqueta', [E], [F, D]),
  general('cortaviento', 'outer', 'Cortaviento', 'Chaqueta', [H, R, E], [S]),
  general('vestido-casual', 'full', 'Vestido casual', 'Vestido', [H, R], [D]),
  general('vestido-formal', 'full', 'Vestido formal', 'Vestido', [R, E], [F], FEM),
  general('conjunto-blazer', 'set', 'Conjunto con blazer', 'Conjunto', [R, E], [F]),
  general('conjunto-buzo', 'set', 'Conjunto de buzo', 'Conjunto', [H, R], [D, S]),
  general('zapatillas', 'shoes', 'Zapatillas', null, [H, R, E], [D, S]),
  general('zapatos-formales', 'shoes', 'Zapatos formales', null, [H, R, E], [F]),

  // Catálogo infantil
  infantil('camiseta', 'top', 'Camiseta', 'Top / Camiseta', [H, R, E], [D, S]),
  infantil('camisa', 'top', 'Camisa', 'Top / Camiseta', [H, R, E], [F]),
  infantil('pantalon', 'bottom', 'Pantalón', 'Pantalón amplio', [H, R, E], [F, D]),
  infantil('pantalon-buzo', 'bottom', 'Pantalón de buzo', null, [H, R, E], [S]),
  infantil('falda', 'bottom', 'Falda', 'Falda', [H, R, E], [F, D], FEM),
  infantil('short', 'bottom', 'Short', 'Short', [H, R, E], [D, S]),
  infantil('chaqueta', 'outer', 'Chaqueta', 'Chaqueta', [H, R, E], [F, D, S]),
  infantil('vestido', 'full', 'Vestido', 'Vestido', [H, R, E], [F, D]),
  infantil('conjunto', 'set', 'Conjunto', 'Conjunto', [H, R, E], [F, D, S]),
  infantil('zapatillas', 'shoes', 'Zapatillas', null, [H, R, E], [D, S]),
  infantil('zapatos', 'shoes', 'Zapatos', null, [H, R, E], [F]),
];

export const PALETTES = {
  'Colores neutros': ['#F5F5F0', '#D3C5B4', '#999999', '#333333'],
  'Colores tierra': ['#D7C4B7', '#B58361', '#7A4A32', '#586445'],
  'Colores fríos': ['#D0E1F9', '#9DAAF2', '#4A6984', '#2C3E50'],
  'Colores cálidos': ['#FAD0C4', '#F8A5C2', '#E77F67', '#CF6A4C'],
  'Colores nuevos': ['#D4A5A5', '#FFD3B6', '#DCEDC8', '#A8E6CF'],
};

const FIT = {
  'Cómoda y relajada': H,
  Libre: H,
  Ligera: R,
  Estilizada: E,
  Definida: E,
};

const OCCASION = {
  'Ocasión formal': F,
  Oficina: F,
  'Uso diario / Informal': D,
  'Vacaciones / Viaje': D,
  Deporte: S,
};

const PLAN = {
  'Pantalón amplio': ['top', 'shoes'],
  Short: ['top', 'shoes'],
  Falda: ['top', 'shoes'],
  'Top / Camiseta': ['bottom', 'shoes'],
  Vestido: ['outer', 'shoes'],
  Chaqueta: ['top', 'bottom'],
  Conjunto: ['top', 'shoes'],
};

const score = (garment, form) =>
  (garment.occasions.includes(OCCASION[form.occasion]) ? 4 : 0) +
  (garment.fits.includes(FIT[form.fitFeel]) ? 2 : 0) +
  (form.gender === 'Sin preferencia' || garment.genders.includes(form.gender) ? 1 : 0);

const pick = (items, form, variant) => {
  if (!items.length) return null;
  const best = Math.max(...items.map((garment) => score(garment, form)));
  const top = items.filter((garment) => score(garment, form) === best);
  return top[variant % top.length];
};

export function buildLook(form, variant = 0) {
  const audience = form.stage === 'Niño/a' ? 'infantil' : 'general';
  const pool = GARMENTS.filter((garment) =>
    garment.audience === audience &&
    !(form.stage === 'Adolescente' && ['top-entallado', 'falda-ajustada'].includes(garment.id))
  );

  const heroOptions = pool.filter((garment) => garment.heroFor === form.garmentType);
  const hero = pick(heroOptions, form, variant) ?? pick(pool, form, variant);
  if (!hero) return null;

  const others = PLAN[form.garmentType].map((slot) =>
    pick(pool.filter((garment) => garment.slot === slot && garment.id !== hero.id), form, variant)
  );

  const palette = PALETTES[form.colorPalette];
  const garments = [hero, ...others].filter(Boolean).map((garment, index) => ({
    ...garment,
    color: palette[(index + variant) % palette.length],
  }));

  const isApproximate =
    hero.heroFor !== form.garmentType || !hero.occasions.includes(OCCASION[form.occasion]);

  return {
    garments,
    palette,
    note: isApproximate
      ? `"${form.garmentType}" no calza del todo con "${form.occasion}", así que te mostramos la alternativa más cercana.`
      : null,
  };
}