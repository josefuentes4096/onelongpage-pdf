# OneLongPage PDF

[English](README.md) · **Español**

Extensión de Chrome que guarda una página web en un **PDF de una sola página continua**, sin saltos de página ni cortes. El PDF incluye una **cabecera** con la URL y la fecha/hora de la captura.

> **¿Estás revisando este proyecto?** En [Prácticas de ingeniería](#prácticas-de-ingeniería) se explica cómo está construido: desarrollo guiado por especificaciones, trunk-based development con pull requests, y una CI con controles de calidad que incluyen tests end-to-end contra Chrome real.

## Funciones

- **Una sola página:** la pestaña actual completa, en una única página tan alta como el contenido. El texto queda vectorial (se puede seleccionar y buscar) y los enlaces siguen funcionando.
- **Cabecera:** la URL completa y la fecha/hora de la captura en la parte superior del PDF, en hora local con su zona horaria y en UTC (ISO 8601):

  ```
  URL: https://ejemplo.com/articulo?id=123
  Capturado: 2026-11-24 14:03:22 UTC-03:00  (2026-11-24T17:03:22Z)
  ```

  La cabecera se dibuja en el margen del PDF, fuera del contenido, así que la página no puede taparla ni cambiarla con su CSS. El nombre del archivo también lleva la fecha y la hora.

- **Oculta avisos de cookies y ventanas emergentes** antes de capturar y los restaura después. No pulsa "aceptar" ni "rechazar". Además, libera el bloqueo de scroll que ponen esos avisos. Desactiva la opción si quieres que esos elementos aparezcan en el PDF.
- **Atajo de teclado** (<kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>) y **menú contextual** (clic derecho en la página).
- **Idiomas:** español e inglés, según el idioma de Chrome.

## Instalación (modo desarrollador)

1. Abre `chrome://extensions` y activa **Modo de desarrollador**.
2. Pulsa **Cargar descomprimida** y elige la carpeta **`extension/`**.

## Cómo funciona

Usa el protocolo de Chrome DevTools (`chrome.debugger` → `Page.printToPDF`):

1. Registra la URL de la pestaña y el momento de la captura.
2. Si la opción está activa, oculta los elementos superpuestos.
3. Emula el modo de impresión con el ancho de papel elegido y mide la altura total del contenido.
4. Genera el PDF con un papel a medida, tan alto como el contenido, y la cabecera en el margen superior.
5. Si por redondeos sale más de una página, vuelve a intentarlo con más altura.
6. Restaura la página y se desconecta del depurador.

## Privacidad y permisos

La extensión **no se conecta a ningún servidor**: sin analítica, sin telemetría y sin cuenta. El código no contiene `fetch`, `XMLHttpRequest` ni `WebSocket`. No declara `host_permissions` ni `content_scripts`.

| Permiso        | Para qué se usa                                                                                                                                            |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `debugger`     | `Page.printToPDF` con un tamaño de papel a medida y la cabecera. Solo se conecta a la pestaña que eliges, durante la captura, y se desconecta al terminar. |
| `activeTab`    | Acceder a la pestaña actual solo cuando pulsas el botón, el atajo o el menú.                                                                               |
| `storage`      | Guardar tus opciones.                                                                                                                                      |
| `downloads`    | Guardar el PDF en tu carpeta de descargas.                                                                                                                 |
| `contextMenus` | La opción del menú del clic derecho.                                                                                                                       |

Chrome muestra una advertencia fuerte al instalar por el permiso `debugger`, y una barra amarilla mientras se usa. No existe otra API que permita a una extensión generar un PDF con un tamaño de página arbitrario sin el diálogo de impresión.

## Limitaciones conocidas

- No funciona en páginas protegidas de Chrome (`chrome://`, Chrome Web Store, visor de PDF).
- Si DevTools está abierto en la pestaña, ciérralo antes de capturar.
- Chrome no genera páginas de más de unos 23 m de alto (65536 pt). Si el contenido es más largo, la extensión avisa.
- Algunos visores, como Adobe Acrobat, limitan la página a unos 508 cm (200 pulgadas). El visor de Chrome no tiene ese problema.
- Las aplicaciones web que desplazan el contenido dentro de un contenedor interno, o dentro de un `iframe` del **mismo origen**, se despliegan automáticamente. Los `iframe` de **otro dominio** no se pueden desplegar: de ellos solo se captura la parte visible.
- Las listas "virtualizadas", que solo mantienen en la página las filas visibles (habituales en tablas enormes y en algunos chats), solo muestran las filas que haya en ese momento.

## Prácticas de ingeniería

### Forma de trabajo

- **Desarrollo guiado por especificaciones (spec-driven development).** El comportamiento se acuerda por escrito antes de escribir código. La [spec 001](docs/specs/001-single-page-capture/spec.md) documenta el producto completo con requisitos numerados y criterios de aceptación, y cada criterio enlaza al test que lo verifica. El trabajo nuevo parte de la [plantilla de specs](docs/specs/_template.md), y la cantidad de especificación se ajusta al tamaño del cambio: un test para un arreglo, una spec para un comportamiento nuevo, y diseño y tareas para un cambio de arquitectura.
- **Trunk-based development con pull requests.** `main` es la única rama permanente y siempre está lista para publicar. Los cambios entran por ramas cortas y PR pequeños, y solo se fusionan cuando la CI pasa. Ver [CONTRIBUTING.md](CONTRIBUTING.md).
- **Asistido por IA, dirigido por una persona.** El proyecto se desarrolla con un agente de IA (Claude Code) que trabaja bajo una constitución escrita del proyecto, [CLAUDE.md](CLAUDE.md): reglas que no se negocian (sin acceso a red, permisos mínimos, interfaz traducida, construir solo lo que se pide), la forma de trabajo anterior y las convenciones de código. Todo cambio pasa por la misma revisión y los mismos controles de calidad.
- **Versiones** con [Semantic Versioning](https://semver.org/lang/es/), y cambios registrados en [CHANGELOG.md](CHANGELOG.md) según [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

### Controles de calidad

Cada pull request ejecuta estas comprobaciones en [GitHub Actions](.github/workflows/ci.yml):

| Control          | Cómo                                                                                                                                                                                                                                                                                                                                                 |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint             | ESLint (configuración plana): reglas recomendadas más igualdad estricta, `const` sin `var` y `console` restringido                                                                                                                                                                                                                                   |
| Formato          | Prettier y EditorConfig                                                                                                                                                                                                                                                                                                                              |
| Tipos            | TypeScript en modo `strict` con `checkJs`, sobre JavaScript anotado con JSDoc (sin paso de compilación)                                                                                                                                                                                                                                              |
| Tests unitarios  | `node:test` sobre la lógica pura: cabecera, validación de opciones, nombres de archivo, formato de fechas, conteo de páginas del PDF, paridad de traducciones y funciones de página autocontenidas                                                                                                                                                   |
| Tests end-to-end | El flujo de captura real ejecutado contra **Chrome headless** mediante el protocolo de DevTools, con páginas de prueba que reproducen estructuras reales (contenedores con scroll interno, `iframe`, carga diferida, avisos de cookies). Cada test comprueba que el PDF tiene una sola página y la altura completa, y que la página quedó restaurada |

### Principios de diseño

- **Núcleo testeable.** El flujo de captura solo depende de una interfaz `CdpSession` de dos métodos (`send`, `run`), así que exactamente el mismo código se ejecuta dentro de la extensión y en los tests end-to-end contra Chrome real. La parte crítica no se prueba con simulaciones (mocks).
- **Primero el test que reproduce el fallo.** Los fallos se reproducen con un test que falla antes de corregirlos. Por ejemplo, un portal web del que solo se capturaba la parte superior se convirtió en una página de prueba que fallaba (805 px capturados de 12.000) hasta que llegó el arreglo.
- **Permisos mínimos y privacidad desde el diseño.** Sin acceso a red, sin `host_permissions` y sin `content_scripts`. El depurador se conecta solo a la pestaña elegida y solo durante la captura.
- **No dejar rastro.** Cada cambio en la página pasa por un registro para deshacerlo, y se revierte al terminar la captura, también cuando falla.
- **Toda entrada externa se valida.** Se validan las opciones guardadas y los mensajes internos, se comprueba quién envía cada mensaje, y la URL se escapa antes de insertarla en la cabecera del PDF.
- **Errores tipados.** Los fallos son `CaptureError` con códigos estables, que se convierten en mensajes traducidos.
- **Internacionalización y accesibilidad.** Todo el texto de la interfaz pasa por `chrome.i18n` (inglés y español, con un test que comprueba que ambos tienen los mismos mensajes). Los cambios de estado se anuncian a los lectores de pantalla y el foco siempre es visible.

## Desarrollo

Requisitos: Node.js 20 o superior.

```sh
npm install
npm run check      # lint + formato + tipos + tests unitarios
npm test           # solo tests unitarios (node:test)
npm run test:e2e   # captura real en Chrome headless (define CHROME_PATH si Chrome no está en la ruta estándar)
npm run format     # formatea el código con Prettier
```

```
extension/                 La extensión (la carpeta que se carga en Chrome)
  manifest.json
  _locales/{en,es}/        Textos traducidos (chrome.i18n)
  background/
    service-worker.js      Punto de entrada: mensajes, atajo, menú contextual
    capture.js             Flujo de captura
    debugger-session.js    Envoltorio de chrome.debugger (CDP)
    page-functions.js      Funciones que se ejecutan dentro de la página
    capture-header.js      Cabecera con URL y fecha/hora (pura, con tests)
    errors.js              Códigos de error tipados
    …
  shared/                  Opciones, i18n, mensajes, formato de fechas, unidades
  popup/                   Ventana del icono
  result/                  Página de vista previa y descarga
tests/                     Tests unitarios (node:test)
  e2e/                     Tests end-to-end contra Chrome real, con páginas de prueba en fixtures/
docs/specs/                Especificaciones (plantilla y una carpeta por spec)
CLAUDE.md                  Constitución del proyecto: reglas, forma de trabajo y convenciones
```

El código es JavaScript con módulos ES, comprobado por TypeScript (`checkJs` con anotaciones JSDoc) y sin paso de compilación: lo que hay en `extension/` es exactamente lo que se ejecuta.

Lee [CONTRIBUTING.md](CONTRIBUTING.md) antes de enviar cambios y [SECURITY.md](SECURITY.md) para informar de vulnerabilidades.

## Autor

**Jose Fuentes** · [LinkedIn](https://www.linkedin.com/in/josefuentes4096/)

## Licencia

[0BSD](LICENSE): úsalo, cópialo, modifícalo y distribúyelo para cualquier fin, sin ninguna condición.
