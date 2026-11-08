import { describe, expect, it } from 'vitest';
import { MODO_TODAS, modoUnidad, rutaCuestionario, urlMaterial } from '@/utils/rutas';

describe('rutas', () => {
  it('arma la ruta del cuestionario por unidad y la del modo mezclado', () => {
    expect(rutaCuestionario(modoUnidad(5))).toBe('/quiz/unidad-5/');
    expect(rutaCuestionario(MODO_TODAS)).toBe('/quiz/todas/');
  });

  it('arma la URL del material apuntando a la sección', () => {
    const url = urlMaterial({
      titulo: 'Subconsultas escalares',
      ruta: 'unidad-05-subconsultas/subconsultas.html',
      seccion: 'escalares',
    });
    expect(url).toBe('/material/unidad-05-subconsultas/subconsultas.html#escalares');
  });

  it('arma la URL de un PDF apuntando a la página', () => {
    const url = urlMaterial({ titulo: 'Guía', ruta: 'unidad-01-introduccion/guia.pdf', seccion: 'pagina-3' });
    expect(url).toBe('/material/unidad-01-introduccion/guia.pdf#page=3');
  });
});
