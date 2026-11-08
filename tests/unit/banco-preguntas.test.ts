import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { bancoPreguntasSchema } from '@/lib/quiz/esquemas';
import { esPdf, numeroPagina } from '@/utils/rutas';

const RAIZ = resolve(import.meta.dirname, '../..');
const CARPETA_PREGUNTAS = join(RAIZ, 'src/content/preguntas');
const CARPETA_MATERIAL = join(RAIZ, 'materialEstudio');

const archivos = readdirSync(CARPETA_PREGUNTAS).filter((archivo) => archivo.endsWith('.json'));

const bancos = archivos.map((archivo) => ({
  archivo,
  banco: bancoPreguntasSchema.parse(JSON.parse(readFileSync(join(CARPETA_PREGUNTAS, archivo), 'utf-8'))),
}));

describe('banco de preguntas (src/content/preguntas)', () => {
  it('contiene al menos un archivo JSON', () => {
    expect(archivos.length).toBeGreaterThan(0);
  });

  it('usa identificadores de pregunta únicos en todo el banco', () => {
    const ids = bancos.flatMap(({ banco }) => banco.preguntas.map((p) => p.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('no repite números de unidad entre archivos', () => {
    const unidades = bancos.map(({ banco }) => banco.unidad);
    expect(new Set(unidades).size).toBe(unidades.length);
  });

  it.each(bancos)('$archivo: referencia material y secciones existentes', ({ banco }) => {
    for (const pregunta of banco.preguntas) {
      for (const material of pregunta.material) {
        const archivo = join(CARPETA_MATERIAL, material.ruta);
        expect(existsSync(archivo), material.ruta).toBe(true);

        // Los PDF se referencian por página; los HTML, por un id de sección.
        if (esPdf(material.ruta)) {
          expect(numeroPagina(material.seccion), `${material.ruta}#${material.seccion}`).not.toBeNull();
          continue;
        }
        const html = readFileSync(archivo, 'utf-8');
        expect(html, `${material.ruta}#${material.seccion}`).toContain(`id="${material.seccion}"`);
      }
    }
  });

  it.each(bancos)('$archivo: reparte las respuestas correctas entre las cuatro opciones', ({ banco }) => {
    // Evita bancos donde la respuesta correcta sea casi siempre la misma letra.
    const letras = new Set(banco.preguntas.map((p) => p.respuestaCorrecta));
    expect(letras.size).toBe(Math.min(4, banco.preguntas.length));
  });
});
