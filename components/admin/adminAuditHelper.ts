import { db, collection, addDoc } from '../../firebase';
import { User } from '../../types';

export async function logAdminAction(
  currentUser: User,
  action: string,
  targetType: string,
  targetId: string,
  details: string
) {
  try {
    await addDoc(collection(db, 'audit_logs'), {
      adminId: currentUser.id,
      adminEmail: currentUser.email || `${currentUser.username}@autobid.com`,
      adminRole: currentUser.role || 'admin',
      action,
      targetType,
      targetId,
      details,
      timestamp: Date.now()
    });
  } catch (err) {
    console.warn('[AuditLog] Failed to record audit log:', err);
  }
}
