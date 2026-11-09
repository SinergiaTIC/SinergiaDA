import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";
import { ConfigEntry } from "./config-entry.model";

/**
 * Two-column table (70% variable / 30% value) used by every section of the
 * instance configuration modal.
 */
@Component({
  standalone: true,
  selector: "config-table",
  imports: [CommonModule],
  template: `
    <div class="overflow-auto max-h-[35vh] border border-gray-200 dark:border-gray-700 rounded">
      <table class="w-full table-fixed text-sm">
        <colgroup>
          <col class="w-[70%]" />
          <col class="w-[30%]" />
        </colgroup>
        <thead class="bg-gray-50 dark:bg-gray-700 text-left sticky top-0 z-10">
          <tr>
            <th class="px-3 py-2 font-semibold" i18n="@@configViewerKey">Variable</th>
            <th class="px-3 py-2 font-semibold" i18n="@@configViewerValue">Valor</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
          @for (entry of entries; track entry.key) {
            <tr class="align-top">
              <td class="px-3 py-2 font-mono text-xs break-all">{{ entry.key }}</td>
              <td class="px-3 py-2 font-bold">
                @if (entry.multiline) {
                  <pre class="font-mono text-xs whitespace-pre-wrap break-words m-0 max-h-40 overflow-auto">{{ entry.value }}</pre>
                } @else {
                  <code class="font-mono text-xs break-all">{{ entry.value }}</code>
                }
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="2" class="px-3 py-3 text-gray-500 dark:text-gray-400" i18n="@@configViewerNoResults">
                Sin resultados para el filtro.
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `
})
export class ConfigTableComponent {
  @Input() entries: ConfigEntry[] = [];
}
