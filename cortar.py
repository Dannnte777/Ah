#!/usr/bin/env python3
"""Corta una imagen en cuadrícula y guarda cada celda como
public/demo/looks/<id>/<nombre>.jpeg

Ejecutar desde la raíz del proyecto (~/Ah/fashion-advisor).

Uso:
  python3 cortar.py IMAGEN FILAS COLUMNAS ID_FILA_1 [ID_FILA_2 ...] --nombres n1,n2,n3

Ejemplos:
  python3 cortar.py originales/adulto-nuevos-vistas.jpeg 1 3 adulto-nuevos --nombres frente,lado,espalda
  python3 cortar.py originales/menores1-outfits.jpeg 2 1 adolescente-neutros adolescente-calidos --nombres outfit
  python3 cortar.py originales/h-ocasiones.png 2 3 hombre --destino public/images --nombres deporte,oficina,informal,vacaciones,formal,-

Cada fila es un look (un id por fila) y cada columna es un archivo (un nombre por columna).
--margen recorta un porcentaje en cada borde de la celda para quitar las líneas separadoras.
"""
import argparse
import sys
from pathlib import Path

from PIL import Image, ImageOps

parser = argparse.ArgumentParser(description="Corta una cuadrícula de Gemini en archivos separados.")
parser.add_argument("imagen", help="Imagen descargada de Gemini")
parser.add_argument("filas", type=int)
parser.add_argument("columnas", type=int)
parser.add_argument("ids", nargs="+", help="Un id de look por fila, de arriba hacia abajo")
parser.add_argument("--nombres", required=True, help="Nombres de archivo por columna, separados por comas")
parser.add_argument("--margen", type=float, default=2.0, help="Porcentaje recortado en cada borde (por defecto 2)")
parser.add_argument("--destino", default="public/demo/looks")
parser.add_argument("--columnas-pct", help="Bordes de las columnas en %% del ancho, si no son iguales. Ej: 0,23,42,60,80,100")
args = parser.parse_args()

nombres = [n.strip() for n in args.nombres.split(",") if n.strip()]

# Modo 1: un id por fila y un nombre por columna.
# Modo 2: un solo id y un nombre por celda (de izquierda a derecha, fila por fila). Usa "-" para descartar una celda.
por_celda = len(args.ids) == 1 and args.filas > 1 and len(nombres) == args.filas * args.columnas
if not por_celda:
    if len(args.ids) != args.filas:
        sys.exit(f"Error: indicaste {args.filas} filas pero {len(args.ids)} ids.")
    if len(nombres) != args.columnas:
        sys.exit(f"Error: indicaste {args.columnas} columnas pero {len(nombres)} nombres.")
if not Path("public").is_dir():
    sys.exit("Error: no encuentro la carpeta public/. Ejecuta el script desde la raíz del proyecto.")

img = ImageOps.exif_transpose(Image.open(args.imagen)).convert("RGB")
ancho, alto = img.size
celda_ancho, celda_alto = ancho / args.columnas, alto / args.filas
if args.columnas_pct:
    bordes = [float(x) * ancho / 100 for x in args.columnas_pct.split(",")]
    if len(bordes) != args.columnas + 1:
        sys.exit(f"Error: --columnas-pct necesita {args.columnas + 1} valores.")
else:
    bordes = [c * celda_ancho for c in range(args.columnas + 1)]
my = celda_alto * args.margen / 100

print(f"Imagen {ancho}x{alto} -> celdas de {round(celda_ancho)}x{round(celda_alto)}")

for fila in range(args.filas):
    look_id = args.ids[0] if por_celda else args.ids[fila]
    carpeta = Path(args.destino) / look_id
    carpeta.mkdir(parents=True, exist_ok=True)
    for columna in range(args.columnas):
        nombre = nombres[fila * args.columnas + columna] if por_celda else nombres[columna]
        if nombre == "-":
            continue
        x0, x1, y0 = bordes[columna], bordes[columna + 1], fila * celda_alto
        mx = (x1 - x0) * args.margen / 100
        caja = (round(x0 + mx), round(y0 + my), round(x1 - mx), round(y0 + celda_alto - my))
        salida = carpeta / f"{nombre}.jpeg"
        aviso = " (reemplazado)" if salida.exists() else ""
        img.crop(caja).save(salida, "JPEG", quality=92)
        print(f"  {salida}{aviso}")
