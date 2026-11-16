import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Heart, Sparkles, SlidersHorizontal, Loader2, Shirt, Ruler } from 'lucide-react';

import { getLook, isAvailable, MALE_LABELS } from './looks';
import GarmentImage from './GarmentImage';

const MINOR_STAGES = ['Niño/a', 'Adolescente'];

// Qué respuesta se elige en cada paso (para el formulario guiado)
const FIELD_BY_STEP = { 2: 'occasion', 3: 'garmentType', 4: 'fitFeel', 5: 'colorPalette' };

// Prendas que no se ofrecen con estilo Masculino
const FEMININE_ONLY = ['Vestido', 'Falda'];

// Imagen que usa la versión masculina (public/images/hombre/<nombre>.jpeg) si el estilo es Masculino.
// Si esa imagen no existe, muestra la original.
function StyleImage({ src, male, ...props }) {
  const maleSrc = src.replace('/images/', '/images/hombre/').replace(/\.\w+$/, '.jpeg');
  const [failed, setFailed] = useState(false);
  const useMale = male && !failed;
  return (
    <img
      key={useMale ? maleSrc : src}
      src={useMale ? maleSrc : src}
      onError={() => useMale && setFailed(true)}
      {...props}
    />
  );
}

// Envía un JSON al servidor (Vite lo redirige a http://localhost:3001)
async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? `Error ${response.status}`);
  return data;
}

