import User from '../../module/admin/users/model/user.model';
import Group from '../../module/admin/groups/model/group.model';

/** Group that marks a user as read-only (observer) in SinergiaDA. */
const READ_ONLY_GROUP = 'EDA_RO';

/**
 * Keeps the SinergiaDA read-only state in sync with the `ro` claim of the
 * SinergiaCRM token.
 *
 * SinergiaDA already models "read-only" as membership of the EDA_RO group (the
 * model sync maps the CRM `readonly` flag to it). Applying the claim here as
 * well makes the permission effective from the user's very next SSO login,
 * without waiting for a model rebuild.
 *
 * Admins are never made read-only (same rule as the model sync).
 */
export async function syncReadOnly(user: any, readOnly: boolean): Promise<void> {
    const groups: any[] = await Group.find({}, 'name role users').lean();
    const roGroup: any = groups.find((g) => g.name === READ_ONLY_GROUP);
    if (!roGroup) {
        return;
    }

    const userRoles: string[] = (user.role || []).map((r: any) => String(r));
    const adminRoleIds: string[] = groups
        .filter((g) => g.role === 'EDA_ADMIN_ROLE')
        .map((g) => String(g._id));
    const isAdmin = userRoles.some((id) => adminRoleIds.includes(id));

    if (readOnly && isAdmin) {
        return;
    }

    const roId = String(roGroup._id);
    const hasRole = userRoles.includes(roId);
    const inGroup = (roGroup.users || []).some((u: any) => String(u) === String(user._id));

    if (readOnly && (!hasRole || !inGroup)) {
        await Group.updateOne({ _id: roGroup._id }, { $addToSet: { users: user._id } });
        await User.updateOne({ _id: user._id }, { $addToSet: { role: roGroup._id } });
        if (!hasRole) {
            user.role = [...(user.role || []), roGroup._id];
        }
    } else if (!readOnly && (hasRole || inGroup)) {
        await Group.updateOne({ _id: roGroup._id }, { $pull: { users: user._id } });
        await User.updateOne({ _id: user._id }, { $pull: { role: roGroup._id } });
        user.role = (user.role || []).filter((r: any) => String(r) !== roId);
    }
}
