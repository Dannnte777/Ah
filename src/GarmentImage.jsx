export default function GarmentImage({ src, color, alt }) {
  if (!color) {
    return <img src={src} alt={alt} className="w-full h-full object-cover" />;
  }

  const mask = {
    WebkitMaskImage: `url("${src}")`,
    maskImage: `url("${src}")`,
    WebkitMaskSize: 'contain',
    maskSize: 'contain',
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
    WebkitMaskPosition: 'center',
    maskPosition: 'center',
  };

  return (
    <div className="relative isolate w-full h-full">
      <img src={src} alt={alt} className="w-full h-full object-contain" />
      <div className="absolute inset-0 mix-blend-multiply" style={{ backgroundColor: color, ...mask }} />
    </div>
  );
}