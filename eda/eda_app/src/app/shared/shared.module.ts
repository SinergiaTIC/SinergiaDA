import { NgModule } from '@angular/core';

// Module
import { CoreModule } from '../core/core.module';
import { PipesModule } from './pipes/pipes.module';

// Directives
import { FocusOnShowDirective } from './directives/autofocus.directive';
import { OnlySignsAndNumbersDirective } from './directives/only-signs-and-numbers.directive';
/* SDA CUSTOM */ import { EdaNewFeatureDirective } from './directives/eda-new-feature.directive';


// Components
import {
    EdaPageDialogComponent,
    EdaDialogComponent,
    EdaDialog2Component,
    NavbarComponent,
    SidebarComponent,
    EdaContextMenuComponent,
    EdaInputComponent,
    EdaDatePickerComponent,
    CreateDashboardComponent,
    EdaFieldComponent
} from './components/shared-components.index';

@NgModule({
    declarations: [
        EdaPageDialogComponent,
        NavbarComponent,
        SidebarComponent,
        EdaDialogComponent,
        EdaDialog2Component,
        EdaContextMenuComponent,
        EdaInputComponent,
        FocusOnShowDirective,
        OnlySignsAndNumbersDirective,
        EdaDatePickerComponent,
        CreateDashboardComponent,
        EdaFieldComponent,
        OnlySignsAndNumbersDirective, /* SDA CUSTOM */
        EdaNewFeatureDirective /* SDA CUSTOM */
    ],
    imports: [
        CoreModule,
        PipesModule
    ],
    exports: [
        EdaPageDialogComponent,
        NavbarComponent,
        SidebarComponent,
        EdaDialogComponent,
        PipesModule,
        EdaDialogComponent,
        EdaDialog2Component,
        EdaContextMenuComponent,
        EdaInputComponent,
        FocusOnShowDirective,
        OnlySignsAndNumbersDirective,
        EdaDatePickerComponent,
        CreateDashboardComponent,
        EdaFieldComponent,
        OnlySignsAndNumbersDirective,
        EdaNewFeatureDirective /* SDA CUSTOM */
    ]
})
export class SharedModule {}
