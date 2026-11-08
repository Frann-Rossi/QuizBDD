import { expect, test, type Page } from '@playwright/test';

/**
 * El banco real tiene preguntas de cuatro opciones. Para probar el cuestionario con dos, la página
 * se intercepta en el navegador: cada pregunta queda con dos opciones (a correcta, b incorrecta).
 * No se toca el banco.
 */
async function reducirADosOpciones(page: Page) {
  await page.route('**/quiz/unidad-5/', async (ruta) => {
    const respuesta = await ruta.fetch();
    const html = await respuesta.text();
    const nuevo = html.replace(/(<script[^>]*data-preguntas[^>]*>)([\s\S]*?)(<\/script>)/, (_m, a, json, c) => {
      const preguntas = JSON.parse(json);
      const reducidas = preguntas.map((p: { opciones: { id: string }[]; respuestaCorrecta: string }) => {
        const correcta = p.opciones.find((o) => o.id === p.respuestaCorrecta);
        const otra = p.opciones.find((o) => o.id !== p.respuestaCorrecta);
        return { ...p, opciones: [{ ...correcta, id: 'a' }, { ...otra, id: 'b' }], respuestaCorrecta: 'a' };
      });
      return a + JSON.stringify(reducidas).replace(/</g, '\u003c') + c;
    });
    await ruta.fulfill({ response: respuesta, body: nuevo });
  });
}

test.describe('Cuestionario con preguntas de dos opciones', () => {
  test('muestra dos opciones, corrige cada respuesta y avanza', async ({ page }) => {
    await reducirADosOpciones(page);
    await page.goto('/quiz/unidad-5/');

    const raiz = page.locator('[data-cuestionario]');
    const opciones = raiz.locator('button[data-opcion]');
    const retro = raiz.locator('[data-retro]');

    // Primera pregunta: respuesta correcta.
    await expect(opciones).toHaveCount(2);
    await raiz.locator('button[data-opcion="a"]').click();
    await expect(retro).toBeVisible();
    await expect(raiz.locator('[data-retro-titulo]')).toHaveText('¡Correcto!');
    await raiz.locator('[data-siguiente]').click();

    // Segunda pregunta: respuesta incorrecta, la correcta se indica.
    await expect(opciones).toHaveCount(2);
    await raiz.locator('button[data-opcion="b"]').click();
    await expect(raiz.locator('[data-retro-titulo]')).toHaveText('Incorrecto');
    await expect(raiz.locator('[data-retro-cuerpo]')).toContainText('La respuesta correcta es la');
    await raiz.locator('[data-siguiente]').click();

    // Tercera pregunta: otra correcta, y el progreso refleja las tres.
    await expect(opciones).toHaveCount(2);
    await raiz.locator('button[data-opcion="a"]').click();
    await expect(raiz.locator('[data-progreso]')).toHaveText(/Pregunta 3\//);
  });
});
