/** Página /crear: arma una pregunta desde el formulario y descarga el JSON de su unidad actualizado. */
import {
  agregarPregunta,
  aArchivoJson,
  construirPregunta,
  quitarPregunta,
  reemplazarPregunta,
  sugerirId,
  type DatosFormulario,
} from '@/lib/crear/pregunta';
import type { DocumentoMaterial } from '@/services/material';
import type { BancoPreguntas, MaterialReferencia, OpcionId, Pregunta } from '@/types/quiz';
import { esPdf, urlMaterial } from '@/utils/rutas';

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
  const bloqueSeccion = elemento<HTMLDivElement>('bloque-seccion');
  const bloquePagina = elemento<HTMLLabelElement>('bloque-pagina');
  const campoPagina = elemento<HTMLInputElement>('campo-pagina');
  const campoCantidad = elemento<HTMLSelectElement>('campo-cantidad');
  const campoCarpetaSubida = elemento<HTMLSelectElement>('campo-carpeta-subida');
  const campoArchivo = elemento<HTMLInputElement>('campo-archivo');
  const botonSubir = elemento<HTMLButtonElement>('boton-subir');
  const estadoSubida = elemento<HTMLParagraphElement>('estado-subida');
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

  /** Cuántas opciones usa la pregunta (2, 3 o 4). Las demás bloques quedan ocultas y no se guardan. */
  function cantidadOpciones(): number {
    return Number(campoCantidad.value) || 4;
  }

  function aplicarCantidadOpciones() {
    const cantidad = cantidadOpciones();
    document.querySelectorAll<HTMLElement>('[data-bloque-opcion]').forEach((bloque) => {
      const indice = Number(bloque.dataset['bloqueOpcion']);
      const usada = indice <= cantidad;
      bloque.hidden = !usada;
      const radio = bloque.querySelector<HTMLInputElement>('input[name="respuesta"]');
      if (radio) {
        radio.disabled = !usada;
        if (!usada) radio.checked = false;
      }
    });
  }

  campoCantidad.addEventListener('change', aplicarCantidadOpciones);

  function leerFormulario(): DatosFormulario {
    const respuesta = document.querySelector<HTMLInputElement>('input[name="respuesta"]:checked');
    return {
      id: campoId.value,
      tema: campoTema.value,
      enunciado: elemento<HTMLTextAreaElement>('campo-enunciado').value,
      opciones: LETRAS.slice(0, cantidadOpciones()).map((letra) => ({
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

    // Un PDF no tiene secciones con id: se referencia por página.
    const pdf = esPdf(campoDocumento.value);
    bloqueSeccion.classList.toggle('hidden', pdf);
    bloquePagina.classList.toggle('hidden', !pdf);
    if (pdf) campoTituloMaterial.value = documento?.titulo ?? '';
  }

  campoDocumento.addEventListener('change', cargarSecciones);

  /** Sube el archivo elegido a la carpeta de la unidad (servidor de desarrollo) y lo agrega a los documentos. */
  botonSubir.addEventListener('click', async () => {
    const archivo = campoArchivo.files?.[0];
    if (!archivo) {
      estadoSubida.textContent = 'Elegí un archivo PDF o HTML de tu PC.';
      estadoSubida.className = 'mt-2 text-sm text-error';
      return;
    }
    const carpeta = campoCarpetaSubida.value;
    estadoSubida.textContent = `Subiendo ${archivo.name}…`;
    estadoSubida.className = 'mt-2 text-sm text-tenue';
    botonSubir.disabled = true;

    try {
      const url = `/__autoria/material?carpeta=${encodeURIComponent(carpeta)}&nombre=${encodeURIComponent(archivo.name)}`;
      const respuesta = await fetch(url, { method: 'POST', body: archivo });
      const cuerpo = (await respuesta.json().catch(() => null)) as { ruta?: string; titulo?: string; error?: string } | null;
      if (!respuesta.ok || !cuerpo?.ruta || !cuerpo.titulo) {
        throw new Error(cuerpo?.error ?? 'No se pudo subir el archivo.');
      }
      const documento = { ruta: cuerpo.ruta, titulo: cuerpo.titulo, secciones: [] };
      datos.documentos.push(documento);
      campoDocumento.append(new Option(documento.titulo, documento.ruta));
      campoDocumento.value = documento.ruta;
      cargarSecciones();
      estadoSubida.textContent = `Listo: ${cuerpo.ruta} ya está en el material y seleccionado en Documento.`;
      estadoSubida.className = 'mt-2 text-sm text-ok';
    } catch (error) {
      // Fuera del servidor de desarrollo la petición no tiene respuesta JSON.
      const detalle = error instanceof Error ? error.message : 'Error desconocido.';
      estadoSubida.textContent = `${detalle} (Subir archivos solo funciona con npm run dev.)`;
      estadoSubida.className = 'mt-2 text-sm text-error';
    } finally {
      botonSubir.disabled = false;
    }
  });
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
    const ruta = campoDocumento.value;
    if (!ruta) {
      mostrarMensaje('Primero elegí un documento.', 'error');
      return;
    }
    let seccion = campoSeccion.value;
    if (esPdf(ruta)) {
      const pagina = Number(campoPagina.value);
      if (!Number.isInteger(pagina) || pagina < 1) {
        mostrarMensaje('Indicá la página del PDF (1 o más).', 'error');
        return;
      }
      seccion = `pagina-${pagina}`;
    } else if (!seccion) {
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
    aplicarCantidadOpciones();
    cargarSecciones();
    mostrarMensaje('Formulario limpio.');
  });

  // ---------- Guardar en el banco y edición (servidor de desarrollo) ----------

  /** Pregunta que se está editando desde la lista de Preguntas, si hay una. */
  let edicion: { archivo: string; unidad: number; id: string } | null = null;

  function cargarPregunta(pregunta: Pregunta, unidad: number) {
    campoUnidad.value = String(unidad);
    campoId.value = pregunta.id;
    campoId.dataset.auto = 'false';
    campoTema.value = pregunta.tema;
    campoCantidad.value = String(pregunta.opciones.length);
    aplicarCantidadOpciones();
    elemento<HTMLTextAreaElement>('campo-enunciado').value = pregunta.enunciado;
    pregunta.opciones.forEach((opcion) => {
      elemento<HTMLInputElement>(`opcion-${opcion.id}-texto`).value = opcion.texto;
      elemento<HTMLTextAreaElement>(`opcion-${opcion.id}-explicacion`).value = opcion.explicacion;
    });
    elemento<HTMLInputElement>(`respuesta-${pregunta.respuestaCorrecta}`).checked = true;
    elemento<HTMLTextAreaElement>('campo-explicacion').value = pregunta.explicacion ?? '';
    elemento<HTMLTextAreaElement>('campo-resumen').value = pregunta.resumen ?? '';
    material.length = 0;
    material.push(...pregunta.material);
    renderizarMaterial();
  }

  const idEditar = new URLSearchParams(window.location.search).get('editar');
  if (idEditar) {
    for (const { archivo, banco } of datos.bancos) {
      const pregunta = banco.preguntas.find((p) => p.id === idEditar);
      if (pregunta) {
        edicion = { archivo, unidad: banco.unidad, id: pregunta.id };
        cargarPregunta(pregunta, banco.unidad);
        elemento('aviso-edicion').classList.remove('hidden');
        elemento('id-en-edicion').textContent = pregunta.id;
        break;
      }
    }
  }

  async function guardarEnDisco(archivo: string, banco: BancoPreguntas) {
    const respuesta = await fetch(`/__autoria/banco?archivo=${encodeURIComponent(archivo)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(banco),
    });
    const cuerpo = (await respuesta.json().catch(() => null)) as { error?: string } | null;
    if (!respuesta.ok) throw new Error(cuerpo?.error ?? 'No se pudo guardar.');
  }

  elemento('boton-guardar-banco').addEventListener('click', async () => {
    const pregunta = prepararPregunta();
    if (!pregunta) return;
    const unidad = Number(campoUnidad.value);
    const destino = datos.bancos.find((b) => b.banco.unidad === unidad);
    if (!destino) return;

    // Cambios a escribir: si la pregunta cambia de unidad, se quita del banco de origen y se agrega al de destino.
    let cambios: { archivo: string; banco: BancoPreguntas }[];
    if (edicion && edicion.unidad !== unidad) {
      const origen = datos.bancos.find((b) => b.banco.unidad === edicion?.unidad);
      if (!origen) return;
      cambios = [
        { archivo: origen.archivo, banco: quitarPregunta(origen.banco, edicion.id) },
        { archivo: destino.archivo, banco: agregarPregunta(destino.banco, pregunta) },
      ];
    } else if (edicion) {
      cambios = [{ archivo: destino.archivo, banco: reemplazarPregunta(destino.banco, edicion.id, pregunta) }];
    } else {
      cambios = [{ archivo: destino.archivo, banco: agregarPregunta(destino.banco, pregunta) }];
    }

    try {
      for (const cambio of cambios) await guardarEnDisco(cambio.archivo, cambio.banco);
    } catch (error) {
      mostrarMensaje(
        `${error instanceof Error ? error.message : 'Error desconocido.'} (Guardar solo funciona con npm run dev.)`,
        'error',
      );
      return;
    }

    // Se actualiza el estado local para que las siguientes operaciones partan de lo guardado.
    for (const cambio of cambios) {
      const entrada = datos.bancos.find((b) => b.archivo === cambio.archivo);
      if (entrada) entrada.banco = cambio.banco;
    }
    edicion = { archivo: destino.archivo, unidad, id: pregunta.id };
    elemento('aviso-edicion').classList.remove('hidden');
    elemento('id-en-edicion').textContent = pregunta.id;
    mostrarMensaje(`Guardado en ${destino.archivo}.`, 'ok');
  });

  aplicarCantidadOpciones();
  cargarSecciones();
  actualizarSugerenciaId();
}
