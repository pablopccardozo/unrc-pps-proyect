# Aporte Teórico: Fundamentos 802.11e

## HCF

802.11e introduce la Función de Coordinación Híbrida (HCF), que contiene dos mecanismos:

* EDCA (Enhanced Distributed Channel Access): Acceso por contienda, mejora del DCF. Introduce 4 Categorías de Acceso (AC) con diferentes prioridades (VO, VI, BE, BK) mediante AIFS[AC], CWmin[AC], CWmax[AC], TXOPlimit[AC]. Es el mecanismo más implementado (WMM es la implementación comercial de EDCA).

* HCCA (HCF Controlled Channel Access): Acceso controlado por sondeo, mejora del PCF. El coordinador (AP) asigna TXOPs a las estaciones basándose en reservas de recursos (TSPEC). Es más complejo y menos común.

## Mecanismos Adicionales de QoS

* Block ACK: Reduce sobrecarga para tráfico en ráfagas.

* No ACK: Útil para aplicaciones de voz/video que toleran pérdidas pero son sensibles a la latencia (probar).

* Piggyback: Reduce sobrecarga.

## Algoritmos de CAC para EDCA:

* Basados en Medición: Deciden admitir flujos según condiciones de red medidas (ancho de banda ocupado, tasa de colisión, retardo).

Ej: "Threshold-Based Admission Control": Usa B_occu (porcentaje de tiempo que el medio está ocupado) o R_c (tasa de colisión). Simple pero con umbrales difíciles de definir.

Ej: "HARMONICA": Ajusta dinámicamente parámetros de acceso (como CWmin, CWmax) para cumplir con QoS y maximizar utilización. Muy relacionado con la idea de "optimización" de tu proyecto.

* Basados en Modelos: Utilizan modelos analíticos (ej: Cadenas de Markov) para predecir el rendimiento (throughput) y decidir.

Son complejos y suelen asumir condiciones ideales (saturación, sin colisiones virtuales).

## Algunos conceptos interesantes

* Límites de EDCA: EDCA (WMM) solo puede garantizar QoS estadístico, no determinista. 