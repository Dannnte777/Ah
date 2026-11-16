import "dotenv/config";
import express from "express";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(express.json({ limit: "1mb" }));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const TEXT_MODELS = ["gemini-3.1-flash-lite", "gemini-3.5-flash-lite", "gemini-3.8-flash"];
const IMAGE_MODELS = ["gemini-nano-banana-2.1", "gemini-3.1-flash-lite-image"];
const MINOR_STAGES = ["Niño/a", "Adolescente"];

const lookCache = new Map();

// Sensación en masculino cuando el estilo es Masculino
const MALE_FEEL = {
  "Cómoda y relajada": "Cómodo y relajado",
  Ligera: "Ligero",
  Estilizada: "Estilizado",
  Definida: "Definido",
};

// Significado de cada sensación (igual que en la pantalla del paso 4)
const FEEL_MEANING = {
  "Cómoda y relajada": "prendas holgadas",
  Ligera: "prendas rectas",
  Estilizada: "prendas entalladas",
  Definida: "prendas que se adaptan al cuerpo",
  Libre: "prendas amplias u oversize",
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isTemporary = (error) =>
  [429, 500, 503, 504].includes(error?.status) ||
  /429|RESOURCE_EXHAUSTED|quota|503|UNAVAILABLE|high demand|overloaded|timeout/i.test(error?.message ?? "");

async function withRetry(fn, attempts = 2) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      if (!isTemporary(error) || i === attempts - 1) throw error;
      await sleep(1000 * 2 ** i + Math.random() * 500);
    }
  }
}

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("timeout")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Modelo con nombre inexistente o retirado: se prueba el siguiente de la lista
const isMissingModel = (error) =>
  error?.status === 404 || /NOT_FOUND|not found|is not supported/i.test(error?.message ?? "");

async function withFallback(models, fn) {
  let lastError;
  for (const model of models) {
    try {
      return await fn(model);
    } catch (error) {
      lastError = error;
      if (!isTemporary(error) && !isMissingModel(error)) throw error;
      console.warn(`${model} no disponible, probando el siguiente`);
    }
  }
  throw lastError;
}

function sendError(res, error) {
  console.error(error);
  res.status(isTemporary(error) ? 503 : 500).json({
    error: isTemporary(error)
      ? "El servicio de IA está saturado. Intenta nuevamente en unos minutos."
      : "No se pudo completar la solicitud. Revisa la consola del servidor.",
  });
}

