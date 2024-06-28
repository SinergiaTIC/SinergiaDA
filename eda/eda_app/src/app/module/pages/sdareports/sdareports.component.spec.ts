import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SdareportsComponent } from './sdareports.component';

describe('SdareportsComponent', () => {
  let component: SdareportsComponent;
  let fixture: ComponentFixture<SdareportsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SdareportsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SdareportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
