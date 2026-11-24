# Política de seguridad

## Informar de una vulnerabilidad

**No abras un issue público.** Usa la función de GitHub
[Report a vulnerability](../../security/advisories/new) (pestaña _Security_ del repositorio) para enviar el
informe de forma privada.

Incluye, si puedes:

- versión de la extensión y de Chrome,
- pasos para reproducirlo,
- impacto esperado (por ejemplo, ejecución de código en la página, falsificación de la URL o la fecha/hora de la cabecera, filtración de datos).

Intentaremos responder en un plazo de 7 días.

## Alcance

Se consideran especialmente graves los problemas que permitan:

- que una página web altere, oculte o falsifique la cabecera (URL o fecha/hora),
- que la extensión envíe datos fuera del equipo,
- usar el permiso `debugger` sobre pestañas distintas a la elegida por el usuario.

## Versiones con soporte

Solo la última versión publicada recibe correcciones de seguridad.
