# Mecanismos de QoS (WMM/EDCA)

* 4 Categorías de Acceso (AC): AC_BK, AC_BE, AC_VI, AC_VO (orden creciente de prioridad).

# Información técnica actual

* Parámetros WMM (Tabla 1, Pág 6):

    AC_VO (Voz): CWmin=3, CWmax=7, AIFS=2, TXOP=1.504 ms

    AC_VI (Vídeo): CWmin=7, CWmax=15, AIFS=2, TXOP=3.008 ms

    AC_BE (Mejor Esfuerzo): CWmin=15, CWmax=1023, AIFS=3

    AC_BK (Fondo): CWmin=15, CWmax=1023, AIFs=7

* Definiciones de métricas: Enfatiza el uso del percentil 99 (P99) de latencia y jitter como métrica clave para RTC, ya que captura los peores casos que arruinan la experiencia, en lugar del promedio.

* Límites de calidad aceptables (Pág 20): Para el RTC usado, un jitter de audio >30 ms y una latencia de vídeo >180 ms se consideran problemáticos. Una tasa de fotogramas >25 fps es deseable.

# Resultados cuantitativos del estudio

Resultados Cuantitativos Clave (Extraídos de Tablas y Figuras):

## 5 GHz, Nivel 1, Cliente Lejos (-82 dBm), Congestión alta (88% aire):

Latencia P99 Downlink: 409 ms (AC_BE) → 277 ms (AC_VI) → 100 ms (AC_VO). (Reducción del 76% con AC_VO).

Jitter de Audio (KPI RTC): 32 ms (AC_BE) → 4 ms (AC_VO).

Latencia P99 Uplink (siempre AC_BE): 141 ms (cuando DL es AC_BE) → 178 ms (cuando DL es AC_VO). (Aumento del 26%). Esto ilustra el "daño colateral" de priorizar solo un sentido.

## 5 GHz, Nivel 2, Cliente Cerca (-49 dBm), Congestión media-variable:

Latencia P99 Downlink: ~170-190 ms (AC_BE) → ~94-105 ms (AC_VO).

Jitter de Audio Pico: 25 ms (AC_BE) → 7 ms (AC_VO).

Impacto de la distancia: Con AC_VO, la latencia downlink es casi insensible a la distancia (ej: 97 ms cerca vs. 100 ms lejos bajo carga). Con AC_BE, la distancia importa mucho (345 ms cerca vs. 409 ms lejos).

