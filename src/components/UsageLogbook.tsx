import React, { useState } from 'react';
import { Equipment, User, UsageLog, Booking, MachineCondition } from '../types';
import { LabStorage } from '../services/storage';
import { 
  BookOpenCheck, 
  Search, 
  Filter, 
  Download, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  AlertOctagon, 
  Plus, 
  LogOut,
  MapPin,
  Calendar,
  Layers,
  FolderGit2,
  Package
} from 'lucide-react';

interface UsageLogbookProps {
  currentUser: User;
  allUsers: User[];
  equipmentList: Equipment[];
  bookings: Booking[];
  logs: UsageLog[];
  onOpenCheckInModal: (equipment: Equipment, booking?: Booking) => void;
  onOpenCheckOutModal: (equipment: Equipment, log: UsageLog) => void;
  onRefresh: () => void;
}

export const UsageLogbook: React.FC<UsageLogbookProps> = ({
  currentUser,
  allUsers,
  equipmentList,
  bookings: _bookings,
  logs,
  onOpenCheckInModal,
  onOpenCheckOutModal,
  onRefresh: _onRefresh,
}) => {
  const [filterEquipment, setFilterEquipment] = useState<string>('all');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterCondition, setFilterCondition] = useState<string>('all');
  const [filterIncidentOnly, setFilterIncidentOnly] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedLogDetail, setSelectedLogDetail] = useState<UsageLog | null>(null);

  const projects = LabStorage.getProjects();

  const userMap = new Map(allUsers.map((u) => [u.id, u]));
  const eqMap = new Map(equipmentList.map((e) => [e.id, e]));

  // Active sessions: logs without checkOutTime
  const activeLogs = logs.filter((l) => !l.checkOutTime);

  // Completed logs
  const completedLogs = logs.filter((l) => Boolean(l.checkOutTime));

  // Filtered logbook entries
  const filteredLogs = logs.filter((log) => {
    const eq = eqMap.get(log.equipmentId);
    const u = userMap.get(log.userId);

    const matchesEq = filterEquipment === 'all' || log.equipmentId === filterEquipment;
    const matchesProject =
      filterProject === 'all' ||
      log.projectId === filterProject ||
      log.projectCode === filterProject;
    const matchesCond =
      filterCondition === 'all' ||
      log.initialCondition === filterCondition ||
      log.finalCondition === filterCondition;
    const matchesIncident = !filterIncidentOnly || log.incidentReport?.hasIncident;

    const query = searchTerm.toLowerCase();
    const matchesSearch =
      (eq?.name || '').toLowerCase().includes(query) ||
      (eq?.code || '').toLowerCase().includes(query) ||
      (log.projectCode || '').toLowerCase().includes(query) ||
      (u?.name || '').toLowerCase().includes(query) ||
      (log.operatorNotes || '').toLowerCase().includes(query) ||
      (log.incidentReport?.description || '').toLowerCase().includes(query);

    return matchesEq && matchesProject && matchesCond && matchesIncident && matchesSearch;
  });

  const getConditionBadge = (c?: MachineCondition) => {
    switch (c) {
      case 'good':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-sm font-medium border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Tốt / Chuẩn
          </span>
        );
      case 'minor_wear':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-sm font-medium border border-amber-200">
            Hao mòn nhẹ
          </span>
        );
      case 'needs_calibration':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] text-orange-700 bg-orange-50 px-2 py-0.5 rounded-sm font-medium border border-orange-200">
            <AlertTriangle className="w-3 h-3 text-orange-600" />
            Cần hiệu chuẩn
          </span>
        );
      case 'damaged':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded-sm font-medium border border-rose-200">
            <AlertOctagon className="w-3 h-3 text-rose-600" />
            Hỏng hóc
          </span>
        );
      default:
        return <span className="text-slate-400 text-xs">---</span>;
    }
  };

  const handleExportCSV = () => {
    LabStorage.exportLogsToCSV(logs, equipmentList, allUsers);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Nhật Ký Sử Dụng Thiết Bị (Lab Logbook)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Ghi nhận chính xác mốc giờ nhận/trả máy, đánh giá tình trạng thiết bị và báo cáo sự cố vận hành
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Xuất Nhật Ký (Excel/CSV)</span>
          </button>
          
          <button
            onClick={() => {
              const availableEq = equipmentList.find((e) => e.status === 'available') || equipmentList[0];
              if (availableEq) onOpenCheckInModal(availableEq);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nhận Máy Đột Xuất</span>
          </button>
        </div>
      </div>

      {/* Section: Currently In-Progress Sessions (Check-out Needed) */}
      {activeLogs.length > 0 && (
        <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs sm:text-sm">
              <Clock className="w-4 h-4 text-amber-600 animate-spin" />
              <span>{activeLogs.length} Phiên Đo Đang Chạy (Cần Check-out Khi Hoàn Tất)</span>
            </div>
            <span className="text-[11px] text-amber-700 font-medium">
              Vui lòng trả máy để hệ thống hoàn tất nhật ký
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeLogs.map((activeLog) => {
              const eq = eqMap.get(activeLog.equipmentId);
              const user = userMap.get(activeLog.userId);
              const checkInDate = new Date(activeLog.checkInTime);
              const isMine = activeLog.userId === currentUser.id;

              return (
                <div
                  key={activeLog.id}
                  className="bg-white p-3.5 rounded-lg border border-amber-200/80 shadow-2xs flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-800">
                        {eq?.code}
                      </span>
                      <span className="text-xs font-semibold text-slate-900 truncate">
                        {eq?.name}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                      <span>Người chạy: <strong className="text-slate-800">{user?.name}</strong></span>
                      <span>·</span>
                      <span>Bắt đầu: <strong className="font-mono text-slate-800">{checkInDate.toLocaleTimeString('vi-VN')}</strong></span>
                      {isMine && (
                        <span className="text-[10px] bg-blue-100 text-blue-800 px-1 rounded font-bold">
                          Phiên của bạn
                        </span>
                      )}
                    </div>
                  </div>

                  {eq && (
                    <button
                      onClick={() => onOpenCheckOutModal(eq, activeLog)}
                      className="shrink-0 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Trả Máy</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Filter className="w-3.5 h-3.5" />
            <span>Lọc:</span>
          </div>

          {/* Equipment selector */}
          <select
            value={filterEquipment}
            onChange={(e) => setFilterEquipment(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
          >
            <option value="all">Tất cả thiết bị</option>
            {equipmentList.map((e) => (
              <option key={e.id} value={e.id}>
                [{e.code}] {e.name}
              </option>
            ))}
          </select>

          {/* Project Tag selector */}
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
          >
            <option value="all">Tất cả đề tài / dự án</option>
            {projects.map((p) => (
              <option key={p.id} value={p.code}>
                [{p.code}] {p.name}
              </option>
            ))}
          </select>

          {/* Condition selector */}
          <select
            value={filterCondition}
            onChange={(e) => setFilterCondition(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
          >
            <option value="all">Tất cả tình trạng</option>
            <option value="good">Tốt / Chuẩn</option>
            <option value="minor_wear">Hao mòn nhẹ</option>
            <option value="needs_calibration">Cần hiệu chuẩn</option>
            <option value="damaged">Hỏng hóc</option>
          </select>

          {/* Incident flag toggle */}
          <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer ml-1">
            <input
              type="checkbox"
              checked={filterIncidentOnly}
              onChange={(e) => setFilterIncidentOnly(e.target.checked)}
              className="rounded text-rose-600 focus:ring-rose-500 w-3.5 h-3.5"
            />
            <span className="font-semibold text-rose-700">Chỉ xem sự cố</span>
          </label>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo người, ghi chú, mã..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
          />
        </div>
      </div>

      {/* Main Logbook Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="font-semibold text-slate-800 flex items-center gap-2">
            <BookOpenCheck className="w-4 h-4 text-blue-600" />
            <span>Sổ Nhật Ký Vận Hành Phòng Thí Nghiệm ({filteredLogs.length} bản ghi)</span>
          </div>
          <span className="text-slate-500 font-mono text-[11px]">
            Đã hoàn tất: {completedLogs.length} / Đang chạy: {activeLogs.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Thiết Bị</th>
                <th className="py-3 px-4">Người Vận Hành</th>
                <th className="py-3 px-4">Mốc Thời Gian (In / Out)</th>
                <th className="py-3 px-4 text-right">Thời Lượng</th>
                <th className="py-3 px-4">Tình Trạng (Đầu / Cuối)</th>
                <th className="py-3 px-4">Sự Cố</th>
                <th className="py-3 px-4">Ghi Chú</th>
                <th className="py-3 px-4 text-right">Chi Tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Không có nhật ký nào phù hợp với bộ lọc tìm kiếm.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const eq = eqMap.get(log.equipmentId);
                  const user = userMap.get(log.userId);
                  const inDate = new Date(log.checkInTime);
                  const outDate = log.checkOutTime ? new Date(log.checkOutTime) : null;
                  const hasIncident = log.incidentReport?.hasIncident;

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      {/* Equipment */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-slate-800 text-[11px]">
                            {eq?.code || log.equipmentId}
                          </span>
                          {log.projectCode && (
                            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-semibold px-1.5 py-0.2 rounded border border-indigo-200 inline-flex items-center gap-1 font-mono">
                              <FolderGit2 className="w-2.5 h-2.5 text-indigo-600" />
                              {log.projectCode}
                            </span>
                          )}
                        </div>
                        <div className="font-medium text-slate-900 text-xs max-w-[160px] truncate" title={eq?.name}>
                          {eq?.name}
                        </div>
                        {log.consumedSupplies && log.consumedSupplies.length > 0 && (
                          <div className="mt-0.5 flex items-center gap-1 text-[10px] text-amber-700 font-medium">
                            <Package className="w-3 h-3 text-amber-600 shrink-0" />
                            <span>{log.consumedSupplies.length} vật tư ({log.materialCostVND ? `${log.materialCostVND.toLocaleString('vi-VN')} đ` : ''})</span>
                          </div>
                        )}
                      </td>

                      {/* Operator */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {user?.name || log.userId}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[140px]">
                          {user?.department}
                        </div>
                      </td>

                      {/* Check-in / Check-out timestamps */}
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <div className="text-slate-800">
                          Vào: {inDate.toLocaleTimeString('vi-VN')} ({inDate.toLocaleDateString('vi-VN')})
                        </div>
                        <div className="text-slate-600 mt-0.5">
                          Ra: {outDate ? `${outDate.toLocaleTimeString('vi-VN')} (${outDate.toLocaleDateString('vi-VN')})` : (
                            <span className="text-amber-600 font-bold">Đang chạy...</span>
                          )}
                        </div>
                      </td>

                      {/* Duration */}
                      <td className="py-3 px-4 font-mono text-right tabular-nums">
                        {log.durationMinutes ? (
                          <span className="font-semibold text-slate-800">
                            {log.durationMinutes} phút
                          </span>
                        ) : (
                          <span className="text-amber-600 font-medium">---</span>
                        )}
                        {log.sampleCount !== undefined && (
                          <div className="text-[10px] text-slate-500">
                            {log.sampleCount} mẫu
                          </div>
                        )}
                      </td>

                      {/* Conditions */}
                      <td className="py-3 px-4 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 w-8">Đầu:</span>
                          {getConditionBadge(log.initialCondition)}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 w-8">Cuối:</span>
                          {getConditionBadge(log.finalCondition)}
                        </div>
                      </td>

                      {/* Incident */}
                      <td className="py-3 px-4">
                        {hasIncident ? (
                          <span
                            className="inline-flex items-center gap-1 text-[11px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-bold border border-rose-200"
                            title={log.incidentReport?.description}
                          >
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            {log.incidentReport?.severity === 'critical'
                              ? 'Khẩn cấp'
                              : log.incidentReport?.severity === 'high'
                              ? 'Nghiêm trọng'
                              : 'Có sự cố'}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">Không</span>
                        )}
                      </td>

                      {/* Operator Notes */}
                      <td className="py-3 px-4">
                        <p className="text-xs text-slate-600 max-w-[200px] truncate" title={log.operatorNotes}>
                          {log.operatorNotes || 'Không có ghi chú'}
                        </p>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedLogDetail(log)}
                          className="px-2.5 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded font-medium transition-colors"
                        >
                          Xem chi tiết
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Detail Modal */}
      {selectedLogDetail && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="font-mono text-xs text-blue-600 font-bold">
                  {selectedLogDetail.id}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  Chi Tiết Nhật Ký Vận Hành Thiết Bị
                </h3>
              </div>
              <button
                onClick={() => setSelectedLogDetail(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Info block */}
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg space-y-1.5 border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500">Thiết bị:</span>
                  <span className="font-bold text-slate-900">
                    {eqMap.get(selectedLogDetail.equipmentId)?.name} (
                    {eqMap.get(selectedLogDetail.equipmentId)?.code})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Phòng thí nghiệm:</span>
                  <span className="font-medium text-slate-800">
                    {eqMap.get(selectedLogDetail.equipmentId)?.room}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Người vận hành:</span>
                  <span className="font-bold text-slate-900">
                    {userMap.get(selectedLogDetail.userId)?.name} ({userMap.get(selectedLogDetail.userId)?.title})
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[11px]">Giờ nhận máy (Check-in)</span>
                  <span className="font-mono font-semibold text-slate-800 text-xs">
                    {new Date(selectedLogDetail.checkInTime).toLocaleString('vi-VN')}
                  </span>
                  <div className="mt-1">
                    {getConditionBadge(selectedLogDetail.initialCondition)}
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[11px]">Giờ trả máy (Check-out)</span>
                  <span className="font-mono font-semibold text-slate-800 text-xs">
                    {selectedLogDetail.checkOutTime
                      ? new Date(selectedLogDetail.checkOutTime).toLocaleString('vi-VN')
                      : 'Đang hoạt động'}
                  </span>
                  <div className="mt-1">
                    {getConditionBadge(selectedLogDetail.finalCondition)}
                  </div>
                </div>
              </div>

              {selectedLogDetail.sampleCount !== undefined && (
                <div className="flex justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500">Số lượng mẫu đã đo:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {selectedLogDetail.sampleCount} mẫu
                  </span>
                </div>
              )}

              {/* Project Tag & Consumed Supplies */}
              {(selectedLogDetail.projectCode || (selectedLogDetail.consumedSupplies && selectedLogDetail.consumedSupplies.length > 0)) && (
                <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-indigo-900 flex items-center gap-1.5 text-xs">
                      <FolderGit2 className="w-3.5 h-3.5 text-indigo-600" />
                      Gắn thẻ đề tài nghiên cứu:
                    </span>
                    <span className="font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200 text-xs">
                      {selectedLogDetail.projectCode || 'Không có mã'}
                    </span>
                  </div>

                  {selectedLogDetail.consumedSupplies && selectedLogDetail.consumedSupplies.length > 0 && (
                    <div className="space-y-1.5 pt-1 border-t border-indigo-100">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                        <span className="flex items-center gap-1">
                          <Package className="w-3 h-3 text-amber-600" />
                          Vật tư tiêu hao xuất dùng trong ca:
                        </span>
                        <span className="text-emerald-700 font-bold">
                          {selectedLogDetail.materialCostVND?.toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                      <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                        {selectedLogDetail.consumedSupplies.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-white px-2 py-1 rounded text-[11px] border border-slate-200">
                            <span className="font-medium text-slate-800 truncate max-w-[200px]" title={item.supplyName}>
                              [{item.supplyCode}] {item.supplyName}
                            </span>
                            <span className="text-slate-600 font-mono shrink-0 ml-2">
                              {item.quantity} {item.unit} · {(item.totalCostVND || (item.quantity * item.unitCostVND)).toLocaleString('vi-VN')} đ
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Incident report box if any */}
              {selectedLogDetail.incidentReport?.hasIncident && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Báo Cáo Sự Cố Trong Ca</span>
                    <span className="uppercase text-[10px] bg-rose-200 px-1 rounded">
                      {selectedLogDetail.incidentReport.severity}
                    </span>
                  </div>
                  <p className="text-xs text-rose-800">
                    {selectedLogDetail.incidentReport.description}
                  </p>
                </div>
              )}

              <div>
                <label className="text-slate-500 font-semibold block mb-1">
                  Ghi chú của người vận hành:
                </label>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 whitespace-pre-wrap">
                  {selectedLogDetail.operatorNotes || 'Không có ghi chú'}
                </div>
              </div>

              {selectedLogDetail.supervisorNotes && (
                <div>
                  <label className="text-slate-500 font-semibold block mb-1">
                    Ý kiến quản lý phòng Lab:
                  </label>
                  <div className="p-2.5 bg-indigo-50/60 rounded-lg border border-indigo-200 text-indigo-900">
                    {selectedLogDetail.supervisorNotes}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedLogDetail(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
