# Migracion Angular 14 → 17 - SinergiaDA Workkit

> **Ultima actualizacion:** 2026-06-01 13:18 UTC
> **Estado:** PASO 0 EN CURSO — Entorno preparado, pendiente iniciar migracion 14→15

---

## 1. Resumen Ejecutivo

Actualizacion del frontend de SinergiaDA desde Angular 14.2.11 hasta Angular 17.3.x.
Requiere pasos intermedios (14→15→16→17) y multiples cambios en dependencias,
codigo fuente y configuracion de build.

---

## 2. Entorno Actual

| Componente | Version Actual | Version Objetivo |
|-----------|----------------|------------------|
| Node.js | 16.20.2 | 18.13+ o 20.9+ |
| npm | 8.19.4 | 9+ (con Node 18) |
| Angular | 14.2.11 | 17.3.x |
| TypeScript | 4.6.2 | 5.4.x |
| RxJS | 7.8.1 | 7.8.1 (compatible) |
| Zone.js | 0.12.x | 0.14.x |

---

## 3. Dependencias y Compatibilidad

### 3.1. Dependencias Angular Core

| Paquete | v14 Actual | v15 | v16 | v17 Objetivo |
|---------|-----------|-----|-----|-------------|
| @angular/core | 14.2.11 | 15.2.x | 16.2.x | 17.3.x |
| @angular/cli | 14.2.10 | 15.2.x | 16.2.x | 17.3.x |
| @angular/compiler-cli | 14.2.11 | 15.2.x | 16.2.x | 17.3.x |
| @angular/cdk | 14.2.7 | 15.2.x | 16.2.x | 17.3.x |
| @angular/localize | 14.2.11 | 15.2.x | 16.2.x | 17.3.x |
| typescript | 4.6.2 | 4.8+ | 4.9.3+ | 5.4.x |
| zone.js | 0.12.x | 0.13.x | 0.13.x | 0.14.x |

### 3.2. Dependencias de Terceros

| Paquete | Actual | v15 | v16 | v17 | Estado |
|---------|--------|-----|-----|-----|--------|
| primeng | 14.2.2 | 15.x | 16.x | 17.18.x | 🔴 Pendiente |
| angular-gridster2 | 14.1.5 | 15.x | 16.x | 17.x | 🔴 Pendiente |
| angular2gridster | 13.0.0 | ❌ No soportado | ❌ No soportado | ❌ No soportado | 🔴 **Reemplazar** |
| ng2-charts | 4.1.1 | 5.x | 6.x | 7.x+ | 🔴 Pendiente |
| chart.js | 3.9.1 | 3.9.1 | 4.x | 4.x | 🔴 Pendiente |
| chartjs-plugin-datalabels | 2.2.0 | 2.2.0 | 2.2.0 | 2.2.0 | 🟢 Compatible |
| sweetalert2 | 10.x | 10.x | 11.x | 11.x+ | 🟡 Revisar |
| ngx-csv-parser | 0.0.7 | ? | ? | ? | 🟡 Revisar |
| quill | 1.3.7 | 1.3.7 | 2.x | 2.x | 🟡 Revisar |
| core-js | 2.6.11 | — | — | — | 🟢 **Eliminar** |
| codelyzer | ^6.0.0 | — | — | — | 🟢 **Eliminar** |
| tslint | 6.1.0 | — | — | — | 🟢 **Reemplazar ESLint** |

### 3.3. Compatibilidad Chart.js 3 → 4 (Breaking Changes)

| Cambio | Chart.js 3 | Chart.js 4 |
|--------|-----------|-----------|
| Escalas | `scales: { xAxes: [...], yAxes: [...] }` | `scales: { x: {...}, y: {...} }` |
| Plugins | Registro global | `chart.register()` |
| Tipos | Typescript 4.x | Typescript 5.x |
| Ejes de tiempo | `type: 'time'` | `type: 'time'` + adaptador requerido |

### 3.4. PrimeNG 14 → 17 Breaking Changes

| Componente v14 | Componente v17 | Cambio |
|---------------|---------------|--------|
| p-dropdown | p-select | Renombrado, API de opciones cambia |
| p-calendar | p-datepicker | Renombrado, API cambia |
| p-inputTextarea | p-textarea | Renombrado |
| p-tabView | p-tabs | Renombrado, API de eventos cambia |
| p-messages | p-message | Renombrado |
| p-chart | — | Eliminado, usar ng2-charts |
| Estilos | theme.css import | Nueva arquitectura CSS variables |
| PrimeNGConfig | providePrimeNG() | Configuracion funcional |

---

