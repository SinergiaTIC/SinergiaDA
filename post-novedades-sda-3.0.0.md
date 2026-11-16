# Actualización de SinergiaDA a la versión 3.0.0

En el día de hoy, 16 de noviembre de 2026, hemos actualizado las instancias de SinergiaDA a la versión 3.0.0.

Se trata de una actualización de gran envergadura: SinergiaDA pasa a construirse sobre la versión 3.1 de EDA, con una base tecnológica más moderna, una interfaz renovada y numerosas funcionalidades nuevas. A continuación resumimos las novedades más relevantes, agrupadas por áreas.

> **⚠️ Importante:** es posible que no todos los cambios se visualicen directamente. Si no es así, es necesario refrescar el navegador pulsando **CTRL + F5**.

## Nuevas funcionalidades y mejoras

- **Filtros de informe**
  - **Filtros de informe obligatorios**: Al crear un filtro de informe se puede marcar como obligatorio. Si un informe tiene filtros obligatorios, no se mostrará hasta que se les asigne un valor. Más información en la wiki: [Configuración de los filtros de informe](https://wiki.sinergiatic.org/index.php/Crear_y_configurar_filtros#Configuraci%C3%B3n_de_los_filtros_de_informe)
  - **Selección múltiple configurable**: Los filtros de informe incorporan un interruptor para permitir la selección de varios valores; si se desactiva, el filtro solo admite un valor.
  - **Filtros con autocompletado**: Además del desplegable con todos los valores, un filtro de informe se puede configurar para escribir y buscar el valor (autocompletado), muy útil en columnas con muchísimos valores. Más información en la wiki: [Filtros de informe](https://wiki.sinergiatic.org/index.php/Crear_y_configurar_filtros#Filtros_de_informe)
- **Diseño y opciones de los informes**
  - **Nuevo diseño de las opciones del informe**: La cabecera del informe se ha rediseñado: las acciones más habituales (Ver / Editar, Añadir y Guardar) se muestran directamente como botones en una barra, y el resto de opciones (filtros de informe, guardar como, enviar por email, estilos, privacidad, etiquetas, eliminar informe…) se mantienen en el menú de los tres puntos. La elección entre Ver y Editar se recuerda por usuario y por informe, y los informes nuevos se abren directamente en modo edición.
  - **Aviso al salir con cambios sin guardar**: Si se intenta salir de un informe con cambios sin guardar, la aplicación avisa antes de descartarlos.
  - **"Ver consulta SQL" como botón en Opciones avanzadas**: La consulta SQL del panel deja de estar detrás de un icono y pasa a ser una opción dentro de Opciones avanzadas.
  - **Imagen de fondo del informe**: Además del color de fondo, el informe permite subir una imagen de fondo desde el diálogo de estilos del informe ("Editar estilos"). Más información en la wiki: [Estilos del informe](https://wiki.sinergiatic.org/index.php/Crear_y_editar_informes#Estilos_del_informe)
  - **Bloquear o desbloquear todos los paneles a la vez**: Desde el menú del informe se pueden bloquear o desbloquear simultáneamente todos los paneles (impidiendo moverlos y redimensionarlos), sin tener que hacerlo panel a panel. Más información en la wiki: [Bloqueo de paneles](https://wiki.sinergiatic.org/index.php/Crear_y_editar_informes#Bloqueo_de_paneles)
  - **Nuevo panel "Navegador": informes como pestañas**: Permite insertar un panel que muestra como pestañas un conjunto de informes, para pasar de uno a otro sin salir del informe. En su configuración se eligen los informes que aparecen (filtrándolos por privacidad y por etiquetas), se ordenan arrastrándolos y se puede decidir que se abran en una pestaña nueva. Se añade desde el menú "Añadir" del informe.
  - **Importar paneles desde otro informe**: Ya no hace falta reconstruir un panel que existe en otro informe: ahora se puede importar directamente. En el menú del informe, la opción de importar paneles permite seleccionar el informe de origen y los paneles que se quieren traer.
- **Paneles: edición y gestión**
  - **Ordenar por campos que no están en la consulta**: En los ajustes avanzados del panel se pueden arrastrar campos a la zona "Ordenar los resultados por" aunque no formen parte de la consulta: no hace falta añadirlos a la consulta para poder ordenar por ellos. Con un clic en cada campo se alterna entre ascendente, descendente o sin ordenar. Más información en la wiki: [Configuración de las columnas](https://wiki.sinergiatic.org/index.php/Crear_y_configurar_paneles#Configuraci%C3%B3n_de_las_columnas)
  - **Opciones avanzadas del panel reorganizadas**: Se ha reorganizado la disposición de las opciones avanzadas del panel para facilitar su uso.
  - **Vista previa de la información del panel**: Al pasar el ratón por el menú del panel (los tres puntos de su cabecera) aparece una vista previa con el resumen de sus datos y filtros, sin necesidad de abrir su edición. Más información en la wiki: [Menú de opciones del panel](https://wiki.sinergiatic.org/index.php/Crear_y_configurar_paneles#Men%C3%BA_de_opciones_del_panel)
  - **Cambiar el tipo de gráfico desde el menú del panel**: El menú del panel incluye la opción "Cambiar tipo de gráfico", que abre el selector de tipos y aplica el nuevo tipo directamente, sin entrar a editar el panel. Más información en la wiki: [Menú de opciones del panel](https://wiki.sinergiatic.org/index.php/Crear_y_configurar_paneles#Men%C3%BA_de_opciones_del_panel)
  - **Exportar un panel a Excel o a CSV**: Desde el menú del panel, la opción de exportar permite elegir el formato: Excel o CSV (antes solo era posible exportar a Excel).
  - **Descarga de paneles en XLS para usuarios de solo lectura**: Los usuarios de solo lectura pueden ahora descargar los paneles en formato Excel.
- **Visualizaciones**
  - **Nuevas opciones visuales en los indicadores (KPI)**: Los paneles de tipo indicador permiten ahora elegir el color de fondo y mostrar una pequeña imagen de prefijo junto al valor. Además, es posible ajustar de manera independiente el tamaño de la imagen, del indicador y del sufijo. Más información en la wiki: [KPI](https://wiki.sinergiatic.org/index.php/Tipo_de_visualizaciones_disponibles#KPI)
  - **Columnas que muestran enlaces e imágenes**: Al definir los datos de un informe, ahora es posible que una columna muestre enlaces en los que se puede pulsar o pequeñas imágenes, en lugar de solo texto. Por ejemplo, una columna puede mostrar la foto o el enlace asociado a cada registro. Más información en la wiki: [Configuración de las columnas](https://wiki.sinergiatic.org/index.php/Crear_y_configurar_paneles#Configuraci%C3%B3n_de_las_columnas)
  - **Elección de paleta de colores de los gráficos**: Los gráficos permiten elegir entre varias paletas de colores prediseñadas (entre ellas la de la versión 2, fijada como predeterminada).
  - **Predicción de series en los gráficos de línea**: Los gráficos de línea pueden mostrar la predicción de la serie (valores futuros estimados), con su propio diálogo de configuración, mediante la opción "Mostrar Predicción". Más información en la wiki: [Gráfico de líneas](https://wiki.sinergiatic.org/index.php/Tipo_de_visualizaciones_disponibles#Gr%C3%A1fico_de_L%C3%ADneas)
  - **Nuevo gráfico "KPI Tendencia"**: Nuevo tipo de gráfico que muestra un indicador con su evolución. Está disponible cuando la consulta tiene una columna de fecha (año/mes/semana/día) y una numérica. Más información en la wiki: [KPI](https://wiki.sinergiatic.org/index.php/Tipo_de_visualizaciones_disponibles#KPI)
  - **Código semafórico en las tablas**: En la configuración de color de una columna de una tabla, además del gradiente, se pueden asignar colores por umbrales ("es mayor que…", "mayor que X y menor que Y", "es menor que…"). Más información en la wiki: [Código de color](https://wiki.sinergiatic.org/index.php/Tipo_de_visualizaciones_disponibles#C%C3%B3digo_de_color)
- **Administración y aspectos generales**
  - **Protección de los modelos de datos**: Cuando una fuente de datos está protegida, la aplicación muestra un aviso y restringe las zonas que no se pueden modificar, evitando así romper informes que dependen de esa fuente. En las fuentes protegidas aparece un banner informativo y algunas opciones no están disponibles mientras la protección esté activa. Más información en la wiki: [Modelos de datos y campos calculados](https://wiki.sinergiatic.org/index.php/Modelos_de_datos_y_campos_calculados)
  - **Perfil bloqueado para usuarios de SinergiaCRM**: Los usuarios que vienen de SinergiaCRM ven su perfil en solo lectura; los creados en SinergiaDA lo mantienen editable. Los usuarios no administradores ven los grupos a los que pertenecen. Más información en la wiki: [Usuarios, grupos y permisos](https://wiki.sinergiatic.org/index.php/Usuarios,_Grupos_y_Permisos)
  - **Portal de datos**: Nueva página "Portal de datos" en el menú de administración que permite publicar un portal con informes: el administrador configura el HTML de la barra lateral, el color de fondo y el informe público que se muestra embebido. La página es pública y no requiere iniciar sesión.
  - **Gestión de correo renovada**: La gestión de correo permite configurar, además de un servidor SMTP, el envío a través de una cuenta de Gmail con OAuth2. Además, la "Gestión de email" pasa al menú de administración y solo puede ser abierta por administradores (antes estaba en el menú lateral y podía abrirla cualquier usuario con sesión).
  - **Nuevas fuentes de datos disponibles**: Se añaden nuevos tipos de fuente de datos: ClickHouse, DuckDB, Odoo, Google Analytics 4 y Holded, disponibles al crear la conexión en "Gestión de fuentes de datos".
  - **La ventana "Acerca de" muestra la versión de la API**: En la ventana "Acerca de" aparece ahora también la versión de la API a la que está conectada la aplicación, lo que facilita comprobar que todo está actualizado.
  - **Base tecnológica actualizada**: La aplicación se ha actualizado a una base tecnológica más moderna (núcleo EDA 3.1 y Angular 17), lo que mejora su rendimiento y permite seguir incorporando mejoras. Documentación de EDA 3: [edadoc.jortilles.com/v3/es](https://edadoc.jortilles.com/v3/es/#/)

## Correcciones de errores

- Se corrige un error que impedía exportar e importar informes correctamente.
- Se corrige un error que provocaba inconsistencias en los filtros de informe al duplicar paneles.
- Se corrige un error en la visualización de porcentajes en tablas cuando se utilizan múltiples agregaciones.
- Se corrige un error por el que el botón Guardar dejaba de funcionar tras guardar una alerta KPI.
- Se corrige un error que impedía que, al iniciar sesión desde un enlace externo, se redirigiera al informe original.
- Se corrige un problema de autocompletado en el campo "color del indicador" de los KPI.
- Se corrige un error que dejaba el filtro en estado inconsistente al eliminarlo desde "Nuevo filtro" sin haberlo configurado.
- Se corrige un error que modificaba el autor del informe al cambiar su tipo desde la barra lateral.
