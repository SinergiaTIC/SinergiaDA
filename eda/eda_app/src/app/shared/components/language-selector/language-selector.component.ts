import { Component, ElementRef, HostListener, Inject, LOCALE_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ENABLED_LANGUAGES } from '@eda/configs/customizable/customizable_default';

interface LanguageOption {
  code: string;
  nativeName: string;
}

/**
 * Every locale the app can be built for (angular.json i18n.locales + sourceLocale).
 * ENABLED_LANGUAGES (customizable_default.ts) decides which of these are actually offered.
 */
const ALL_LANGUAGES: LanguageOption[] = [
  { code: 'es', nativeName: 'Español' },
  { code: 'en', nativeName: 'English' },
  { code: 'ca', nativeName: 'Català' },
  { code: 'fr', nativeName: 'Français' },
  { code: 'pl', nativeName: 'Polski' },
  { code: 'gl', nativeName: 'Galego' },
  { code: 'eu', nativeName: 'Euskara' },
];

@Component({
  standalone: true,
  selector: 'app-language-selector',
  imports: [CommonModule],
  templateUrl: './language-selector.component.html',
})
export class LanguageSelectorComponent {
  public isOpen = false;
  public languages: LanguageOption[];
  public currentLocale: string;
  public currentLanguageLabel: string;

  constructor(
    @Inject(LOCALE_ID) currentLocale: string,
    private elementRef: ElementRef<HTMLElement>
  ) {
    this.currentLocale = currentLocale;
    this.languages = ALL_LANGUAGES.filter(lang => ENABLED_LANGUAGES.includes(lang.code));

    const current = this.languages.find(lang => lang.code === this.currentLocale);
    this.currentLanguageLabel = current ? current.nativeName : this.currentLocale;
  }

  public toggleOpen(event: Event): void {
    event.stopPropagation();
    this.isOpen = !this.isOpen;
  }

  @HostListener('document:click', ['$event'])
  public onDocumentClick(event: Event): void {
    if (this.isOpen && !this.elementRef.nativeElement.contains(event.target as Node)) {
      this.isOpen = false;
    }
  }
}