## 4. Cambios de Codigo Fuente Bloqueantes

### 4.1. 🔴 ComponentFactoryResolver (Eliminado en v15)

**Archivo:** `panel-chart.component.ts` (lineas 13, 82, 422-423, 479-480, 529-530, 908-909, 960-961, 1030-1031, 1039-1040, 1067-1068, 1091-1092, 1118-1119, 1141-1142, 1167-1168, 1191-1192, 1203-1204)

**Patron actual:**
```typescript
const factory = this.resolver.resolveComponentFactory(EdaTableComponent);
this.componentRef = this.entry.createComponent(factory);
```

**Patron Angular 15+:**
```typescript
import { EdaTableComponent } from './ruta';
// El componente debe estar en entryComponents o ser standalone
this.componentRef = this.entry.createComponent(EdaTableComponent);
```

**Impacto:** ~16 usos del patron antiguo. Linea 409 ya usa el nuevo patron.

### 4.2. 🔴 Router Guards Clase (Deprecados v15, Eliminados en adelante)

| Archivo | Guard | Accion |
|---------|-------|--------|
| `verify-token.guard.ts` | `CanActivate` clase | Convertir a funcion |
| `login-guard.guard.ts` | `CanActivate` clase | Convertir a funcion |

**Patron funcional:**
```typescript
import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';

export const verifyTokenGuard: CanActivateFn = () => {
  const userService = inject(UserService);
  const router = inject(Router);
  // ... logica existente ...
};
```

### 4.3. 🔴 relativeLinkResolution: 'legacy' (Eliminado en v15)

**Archivo:** `core-pages.routes.ts:28`
```typescript
// Actual:
export const CORE_ROUTES = RouterModule.forRoot(coreRoutes, {
  useHash: true, onSameUrlNavigation: 'reload', relativeLinkResolution: 'legacy'
});

// Cambio: Eliminar 'relativeLinkResolution: legacy'
export const CORE_ROUTES = RouterModule.forRoot(coreRoutes, {
  useHash: true, onSameUrlNavigation: 'reload'
});
```

### 4.4. 🔴 angular2gridster (Sin soporte Angular 15+)

**Archivos afectados:**
- `dashboard.component.ts` — imports y uso de `GridsterComponent`, `IGridsterOptions`, `IGridsterDraggableOptions`
- `pages.module.ts` — `GridsterModule` de angular2gridster
- `dashboard.component.html` — template con `<gridster>` y `<gridster-item>`

**Accion:** Reemplazar por `angular-gridster2` v17.x que tiene API similar pero diferente.

### 4.5. 🟡 UntypedFormGroup / UntypedFormBuilder

**Archivo:** `dashboard.component.ts:4`
```typescript
import { UntypedFormGroup, UntypedFormBuilder, Validators } from '@angular/forms';
```

En Angular 14+ los formularios son tipados por defecto. `UntypedFormGroup` funciona
pero es recomendable migrar a `FormGroup` tipado.

---

## 5. Plan de Trabajo por Pasos

### [x] PASO 0: Preparacion de Entorno
- [x] Actualizar Node.js a v18.13+ o v20.9+ (usando nvm: v18.18.0)
- [x] Confirmar `npm` version 9+ (npm 9.8.1)
- [x] Verificar build compila con Node 18 (sin errores, solo warnings CommonJS)
- [x] Solucionar cache `.angular/` owned by root (configurar `cli.cache.path` en angular.json)
- [x] Hacer commit del documento MIGRATION.md como baseline
- [~] Branch ya existente: `enhancement/angular17`

### [ ] PASO 1: Angular 14 → 15
- [ ] Ejecutar `ng update @angular/core@15 @angular/cli@15 --allow-dirty`
- [ ] **MANUAL:** Migrar `ComponentFactoryResolver` → `ViewContainerRef.createComponent()`
- [ ] **MANUAL:** Convertir guards clase a funciones
- [ ] **MANUAL:** Eliminar `relativeLinkResolution: 'legacy'`
- [ ] **MANUAL:** Reemplazar `angular2gridster` por `angular-gridster2`
- [ ] **MANUAL:** Actualizar PrimeNG 14.x → 15.x
- [ ] **MANUAL:** Actualizar angular-gridster2 14.x → 15.x
- [ ] **MANUAL:** Actualizar ng2-charts 4.1.1 → 5.x
- [ ] **MANUAL:** Actualizar chart.js 3.9.1 → 4.x
- [ ] **MANUAL:** Actualizar TypeScript a 4.8+
- [ ] Ejecutar `ng build` y verificar compilacion
- [ ] **COMMIT** despues de verificar

