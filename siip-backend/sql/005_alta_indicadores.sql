-- Alta documental de indicadores. Aplicar explícitamente solo en la base autorizada.
-- Requiere SQL 001 y 002. No crea capturas, publicaciones ni cuentas.
BEGIN;
CREATE TABLE agrupaciones_tematicas (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo varchar(2) NOT NULL UNIQUE,
    nombre text NOT NULL CHECK (btrim(nombre) <> ''),
    activo boolean NOT NULL DEFAULT true
);
CREATE TABLE familias (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    agrupacion_id bigint NOT NULL REFERENCES agrupaciones_tematicas(id),
    codigo varchar(3) NOT NULL UNIQUE,
    nombre text NOT NULL CHECK (btrim(nombre) <> ''),
    activo boolean NOT NULL DEFAULT true
);
CREATE TABLE indicadores (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    consecutivo bigint GENERATED ALWAYS AS IDENTITY (START WITH 130) UNIQUE,
    familia_id bigint NOT NULL REFERENCES familias(id),
    ipsm_origen text NOT NULL DEFAULT '',
    codigo text NOT NULL CHECK (btrim(codigo) <> ''),
    nombre text NOT NULL CHECK (btrim(nombre) <> ''),
    definicion text NOT NULL CHECK (btrim(definicion) <> ''),
    nivel_objetivo text NOT NULL CHECK (btrim(nivel_objetivo) <> ''),
    tipo_indicador text NOT NULL CHECK (btrim(tipo_indicador) <> ''),
    ambito_desempeno text NOT NULL CHECK (btrim(ambito_desempeno) <> ''),
    dimension_desempeno text NOT NULL CHECK (btrim(dimension_desempeno) <> ''),
    transversalidad text NOT NULL DEFAULT '',
    funcion_indicador text NOT NULL DEFAULT '',
    procedencia text NOT NULL DEFAULT '',
    ids_origen text NOT NULL DEFAULT '',
    justificacion text NOT NULL DEFAULT '',
    objetivo text NOT NULL CHECK (btrim(objetivo) <> ''),
    formula_texto text NOT NULL CHECK (btrim(formula_texto) <> ''),
    variables_texto text NOT NULL CHECK (btrim(variables_texto) <> ''),
    unidad_medida text NOT NULL CHECK (btrim(unidad_medida) <> ''),
    acumulacion_texto text NOT NULL DEFAULT '',
    sentido text NOT NULL CHECK (btrim(sentido) <> ''),
    desagregacion_origen text NOT NULL CHECK (btrim(desagregacion_origen) <> ''),
    periodicidad text NOT NULL CHECK (btrim(periodicidad) <> ''),
    linea_base_texto text NOT NULL DEFAULT '',
    periodo_linea_base text NOT NULL DEFAULT '',
    medio_verificacion text NOT NULL CHECK (btrim(medio_verificacion) <> ''),
    unidad_responsable_texto text NOT NULL CHECK (btrim(unidad_responsable_texto) <> ''),
    criterio_interpretacion text NOT NULL CHECK (btrim(criterio_interpretacion) <> ''),
    meta_texto text NOT NULL DEFAULT '',
    periodo_cumplimiento text NOT NULL DEFAULT '',
    regla_semaforo_texto text NOT NULL CHECK (btrim(regla_semaforo_texto) <> ''),
    observaciones_limitaciones text NOT NULL DEFAULT '',
    territorial_origen text NOT NULL DEFAULT '',
    activo boolean NOT NULL DEFAULT false,
    creado_en timestamptz NOT NULL DEFAULT now(),
    actualizado_en timestamptz NOT NULL DEFAULT now(),
    CHECK (codigo ~ '^SIIP\.[0-9]{2}\.F[0-9]{2}\.[0-9]{3}$'),
    CHECK (periodicidad IN ('Mensual', 'Trimestral', 'Semestral', 'Anual'))
);
CREATE UNIQUE INDEX indicadores_codigo_unico ON indicadores (upper(btrim(codigo)));
CREATE INDEX indicadores_familia ON indicadores (familia_id);

