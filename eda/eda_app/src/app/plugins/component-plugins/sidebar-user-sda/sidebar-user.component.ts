import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UserService } from '@eda/services/service.index';

/**
 * Side-menu user badge (component plugin of type 'sidebar-user').
 *
 * The left side menu is icon-only, so the current user is shown as an avatar
 * with their initials; the full name is available in the tooltip and clicking it
 * opens the profile page.
 *
 * The user comes from the session (UserService), so it works the same for
 * SinergiaCRM SSO sessions and for local logins.
 */
@Component({
    selector: 'app-sidebar-user-sda',
    standalone: true,
    imports: [RouterLink],
    templateUrl: './sidebar-user.component.html',
    styleUrls: ['./sidebar-user.component.css'],
})
export class SidebarUserSdaComponent {

    private userService = inject(UserService);

    /** Full name to show as tooltip, falling back to the email. */
    public get displayName(): string {
        const user = this.userService.user;
        const name = (user?.name || '').trim();
        const email = (user?.email || '').trim();
        return name || email;
    }

    /** Up to two initials of the user's name (or of the email when there's no name). */
    public get initials(): string {
        const source = this.displayName;
        if (!source) {
            return '?';
        }
        const words = source.split(/[\s._@-]+/).filter((part) => part.length > 0);
        if (words.length === 0) {
            return '?';
        }
        if (words.length === 1) {
            // Single word (e.g. 'u1'): its first two letters
            return words[0].slice(0, 2).toLocaleUpperCase();
        }
        return words
            .slice(0, 2)
            .map((part) => part.charAt(0))
            .join('')
            .toLocaleUpperCase();
    }

    /** Whether there's a session to show. */
    public get hasUser(): boolean {
        return !!this.displayName;
    }
}
