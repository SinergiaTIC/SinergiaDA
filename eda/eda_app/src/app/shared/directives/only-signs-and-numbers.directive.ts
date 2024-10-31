import { Directive, HostListener  } from '@angular/core';

@Directive({
  selector: '[appOnlySignsAndNumbers]'
})
export class OnlySignsAndNumbersDirective {

  constructor() { }

  @HostListener('input', ['$event'])
  onInput(event: any) {
    const valorFiltrado = event.target.value.replace(/[^0-9:.,]/g, '');
    event.target.value = valorFiltrado;
  }

}
