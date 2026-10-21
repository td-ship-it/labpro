import React, { useState, useMemo } from 'react';
import { 
  ResearchProject, 
  ConsumableSupply, 
  ConsumedSupplyItem, 
  Booking, 
  UsageLog, 
  Equipment, 
  User 
} from '../types';
import { LabStorage, localDateStr } from '../services/storage';
import { 
  FolderGit2, 
  Plus, 
  Download, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  Coins, 
  Package, 
  User as UserIcon, 
  Building2, 
  CheckCircle2, 
  AlertTriangle, 
  FileSpreadsheet, 
  ChevronRight, 
  Tag, 
  Sparkles, 
  FlaskConical, 
  Layers, 
  TrendingUp, 
  X, 
  Check, 
  Briefcase,
  HelpCircle,
  ExternalLink,
  Zap,
  Printer
} from 'lucide-react';

interface ProjectTrackingViewProps {
  currentUser: User;
  allUsers: User[];
  equipmentList: Equipment[];
  bookings: Booking[];
  logs: UsageLog[];
  onOpenBookingModal?: (equipmentId?: string, preferredDate?: string, preferredStartTime?: string, preferredEndTime?: string, preselectedProjectId?: string) => void;
  onRefresh?: () => void;
}

export const ProjectTrackingView: React.FC<ProjectTrackingViewProps> = ({
  currentUser,
  allUsers,
  equipmentList,
  bookings,
  logs,
  onOpenBookingModal,
  onRefresh,
}) => {
  // Đọc trực tiếp từ kho mỗi lần hiển thị để luôn thấy dữ liệu mới nhất (kể cả do người khác cập nhật)
  const projects: ResearchProject[] = LabStorage.getProjects();
  const suppliesCatalog: ConsumableSupply[] = LabStorage.getConsumableSupplies();
  
  // Filter States
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'on_hold'>('all');

  // Modal State for New Project
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newProjectData, setNewProjectData] = useState<{
    code: string;
    name: string;
    principalInvestigator: string;
    piEmail: string;
    department: string;
    fundingAgency: string;
    startDate: string;
    endDate: string;
    budgetTotalVND: number;
    materialBudgetVND: number;
    colorTag: 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky' | 'purple';
    description: string;
  }>({
    code: '',
    name: '',
    principalInvestigator: currentUser.name,
    piEmail: currentUser.email,
    department: currentUser.department || 'Phòng Thí nghiệm Phân tích',
    fundingAgency: 'Quỹ NAFOSTED / Đề tài cấp Bộ',
    startDate: localDateStr(),
    endDate: localDateStr(new Date(new Date().setFullYear(new Date().getFullYear() + 1))),
    budgetTotalVND: 300000000,
    materialBudgetVND: 50000000,
    colorTag: 'indigo',
    description: '',
  });

  const [formError, setFormError] = useState<string | null>(null);

  // Helper maps
  const eqMap = useMemo(() => new Map(equipmentList.map((e) => [e.id, e])), [equipmentList]);
  const userMap = useMemo(() => new Map(allUsers.map((u) => [u.id, u])), [allUsers]);

  // Color tag styling helper
  const getColorStyles = (color: string) => {
    switch (color) {
      case 'emerald':
        return {
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          text: 'text-emerald-800',
          pill: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          progress: 'bg-emerald-500',
          accent: 'text-emerald-600',
        };
      case 'amber':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          text: 'text-amber-800',
          pill: 'bg-amber-100 text-amber-800 border-amber-300',
          progress: 'bg-amber-500',
          accent: 'text-amber-600',
        };
      case 'rose':
        return {
          bg: 'bg-rose-50',
          border: 'border-rose-200',
          text: 'text-rose-800',
          pill: 'bg-rose-100 text-rose-800 border-rose-300',
          progress: 'bg-rose-500',
          accent: 'text-rose-600',
        };
      case 'purple':
        return {
          bg: 'bg-purple-50',
          border: 'border-purple-200',
          text: 'text-purple-800',
          pill: 'bg-purple-100 text-purple-800 border-purple-300',
          progress: 'bg-purple-500',
          accent: 'text-purple-600',
        };
      case 'sky':
        return {
          bg: 'bg-sky-50',
          border: 'border-sky-200',
          text: 'text-sky-800',
          pill: 'bg-sky-100 text-sky-800 border-sky-300',
          progress: 'bg-sky-500',
          accent: 'text-sky-600',
        };
      case 'indigo':
      default:
        return {
          bg: 'bg-indigo-50',
          border: 'border-indigo-200',
          text: 'text-indigo-800',
          pill: 'bg-indigo-100 text-indigo-800 border-indigo-300',
          progress: 'bg-indigo-600',
          accent: 'text-indigo-600',
        };
    }
  };

  // Filter projects
  const filteredProjects = useMemo(() => {
    return projects.filter((proj) => {
      if (statusFilter !== 'all' && proj.status !== statusFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          proj.code.toLowerCase().includes(q) ||
          proj.name.toLowerCase().includes(q) ||
          proj.principalInvestigator.toLowerCase().includes(q) ||
          proj.department.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [projects, statusFilter, searchTerm]);

  // Aggregate project statistics
  const projectSummaries = useMemo(() => {
    const map = new Map<string, ReturnType<typeof LabStorage.getProjectSummary>>();
    projects.forEach((proj) => {
      const summary = LabStorage.getProjectSummary(proj.id);
      map.set(proj.id, summary);
    });
    return map;
  }, [projects, bookings, logs]);

  // Overall Global KPI Metrics
  const totalApprovedMaterialBudget = projects.reduce((acc, p) => acc + p.materialBudgetVND, 0);
  const totalActualMaterialCost = Array.from(projectSummaries.values()).reduce((acc, s) => acc + s.totalMaterialCostVND, 0);
  const totalResearchHours = Array.from(projectSummaries.values()).reduce((acc, s) => acc + s.totalActualHours, 0);
  const overallBudgetPercentage = Math.round((totalActualMaterialCost / Math.max(totalApprovedMaterialBudget, 1)) * 100);

  // Active Project for Detail Ledger View
  const activeDetailProject = selectedProjectId !== 'all'
    ? projects.find((p) => p.id === selectedProjectId)
    : null;

  const activeSummary = activeDetailProject
    ? projectSummaries.get(activeDetailProject.id)
    : null;

  // Logs for ledger table
  const relevantLedgerLogs = useMemo(() => {
    return logs.filter((log) => {
      if (activeDetailProject) {
        return log.projectId === activeDetailProject.id || log.projectCode === activeDetailProject.code;
      }
      return Boolean(log.projectId || log.projectCode);
    }).sort((a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime());
  }, [logs, activeDetailProject]);

  // Handle Add Project Submit
  const handleAddProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newProjectData.code.trim()) {
      setFormError('Vui lòng nhập Mã đề tài / dự án.');
      return;
    }
    if (!newProjectData.name.trim()) {
      setFormError('Vui lòng nhập Tên đề tài nghiên cứu.');
      return;
    }
    if (!newProjectData.principalInvestigator.trim()) {
      setFormError('Vui lòng nhập Tên chủ nhiệm đề tài (PI).');
      return;
    }

    // Check duplicate code
    const existing = projects.find((p) => p.code.toLowerCase() === newProjectData.code.trim().toLowerCase());
    if (existing) {
      setFormError(`Mã đề tài "${newProjectData.code.trim()}" đã tồn tại.`);
      return;
    }

    const newProj: ResearchProject = {
      ...newProjectData,
      id: `proj-${Date.now()}`,
      code: newProjectData.code.trim().toUpperCase(),
      name: newProjectData.name.trim(),
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    LabStorage.upsertProject(newProj);
    setIsAddModalOpen(false);
    setSelectedProjectId(newProj.id);
    if (onRefresh) onRefresh();
  };

  // Handle CSV Export
  const handleExportCSV = (projId?: string) => {
    LabStorage.exportProjectMaterialReportToCSV({
      projectId: projId || selectedProjectId,
      projects,
      logs,
      bookings,
      equipment: equipmentList,
      users: allUsers,
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-xs">
              <FolderGit2 className="w-4 h-4" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Quản Lý Dự Án Nghiên Cứu & Tiêu Hao Vật Tư
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
              Project Tracking
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Gắn thẻ từng ca đăng ký thiết bị theo mã đề tài khoa học, kiểm soát định mức ngân sách vật tư tiêu hao (consumables) và lập bảng kê quyết toán.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => handleExportCSV()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Xuất Báo Cáo Quyết Toán (.CSV)</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm Đề Tài Mới</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Active Projects */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Đề tài đang theo dõi</span>
            <Briefcase className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {projects.length} <span className="text-xs font-normal text-slate-400">dự án</span>
          </div>
          <div className="text-[11px] text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>{projects.filter((p) => p.status === 'active').length} đề tài đang thực hiện</span>
          </div>
        </div>

        {/* Total Approved Material Budget */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Ngân sách vật tư được duyệt</span>
            <Coins className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {(totalApprovedMaterialBudget / 1000000).toFixed(1)} <span className="text-xs font-normal text-slate-400">triệu VNĐ</span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            {totalApprovedMaterialBudget.toLocaleString('vi-VN')} ₫
          </div>
        </div>

        {/* Actual Consumables Consumed */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Đã tiêu hao qua các ca máy</span>
            <Package className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-900 tabular-nums">
            {(totalActualMaterialCost / 1000000).toFixed(2)} <span className="text-xs font-normal text-slate-400">triệu VNĐ</span>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center justify-between">
            <span>Tỷ lệ giải ngân:</span>
            <span className="font-bold text-slate-700">{overallBudgetPercentage}%</span>
          </div>
        </div>

        {/* Operating Machine Hours Served */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Thời lượng máy phục vụ</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {totalResearchHours.toFixed(1)} <span className="text-xs font-normal text-slate-400">giờ</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Tổng hợp qua {logs.filter((l) => Boolean(l.projectId || l.projectCode)).length} ca đo thực tế
          </div>
        </div>
      </div>

      {/* 3. Filter Bar & Project Selector Strip */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search box */}
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm mã đề tài, tên dự án, chủ nhiệm PI..."
              className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-700">Trạng thái:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang tiến hành</option>
              <option value="completed">Đã hoàn thành</option>
              <option value="on_hold">Tạm dừng</option>
            </select>
          </div>
        </div>

        {/* View Mode or Selected Tag indicator */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-center min-w-0 max-w-full">
          <span className="text-slate-500">Đang lọc theo:</span>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="text-xs font-bold text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50/50 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">Tất cả đề tài nghiên cứu ({projects.length})</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                [{p.code}] {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4. Projects Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProjects.map((proj) => {
          const summary = projectSummaries.get(proj.id);
          const colorStyles = getColorStyles(proj.colorTag);
          const isSelected = selectedProjectId === proj.id;
          const pct = summary?.budgetConsumedPercentage || 0;

          return (
            <div
              key={proj.id}
              onClick={() => setSelectedProjectId(isSelected ? 'all' : proj.id)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-4 shadow-2xs group ${
                isSelected
                  ? 'border-indigo-600 ring-2 ring-indigo-500/30 bg-indigo-50/20'
                  : 'border-slate-200 hover:border-indigo-300 bg-white hover:shadow-xs'
              }`}
            >
              {/* Card Header: Code Badge & Status */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold border ${colorStyles.pill}`}>
                    {proj.code}
                  </span>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      proj.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : proj.status === 'completed'
                        ? 'bg-slate-100 text-slate-700'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {proj.status === 'active' ? 'Đang tiến hành' : proj.status === 'completed' ? 'Đã hoàn thành' : 'Tạm dừng'}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                  {proj.name}
                </h3>

                {/* PI & Department */}
                <div className="space-y-1 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-slate-700 font-medium truncate">Chủ nhiệm: <strong>{proj.principalInvestigator}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{proj.department}</span>
                  </div>
                </div>
              </div>

              {/* Material Budget Progress Bar */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 text-[11px]">Định mức vật tư tiêu hao:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {(summary?.totalMaterialCostVND || 0).toLocaleString('vi-VN')} ₫ <span className="font-normal text-slate-400">/ {proj.materialBudgetVND.toLocaleString('vi-VN')} ₫</span>
                  </span>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      pct > 85 ? 'bg-rose-600' : pct > 60 ? 'bg-amber-500' : colorStyles.progress
                    }`}
                    style={{ width: `${Math.max(pct, 4)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Đã tiêu hao: <strong className="text-slate-700">{pct}%</strong></span>
                  <span className="text-slate-500 font-mono">Còn: {(summary?.remainingMaterialBudgetVND || 0).toLocaleString('vi-VN')} ₫</span>
                </div>
              </div>

              {/* Metrics & Booking Action */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-xs">
                <div className="flex items-center gap-3 text-[11px] text-slate-600 font-mono">
                  <span><strong>{summary?.totalBookingsCount || 0}</strong> ca</span>
                  <span>·</span>
                  <span><strong>{summary?.totalActualHours || 0}</strong>h máy</span>
                  <span>·</span>
                  <span><strong>{summary?.totalSamplesCount || 0}</strong> mẫu</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onOpenBookingModal) {
                        onOpenBookingModal(undefined, undefined, undefined, undefined, proj.id);
                      }
                    }}
                    className="p-1.5 rounded-lg text-indigo-700 hover:bg-indigo-50 border border-indigo-200 transition-colors"
                    title="Đặt máy ngay và gắn thẻ đề tài này"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExportCSV(proj.id);
                    }}
                    className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 border border-emerald-200 transition-colors"
                    title="Xuất bảng kê vật tư đề tài này"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 5. Detailed Consumable Supplies Ledger & Session History */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-amber-100 text-amber-800">
                <Package className="w-4 h-4 text-amber-700" />
              </span>
              <h2 className="text-base font-bold text-slate-900">
                {activeDetailProject
                  ? `Sổ Chi Tiết Tiêu Hao Vật Tư: [${activeDetailProject.code}] ${activeDetailProject.name}`
                  : `Bảng Kê Tiêu Hao Vật Tư & Ca Máy Theo Đề Tài (Toàn Phòng Lab)`}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeDetailProject
                ? `Chủ nhiệm đề tài: ${activeDetailProject.principalInvestigator} · Đơn vị: ${activeDetailProject.department}`
                : `Thống kê chi tiết danh mục vật tư đã xuất kho và ca đo thực tế của các đề tài nghiên cứu`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeDetailProject && (
              <button
                onClick={() => setSelectedProjectId('all')}
                className="text-xs px-2.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors font-medium"
              >
                Xem tất cả đề tài
              </button>
            )}

            <button
              onClick={() => handleExportCSV(activeDetailProject?.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-2xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải Bảng Kê Excel</span>
            </button>
          </div>
        </div>

        {/* Itemized Consumable Supplies Breakdown for Selected Project */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-slate-400" />
            <span>Danh Mục Vật Tư Tiêu Hao Đã Sử Dụng</span>
          </h3>

          {(!activeSummary || activeSummary.suppliesSummary.length === 0) ? (
            <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50">
              Chưa phát sinh vật tư tiêu hao tính phí cho đề tài này trong các ca đo đã hoàn thành.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-2.5 px-3">Mã Vật Tư</th>
                    <th className="py-2.5 px-3">Tên Vật Tư & Quy Cách</th>
                    <th className="py-2.5 px-3">Đơn Vị</th>
                    <th className="py-2.5 px-3 text-right">Đơn Giá (VNĐ)</th>
                    <th className="py-2.5 px-3 text-center">Số Lượng Đã Dùng</th>
                    <th className="py-2.5 px-3 text-right">Thành Tiền (VNĐ)</th>
                    <th className="py-2.5 px-3 text-right">% Ngân Sách</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeSummary.suppliesSummary.map((item) => {
                    const pctOfBudget = activeDetailProject
                      ? ((item.totalCostVND / Math.max(activeDetailProject.materialBudgetVND, 1)) * 100).toFixed(1)
                      : '0';

                    return (
                      <tr key={item.supplyCode} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">
                          {item.supplyCode}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-900">
                          {item.supplyName}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {item.unit}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                          {item.unitCostVND.toLocaleString('vi-VN')} ₫
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-indigo-700">
                          {item.totalQuantity}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {item.totalCostVND.toLocaleString('vi-VN')} ₫
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                          {pctOfBudget}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-bold border-t border-slate-200 text-slate-900">
                    <td colSpan={5} className="py-2.5 px-3 text-right">
                      Tổng Cộng Chi Phí Vật Tư:
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-indigo-700 text-sm">
                      {activeSummary.totalMaterialCostVND.toLocaleString('vi-VN')} ₫
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      {activeSummary.budgetConsumedPercentage}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Session Ledger Table */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Lịch Sử Từng Ca Vận Hành Máy Đã Gắn Thẻ Đề Tài</span>
          </h3>

          {relevantLedgerLogs.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50">
              Chưa có nhật ký ca đo nào được gắn thẻ cho đề tài này.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-2.5 px-3">Mã Ca / Ngày</th>
                    <th className="py-2.5 px-3">Mã Đề Tài</th>
                    <th className="py-2.5 px-3">Thiết Bị</th>
                    <th className="py-2.5 px-3">Người Vận Hành</th>
                    <th className="py-2.5 px-3 text-center">Thời Gian (phút)</th>
                    <th className="py-2.5 px-3 text-center">Số Mẫu</th>
                    <th className="py-2.5 px-3">Vật Tư Tiêu Hao Trong Ca</th>
                    <th className="py-2.5 px-3 text-right">Chi Phí (VNĐ)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {relevantLedgerLogs.map((log) => {
                    const eq = eqMap.get(log.equipmentId);
                    const u = userMap.get(log.userId);
                    const proj = projects.find((p) => p.id === log.projectId || p.code === log.projectCode);
                    const cost = log.materialCostVND || (log.consumedSupplies?.reduce((acc, s) => acc + s.totalCostVND, 0) || 0);

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 font-mono">
                          <span className="block font-bold text-slate-900">{log.id}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(log.checkInTime).toLocaleDateString('vi-VN')} {new Date(log.checkInTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>

                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-md font-mono text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {proj ? proj.code : (log.projectCode || 'N/A')}
                          </span>
                        </td>

                        <td className="py-2.5 px-3">
                          <span className="font-mono font-bold text-slate-800">{eq?.code}</span>
                          <span className="block text-[11px] text-slate-500 truncate max-w-[140px]">{eq?.name}</span>
                        </td>

                        <td className="py-2.5 px-3">
                          <span className="font-medium text-slate-900">{u?.name || log.userId}</span>
                          <span className="block text-[10px] text-slate-400">{u?.department}</span>
                        </td>

                        <td className="py-2.5 px-3 text-center font-mono">
                          {log.durationMinutes ? `${log.durationMinutes}m` : 'Đang chạy'}
                        </td>

                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">
                          {log.sampleCount || 0}
                        </td>

                        <td className="py-2.5 px-3 text-slate-600 max-w-xs">
                          {log.consumedSupplies && log.consumedSupplies.length > 0 ? (
                            <div className="space-y-0.5">
                              {log.consumedSupplies.map((s, idx) => (
                                <div key={idx} className="text-[11px]">
                                  • {s.supplyName}: <strong>{s.quantity} {s.unit}</strong>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Không phát sinh vật tư</span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {cost > 0 ? `${cost.toLocaleString('vi-VN')} ₫` : '0 ₫'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 6. Modal: Add New Research Project */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-600 text-white">
                  <FolderGit2 className="w-4 h-4" />
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Đăng Ký Đề Tài Nghiên Cứu Mới
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddProjectSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Project Code */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mã Đề Tài / Dự Án <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newProjectData.code}
                    onChange={(e) => setNewProjectData({ ...newProjectData, code: e.target.value })}
                    placeholder="VD: DT-VAST-2026, NCS-MAT-01"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 uppercase"
                  />
                </div>

                {/* Color Tag */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Màu Thẻ Tag Nhận Diện
                  </label>
                  <select
                    value={newProjectData.colorTag}
                    onChange={(e) => setNewProjectData({ ...newProjectData, colorTag: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  >
                    <option value="indigo">Indigo (Xanh chàm truyền thống)</option>
                    <option value="emerald">Emerald (Xanh lục sinh thái)</option>
                    <option value="amber">Amber (Vàng hổ phách)</option>
                    <option value="rose">Rose (Đỏ hoa hồng)</option>
                    <option value="sky">Sky (Xanh da trời)</option>
                    <option value="purple">Purple (Tím thạch anh)</option>
                  </select>
                </div>
              </div>

              {/* Project Name */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tên Đề Tài Nghiên Cứu Đầy Đủ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newProjectData.name}
                  onChange={(e) => setNewProjectData({ ...newProjectData, name: e.target.value })}
                  placeholder="VD: Nghiên cứu chế tạo vật liệu nano composite TiO2 quang xúc tác..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Principal Investigator */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Chủ Nhiệm Đề Tài (PI) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newProjectData.principalInvestigator}
                    onChange={(e) => setNewProjectData({ ...newProjectData, principalInvestigator: e.target.value })}
                    placeholder="VD: PGS. TS. Nguyễn Văn Minh"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>

                {/* Department */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Khoa / Viện / Đơn Vị Chủ Trì
                  </label>
                  <input
                    type="text"
                    value={newProjectData.department}
                    onChange={(e) => setNewProjectData({ ...newProjectData, department: e.target.value })}
                    placeholder="VD: Khoa Hóa học & Môi trường"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Funding Agency */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Cơ Quan Quản Lý / Cấp Kinh Phí
                  </label>
                  <input
                    type="text"
                    value={newProjectData.fundingAgency}
                    onChange={(e) => setNewProjectData({ ...newProjectData, fundingAgency: e.target.value })}
                    placeholder="VD: Quỹ NAFOSTED, Đề tài cấp Viện..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>

                {/* Material Budget VND */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Định Mức Ngân Sách Vật Tư Tiêu Hao (VNĐ) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1000000}
                    step={1000000}
                    value={newProjectData.materialBudgetVND}
                    onChange={(e) => setNewProjectData({ ...newProjectData, materialBudgetVND: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    Được dùng để tính tỷ lệ % cảnh báo vượt định mức
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Start Date */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Ngày Bắt Đầu Đề Tài
                  </label>
                  <input
                    type="date"
                    value={newProjectData.startDate}
                    onChange={(e) => setNewProjectData({ ...newProjectData, startDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Ngày Kết Thúc Dự Kiến
                  </label>
                  <input
                    type="date"
                    value={newProjectData.endDate}
                    onChange={(e) => setNewProjectData({ ...newProjectData, endDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mô Tả Mục Tiêu Thí Nghiệm & Phạm Vi
                </label>
                <textarea
                  rows={3}
                  value={newProjectData.description}
                  onChange={(e) => setNewProjectData({ ...newProjectData, description: e.target.value })}
                  placeholder="Tóm tắt nội dung nghiên cứu và các thiết bị phòng lab trọng tâm sẽ sử dụng..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold transition-colors"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 font-semibold shadow-xs transition-colors"
                >
                  Lưu Đề Tài & Bắt Đầu Theo Dõi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
