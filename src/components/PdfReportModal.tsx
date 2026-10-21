import React, { useRef } from 'react';
import { Equipment, User, Booking, UsageLog } from '../types';
import { 
  X, 
  Printer, 
  Download, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  MapPin, 
  Clock, 
  Building2 
} from 'lucide-react';
import { 
  UmpHcmLogo, 
  UmpSchoolOfPharmacyLogo, 
  BaocheDeptLogo, 
  VilasLogo, 
  Iso17025Badge, 
  LabLogProLogo 
} from './LabLogos';

interface PdfReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  startDate: string;
  endDate: string;
  selectedEquipmentId: string;
  equipmentList: Equipment[];
  allUsers: User[];
  bookings: Booking[];
  logs: UsageLog[];
  currentUser: User;
}

export const PdfReportModal: React.FC<PdfReportModalProps> = ({
  isOpen,
  onClose,
  startDate,
  endDate,
  selectedEquipmentId,
  equipmentList,
  allUsers,
  bookings: _bookings,
  logs,
  currentUser,
}) => {
  const reportRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const userMap = new Map(allUsers.map((u) => [u.id, u]));
  const eqMap = new Map(equipmentList.map((e) => [e.id, e]));

  const selectedEquipment = selectedEquipmentId !== 'all' ? eqMap.get(selectedEquipmentId) : null;

  // Filter logs according to criteria
  const filteredLogs = logs.filter((log) => {
    // Check equipment
    if (selectedEquipmentId !== 'all' && log.equipmentId !== selectedEquipmentId) {
      return false;
    }
    // Check date (compare log.checkInTime with startDate and endDate)
    const logDate = log.checkInTime.split('T')[0];
    if (startDate && logDate < startDate) return false;
    if (endDate && logDate > endDate) return false;
    return true;
  });

  // Calculate stats for the filtered set
  const totalSessions = filteredLogs.length;
  const totalMinutes = filteredLogs.reduce((acc, l) => acc + (l.durationMinutes || 0), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const totalSamples = filteredLogs.reduce((acc, l) => acc + (l.sampleCount || 0), 0);
  const incidentLogs = filteredLogs.filter((l) => l.incidentReport?.hasIncident);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static">
      {/* Modal Container */}
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[95vh] shadow-2xl border border-slate-200 overflow-hidden flex flex-col print:border-none print:shadow-none print:max-w-none print:max-h-none print:w-full">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="px-6 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Xem Trước Bản In & Xuất Báo Cáo PDF
              </h3>
              <p className="text-[11px] text-slate-500">
                Định dạng A4 tiêu chuẩn phòng thí nghiệm khoa học, tương thích lưu file PDF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In Báo Cáo / Lưu PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable A4 Report Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-slate-100/50 print:bg-white print:p-0 print:overflow-visible">
          <div
            id="printable-report"
            ref={reportRef}
            className="bg-white max-w-3xl mx-auto p-8 sm:p-12 border border-slate-200 rounded-xl shadow-xs space-y-6 text-slate-900 print:border-none print:shadow-none print:p-0 print:max-w-none"
          >
            {/* Header: Institutional letterhead */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b border-slate-300">
              <div className="flex items-start gap-3">
                <div className="flex items-center gap-1 shrink-0">
                  <UmpHcmLogo size={38} variant="icon" />
                  <UmpSchoolOfPharmacyLogo size={38} variant="icon" />
                  <BaocheDeptLogo size={38} variant="icon" />
                </div>
                <div className="text-left space-y-0.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    BỘ Y TẾ
                  </div>
                  <div className="text-xs font-black uppercase tracking-tight text-teal-950">
                    ĐẠI HỌC Y DƯỢC TP. HỒ CHÍ MINH
                  </div>
                  <div className="text-xs font-bold uppercase text-emerald-900">
                    TRƯỜNG DƯỢC · BỘ MÔN BÀO CHẾ
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Phòng Thí Nghiệm & Thực Tập Bào Chế Dược Phẩm
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 text-right sm:text-right">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-900">
                    CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                  </div>
                  <div className="text-xs italic text-slate-700">
                    Độc lập - Tự do - Hạnh phúc
                  </div>
                  <div className="text-[10px] text-slate-500 pt-0.5 font-mono">
                    Số: LAB-{new Date().getFullYear()}/BC-TB
                  </div>
                </div>
                <div className="hidden sm:flex flex-col items-center gap-1 shrink-0 pt-0.5">
                  <VilasLogo size={22} variant="icon" />
                  <Iso17025Badge size={22} variant="icon" />
                </div>
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center py-2 space-y-1">
              <h1 className="text-lg sm:text-xl font-bold uppercase tracking-tight text-slate-900">
                BÁO CÁO VẬN HÀNH & SỬ DỤNG THIẾT BỊ PHÒNG THÍ NGHIỆM
              </h1>
              <p className="text-xs text-slate-600 italic">
                (Khoảng thời gian: từ ngày <strong className="font-mono text-slate-900">{startDate || 'Ban đầu'}</strong> đến ngày <strong className="font-mono text-slate-900">{endDate || 'Hiện tại'}</strong>)
              </p>
            </div>

            {/* Scope Information */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500">Phạm vi báo cáo:</span>{' '}
                  <strong className="text-slate-900">
                    {selectedEquipment ? `[${selectedEquipment.code}] ${selectedEquipment.name}` : 'Toàn bộ danh mục thiết bị trong Lab'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">Phòng đặt máy:</span>{' '}
                  <strong className="text-slate-900">
                    {selectedEquipment ? `${selectedEquipment.room} (${selectedEquipment.building})` : 'Tất cả các phòng'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">Người xuất báo cáo:</span>{' '}
                  <strong className="text-slate-900">
                    {currentUser.name} ({currentUser.title})
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">Thời điểm trích xuất:</span>{' '}
                  <strong className="font-mono text-slate-900">
                    {new Date().toLocaleString('vi-VN')}
                  </strong>
                </div>
              </div>
            </div>

            {/* KPI Summary Block */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1">
                I. TỔNG HỢP CÁC CHỈ SỐ HOẠT ĐỘNG TRONG KỲ
              </h4>
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="p-3 border border-slate-200 rounded-lg bg-slate-50/50">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Tổng lượt vận hành</div>
                  <div className="text-xl font-bold font-mono text-slate-900 mt-1">{totalSessions}</div>
                  <div className="text-[10px] text-slate-400">phiên chạy máy</div>
                </div>
                <div className="p-3 border border-slate-200 rounded-lg bg-slate-50/50">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Tổng thời gian chạy</div>
                  <div className="text-xl font-bold font-mono text-blue-700 mt-1">{totalHours}</div>
                  <div className="text-[10px] text-slate-400">giờ hoạt động</div>
                </div>
                <div className="p-3 border border-slate-200 rounded-lg bg-slate-50/50">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Tổng số mẫu đo</div>
                  <div className="text-xl font-bold font-mono text-emerald-700 mt-1">{totalSamples}</div>
                  <div className="text-[10px] text-slate-400">mẫu phân tích</div>
                </div>
                <div className="p-3 border border-slate-200 rounded-lg bg-slate-50/50">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Sự cố phát sinh</div>
                  <div className={`text-xl font-bold font-mono mt-1 ${incidentLogs.length > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
                    {incidentLogs.length}
                  </div>
                  <div className="text-[10px] text-slate-400">vụ việc ghi nhận</div>
                </div>
              </div>
            </div>

            {/* Detailed Table of Runs */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1">
                II. DANH SÁCH CHI TIẾT CÁC PHIÊN CHẠY MÁY & BÀN GIAO
              </h4>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2 text-center w-8">STT</th>
                      <th className="p-2">Ngày & Giờ</th>
                      <th className="p-2">Mã & Tên Thiết Bị</th>
                      <th className="p-2">Người Sử Dụng</th>
                      <th className="p-2 text-right">Thời lượng</th>
                      <th className="p-2 text-center">Số mẫu</th>
                      <th className="p-2">Tình trạng / Sự cố</th>
                      <th className="p-2">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-slate-400 italic">
                          Không có dữ liệu nhật ký nào trong khoảng thời gian và thiết bị đã chọn.
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((log, index) => {
                        const eq = eqMap.get(log.equipmentId);
                        const user = userMap.get(log.userId);
                        const inDate = new Date(log.checkInTime);
                        const hasInc = log.incidentReport?.hasIncident;

                        return (
                          <tr key={log.id} className="hover:bg-slate-50/50">
                            <td className="p-2 text-center font-mono">{index + 1}</td>
                            <td className="p-2 font-mono whitespace-nowrap">
                              <div>{inDate.toLocaleDateString('vi-VN')}</div>
                              <div className="text-[10px] text-slate-500">
                                {inDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </td>
                            <td className="p-2">
                              <span className="font-mono font-bold text-slate-800">{eq?.code}</span>
                              <div className="text-[10px] text-slate-600 line-clamp-1">{eq?.name}</div>
                            </td>
                            <td className="p-2">
                              <div className="font-semibold">{user?.name || log.userId}</div>
                              <div className="text-[10px] text-slate-500">{user?.department}</div>
                            </td>
                            <td className="p-2 text-right font-mono tabular-nums">
                              {log.durationMinutes ? `${log.durationMinutes} ph` : '---'}
                            </td>
                            <td className="p-2 text-center font-mono tabular-nums">
                              {log.sampleCount || 0}
                            </td>
                            <td className="p-2">
                              {hasInc ? (
                                <span className="text-rose-700 font-bold">
                                  ⚠️ Sự cố: {log.incidentReport?.severity}
                                </span>
                              ) : (
                                <span className="text-emerald-700 font-medium">Hoạt động tốt</span>
                              )}
                            </td>
                            <td className="p-2 text-slate-600 text-[10px] max-w-[150px] truncate">
                              {log.operatorNotes || '---'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Assessment & Signatures */}
            <div className="space-y-4 pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1">
                III. ĐÁNH GIÁ KỸ THUẬT & XÁC NHẬN CỦA ĐƠN VỊ
              </h4>

              <div className="text-xs text-slate-700 leading-relaxed space-y-1">
                <p>
                  - Thiết bị được vận hành đúng quy trình kỹ thuật và hướng dẫn an toàn phòng thí nghiệm.
                </p>
                <p>
                  - Toàn bộ thời gian chạy máy và vật tư hao phí đã được kiểm toán và đối chiếu với sổ nhật ký gốc.
                </p>
                {incidentLogs.length > 0 && (
                  <p className="text-amber-800 font-medium">
                    - Lưu ý: Có {incidentLogs.length} sự cố kỹ thuật đã được ghi nhận trong kỳ báo cáo, đề nghị kỹ thuật viên kiểm tra bảo trì định kỳ.
                  </p>
                )}
              </div>

              {/* 3-column Signatures block */}
              <div className="grid grid-cols-3 gap-4 pt-8 text-center text-xs">
                <div className="space-y-16">
                  <div className="font-bold text-slate-800 uppercase text-[11px]">
                    NGƯỜI LẬP BÁO CÁO
                    <div className="font-normal italic text-[10px] text-slate-500">(Ký và ghi rõ họ tên)</div>
                  </div>
                  <div className="font-semibold text-slate-900">{currentUser.name}</div>
                </div>

                <div className="space-y-16">
                  <div className="font-bold text-slate-800 uppercase text-[11px]">
                    CÁN BỘ PHỤ TRÁCH MÁY
                    <div className="font-normal italic text-[10px] text-slate-500">(Ký và ghi rõ họ tên)</div>
                  </div>
                  <div className="font-semibold text-slate-900">
                    {selectedEquipment?.responsibleStaff || 'KTV. Hoàng Tuấn Cường'}
                  </div>
                </div>

                <div className="space-y-16">
                  <div className="font-bold text-slate-800 uppercase text-[11px]">
                    TRƯỞNG PHÒNG THÍ NGHIỆM
                    <div className="font-normal italic text-[10px] text-slate-500">(Ký tên và đóng dấu)</div>
                  </div>
                  <div className="font-semibold text-slate-900">TS. Lê Quang Dũng</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
