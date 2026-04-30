import { NgModule } from '@angular/core';

// Module
import { CoreModule } from '../core/core.module';
import { PipesModule } from './pipes/pipes.module';

// Directives
import { FocusOnShowDirective } from './directives/autofocus.directive';
import { OnlySignsAndNumbersDirective } from './directives/only-signs-and-numbers.directive';


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
    EdaFieldComponent,
    SdaTourComponent, // SDA CUSTOM
    SdaHighlightComponent // SDA CUSTOM
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
        OnlySignsAndNumbersDirective,
        /* SDA CUSTOM */ SdaTourComponent,
        /* SDA CUSTOM */ SdaHighlightComponent
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
        /* SDA CUSTOM */ SdaTourComponent,
        /* SDA CUSTOM */ SdaHighlightComponent
    ]
})
export class SharedModule {}
