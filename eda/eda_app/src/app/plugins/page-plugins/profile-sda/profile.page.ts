import { Component, OnInit, inject, signal } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormBuilder, type FormGroup, ReactiveFormsModule, Validators } from "@angular/forms"
import { GroupService, UserService } from "@eda/services/service.index";
import { User } from "@eda/models/model.index";
import { IconComponent } from "@eda/shared/components/icon/icon.component";
import Swal from 'sweetalert2';

/**
 * SDA profile (page plugin replacing the core 'profile' route).
 *
 * - SCRM users (synced from sda_def_users via updateModel, flagged with
 *   info.scrm_user=true in Mongo): name/email read-only (managed in
 *   SinergiaCRM), but password CAN be changed from SDA.
 * - Users created in SDA (info.scrm_user=false): EDITABLE profile (name, email,
 *   password and picture), same UX as the core.
 * - The info.scrm_user flag is the ONLY source of truth: updateModel sets it
 *   to true for users in sda_def_users and to false for everyone else, so
 *   group membership (e.g. SCRM_* groups) must NOT be used to infer origin.
 * - Admins: the groups section is hidden (getMineGroups returns every
 *   existing group for them, so listing it makes no sense).
 */
@Component({
  selector: "profile-sda",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IconComponent,
  ],
  templateUrl: "./profile.page.html",
  styleUrls: ["./profile.page.css"]
})
export class ProfileSdaPage implements OnInit {
  private msgEmailInUseTitle = $localize`:@@emailAlreadyExistsTitle:Email en uso`;
  private msgEmailInUse = $localize`:@@emailAlreadyExistsMsg:Ya existe un usuario con este correo electrónico.`;
  private msgUpdatedUser = $localize`:@@UpdatedUser:Usuario actualizado`;
  private msgUpdateError = $localize`:@@UpdatedUserError:Error al actualizar el usuario`;

  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private groupService = inject(GroupService);

  user: User;
  profileForm: FormGroup
  activeTab = signal("email")

  /** true → SCRM user (updateModel): name/email read-only, password editable */
  isScrmUser = signal(false);
  /** true → admin: groups section hidden (getMineGroups returns ALL groups) */
  isAdmin = signal(false);
  /** groups the current user belongs to (getGroupsByUser) */
  userGroups = signal<Array<{ name: string }>>([]);

  constructor() {
    this.initForm();
  }

  ngOnInit(): void {
    this.loadGroups();
  }

  private initForm() {
    this.user = this.userService.getUserObject();
    this.isAdmin.set(this.checkIsAdmin(this.user));

    this.profileForm = this.fb.group(
      {
        username: [this.user?.name || "", [Validators.required, Validators.minLength(2)]],
        email: this.user?.google ?? [this.user?.email || "", [Validators.required]],
        password: [""],
        confirmPassword: [""],
      },
      { validators: this.passwordMatchValidator },
    )

    // Lock based on the info.scrm_user flag from Mongo: the only criterion.
    if (this.isScrmUserByFlag(this.user)) {
      this.lockProfile();
    }
  }

  /**
   * Users synced from SinergiaCRM (sda_def_users) via updateModel carry
   * info.scrm_user=true in Mongo; updateModel marks every other user as
   * info.scrm_user=false, so no further origin checks are needed.
   */
  private isScrmUserByFlag(user: User): boolean {
    return (user as any)?.info?.scrm_user === true;
  }

  private checkIsAdmin(user: User): boolean {
    if (this.userService?.isAdmin === true) {
      return true;
    }
    const roles = (user as any)?.role || [];
    return roles.some((r: any) => (r?._id ?? r)?.toString() === '135792467811111111111110');
  }

  /**
   * Loads the groups of the current user for display only. Group
   * membership (including SCRM_* groups) does NOT determine the origin.
   * Skipped for admins: getMineGroups returns every existing group for
   * them, so the list is not their membership.
   */
  private loadGroups(): void {
    if (this.isAdmin()) {
      this.userGroups.set([]);
      return;
    }
    this.groupService.getGroupsByUser().subscribe({
      next: (groups: any[]) => {
        this.userGroups.set(Array.isArray(groups) ? groups : []);
      },
      error: () => {
        this.userGroups.set([]);
      }
    });
  }

  /** Locks name/email but keeps the password fields enabled (SCRM can change it). */
  private lockProfile(): void {
    this.isScrmUser.set(true);
    this.profileForm?.get('username')?.disable();
    this.profileForm?.get('email')?.disable();
  }

  passwordMatchValidator(group: FormGroup) {
    const password = group.get("password")?.value
    const confirmPassword = group.get("confirmPassword")?.value

    if ((password && !confirmPassword) || (!password && confirmPassword)) {
      return { passwordMismatch: true }
    }

    if (password && confirmPassword && password !== confirmPassword) {
      return { passwordMismatch: true }
    }

    return null
  }

  onSubmit() {
    // SCRM users: password-only save (name/email are managed in SinergiaCRM).
    if (this.isScrmUser()) {
      const password = this.profileForm.get('password')?.value;
      if (!password || this.profileForm.hasError('passwordMismatch') || this.profileForm.get('password')?.invalid) {
        return;
      }
      this.savePasswordOnly();
      return;
    }

    const newEmail = this.profileForm.value.email;
    const emailChanged = newEmail && newEmail !== this.user.email;

    if (emailChanged) {
      this.userService.getUsers().subscribe(users => {
        const emailExists = users.some((u: User) => u.email === newEmail && u._id !== this.user._id);
        if (emailExists) {
          Swal.fire(this.msgEmailInUseTitle, this.msgEmailInUse, 'warning');
          return;
        }
        this.saveUser();
      });
    } else {
      this.saveUser();
    }
  }

  private savePasswordOnly() {
    this.user.password = this.profileForm.get('password')?.value;

    if (this.userService.isAdmin) {
      this.userService.manageUpdateUsers(this.user).subscribe(
        res => Swal.fire(this.msgUpdatedUser, res.email, 'success'),
        err => Swal.fire(this.msgUpdateError, err.text, 'error')
      );
    } else {
      this.userService.updateUser(this.user).subscribe(
        _ => {},
        err => Swal.fire(this.msgUpdateError, err.text, 'error')
      );
    }
  }

  private saveUser() {
    this.user.name = this.profileForm.value.username;
    this.user.email = this.profileForm.value.email;
    this.user.password = this.profileForm.value.password;

    if (this.userService.isAdmin) {
      this.userService.manageUpdateUsers(this.user).subscribe(
        res => Swal.fire(this.msgUpdatedUser, res.email, 'success'),
        err => Swal.fire(this.msgUpdateError, err.text, 'error')
      );
    } else {
      this.userService.updateUser(this.user).subscribe(
        _ => {},
        err => Swal.fire(this.msgUpdateError, err.text, 'error')
      );
    }
  }

  setActiveTab(tab: string) {
    this.activeTab.set(tab)
  }
}
