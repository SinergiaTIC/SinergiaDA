import { NgModule, Provider } from '@angular/core';

// Modules
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { PrimengModule } from './primeng.module';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        PrimengModule,
        BaseChartDirective,
    ],
    exports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        HttpClientModule,
        PrimengModule,
        BaseChartDirective,
    ],
    providers: [
        provideCharts(withDefaultRegisterables()) as Provider,
    ],
})

export class CoreModule {}
