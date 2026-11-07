/** Página /crear: arma una pregunta desde el formulario y descarga el JSON de su unidad actualizado. */
import {
  agregarPregunta,
  aArchivoJson,
  construirPregunta,
  sugerirId,
  type DatosFormulario,
} from '@/lib/crear/pregunta';
import type { DocumentoMaterial } from '@/services/material';
import type { BancoPreguntas, MaterialReferencia, OpcionId } from '@/types/quiz';
import { urlMaterial } from '@/utils/rutas';

interface DatosPagina {
  bancos: { archivo: string; banco: BancoPreguntas }[];
  documentos: DocumentoMaterial[];
  idsExistentes: string[];
}

const LETRAS: OpcionId[] = ['a', 'b', 'c', 'd'];

function elemento<T extends HTMLElement>(id: string): T {
  const encontrado = document.getElementById(id);
  if (!encontrado) throw new Error(`Falta el elemento "${id}".`);
  return encontrado as T;
}

export function iniciarCrear(): void {
  const datos: DatosPagina = JSON.parse(elemento('datos-crear').textContent ?? '{}');
  const material: MaterialReferencia[] = [];

  const campoUnidad = elemento<HTMLSelectElement>('campo-unidad');
  const campoId = elemento<HTMLInputElement>('campo-id');
  const campoTema = elemento<HTMLInputElement>('campo-tema');
  const campoDocumento = elemento<HTMLSelectElement>('campo-documento');
  const campoSeccion = elemento<HTMLSelectElement>('campo-seccion');
  const campoTituloMaterial = elemento<HTMLInputElement>('campo-titulo-material');
  const listaMaterial = elemento<HTMLUListElement>('lista-material');
  const listaErrores = elemento<HTMLUListElement>('lista-errores');
  const vistaPrevia = elemento<HTMLPreElement>('vista-previa');
  const mensaje = elemento<HTMLDivElement>('mensaje-estado');

  const unidadActual = () => datos.bancos.find((b) => String(b.banco.unidad) === campoUnidad.value);

  function mostrarMensaje(texto: string, tipo: 'ok' | 'error' | 'neutro' = 'neutro') {
    mensaje.textContent = texto;
    mensaje.className = `mt-4 text-sm ${tipo === 'ok' ? 'text-ok' : tipo === 'error' ? 'text-error' : 'text-tenue'}`;
  }

  function mostrarErrores(errores: string[]) {
    listaErrores.replaceChildren(
      ...errores.map((texto) => {
        const li = document.createElement('li');
        li.textContent = `• ${texto}`;
        return li;
      }),
    );
  }

  function leerFormulario(): DatosFormulario {
    const respuesta = document.querySelector<HTMLInputElement>('input[name="respuesta"]:checked');
    return {
      id: campoId.value,
      tema: campoTema.value,
      enunciado: elemento<HTMLTextAreaElement>('campo-enunciado').value,
      opciones: LETRAS.map((letra) => ({
        texto: elemento<HTMLInputElement>(`opcion-${letra}-texto`).value,
        explicacion: elemento<HTMLTextAreaElement>(`opcion-${letra}-explicacion`).value,
      })),
      respuestaCorrecta: (respuesta?.value ?? '') as OpcionId | '',
      explicacion: elemento<HTMLTextAreaElement>('campo-explicacion').value,
      resumen: elemento<HTMLTextAreaElement>('campo-resumen').value,
      material: [...material],
    };
  }

  /** Valida el formulario; devuelve la pregunta o muestra los errores y devuelve null. */
  function prepararPregunta() {
    const id = campoId.value.trim();
    const idsOtros = datos.idsExistentes.filter((existente) => existente !== id);
    const resultado = construirPregunta(leerFormulario(), idsOtros);
    if (resultado.ok) {
      mostrarErrores([]);
      return resultado.pregunta;
    }
    mostrarErrores(resultado.errores);
    mostrarMensaje('Revisá los campos marcados antes de continuar.', 'error');
    return null;
  }

  // ---------- Identificador sugerido ----------

  function actualizarSugerenciaId() {
    const unidad = Number(campoUnidad.value);
    if (campoId.dataset.auto !== 'false') {
      campoId.value = sugerirId(unidad, campoTema.value);
      campoId.dataset.auto = 'true';
    }
  }

  campoTema.addEventListener('input', actualizarSugerenciaId);
  campoUnidad.addEventListener('change', actualizarSugerenciaId);
  campoId.addEventListener('input', () => {
    campoId.dataset.auto = 'false';
  });
  campoId.dataset.auto = 'true';

  // ---------- Material de estudio ----------

  /** Sin documento elegido, el select de secciones queda deshabilitado y sin opciones reales. */
  function cargarSecciones() {
    const documento = datos.documentos.find((doc) => doc.ruta === campoDocumento.value);
    const secciones = documento?.secciones ?? [];
    campoSeccion.replaceChildren(
      new Option(documento ? '— Elegí una sección —' : '— Primero elegí un documento —', ''),
      ...secciones.map((seccion) => new Option(`${seccion.titulo} (#${seccion.id})`, seccion.id)),
    );
    campoSeccion.disabled = !documento;
    campoTituloMaterial.value = '';
  }

  campoDocumento.addEventListener('change', cargarSecciones);
  campoSeccion.addEventListener('change', () => {
    const seccion = datos.documentos
      .find((doc) => doc.ruta === campoDocumento.value)
      ?.secciones.find((s) => s.id === campoSeccion.value);
    campoTituloMaterial.value = seccion?.titulo ?? '';
  });

  function renderizarMaterial() {
    listaMaterial.replaceChildren(
      ...material.map((item, indice) => {
        const li = document.createElement('li');
        li.className = 'flex flex-wrap items-center gap-2 border-[3px] border-borde bg-panel-2 px-3 py-2 text-sm';

        const enlace = document.createElement('a');
        enlace.href = urlMaterial(item);
        enlace.target = '_blank';
        enlace.rel = 'noopener';
        enlace.className = 'font-bold text-primario underline underline-offset-4 break-all';
        enlace.textContent = item.titulo;

        const ruta = document.createElement('code');
        ruta.className = 'text-xs text-tenue break-all';
        ruta.textContent = urlMaterial(item);

        const quitar = document.createElement('button');
        quitar.type = 'button';
        quitar.className = 'ml-auto font-pixel text-base uppercase text-error hover:underline';
        quitar.textContent = 'Quitar';
        quitar.addEventListener('click', () => {
          material.splice(indice, 1);
          renderizarMaterial();
        });

        li.append(enlace, ruta, quitar);
        return li;
      }),
    );
  }

  elemento('boton-agregar-material').addEventListener('click', () => {
    const titulo = campoTituloMaterial.value.trim();
    const seccion = campoSeccion.value;
    const ruta = campoDocumento.value;
    if (!ruta) {
      mostrarMensaje('Primero elegí un documento.', 'error');
      return;
    }
    if (!seccion) {
      mostrarMensaje('Elegí la sección del documento.', 'error');
      return;
    }
    if (!titulo) {
      mostrarMensaje('Escribí el nombre que verá quien estudie.', 'error');
      return;
    }
    if (material.some((item) => item.ruta === ruta && item.seccion === seccion)) {
      mostrarMensaje('Esa sección ya está agregada.', 'error');
      return;
    }
    material.push({ titulo, ruta, seccion });
    renderizarMaterial();
    mostrarMensaje('Material agregado.', 'ok');
  });

  // ---------- Vista previa, descarga y copia ----------

  elemento('boton-vista-previa').addEventListener('click', () => {
    const pregunta = prepararPregunta();
    if (!pregunta) {
      vistaPrevia.classList.add('hidden');
      return;
    }
    vistaPrevia.textContent = JSON.stringify(pregunta, null, 2);
    vistaPrevia.classList.remove('hidden');
    mostrarMensaje('La pregunta es válida. Revisá la vista previa y descargá el archivo.', 'ok');
  });

  elemento('boton-descargar').addEventListener('click', () => {
    const pregunta = prepararPregunta();
    const origen = unidadActual();
    if (!pregunta || !origen) return;

    const actualizado = agregarPregunta(origen.banco, pregunta);
    const blob = new Blob([aArchivoJson(actualizado)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = origen.archivo;
    enlace.click();
    URL.revokeObjectURL(url);

    mostrarMensaje(
      `Descargado ${origen.archivo} con la pregunta agregada. Reemplazá el archivo de la misma carpeta en src/content/preguntas/.`,
      'ok',
    );
  });

  elemento('boton-copiar').addEventListener('click', async () => {
    const pregunta = prepararPregunta();
    if (!pregunta) return;
    const texto = JSON.stringify(pregunta, null, 2);
    try {
      await navigator.clipboard.writeText(texto);
      mostrarMensaje('Pregunta copiada al portapapeles.', 'ok');
    } catch {
      vistaPrevia.textContent = texto;
      vistaPrevia.classList.remove('hidden');
      mostrarMensaje('No se pudo copiar automáticamente. Copiá el texto de la vista previa.', 'error');
    }
  });

  elemento('boton-limpiar').addEventListener('click', () => {
    elemento<HTMLFormElement>('formulario-pregunta').reset();
    material.length = 0;
    renderizarMaterial();
    mostrarErrores([]);
    vistaPrevia.classList.add('hidden');
    campoId.dataset.auto = 'true';
    actualizarSugerenciaId();
    cargarSecciones();
    mostrarMensaje('Formulario limpio.');
  });

  cargarSecciones();
  actualizarSugerenciaId();
}
