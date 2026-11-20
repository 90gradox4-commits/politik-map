POLITIK MAP — CORRECCIÓN MAPTILER
=================================

IMPORTANTE: esta versión NO contiene ninguna clave API. Debes pegar tu clave nueva en config.js antes de publicar.

1) CONFIGURAR LA CLAVE
- Abre config.js con Bloc de notas.
- Reemplaza PEGA_AQUI_TU_NUEVA_CLAVE_MAPTILER por la clave NUEVA creada en MapTiler.
- Guarda el archivo.
- No pegues la clave en chats ni capturas.

2) ORÍGENES PERMITIDOS EN MAPTILER
En la clave nueva, configura los orígenes HTTP permitidos para:
- localhost (pruebas locales)
- 127.0.0.1 (pruebas locales)
- 90gradox4-commits.github.io (GitHub Pages)
Si el panel rechaza alguno, consulta el formato exacto que solicita MapTiler para el campo de origen.

3) SUBIR A GITHUB
- Abre el repositorio politik-map.
- Sube y reemplaza index.html, styles.css, app.js, config.js y README.txt.
- Confirma los cambios en la rama main.
- GitHub Pages publicará la actualización automáticamente.

4) CORRECCIÓN TÉCNICA
- Calles usa el endpoint Maps API streets-v4.
- Satélite usa el endpoint Tiles API satellite-v4.
La documentación oficial diferencia /maps/ para estilos de mapa y /tiles/ para conjuntos de mosaicos.

5) DIAGNÓSTICO SI SIGUE APARECIENDO INVALID KEY
- Comprueba que pegaste la clave NUEVA completa, sin espacios ni comillas adicionales.
- Comprueba que la clave está activa y que no está revocada.
- Comprueba que el origen 90gradox4-commits.github.io está permitido.
- Espera unos minutos tras guardar cambios y recarga con Ctrl+F5.
- Revisa que el uso/cuota de tu cuenta permita nuevas solicitudes.

Nota: las claves API de navegador son visibles en el cliente. Restringe sus orígenes y vigila el consumo. GitHub Pages y MapTiler pueden tener cuotas y condiciones de uso; no es uso ilimitado.