export default function App() {
  const [step, setStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState(null);
  const [error, setError] = useState(null);
  const [variant, setVariant] = useState(0);
  const [favorites, setFavorites] = useState([]);
  const [currentLook, setCurrentLook] = useState(null);

  const [formData, setFormData] = useState({
    stage: 'Adulto',
    occasion: 'Ocasión formal',
    garmentType: 'Conjunto',
    fitFeel: 'Estilizada',
    colorPalette: 'Colores tierra',
    height: '160 - 170 cm',
    bust: '88',
    waist: '68',
    hips: '95',
    gender: 'Sin preferencia',
  });

  const totalSteps = 6; // El paso 7 es el resultado

  const handleNext = () => {
    if (step < totalSteps) {
      // Si la opción marcada en el paso siguiente ya no tiene looks, se marca la primera disponible
      const nextField = FIELD_BY_STEP[step + 1];
      if (nextField && !isAvailable(formData, nextField, formData[nextField])) {
        const first = optionIds(step + 1).find((id) => isAvailable(formData, nextField, id));
        if (first) setFormData({ ...formData, [nextField]: first });
      }
      setStep(step + 1);
    } else if (step === totalSteps) {
      generateOutfit();
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const toggleFavorite = (name) => {
    setFavorites((current) =>
      current.includes(name)
        ? current.filter((favorite) => favorite !== name)
        : [...current, name]
    );
  };

  const generateOutfit = async (nextVariant = 0) => {
    const built = getLook(formData, nextVariant);
    setStep(7);

    if (!built) {
      setError('Aún no hay prendas en el catálogo.');
      return;
    }

    setVariant(nextVariant);
    setCurrentLook(built);
    setIsGenerating(true);
    setError(null);
    setAiRecommendation(null);

    try {
      const payload = {
        ...formData,
        colorPalette: built.colors?.[0] ?? formData.colorPalette,
        closest: Boolean(built.note),
        mismatches: built.mismatches ?? [],
        pieces: built.garments.map((garment) => garment.name),
      };

      // Niño/a y Adolescente: no se envían medidas corporales
      if (MINOR_STAGES.includes(formData.stage)) {
        delete payload.bust;
        delete payload.waist;
        delete payload.hips;
      }

      const look = await postJson('/api/look', payload);
      setAiRecommendation(look);
    } catch (e) {
      console.error(e);
      setAiRecommendation({
        description: 'Look seleccionado según tus preferencias. La descripción con IA no está disponible en este momento.',
        garments: built.garments.map(() => ({ desc: '', recommendedSize: '—' })),
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const showNextLook = () => generateOutfit(variant + 1);

  const stages = [
    { id: 'Niño/a', label: 'Niño/a', img: '/images/nino.png' },
    { id: 'Adolescente', label: 'Adolescente', img: '/images/joven.jpeg' },
    { id: 'Adulto', label: 'Adulto', img: '/images/adulto.jpeg' },
    { id: 'Adulto mayor', label: 'Adulto mayor', img: '/images/Adultomayor.jpeg' },
  ];
  const occasions = [
    { id: 'Deporte', label: 'Deporte', img: '/images/deporte.png' },
    { id: 'Oficina', label: 'Oficina', img: '/images/oficina.png' },
    { id: 'Uso diario / Informal', label: 'Uso diario /\nInformal', img: '/images/informal.png' },
    { id: 'Vacaciones / Viaje', label: 'Vacaciones /\nViaje', img: '/images/vacaciones.png' },
    { id: 'Ocasión formal', label: 'Ocasión formal', img: '/images/formal.png' },
  ];
  const garments = [
    { id: 'Pantalón amplio', label: 'Pantalón amplio', img: '/images/pantalon.png', color: '#E8E1D9' },
    { id: 'Top / Camiseta', label: 'Top / Camiseta', img: '/images/polera.png', color: '#F7EBE8' },
    { id: 'Vestido', label: 'Vestido casual', img: '/images/vestido.png', color: '#E2E8E4' },
    { id: 'Falda', label: 'Falda A', img: '/images/falda.png', color: '#EBF2F7' },
    { id: 'Short', label: 'Short bermuda', img: '/images/short.png', color: '#F9EBEA' },
    { id: 'Chaqueta', label: 'Chaqueta denim', img: '/images/chaqueta.png', color: '#ECE8F5' },
    { id: 'Conjunto', label: 'Conjunto / Blazer', img: '/images/conjunto.png', color: '#F4EBE1' },
  ];
  const fitFeels = [
    { id: 'Cómoda y relajada', label: 'Cómoda y relajada', desc: 'Prendas holgadas.', img: '/images/comodo.png', color: '#EDE7F6' },
    { id: 'Ligera', label: 'Ligera', desc: 'Prendas rectas.', img: '/images/ligera.png', color: '#FCE4EC' },
    { id: 'Estilizada', label: 'Estilizada', desc: 'Prendas entalladas.', img: '/images/estilizada.png', color: '#E8EAF6' },
    { id: 'Definida', label: 'Definida', desc: 'Prendas que se adapten al cuerpo.', img: '/images/definida.png', color: '#FBE9E7' },
    { id: 'Libre', label: 'Libre', desc: 'Prendas amplias o oversize.', img: '/images/libre.png', color: '#E8F5E9' },
  ];
  const colorPalettes = [
    { id: 'Colores neutros', label: 'Colores neutros', img: '/images/neutros.png', colors: ['#F5F5F0', '#D3C5B4', '#999999', '#333333'] },
    { id: 'Colores tierra', label: 'Colores tierra', img: '/images/tierra.png', colors: ['#D7C4B7', '#B58361', '#7A4A32', '#586445'] },
    { id: 'Colores fríos', label: 'Colores fríos', img: '/images/frio.png', colors: ['#D0E1F9', '#9DAAF2', '#4A6984', '#2C3E50'] },
    { id: 'Colores cálidos', label: 'Colores cálidos', img: '/images/calido.png', colors: ['#FAD0C4', '#F8A5C2', '#E77F67', '#CF6A4C'] },
    { id: 'Colores nuevos', label: 'Colores nuevos', img: '/images/nuevos.png', colors: ['#D4A5A5', '#FFD3B6', '#DCEDC8', '#A8E6CF'] },
  ];

  const isMinor = MINOR_STAGES.includes(formData.stage);
  const isMale = formData.gender === 'Masculino';
  const maleLabel = (item) => (isMale ? MALE_LABELS[item.id] ?? item.label : item.label);

  const heightOptions = isMinor
    ? ['Menos de 130 cm', '130 - 150 cm', '150 - 170 cm']
    : ['150 - 160 cm', '160 - 170 cm', '170 - 180 cm'];

  const visibleFits = isMinor
    ? fitFeels.filter((fit) => !['Estilizada', 'Definida'].includes(fit.id))
    : fitFeels;

  const visibleGarments = formData.gender === 'Masculino'
    ? garments.filter((item) => !FEMININE_ONLY.includes(item.id))
    : garments;

  const available = (field, id) => isAvailable(formData, field, id);

  const optionIds = (stepNumber) =>
    ({ 2: occasions, 3: visibleGarments, 4: visibleFits, 5: colorPalettes }[stepNumber] ?? []).map((item) => item.id);

  const selectGender = (gender) => {
    setFormData({
      ...formData,
      gender,
      garmentType: gender === 'Masculino' && FEMININE_ONLY.includes(formData.garmentType)
        ? 'Top / Camiseta'
        : formData.garmentType,
    });
  };

  const selectStage = (stage) => {
    const minor = MINOR_STAGES.includes(stage);
    setFormData({
      ...formData,
      stage,
      height: minor ? '130 - 150 cm' : '160 - 170 cm',
      fitFeel: minor && ['Estilizada', 'Definida'].includes(formData.fitFeel)
        ? 'Ligera'
        : formData.fitFeel,
    });
  };

  const lookImages = currentLook?.images;
  const imagePanels = lookImages?.flatLay
    ? [{ key: 'flatLay', label: 'Prendas' }]
    : [
        { key: 'front', label: 'Frente' },
        { key: 'side', label: 'Lado' },
        { key: 'back', label: 'Espalda' },
      ];
      
  if(step === 0) {
    const features = [
      { Icon: Shirt, text: 'Looks con imágenes\nde referencia' },
      { Icon: Ruler, text: 'Recomendación\nde talla y calce' },
      { Icon: Sparkles, text: 'Looks según\ntu estilo y ocasión' },
    ];

    return (
      <div className="relative min-h-screen bg-[#FCF0EC] overflow-hidden flex items-center justify-center p-6">
      {/* Manchas de las esquinas */}
      <div className="absolute -top-16 -left-16 md:-top-40 md:-left-40 w-44 h-44 md:w-[30rem] md:h-[30rem] rounded-full bg-[#DCCFE6]" />
      <div className="absolute -top-16 -right-16 md:-top-40 md:-right-40 w-44 h-44 md:w-[30rem] md:h-[30rem] rounded-full bg-[#F2C6BB]" />
      <div className="absolute -bottom-16 -left-16 md:-bottom-40 md:-left-40 w-44 h-44 md:w-[30rem] md:h-[30rem] rounded-full bg-[#D2D3C4]" />
      <div className="absolute -bottom-16 -right-16 md:-bottom-40 md:-right-40 w-44 h-44 md:w-[30rem] md:h-[30rem] rounded-full bg-[#C7D2E3]" />

      <div className="relative z-10 flex flex-col items-center text-center w-full max-w-3xl animate-fade-in">
        <h1 className="text-6xl md:text-8xl font-extrabold italic tracking-tight text-[#4A2F4F] leading-none">
         Forma<span className="text-[#B07A8C]">+</span>
        </h1>
        <p className="mt-3 text-2xl md:text-3xl font-bold italic text-[#4A2F4F]">
          <span className="font-normal not-italic text-xl mr-2">×</span>Dinámica
        </p>
        <p className="mt-3 text-base md:text-xl text-[#4A2F4F]/80">
          Tu asesor de estilo y calce personalizado
        </p>
        <div
          className="mt-6 w-full max-w-xl bg-[#FCF0EC]"
          style={{
            WebkitMaskImage: 'radial-gradient(ellipse 50% 50% at 50% 50%, #000 100%, transparent 100%)',
            maskImage: 'radial-gradient(ellipse 50% 50% at 50% 50%, #000 100%, transparent 100%)',
          }}
        >
        <img
          src="/images/ilustracion.jpeg"
          alt="Tres mujeres con distintos looks"
          className="w-full mix-blend-multiply"
        />
      </div>

        <button
          type="button"
          onClick={() => setStep(1)}
          className="mt-6 flex items-center gap-3 bg-[#6F5270] hover:bg-[#5E4360] text-white px-12 py-4 rounded-full text-lg font-medium shadow-md transition"
        >
          Comenzar <ArrowRight className="w-5 h-5" />
        </button>

        <div className="mt-10 grid grid-cols-3 gap-4 md:gap-10 w-full max-w-2xl">
          {features.map(({ Icon, text }, i) => (
            <div
              key={text}
              className={`flex flex-col items-center gap-2 text-[#4A2F4F] ${i > 0 ? 'border-l border-[#4A2F4F]/20' : ''}`}
            >
              <Icon className="w-6 h-6" strokeWidth={1.5} />
              <span className="text-xs md:text-sm whitespace-pre-line leading-tight">{text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
    );
  }
      
  





  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#333] font-sans flex flex-col items-center p-4 md:p-8 relative overflow-hidden">
      <div className="w-full max-w-6xl bg-white/80 backdrop-blur-md rounded-3xl p-6 md:p-10 shadow-sm border border-stone-100 min-h-[600px] flex flex-col justify-between transition-all duration-500 ease-in-out">

        {/* Encabezado y navegación de puntos */}
        <div className="flex items-center justify-between mb-6">
          {step >= 1 && step <= totalSteps ? (
            <button onClick={handleBack} className="flex items-center gap-2 text-stone-500 hover:text-stone-800 transition text-sm font-medium">
              <ArrowLeft className="w-4 h-4" /> Volver
            </button>
          ) : <div className="w-20" />}

          {step <= totalSteps && (
            <div className="flex items-center gap-3 mx-auto">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className={`w-3 h-3 rounded-full transition-all duration-300 ${step === i ? 'bg-[#8c7bb6] scale-125' : step > i ? 'bg-[#8c7bb6]/40' : 'bg-stone-200'}`} />
              ))}
            </div>
          )}

          {step === 7 && (
            <div className="flex items-center gap-2 ml-auto text-xs font-semibold bg-[#F5E6E6] text-[#7A5B5B] px-4 py-2 rounded-full border border-[#EACDCD]">
              <Sparkles className="w-3.5 h-3.5" /> Tu look personalizado
            </div>
          )}
        </div>

        {/* PASO 1: ETAPA DE VIDA */}
        {step === 1 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center my-4 animate-fade-in">
            <h1 className="text-2xl md:text-3xl font-bold text-stone-800 mb-2">¿En qué etapa de vida estás?</h1>
            <p className="text-stone-500 text-sm mb-8">Esto nos ayuda a ofrecerte recomendaciones más precisas y personalizadas.</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-2xl mb-8">
              {stages.map((item) => (
                <div
                  key={item.id}
                  onClick={() => selectStage(item.id)}
                  className={`cursor-pointer rounded-2xl p-6 flex flex-col items-center gap-4 transition border ${
                    formData.stage === item.id
                      ? 'border-[#8c7bb6] bg-purple-50/40 shadow-sm'
                      : 'border-stone-100 bg-stone-50/50 hover:bg-stone-100/60'
                  }`}
                >
                  <div className="w-20 h-20 rounded-full bg-purple-100/50 flex items-center justify-center overflow-hidden">
                    <img
                      src={item.img}
                      alt={item.label}
                      className="w-full h-full object-cover object-center scale-105"
                    />
                  </div>

                  <span className="font-semibold text-stone-700 text-sm">{item.label}</span>
                  <input
                    type="radio"
                    name="stage"
                    checked={formData.stage === item.id}
                    onChange={() => {}}
                    className="accent-[#8c7bb6] w-4 h-4 cursor-pointer"
                  />
                </div>
              ))}
            </div>

            <p className="text-stone-500 text-sm mb-3">¿Qué estilo de prendas prefieres?</p>
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {['Femenino', 'Masculino', 'Sin preferencia'].map((gender) => (
                <button
                  key={gender}
                  type="button"
                  onClick={() => selectGender(gender)}
                  className={`px-4 py-2 rounded-full border text-sm ${
                    formData.gender === gender
                      ? 'border-[#8c7bb6] bg-purple-50 text-[#6b5a96]'
                      : 'border-stone-200 text-stone-600'
                  }`}
                >
                  {gender}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PASO 2: OCASIÓN */}
        {step === 2 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center my-4 animate-fade-in">
            <h1 className="text-2xl md:text-3xl font-bold text-stone-800 mb-2">¿Para qué ocasión necesitas tu look?</h1>
            <p className="text-stone-500 text-sm mb-8">Esto nos ayuda a recomendarte prendas y estilos más adecuados a tu día a día.</p>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 w-full mb-8">
              {occasions.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setFormData({ ...formData, occasion: item.id })}
                  className={`${available('occasion', item.id) ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed pointer-events-none'} rounded-2xl p-4 flex flex-col items-center gap-3 transition border ${
                    formData.occasion === item.id
                      ? 'border-[#8c7bb6] bg-purple-50/40 shadow-sm'
                      : 'border-stone-100 bg-stone-50/50 hover:bg-stone-100/60'
                  }`}
                >
                  <div className="w-full h-40 rounded-xl overflow-hidden mb-3">
                    <StyleImage male={isMale} src={item.img} alt={item.label} className="w-full h-full object-cover" />
                  </div>
                  <span className="font-medium text-stone-700 text-xs whitespace-pre-line leading-tight">{item.label}</span>
                  {!available('occasion', item.id) && (
                    <span className="text-[10px] text-stone-400">No disponible con lo que elegiste</span>
                  )}
                  <input
                    type="radio"
                    name="occasion"
                    checked={formData.occasion === item.id}
                    onChange={() => {}}
                    className="accent-[#8c7bb6] w-4 h-4 cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PASO 3: TIPO DE PRENDA */}
        {step === 3 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center my-4 animate-fade-in">
            <h1 className="text-2xl md:text-3xl font-bold text-stone-800 mb-2">¿Qué tipo de prenda te gustaría ver?</h1>
            <p className="text-stone-500 text-sm mb-8">Selecciona la opción que más te interese.</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mb-8">
              {visibleGarments.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setFormData({ ...formData, garmentType: item.id })}
                  className={`${available('garmentType', item.id) ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed pointer-events-none'} rounded-2xl p-4 flex flex-col items-center gap-3 transition border ${
                    formData.garmentType === item.id
                      ? 'border-[#8c7bb6] bg-purple-50/40 shadow-sm'
                      : 'border-stone-100 bg-stone-50/50 hover:bg-stone-100/60'
                  }`}
                >
                  <div
                    className="w-full h-28 rounded-xl flex items-center justify-center p-2 overflow-hidden"
                    style={{ backgroundColor: item.color }}
                  >
                    <StyleImage male={isMale} src={item.img} alt={item.label} className="w-full h-full object-contain" />
                  </div>

                  <span className="font-medium text-stone-700 text-xs">{maleLabel(item)}</span>
                  {!available('garmentType', item.id) && (
                    <span className="text-[10px] text-stone-400">No disponible con lo que elegiste</span>
                  )}
                  <input
                    type="radio"
                    name="garmentType"
                    checked={formData.garmentType === item.id}
                    onChange={() => {}}
                    className="accent-[#8c7bb6] w-4 h-4 cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PASO 4: CÓMO SENTIRTE */}
        {step === 4 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center my-4 animate-fade-in">
            <h1 className="text-2xl md:text-3xl font-bold text-stone-800 mb-2">¿Cómo te gustaría sentirte con este look?</h1>
            <p className="text-stone-500 text-sm mb-8">Selecciona la opción que mejor te represente.</p>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 w-full mb-8">
              {visibleFits.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setFormData({ ...formData, fitFeel: item.id })}
                  className={`${available('fitFeel', item.id) ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed pointer-events-none'} rounded-2xl p-4 flex flex-col items-center justify-between transition border ${
                    formData.fitFeel === item.id
                      ? 'border-[#8c7bb6] bg-purple-50/40 shadow-sm'
                      : 'border-stone-100 bg-stone-50/50 hover:bg-stone-100/60'
                  }`}
                >
                  <div className="w-full h-28 rounded-xl flex items-center justify-center p-2 overflow-hidden" style={{ backgroundColor: item.color }}>
                    <StyleImage male={isMale} src={item.img} alt={item.label} className="w-full h-full object-contain" />
                  </div>
                  <div className="my-2">
                    <h3 className="font-semibold text-stone-800 text-xs">{maleLabel(item)}</h3>
                    <p className="text-[11px] text-stone-400 mt-1">{item.desc}</p>
                  </div>
                  {!available('fitFeel', item.id) && (
                    <span className="text-[10px] text-stone-400">No disponible con lo que elegiste</span>
                  )}
                  <input
                    type="radio"
                    name="fitFeel"
                    checked={formData.fitFeel === item.id}
                    onChange={() => {}}
                    className="accent-[#8c7bb6] w-4 h-4 cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PASO 5: COLORES */}
        {step === 5 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center my-4 animate-fade-in">
            <h1 className="text-2xl md:text-3xl font-bold text-stone-800 mb-2">¿Qué colores te gustaría utilizar?</h1>
            <p className="text-stone-500 text-sm mb-8">Selecciona la paleta que más te represente.</p>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 w-full mb-8">
              {colorPalettes.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setFormData({ ...formData, colorPalette: item.id })}
                  className={`${available('colorPalette', item.id) ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed pointer-events-none'} rounded-2xl p-4 flex flex-col items-center gap-3 transition border ${
                    formData.colorPalette === item.id
                      ? 'border-[#8c7bb6] bg-purple-50/40 shadow-sm'
                      : 'border-stone-100 bg-stone-50/50 hover:bg-stone-100/60'
                  }`}
                >
                  <span className="font-semibold text-stone-700 text-xs">{item.label}</span>
                  <div className="w-30 h-30 rounded-2xl flex items-center justify-center overflow-hidden p-1 shadow-sm bg-white">
                    <img src={item.img} alt={item.label} className="w-full h-full object-contain" />
                  </div>
                  {!available('colorPalette', item.id) && (
                    <span className="text-[10px] text-stone-400">No disponible con lo que elegiste</span>
                  )}
                  <input
                    type="radio"
                    name="colorPalette"
                    checked={formData.colorPalette === item.id}
                    onChange={() => {}}
                    className="accent-[#8c7bb6] w-4 h-4 cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PASO 6: MEDIDAS APROXIMADAS */}
        {step === 6 && (
          <div className="flex-1 flex flex-col items-center text-center my-2 animate-fade-in">
            <h1 className="text-2xl md:text-3xl font-bold text-stone-800 mb-2">¿Cuáles son tus medidas aproximadas?</h1>
            <p className="text-stone-500 text-sm mb-6">Esto nos ayuda a recomendarte tallas y un calce más preciso.</p>

            <div className="flex flex-col gap-6 w-full max-w-4xl mb-6">

              {/* TARJETA SUPERIOR: ESTATURA + SILUETA */}
              <div className="bg-[#FAF7F2] p-6 md:p-8 rounded-3xl border border-[#F0EBE1] flex flex-col md:flex-row items-center gap-8 shadow-sm">
                {!isMinor && (
                  <div className="w-full md:w-1/3 flex justify-center">
                    <div className="w-48 h-72 bg-[#FAF5F0] rounded-2xl p-2 flex items-center justify-center overflow-hidden">
                      <StyleImage
                        male={isMale}
                        src="/images/estatura.png"
                        alt="Silueta estatura"
                        className="w-full h-full object-contain mix-blend-multiply"
                      />
                    </div>
                  </div>
                )}
                <div className={`w-full text-left ${isMinor ? '' : 'md:w-2/3'}`}>
                  <h3 className="font-bold text-stone-800 text-lg mb-1">Estatura</h3>
                  <p className="text-sm text-stone-400 mb-5">Selecciona el rango que mejor te represente.</p>
                  <div className="space-y-3">
                    {heightOptions.map((h) => (
                      <label
                        key={h}
                        onClick={() => setFormData({ ...formData, height: h })}
                        className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer text-sm font-medium transition ${
                          formData.height === h ? 'border-[#8c7bb6] bg-purple-50/50 text-[#6b5a96]' : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                        }`}
                      >
                        <span>{h}</span>
                        <input type="radio" name="height" checked={formData.height === h} onChange={() => {}} className="accent-[#8c7bb6] w-4 h-4" />
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* TARJETA INFERIOR: CONTORNOS APROXIMADOS */}
              {!isMinor && (
                <div className="bg-[#FAF7F2] p-6 md:p-8 rounded-3xl border border-[#F0EBE1] shadow-sm text-left">
                  <h3 className="font-bold text-stone-800 text-lg mb-1">Contornos aproximados</h3>
                  <p className="text-sm text-stone-400 mb-6">Ingresa tus medidas en centímetros (cm).</p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* BUSTO */}
                    <div className="bg-white pt-6 pb-4 px-4 rounded-2xl border border-stone-200/60 flex flex-col items-center text-center">
                      <div className="w-40 h-40 rounded-xl bg-[#FAF5F0] mb-4 flex items-center justify-center p-2">
                        <StyleImage male={isMale} src="/images/busto.png" alt={isMale ? 'Pecho' : 'Busto'} className="w-full h-full object-contain mix-blend-multiply" />
                      </div>
                      <span className="font-bold text-sm text-stone-800">{isMale ? 'Pecho' : 'Busto'}</span>
                      <span className="text-[10px] text-stone-400 mb-4">{isMale ? 'Parte más ancha del pecho' : 'Parte más prominente'}</span>
                      <input
                        type="number"
                        value={formData.bust}
                        onChange={(e) => setFormData({ ...formData, bust: e.target.value })}
                        className="w-full p-3 rounded-xl border border-stone-200 text-center text-sm font-medium focus:outline-none focus:border-[#8c7bb6] bg-stone-50"
                        placeholder="cm"
                      />
                    </div>

                    {/* CINTURA */}
                    <div className="bg-white pt-6 pb-4 px-4 rounded-2xl border border-stone-200/60 flex flex-col items-center text-center">
                      <div className="w-40 h-40 rounded-xl bg-[#FAF5F0] mb-4 flex items-center justify-center p-2">
                        <StyleImage male={isMale} src="/images/cintura.png" alt="Cintura" className="w-full h-full object-contain mix-blend-multiply" />
                      </div>
                      <span className="font-bold text-sm text-stone-800">Cintura</span>
                      <span className="text-[10px] text-stone-400 mb-4">Parte más estrecha</span>
                      <input
                        type="number"
                        value={formData.waist}
                        onChange={(e) => setFormData({ ...formData, waist: e.target.value })}
                        className="w-full p-3 rounded-xl border border-stone-200 text-center text-sm font-medium focus:outline-none focus:border-[#8c7bb6] bg-stone-50"
                        placeholder="cm"
                      />
                    </div>

                    {/* CADERA */}
                    <div className="bg-white pt-6 pb-4 px-4 rounded-2xl border border-stone-200/60 flex flex-col items-center text-center">
                      <div className="w-40 h-40 rounded-xl bg-[#FAF5F0] mb-4 flex items-center justify-center p-2">
                        <StyleImage male={isMale} src="/images/cadera.png" alt="Cadera" className="w-full h-full object-contain mix-blend-multiply" />
                      </div>
                      <span className="font-bold text-sm text-stone-800">Cadera</span>
                      <span className="text-[10px] text-stone-400 mb-4">Zona más ancha</span>
                      <input
                        type="number"
                        value={formData.hips}
                        onChange={(e) => setFormData({ ...formData, hips: e.target.value })}
                        className="w-full p-3 rounded-xl border border-stone-200 text-center text-sm font-medium focus:outline-none focus:border-[#8c7bb6] bg-stone-50"
                        placeholder="cm"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {step < 7 && (
          <div className="w-full mt-auto pt-6 border-t border-stone-100 flex justify-end">
            <button
              onClick={handleNext}
              className="bg-[#8c7bb6] text-white px-8 py-3 rounded-full font-bold text-sm shadow-md transition hover:bg-[#7a6aa0] flex items-center gap-2"
            >
              {step === 6 ? (
                <>Ver resultado <Sparkles className="w-4 h-4" /></>
              ) : (
                <>Continuar <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        )}

        {/* PASO 7: RESULTADO */}
        {step === 7 && (
          <div className="flex-1 flex flex-col my-2 animate-fade-in w-full">
            {isGenerating ? (
              <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="w-12 h-12 text-[#8c7bb6] animate-spin mb-4" />
                <h2 className="text-xl font-bold text-stone-700">Diseñando tu look ideal...</h2>
                <p className="text-stone-500 mt-2">Analizando tus preferencias de estilo.</p>
              </div>
            ) : error ? (
              <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] text-center">
                <h2 className="text-xl font-bold text-stone-700">No pudimos crear tu look</h2>
                <p className="text-stone-500 mt-2 mb-6">{error}</p>
                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="px-6 py-3 rounded-full border border-stone-300 text-sm">
                    Ajustar preferencias
                  </button>
                  <button onClick={() => generateOutfit(variant)} className="px-6 py-3 rounded-full bg-[#8c7bb6] text-white text-sm">
                    Reintentar
                  </button>
                </div>
              </div>
            ) : aiRecommendation && currentLook && (
              <>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 border-b border-stone-200 pb-6">
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-stone-800 tracking-tight">Tu look <span className="text-[#8c7bb6]">personalizado</span></h1>
                    <p className="text-stone-500 mt-2 text-sm max-w-lg">{aiRecommendation.description}</p>
                    {currentLook.note && <p className="text-xs text-[#7A5B5B] mt-2">{currentLook.note}</p>}
                    <p className="text-[11px] text-stone-400 mt-2">
                      Imágenes pregeneradas. No se adaptan a las medidas.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 mt-4 md:mt-0 flex-wrap">
                    <span className="text-xs bg-[#FAF5F0] text-stone-600 px-4 py-2 rounded-xl flex items-center gap-2 border border-stone-200"><span className="text-lg">📅</span> {formData.occasion}</span>
                    <div className="flex items-center bg-[#FAF5F0] px-4 py-2 rounded-xl border border-stone-200 gap-2">
                      <span className="text-xs text-stone-600 mr-1">Tonos:</span>
                      {currentLook.palette.slice(0, 4).map((color, i) => (
                        <div key={i} className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                  {/* IMÁGENES Y PROPORCIONES (IZQUIERDA) */}
                  <div className="lg:col-span-7 h-[500px]">
                    {lookImages ? (
                      <div className={`h-full grid gap-3 ${lookImages.flatLay ? 'grid-cols-1' : 'grid-cols-3'}`}>
                        {imagePanels.map(({ key, label }) => (
                          <div key={key} className="bg-[#EBE5E0] rounded-3xl overflow-hidden relative shadow-sm">
                            <img
                              src={lookImages[key]}
                              alt={label}
                              className={`w-full h-full ${key === 'flatLay' ? 'object-contain' : 'object-cover'}`}
                            />
                            <div className="absolute bottom-3 left-0 right-0 text-center">
                              <span className="bg-white/80 px-3 py-1 rounded-full text-[10px] font-semibold text-stone-700 uppercase tracking-widest">
                                {label}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-full grid grid-cols-2 grid-rows-2 gap-3">
                        {currentLook.garments.map((garment, index) => (
                          <div
                            key={garment.id}
                            className={`bg-[#F3EEE9] rounded-3xl p-4 min-h-0 ${index === 0 ? 'row-span-2' : ''}`}
                          >
                            <GarmentImage src={garment.img} color={garment.color} alt={garment.name} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* PRENDAS Y PALETA (DERECHA) */}
                  <div className="lg:col-span-5 flex flex-col space-y-6">
                    <div>
                      <h3 className="font-bold text-stone-800 text-lg mb-4">Prendas del look</h3>
                      <div className="flex flex-col gap-4">
                        {currentLook.garments.map((item, idx) => (
                          <div key={item.id} className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm flex items-center gap-4">
                            <div className="w-20 h-24 rounded-xl overflow-hidden bg-[#F3EEE9]">
                              <GarmentImage src={item.img} color={item.color} alt={item.name} />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-bold text-stone-800 text-sm">{item.name}</h4>
                              <span className="text-[11px] text-stone-400 block mt-1">
                                {aiRecommendation.garments[idx]?.desc}
                              </span>
                              <div className="mt-3 flex items-center gap-2">
                                <span className="text-[11px] text-stone-500">Talla recomendada</span>
                                <span className="bg-[#816868] text-white font-bold px-3 py-1 rounded-lg text-xs">
                                  {aiRecommendation.garments[idx]?.recommendedSize ?? '—'}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleFavorite(item.name)}
                              aria-label={favorites.includes(item.name) ? `Quitar ${item.name} de favoritos` : `Agregar ${item.name} a favoritos`}
                              className="self-start"
                            >
                              <Heart
                                className={`w-5 h-5 transition ${favorites.includes(item.name) ? 'text-red-400' : 'text-stone-300 hover:text-red-400'}`}
                                fill={favorites.includes(item.name) ? 'currentColor' : 'none'}
                              />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-stone-800 text-lg mb-3">Paleta del look</h3>
                      <div className="flex gap-3">
                        {currentLook.palette.map((color, i) => (
                          <div key={i} className="w-12 h-12 rounded-full shadow-sm" style={{ backgroundColor: color }} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botones inferiores */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-stone-200">
                  <button onClick={() => setStep(1)} className="flex items-center gap-2 px-6 py-3 rounded-full border border-stone-300 text-stone-600 hover:bg-stone-50 transition text-sm font-medium">
                    <SlidersHorizontal className="w-4 h-4" /> Ajustar preferencias
                  </button>
                  <button
                    onClick={showNextLook}
                    className="flex items-center gap-2 px-8 py-3 rounded-full bg-[#816868] text-white hover:bg-[#6A5454] transition text-sm font-medium shadow-md"
                  >
                    Generar otra propuesta <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}