### [ ] PASO 2: Angular 15 → 16
- [ ] Ejecutar `ng update @angular/core@16 @angular/cli@16 --allow-dirty`
- [ ] Actualizar TypeScript a 4.9.3+
- [ ] **MANUAL:** Actualizar PrimeNG 15.x → 16.x
- [ ] **MANUAL:** Actualizar angular-gridster2 15.x → 16.x
- [ ] **MANUAL:** Actualizar ng2-charts 5.x → 6.x
- [ ] Ejecutar `ng build` y verificar compilacion
- [ ] **COMMIT** despues de verificar

### [ ] PASO 3: Angular 16 → 17
- [ ] Ejecutar `ng update @angular/core@17 @angular/cli@17 --allow-dirty`
- [ ] Actualizar TypeScript a 5.2+ (ideal 5.4.x)
- [ ] **MANUAL:** Actualizar PrimeNG 16.x → 17.x (breaking changes mayores)
- [ ] **MANUAL:** Actualizar angular-gridster2 16.x → 17.x
- [ ] **MANUAL:** Actualizar ng2-charts 6.x → 7.x+
- [ ] **MANUAL:** Migrar build system (`browser` → `application` con esbuild/Vite)
- [ ] **MANUAL:** Migrar TSLint → ESLint (`ng add @angular-eslint/schematics`)
- [ ] **MANUAL:** Eliminar `core-js` v2 de dependencias y polyfills
- [ ] **MANUAL:** Actualizar `tsconfig.json` (target ES2022, moduleResolution bundler)
- [ ] Ejecutar `ng build` y verificar compilacion
- [ ] **COMMIT** despues de verificar

### [ ] PASO 4: Migraciones Post-Actualizacion (Opcionales)
- [ ] Opcional: Migrar `*ngIf`/`*ngFor` → `@if`/`@for` (control flow)
- [ ] Opcional: Migrar `HttpClientModule` → `provideHttpClient()`
- [ ] Opcional: Migrar a standalone components
- [ ] Opcional: Migrar Karma → Jest/Vitest
- [ ] Opcional: Actualizar sweetalert2 + quill + ngx-csv-parser

---

## 6. Estado de Progreso

| Fase | Estado | Fecha | Notas |
|------|--------|-------|-------|
| Paso 0: Preparacion | ✅ Completado | 2026-06-01 | Node 18.18.0 activo, build verificado, cache configurado |
| Paso 1: 14→15 | ⬜ Pendiente | — | — |
| Paso 2: 15→16 | ⬜ Pendiente | — | — |
| Paso 3: 16→17 | ⬜ Pendiente | — | — |
| Paso 4: Post-migracion | ⬜ Pendiente | — | — |

---

## 7. Problemas Conocidos / Riesgos

1. **PrimeNG 14→17**: Cambio mayor de API. Varios componentes renombrados.
   Ver `p-dropdown` → `p-select`, `p-calendar` → `p-datepicker`, etc.
2. **angular2gridster**: Libreria diferente a `angular-gridster2`. Requiere reescritura
   del layout del dashboard. Es el cambio mas riesgoso.
3. **Chart.js 3→4**: API de escalas y ejes cambiada. Revisar todas las graficas.
4. **Vite/esbuild**: Pueden romper los path mappings de `@eda/*`. Verificar
   `tsconfig.json` con `moduleResolution: "bundler"`.
5. **TypeScript 4.6 → 5.4**: Salto de 3 versiones major. Posibles errores de tipos
   nuevos que antes no se detectaban.

---

## 8. Comandos Utiles

```bash
# Ver versiones actuales
node --version && npm --version
ng version

# Actualizar Angular paso a paso
ng update @angular/core@15 @angular/cli@15 --allow-dirty
ng update @angular/core@16 @angular/cli@16 --allow-dirty
ng update @angular/core@17 @angular/cli@17 --allow-dirty

# Construir y verificar
ng build --configuration=production
ng serve --configuration=ca

# Migrar a ESLint
ng add @angular-eslint/schematics

# Migrar control flow
ng generate @angular/core:control-flow

# Migrar a standalone
ng generate @angular/core:standalone
```

---

## 9. Referencias

- [Angular Update Guide](https://update.angular.io/)
- [PrimeNG Changelog](https://github.com/primefaces/primeng/blob/master/CHANGELOG.md)
- [angular-gridster2 Releases](https://github.com/tiberiuzuld/angular-gridster2/releases)
- [Chart.js Migration Guide](https://www.chartjs.org/docs/latest/migration/v4-migration.html)
- [Angular ESLint](https://github.com/angular-eslint/angular-eslint)