-- Solo catálogos de clasificación del anexo base; no carga los 63 indicadores ni los ficticios.
INSERT INTO agrupaciones_tematicas (codigo, nombre) VALUES
    ('01', 'Seguridad pública, justicia cívica y protección civil'),
    ('02', 'Bienestar y desarrollo social'),
    ('03', 'Desarrollo económico y empleo'),
    ('04', 'Territorio, desarrollo urbano y medio ambiente'),
    ('05', 'Servicios públicos municipales'),
    ('06', 'Movilidad y accesibilidad'),
    ('07', 'Gobierno y gestión institucional'),
    ('08', 'Finanzas públicas y gestión de recursos');
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F01', 'Seguridad ciudadana: incidencia delictiva y percepción' FROM agrupaciones_tematicas WHERE codigo = '01';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F02', 'Capacidad operativa policial' FROM agrupaciones_tematicas WHERE codigo = '01';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F03', 'Profesionalización y fortalecimiento policial' FROM agrupaciones_tematicas WHERE codigo = '01';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F04', 'Confianza y desempeño de la policía municipal' FROM agrupaciones_tematicas WHERE codigo = '01';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F05', 'Prevención social y participación comunitaria en seguridad' FROM agrupaciones_tematicas WHERE codigo = '01';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F06', 'Vigilancia territorial y monitoreo de seguridad' FROM agrupaciones_tematicas WHERE codigo = '01';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F07', 'Justicia cívica' FROM agrupaciones_tematicas WHERE codigo = '01';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F08', 'Atención a víctimas' FROM agrupaciones_tematicas WHERE codigo = '01';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F09', 'Violencia contra las mujeres' FROM agrupaciones_tematicas WHERE codigo = '01';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F10', 'Riesgos, protección civil y emergencias' FROM agrupaciones_tematicas WHERE codigo = '01';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F11', 'Regulación y supervisión de seguridad privada' FROM agrupaciones_tematicas WHERE codigo = '01';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F12', 'Pobreza y rezago social' FROM agrupaciones_tematicas WHERE codigo = '02';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F13', 'Desarrollo humano' FROM agrupaciones_tematicas WHERE codigo = '02';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F14', 'Educación y rezago educativo' FROM agrupaciones_tematicas WHERE codigo = '02';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F15', 'Salud, prevención y acceso a servicios' FROM agrupaciones_tematicas WHERE codigo = '02';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F16', 'Carencia de servicios básicos en la vivienda' FROM agrupaciones_tematicas WHERE codigo = '02';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F17', 'Actividad cultural y gestión del patrimonio' FROM agrupaciones_tematicas WHERE codigo = '02';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F18', 'Visitantes y experiencia turística' FROM agrupaciones_tematicas WHERE codigo = '03';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F19', 'Empleo, precariedad e informalidad laboral' FROM agrupaciones_tematicas WHERE codigo = '03';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F20', 'Formalidad y dinamismo comercial' FROM agrupaciones_tematicas WHERE codigo = '03';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F21', 'Estructura empresarial y desarrollo productivo' FROM agrupaciones_tematicas WHERE codigo = '03';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F22', 'Atracción y retención de inversión' FROM agrupaciones_tematicas WHERE codigo = '03';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F23', 'Desarrollo rural y productividad agropecuaria' FROM agrupaciones_tematicas WHERE codigo = '03';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F24', 'Conectividad digital e internet' FROM agrupaciones_tematicas WHERE codigo = '03';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F25', 'Planeación urbana y ordenamiento ecológico' FROM agrupaciones_tematicas WHERE codigo = '04';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F26', 'Densidad y expansión urbana' FROM agrupaciones_tematicas WHERE codigo = '04';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F27', 'Asentamientos irregulares' FROM agrupaciones_tematicas WHERE codigo = '04';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F28', 'Actualización catastral y regularización predial' FROM agrupaciones_tematicas WHERE codigo = '04';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F29', 'Asentamientos y población en zonas de riesgo' FROM agrupaciones_tematicas WHERE codigo = '04';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F30', 'Espacios públicos, áreas verdes y calidad del entorno urbano' FROM agrupaciones_tematicas WHERE codigo = '04';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F31', 'Conservación y restauración ecosistémica' FROM agrupaciones_tematicas WHERE codigo = '04';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F32', 'Calidad del aire y control ambiental' FROM agrupaciones_tematicas WHERE codigo = '04';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F33', 'Disponibilidad, consumo y sostenibilidad hídrica' FROM agrupaciones_tematicas WHERE codigo = '04';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F34', 'Servicios de agua potable y saneamiento' FROM agrupaciones_tematicas WHERE codigo = '05';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F35', 'Alumbrado público' FROM agrupaciones_tematicas WHERE codigo = '05';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F36', 'Gestión integral de residuos sólidos urbanos' FROM agrupaciones_tematicas WHERE codigo = '05';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F37', 'Panteones' FROM agrupaciones_tematicas WHERE codigo = '05';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F38', 'Rastro municipal' FROM agrupaciones_tematicas WHERE codigo = '05';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F39', 'Infraestructura y estado de vialidades' FROM agrupaciones_tematicas WHERE codigo = '06';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F40', 'Movilidad peatonal y accesibilidad universal' FROM agrupaciones_tematicas WHERE codigo = '06';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F41', 'Infraestructura y movilidad ciclista' FROM agrupaciones_tematicas WHERE codigo = '06';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F42', 'Transporte público' FROM agrupaciones_tematicas WHERE codigo = '06';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F43', 'Accidentes y seguridad vial' FROM agrupaciones_tematicas WHERE codigo = '06';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F44', 'Planeación, evaluación y gestión para resultados' FROM agrupaciones_tematicas WHERE codigo = '07';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F45', 'Capacidad institucional y eficiencia administrativa' FROM agrupaciones_tematicas WHERE codigo = '07';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F46', 'Gobierno digital y trámites electrónicos' FROM agrupaciones_tematicas WHERE codigo = '07';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F47', 'Participación ciudadana y presupuesto participativo' FROM agrupaciones_tematicas WHERE codigo = '07';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F48', 'Auditoría y control interno' FROM agrupaciones_tematicas WHERE codigo = '07';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F49', 'Transparencia y acceso a la información' FROM agrupaciones_tematicas WHERE codigo = '07';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F50', 'Calidad de registros, información y reportes municipales' FROM agrupaciones_tematicas WHERE codigo = '07';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F51', 'Eficiencia de trámites y atención municipal' FROM agrupaciones_tematicas WHERE codigo = '07';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F52', 'Autonomía financiera e ingresos propios' FROM agrupaciones_tematicas WHERE codigo = '08';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F53', 'Gestión presupuestaria y sostenibilidad financiera' FROM agrupaciones_tematicas WHERE codigo = '08';
INSERT INTO familias (agrupacion_id, codigo, nombre)
    SELECT id, 'F54', 'Patrimonio municipal' FROM agrupaciones_tematicas WHERE codigo = '08';
COMMIT;
