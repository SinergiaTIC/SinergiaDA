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
 *   info.scrm_user=true in Mongo): LOCKED profile, read-only. Their record is
 *   managed in SinergiaCRM, not in SDA.
 * - Users created in SDA (info.scrm_user=false): EDITABLE profile (name, email,
 *   password and picture), same UX as the core.
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

  /** true → SCRM user (updateModel): profile cannot be modified */
  isScrmUser = signal(false);
  /** true while the origin is being resolved (flag + SCRM_* groups) */
  isCheckingOrigin = signal(true);

  constructor() {
    this.initForm();
  }

  ngOnInit(): void {
    this.resolveOrigin();
  }

  private initForm() {
    this.user = this.userService.getUserObject();

    this.profileForm = this.fb.group(
      {
        username: [this.user?.name || "", [Validators.required, Validators.minLength(2)]],
        email: this.user?.google ?? [this.user?.email || "", [Validators.required]],
        password: [""],
        confirmPassword: [""],
      },
      { validators: this.passwordMatchValidator },
    )

    // Immediate synchronous lock based on the info.scrm_user flag from Mongo.
    // The async SCRM_* groups check confirms it right after (covers users
    // synced before the flag existed, until the next updateModel run).
    if (this.isScrmUserByFlag(this.user)) {
      this.lockProfile();
    }
  }

  /**
   * Users synced from SinergiaCRM (sda_def_users) via updateModel carry
   * info.scrm_user=true in Mongo. Users created directly in SDA do not.
   */
  private isScrmUserByFlag(user: User): boolean {
    return (user as any)?.info?.scrm_user === true;
  }

  /**
   * Confirms the origin against the user groups: belonging to any
   * 'SCRM_*' group marks the user as managed by SinergiaCRM.
   */
  private resolveOrigin(): void {
    this.groupService.getGroupsByUser().subscribe({
      next: (groups: any[]) => {
        const belongsToScrmGroup = Array.isArray(groups)
          && groups.some(g => (g?.name || '').startsWith('SCRM_'));
        if (belongsToScrmGroup) {
          this.lockProfile();
        }
        this.isCheckingOrigin.set(false);
      },
      error: () => {
        // No groups: fall back to the email criterion.
        this.isCheckingOrigin.set(false);
      }
    });
  }

  /** Disables the whole form so the profile cannot be modified. */
  private lockProfile(): void {
    this.isScrmUser.set(true);
    this.profileForm?.disable();
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
    // Extra guard: even though the template hides the form, never save for SCRM.
    if (this.isScrmUser()) {
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
