POLITIK MAP 2.0 — GitHub Pages + MapTiler
=========================================

PASO 1 — CONFIGURAR MAPTILER
1. Crea una clave NUEVA en https://cloud.maptiler.com/account/keys/
2. Abre config.js y reemplaza PEGA_AQUI_TU_NUEVA_CLAVE_MAPTILER por tu clave.
3. No compartas capturas donde se vea la clave.
4. Restringe Allowed HTTP origins a https://TUUSUARIO.github.io
5. Para pruebas locales autoriza localhost y 127.0.0.1 si la consola lo permite.
La clave del navegador no es secreta. Las restricciones de origen y la cuota son esenciales.

PASO 2 — PUBLICAR EN GITHUB PAGES
1. En GitHub crea un repositorio llamado politik-map.
2. Sube a la raíz: index.html, styles.css, app.js, config.js, README.txt y .nojekyll.
3. Abre Settings > Pages.
4. En Build and deployment selecciona Deploy from a branch.
5. Selecciona main y /(root), y pulsa Save.
6. La web quedará en https://TUUSUARIO.github.io/politik-map/
7. Agrega https://TUUSUARIO.github.io a los orígenes permitidos de MapTiler.

FUNCIONES
- Alternar mapa de calles y satélite.
- Selector de departamento colombiano.
- Búsqueda geográfica de municipio/lugar con MapTiler Geocoding.
- Centrar el mapa en la ubicación seleccionada.
- Filtros para líderes, reuniones y representantes.
- CRUD de registros, eventos, lugares y resultados agregados.
- Exportación CSV y respaldo JSON.

COSTOS Y LIMITACIONES
- MapTiler ofrece una cuota gratuita limitada, no uso ilimitado. Controla el consumo en el panel de tu cuenta.
- GitHub Pages aloja la web estática.
- Esta versión guarda datos en localStorage: cada navegador/dispositivo conserva su propia copia; no hay sincronización multiusuario.
- Para sincronizar entre equipos se necesita una base de datos remota y autenticación (por ejemplo Supabase), sujeto también a sus límites gratuitos.
- La clave API es pública en una web estática. Restringe orígenes y vigila el consumo.

PRIVACIDAD
Los datos iniciales son ficticios. Usa información personal solo con autorización, evita domicilios y coordenadas precisas de particulares y no registres ni infieras preferencias individuales de voto. Los resultados electorales deben ser agregados y contar con una fuente verificable.
