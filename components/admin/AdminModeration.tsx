import React, { useState, useEffect } from 'react';
import { db, collection, onSnapshot, updateDoc, doc, deleteDoc } from '../../firebase';
import { ModerationReport, User, Vehicle } from '../../types';
import { logAdminAction } from './adminAuditHelper';

interface AdminModerationProps {
  currentUser: User;
  vehicles: Vehicle[];
}

export const AdminModeration: React.FC<AdminModerationProps> = ({ currentUser, vehicles }) => {
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'actioned'>('pending');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'moderation_reports'), (snap) => {
      const list: ModerationReport[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as ModerationReport));
      list.sort((a, b) => b.createdAt - a.createdAt);
      setReports(list);
    });
    return () => unsub();
  }, []);

  const handleDismissReport = async (report: ModerationReport) => {
    try {
      await updateDoc(doc(db, 'moderation_reports', report.id), {
        status: 'dismissed',
        reviewedBy: currentUser.email,
        actionTaken: 'Dismissed as false report'
      });
      await logAdminAction(currentUser, 'DISMISS_REPORT', 'moderation_reports', report.id, `Dismissed report against ${report.targetType} ${report.targetId}`);
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleBlacklistVehicle = async (report: ModerationReport) => {
    if (!window.confirm(`Blacklist and remove vehicle listing "${report.targetTitle}"?`)) return;
    try {
      // Update vehicle doc
      await updateDoc(doc(db, 'vehicles', report.targetId), {
        isBlacklisted: true,
        status: 'Ended'
      });
      // Update report
      await updateDoc(doc(db, 'moderation_reports', report.id), {
        status: 'actioned',
        reviewedBy: currentUser.email,
        actionTaken: 'Vehicle Blacklisted & De-listed'
      });
      await logAdminAction(
        currentUser,
        'BLACKLIST_VEHICLE',
        'vehicles',
        report.targetId,
        `Blacklisted vehicle "${report.targetTitle}" following report: ${report.reason}`
      );
      alert('Vehicle blacklisted from marketplace!');
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const filteredReports = reports.filter(r => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'pending') return r.status === 'pending';
    return r.status === 'actioned' || r.status === 'dismissed';
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
            <h2 className="text-xl font-bold text-gray-900">Module 14: Content Moderation & Fraud Shield</h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Review user-reported listings, suspicious odometer entries, inappropriate images, and prevent bad actors from compromising trust.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${statusFilter === 'pending' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            Pending Queue ({reports.filter(r => r.status === 'pending').length})
          </button>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${statusFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            All Reports ({reports.length})
          </button>
        </div>
      </div>

      {/* Reports Queue */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
        {filteredReports.length === 0 ? (
          <div className="py-16 text-center text-gray-400 space-y-2">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">
              ✓
            </div>
            <h4 className="font-bold text-gray-800 text-sm">Moderation Queue Clear</h4>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              No flagged listings or user reports require attention at this time.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredReports.map((report) => (
              <div key={report.id} className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-gray-50/60 transition-colors">
                <div className="space-y-1.5 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700">
                      {report.targetType} Flagged
                    </span>
                    <span className="text-xs text-gray-400">
                      Reported {new Date(report.createdAt).toLocaleDateString()}
                    </span>
                    {report.status !== 'pending' && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${report.status === 'actioned' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
                        {report.status.toUpperCase()}
                      </span>
                    )}
                  </div>

                  <h4 className="font-bold text-gray-900 text-sm">{report.targetTitle}</h4>
                  <div className="text-xs text-gray-700">
                    <strong className="text-gray-900">Reason:</strong> {report.reason}
                  </div>
                  {report.details && (
                    <p className="text-xs text-gray-500 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                      "{report.details}"
                    </p>
                  )}
                  {report.actionTaken && (
                    <div className="text-[11px] font-semibold text-emerald-700">
                      Action taken: {report.actionTaken} (by {report.reviewedBy})
                    </div>
                  )}
                </div>

                {report.status === 'pending' && (
                  <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                    <button
                      onClick={() => handleDismissReport(report)}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl"
                    >
                      Dismiss
                    </button>
                    <button
                      onClick={() => handleBlacklistVehicle(report)}
                      className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs"
                    >
                      Blacklist Listing
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