app.post("/api/look", async (req, res) => {
  const f = { ...req.body };
  const isMinor = MINOR_STAGES.includes(f.stage);

  if (isMinor) {
    delete f.bust;
    delete f.waist;
    delete f.hips;
  }

  const pieces = Array.isArray(f.pieces) ? f.pieces : [];
  const cacheKey = JSON.stringify(f);

  if (lookCache.has(cacheKey)) {
    return res.json(lookCache.get(cacheKey));
  }

  const feelLabel = f.gender === "Masculino" ? MALE_FEEL[f.fitFeel] ?? f.fitFeel : f.fitFeel;
  const feel = FEEL_MEANING[f.fitFeel] ? `${feelLabel} (${FEEL_MEANING[f.fitFeel]})` : feelLabel;

  const chestLabel = f.gender === "Masculino" ? "Pecho" : "Busto";
  const measures = isMinor ? "" : `\n- ${chestLabel}/Cintura/Cadera: ${f.bust}/${f.waist}/${f.hips} cm`;

  const mismatches = Array.isArray(f.mismatches) ? f.mismatches.map(String).slice(0, 5) : [];
  const missingGarment = mismatches.some((item) => item.startsWith("prenda"));

  let closestRule = "Este look coincide con lo que pidió la persona.";
  if (mismatches.length) {
    closestRule = `IMPORTANTE: este look NO coincide con lo pedido en: ${mismatches.join("; ")}. No afirmes que coincide en esos puntos; destaca en qué sí encaja.`;
    if (missingGarment) {
      closestRule += ` Como el look no incluye la prenda "${f.garmentType}", sugiere brevemente cómo podría sumarla manteniendo la paleta.`;
    }
  } else if (f.closest) {
    closestRule = "IMPORTANTE: este es el look más cercano disponible, no uno exacto. No afirmes que coincide en todo; destaca en qué sí encaja.";
  }

  const sizeRule = isMinor
    ? 'talla infantil o juvenil orientativa según la estatura (por ejemplo "8-10 años" o "14 años"). No uses ni menciones medidas corporales.'
    : "talla de adulto (XS, S, M, L, XL o XXL; en pantalones puede ser número) según la estatura y las medidas.";

  const prompt = `Actúa como asesor de moda. Responde en español.
Las prendas del look ya están elegidas; no las cambies ni agregues otras:
${pieces.map((piece, index) => `${index + 1}. ${piece}`).join("\n")}

Lo que pidió la persona:
- Etapa de vida: ${f.stage}
- Estilo de prendas: ${f.gender}
- Ocasión: ${f.occasion}
- Tipo de prenda principal: ${f.garmentType}
- Sensación: ${feel}
- Estatura: ${f.height}${measures}

Paleta del look: ${f.colorPalette}

${closestRule}

Devuelve solo JSON con esta forma:
{
  "description": "string",
  "garments": [{ "desc": "string", "recommendedSize": "string" }]
}
Reglas:
- "description": máximo 2 frases. Explica por qué este outfit encaja con la ocasión, la sensación y la paleta.
- "garments": exactamente ${pieces.length} elementos, en el mismo orden de la lista.
- "desc": una frase breve sobre cómo usar o combinar esa prenda.
- "recommendedSize": ${sizeRule}`;

  try {
    const look = await withFallback(TEXT_MODELS, async (model) => {
      const start = Date.now();
      const response = await withRetry(
        () =>
          withTimeout(
            ai.models.generateContent({
              model,
              contents: prompt,
              config: { responseMimeType: "application/json" },
            }),
            25000
          ),
        1
      );
      console.log(`${model}: ${Date.now() - start} ms`);

      const parsed = JSON.parse(response.text);
      if (!Array.isArray(parsed.garments) || parsed.garments.length !== pieces.length) {
        throw new Error("Respuesta de IA incompleta");
      }
      return parsed;
    });

    lookCache.set(cacheKey, look);
    res.json(look);
  } catch (error) {
    sendError(res, error);
  }
});

async function generateImage(model, input, previousId) {
  const interaction = await withRetry(() =>
    ai.interactions.create({
      model,
      input,
      ...(previousId && { previous_interaction_id: previousId }),
      response_format: {
        type: "image",
        mime_type: "image/png",
        aspect_ratio: "2:3",
        image_size: "1K",
      },
    })
  );

  const data = interaction.output_image?.data;
  if (!data) throw new Error("La respuesta no incluyó una imagen");

  return { id: interaction.id, src: `data:image/png;base64,${data}` };
}

// Esta ruta no se usa en la demo y requiere facturación
app.post("/api/look-images", async (req, res) => {
  const { look, formData: f } = req.body;
  const clothes = look.garments
    .map((g) => `${g.name} (${g.desc}, color ${g.colorHex})`)
    .join("; ");

  try {
    const images = await withFallback(IMAGE_MODELS, async (model) => {
      // Sin personas ni medidas corporales cuando el usuario es menor de edad
      if (MINOR_STAGES.includes(f.stage)) {
        const flatLay = await generateImage(
          model,
          `Flat-lay product photograph of age-appropriate clothing, with no person or mannequin: ${clothes}. Soft neutral background, even light, no text.`
        );
        return { flatLay: flatLay.src };
      }

      const age = f.stage === "Adulto mayor" ? "older adult" : "adult";
      const front = await generateImage(
        model,
        `Full-body fashion catalog photograph of one ${age} model wearing: ${clothes}. Height ${f.height}; bust ${f.bust} cm, waist ${f.waist} cm, hips ${f.hips} cm. Front view, head to toe visible, plain warm beige studio background, soft light, no text.`
      );
      const side = await generateImage(
        model,
        "Show the same person, outfit, background and lighting from a side profile view. Keep the head and feet visible. Change nothing else.",
        front.id
      );
      const back = await generateImage(
        model,
        "Show the same person, outfit, background and lighting from directly behind. Keep the head and feet visible. Change nothing else.",
        side.id
      );

      return { front: front.src, side: side.src, back: back.src };
    });

    res.json(images);
  } catch (error) {
    sendError(res, error);
  }
});

app.listen(3001, () => console.log("API en http://localhost:3001"));