# GEAR CONTROL 90° — Web App para GitHub

Aplicación web progresiva para inventario de equipos fotográficos, generación de QR, escaneo, salidas, devoluciones, mantenimiento y reportes.

## Publicar en GitHub Pages

1. Descomprime este ZIP.
2. Crea un repositorio nuevo en GitHub, por ejemplo `gear-control-90`.
3. Sube `index.html`, `manifest.webmanifest`, `sw.js` y este README a la raíz del repositorio.
4. En GitHub abre **Settings → Pages**.
5. En **Build and deployment**, selecciona **Deploy from a branch**.
6. Selecciona la rama `main` y la carpeta `/ (root)`, guarda.
7. Espera a que GitHub publique la web y abre la URL que te entrega.

## Usar el escáner desde iPhone

- Abre la URL publicada en Safari.
- Pulsa “Activar pitido” dentro de Escáner QR.
- Pulsa “Iniciar cámara” y concede permiso.
- El escáner requiere HTTPS; GitHub Pages proporciona HTTPS.
- Puedes añadir la web a la pantalla de inicio desde el menú Compartir de Safari.

## Funciones incluidas

- Dashboard con resumen.
- Alta, edición, búsqueda y eliminación de equipos.
- Códigos internos automáticos por categoría.
- QR único por equipo.
- Descargar QR PNG e imprimir etiquetas.
- Escáner QR con cámara trasera y doble pitido.
- Crear eventos/salidas y agregar equipos escaneando.
- Registrar devoluciones y detectar pendientes.
- Mantenimiento.
- Reportes, exportación CSV y respaldo JSON.
- Importación de respaldo.
- Diseño responsive y PWA básica.

## IMPORTANTE: almacenamiento

Esta versión inicial guarda los datos en `localStorage` del navegador/dispositivo. No utiliza todavía Supabase ni sincroniza automáticamente entre iPhone y computadora.

Si borras los datos del navegador, puedes perder el inventario: descarga respaldos JSON periódicamente. Para una versión multi-dispositivo con cuenta privada, sincronización y base de datos central, hay que conectar Supabase y configurar autenticación y políticas RLS.

## Notas técnicas

- Las librerías de escaneo y generación QR se cargan desde CDN, por lo que requieren internet.
- La cámara necesita HTTPS.
- El sonido debe activarse manualmente por las restricciones de audio de Safari/iOS.
- Prueba primero con equipos ficticios antes de usar el inventario real.


## Compatibilidad con QR de la prueba anterior

La versión actual también reconoce el QR de demostración anterior `GEAR90:DEMO:CAM-001`, siempre que exista un equipo registrado con código interno `CAM-001`.


### Actualización del escáner QR
Esta versión incrementa la caché PWA a v2 y prioriza la descarga del HTML actualizado para evitar que Safari/GitHub Pages mantenga una versión anterior. El lector ahora muestra el texto exacto que detecta y diferencia entre QR leído y equipo no registrado.
