# Contribuir

¡Gracias por tu interés!

## Flujo de trabajo: trunk-based development

El proyecto usa _trunk-based development_ con pull requests:

- **`main` es la única rama permanente** y siempre debe estar en estado publicable.
- **Ramas cortas:** crea una rama desde `main` para cada cambio (`fix/header-long-url`, `feat/dark-mode`…) y fusiónala en uno o dos días como máximo. Nada de ramas `develop` ni de ramas de larga duración.
- **Cambios pequeños:** un PR, un cambio. Si algo es grande, divídelo en varios PR que se puedan fusionar por separado.
- **Todo entra por PR:** no se hace commit directo a `main`. El PR se fusiona cuando la CI pasa y tiene la revisión aprobada.
- **Funciones a medio hacer:** si un cambio no puede terminarse en un PR, intégralo desactivado (por ejemplo, sin exponerlo en la interfaz) en lugar de mantener una rama abierta.
- **Versiones:** se publican desde `main` con una etiqueta `vX.Y.Z`, siguiendo [Semantic Versioning](https://semver.org/lang/es/).

## Especificaciones (spec-driven development)

El comportamiento del producto se define en [`docs/specs/`](docs/specs/). La spec principal es [001: captura en una sola página](docs/specs/001-single-page-capture/spec.md). El trabajo de especificación se ajusta al tamaño del cambio:

- **Arreglo que restaura un comportamiento ya especificado:** basta con la descripción del PR y un test que reproduzca el fallo.
- **Comportamiento nuevo o modificado:** crea una spec a partir de [`docs/specs/_template.md`](docs/specs/_template.md), o actualiza la existente, y acuérdala **antes** de escribir código.
- **Cambio de arquitectura:** spec con las secciones "Design" y "Tasks" completas.

La spec va en el mismo PR que el código, y cada criterio de aceptación enlaza al test que lo verifica. Las reglas del proyecto para agentes de IA y personas están en [`CLAUDE.md`](CLAUDE.md).

## Antes de abrir un pull request

1. `npm install` y luego `npm run check` y `npm run test:e2e`. La CI ejecuta lo mismo y debe pasar.
2. Añade o actualiza los tests en `tests/` si cambias lógica pura (cabecera, opciones, formatos, utilidades de PDF), y en `tests/e2e/` si cambias cómo se captura la página.
3. Prueba manualmente la extensión cargando `extension/` en `chrome://extensions` con al menos:
   - una página larga con imágenes diferidas,
   - una página con aviso de cookies,
   - una URL muy larga (para comprobar que la cabecera no se monta sobre el contenido).
4. Actualiza `CHANGELOG.md` en la sección "Sin publicar".

## Reglas del proyecto

- **Sin llamadas de red.** La extensión no debe contactar con ningún servidor. Cualquier excepción tiene que ser opcional, estar desactivada por defecto y documentarse en el README.
- **Mínimos permisos.** No añadas permisos ni `host_permissions` sin justificarlo en el PR y en la tabla del README.
- **Textos traducidos.** Todo texto visible va en `extension/_locales/*/messages.json`, en todos los idiomas. Un test lo comprueba.
- **Funciones de página autocontenidas.** Lo que hay en `background/page-functions.js` se envía a la página como texto: nada de imports ni referencias externas. Un test lo comprueba.
- Mensajes de commit en modo imperativo y en inglés (`Fix header height for long URLs`).
