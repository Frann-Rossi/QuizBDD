# Inicialización y configuración del proyecto

## Contexto

Vamos a desarrollar una aplicación web educativa tipo **Quiz**, orientada al aprendizaje y repaso de Bases de Datos (BDD).

La aplicación permitirá incorporar material de estudio desde una carpeta del proyecto, organizado por unidades y temas, para utilizarlo en cuestionarios de opción múltiple.

Cada pregunta tendrá cuatro opciones y una única respuesta correcta.

- **Respuesta correcta:** mostrar una explicación del concepto y material complementario para reforzar los conocimientos.
- **Respuesta incorrecta:** indicar la respuesta correcta, explicar por qué la opción seleccionada es incorrecta y proporcionar material de estudio para comprender el tema.

La aplicación deberá ser responsive, funcionar correctamente tanto en computadoras como en dispositivos móviles y contar con una arquitectura preparada para incorporar nuevas funcionalidades.

## Tarea

Inicializar el proyecto desde cero utilizando **Astro, Tailwind CSS y TypeScript**, configurando todo lo necesario para comenzar su desarrollo.

1. Crear e inicializar el proyecto con Astro.
2. Integrar y configurar Tailwind CSS.
3. Configurar TypeScript con buenas prácticas.
4. Crear y configurar el archivo `package.json`, incluyendo scripts para desarrollo, build, verificación de tipos y tests.
5. Crear una estructura completa de carpetas, organizada y escalable, contemplando:
   - Páginas y rutas.
   - Componentes reutilizables.
   - Layouts.
   - Estilos globales.
   - Tipos e interfaces TypeScript.
   - Lógica de negocio del cuestionario.
   - Material de estudio organizado por unidades y temas.
   - Banco de preguntas en archivos JSON.
   - Utilidades y servicios.
   - Pruebas automatizadas.
   - Recursos estáticos.
6. Configurar las herramientas necesarias para ejecutar el proyecto en desarrollo.
7. Crear una página inicial básica que permita comprobar el funcionamiento de Astro y Tailwind CSS.
8. Crear un archivo `README.md` con instrucciones de instalación, ejecución, estructura y comandos disponibles.
9. Preparar un archivo `.gitignore` adecuado para evitar incluir dependencias, archivos generados y configuraciones sensibles.

## Requisitos

- No instalar dependencias innecesarias.
- Utilizar versiones estables y compatibles entre sí.
- Aplicar buenas prácticas de desarrollo y organización del código.
- Mantener una separación clara de responsabilidades.
- Priorizar una arquitectura sencilla, mantenible y escalable.
- Evitar sobreingeniería y configuraciones que todavía no sean necesarias.
- No incorporar una base de datos en esta inicialización.
- No integrar servicios externos ni inteligencia artificial.
- No implementar todavía la lógica completa de los cuestionarios.
- No crear archivos o componentes vacíos únicamente para completar la estructura.
- No realizar commits automáticamente.
- No desplegar la aplicación a producción.

## Verificación

Al finalizar la configuración:

1. Comprobar que todas las dependencias se instalen correctamente.
2. Ejecutar la verificación de TypeScript y Astro.
3. Ejecutar `npm run build` y confirmar que finalice sin errores.
4. Ejecutar los tests configurados y verificar que pasen correctamente.
5. Comprobar que el servidor de desarrollo se inicie correctamente.
6. Verificar que la página inicial se visualice correctamente y que Tailwind CSS funcione.
7. Revisar que no existan dependencias innecesarias, errores de configuración ni problemas en la estructura del proyecto.
8. Corregir cualquier error detectado y repetir las verificaciones correspondientes.

## Informe final

Entregar un informe que incluya:

- Resumen de las tareas realizadas.
- Árbol completo de carpetas y archivos creados.
- Dependencias instaladas y justificación de cada una.
- Scripts configurados en `package.json`.
- Resultado de la verificación de TypeScript.
- Resultado del build.
- Resultado de los tests ejecutados.
- Problemas encontrados y soluciones aplicadas.
- Confirmación de que el proyecto está listo para comenzar a desarrollar sus funcionalidades.

## Regla obligatoria

**No dar por finalizada la configuración hasta que el proyecto compile correctamente, las verificaciones se completen y todos los tests implementados pasen.**

Si alguna verificación falla, corregir el problema antes de finalizar.

No avanzar con funcionalidades adicionales sin autorización.
