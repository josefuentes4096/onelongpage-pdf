# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). El proyecto sigue
[Semantic Versioning](https://semver.org/lang/es/).

## [Sin publicar]

### Cambiado

- El proyecto pasa a llamarse **OneLongPage PDF** (antes "PDF Página Infinita").
- La carga de contenido diferido se hace con la ventana real (se ve el desplazamiento) y antes de simular la impresión.

### Corregido

- En aplicaciones web cuyo contenido se desplaza dentro de un contenedor interno (la ventana no hace scroll) o dentro de un `iframe` del mismo origen, solo se capturaba la parte visible (~7–10 % superior). Ahora esos contenedores e `iframe` se "despliegan" antes de medir.
- La carga de contenido diferido usaba una ventana simulada de 100 px y se saltaba partes de la página.

### Añadido

- Tests end-to-end contra Chrome real (`npm run test:e2e`) con páginas de prueba: página normal, contenedor interno, `iframe`, carga diferida y aviso de cookies.
- Proceso de desarrollo guiado por especificaciones: `CLAUDE.md` (reglas del proyecto), plantilla de specs y spec 001 del comportamiento actual.
- Flujo trunk-based con pull requests documentado en `CONTRIBUTING.md`.
- README en inglés (`README.md`) con versión en español (`README.es.md`).

## [1.3.0] - 2026-11-24

### Cambiado

- Reorganización del código en módulos ES dentro de `extension/`, con tipos comprobados (JSDoc + TypeScript).
- Los scripts que se ejecutan en la página son funciones reales (antes, cadenas de texto).
- Errores con códigos tipados en lugar de detectarlos por el texto del mensaje.
- Interfaz traducida con `chrome.i18n` (español e inglés).

### Corregido

- Dos capturas simultáneas en la misma pestaña ya no chocan: la segunda avisa de que hay una en curso.
- Si el usuario cancela la barra del depurador, se muestra "Captura cancelada" en lugar de un error genérico.
- Los PDF que no llega a recoger la página de resultado se liberan de memoria pasados 2 minutos.
- Se libera la URL temporal (blob) del PDF al cerrar la página de resultado.
- Se validan las opciones guardadas y los mensajes recibidos.
- El estado del popup se anuncia a los lectores de pantalla.

### Añadido

- Lint (ESLint), formato (Prettier), comprobación de tipos, tests unitarios e integración continua (GitHub Actions).
- `CONTRIBUTING.md`, `SECURITY.md` y este changelog.

## [1.2.0] - 2026-11-24

### Añadido

- Cabecera con la URL y la fecha/hora de la captura.

### Eliminado

- Editor de texto y captura de selección.

## [1.1.0] - 2026-11-24

### Añadido

- Ocultar avisos de cookies y ventanas emergentes antes de capturar.
- Atajo de teclado y menú contextual.
- Sección de privacidad y permisos en el README.

## [1.0.0] - 2026-11-24

### Añadido

- Captura de la página actual en un PDF de una sola página continua.
